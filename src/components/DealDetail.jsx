// src/components/DealDetail.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

/*
  DealDetail.jsx
  - Robust comment handling (supports comments column named "content" OR "text")
  - Realtime subscribe to comments so everyone sees updates instantly
  - Posts-count fallback: if profiles.posts_count missing, we query deals count for that user
  - Likes: universal count + per-user like/unlike
  - Avatar fallback: shows letter if no avatar_url
  - Keeps original layout: image on left, content on right
*/

export default function DealDetail() {
  const { id } = useParams();
  const mountedRef = useRef(true);

  const [deal, setDeal] = useState(null);
  const [loadingDeal, setLoadingDeal] = useState(true);
  const [error, setError] = useState(null);

  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(true);

  const [likesCount, setLikesCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [likesLoading, setLikesLoading] = useState(true);

  // helper: normalize comment object whether DB column is 'content' or 'text'
  const normalizeComment = (c) => {
    return {
      id: c.id,
      text: c.content ?? c.text ?? "", // prefer content then text
      created_at: c.created_at,
      user_id: c.user_id,
      profiles: c.profiles ?? null,
      posts_count: c.posts_count ?? null,
    };
  };

  // ---------- Fetch deal ----------
  async function fetchDeal() {
    setLoadingDeal(true);
    try {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, description, image, price, old_price, link, posted_by")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (mountedRef.current) setDeal(data);
    } catch (err) {
      console.error("Error loading deal:", err);
      if (mountedRef.current) setError(err.message || "Failed to load deal");
    } finally {
      if (mountedRef.current) setLoadingDeal(false);
    }
  }

  // ---------- Comments ----------
  async function fetchComments() {
    setCommentsLoading(true);
    try {
      // select with profiles sub-object (works if comments.user_id references profiles.user_id)
      // we select both possible comment columns and normalize later
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          text,
          created_at,
          user_id,
          profiles ( user_id, username, avatar_url, coins, posts_count )
        `)
        .eq("deal_id", id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
        if (mountedRef.current) setComments([]);
        return;
      }

      let commentsArray = (data || []).map((c) => {
        // for some DBs profiles subselect uses profiles.user_id or id — both safe if it's present
        const p = c.profiles ?? null;
        const normalized = normalizeComment(c);

        // attach normalized profiles shape
        normalized.profiles = {
          username: p?.username ?? p?.id ?? null,
          avatar_url: p?.avatar_url ?? null,
          coins: p?.coins ?? 0,
          posts_count: p?.posts_count ?? null,
          user_id: p?.user_id ?? p?.id ?? null,
        };

        return normalized;
      });

      // If posts_count missing for commenters, fetch counts per unique commenter
      const missingCountsUsers = Array.from(
        new Set(
          commentsArray
            .filter((c) => c.profiles && (c.profiles.posts_count === null || c.profiles.posts_count === undefined))
            .map((c) => c.profiles.user_id)
            .filter(Boolean)
        )
      );

      if (missingCountsUsers.length) {
        // batch fetch counts for these users
        await Promise.all(
          missingCountsUsers.map(async (userId) => {
            try {
              const { count } = await supabase
                .from("deals")
                .select("id", { count: "exact", head: true })
                .eq("posted_by", userId);

              const postsCount = count ?? 0;
              // apply to commentsArray
              commentsArray = commentsArray.map((c) =>
                c.profiles.user_id === userId ? { ...c, posts_count: postsCount } : c
              );
            } catch (err) {
              console.warn("Could not fetch posts_count for", userId, err);
            }
          })
        );
      }

      if (mountedRef.current) setComments(commentsArray);
    } catch (err) {
      console.error("Unexpected comments error:", err);
      if (mountedRef.current) setComments([]);
    } finally {
      if (mountedRef.current) setCommentsLoading(false);
    }
  }

  // ---------- Add comment (robust to either 'content' or 'text' column) ----------
  async function handleAddComment(e) {
    e?.preventDefault?.();
    const text = commentDraft.trim();
    if (!text) return;

    // get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please log in to comment.");
      return;
    }

    // Try inserting to 'content' first, fallback to 'text' if insert fails
    const tryInsert = async (columnName) => {
      const payload = {
        deal_id: id,
        user_id: user.id,
      };
      payload[columnName] = text;

      const { data, error } = await supabase.from("comments").insert(payload).select(`
        id,
        content,
        text,
        created_at,
        user_id,
        profiles ( user_id, username, avatar_url, coins, posts_count )
      `).single();

      return { data, error };
    };

    // attempt
    let res = await tryInsert("content");
    if (res.error) {
      // try 'text'
      res = await tryInsert("text");
    }

    if (res.error) {
      console.error("Failed to insert comment:", res.error);
      alert("Failed to post comment: " + (res.error.message || res.error));
      return;
    }

    // success: normalized row
    const inserted = normalizeComment(res.data);
    inserted.profiles = {
      username: res.data.profiles?.username ?? null,
      avatar_url: res.data.profiles?.avatar_url ?? null,
      coins: res.data.profiles?.coins ?? 0,
      posts_count: res.data.profiles?.posts_count ?? null,
      user_id: res.data.profiles?.user_id ?? res.data.profiles?.id ?? null,
    };

    // append locally (so poster sees it instantly)
    if (mountedRef.current) {
      setComments((c) => [...c, inserted]);
      setCommentDraft("");
    }
    // Note: realtime subscription will also add the comment for other users
  }

  // ---------- Likes ----------
  async function fetchLikes() {
    setLikesLoading(true);
    try {
      // count likes for this deal
      const { data, error } = await supabase
        .from("likes")
        .select("user_id")
        .eq("deal_id", id);

      if (!error) {
        const arr = data || [];
        if (mountedRef.current) setLikesCount(arr.length);

        // check if currently logged-in user liked
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.id) {
          const liked = arr.some((r) => r.user_id === user.id);
          if (mountedRef.current) setUserLiked(!!liked);
        } else {
          if (mountedRef.current) setUserLiked(false);
        }
      } else {
        console.warn("Error fetching likes:", error);
      }
    } catch (err) {
      console.error("Unexpected likes error:", err);
    } finally {
      if (mountedRef.current) setLikesLoading(false);
    }
  }

  async function handleToggleLike() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please log in to like.");
      return;
    }

    try {
      if (userLiked) {
        // delete
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("deal_id", id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // insert (protect duplicates with unique constraint in DB ideally)
        const { error } = await supabase.from("likes").insert({ deal_id: id, user_id: user.id });
        if (error) throw error;
      }
      // refresh counts
      await fetchLikes();
    } catch (err) {
      console.error("Like/unlike failed:", err);
      alert("Could not update like: " + (err.message || err));
    }
  }

  // ---------- Realtime subscription for comments ----------
  useEffect(() => {
    let channel;
    // Supabase JS v2 uses `supabase.channel`, older v1 uses `.from().on()`.
    // Try v2 style first with try/catch fallback.
    try {
      if (!id) return;
      // subscribe to INSERTs on comments for this deal
      channel = supabase.channel(`public:comments:deal_${id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "comments", filter: `deal_id=eq.${id}` },
          (payload) => {
            const row = payload?.new;
            if (!row) return;
            const normalized = normalizeComment(row);
            normalized.profiles = {
              username: row.profiles?.username ?? null,
              avatar_url: row.profiles?.avatar_url ?? null,
              coins: row.profiles?.coins ?? 0,
              posts_count: row.profiles?.posts_count ?? null,
              user_id: row.profiles?.user_id ?? row.profiles?.id ?? row.user_id ?? null,
            };
            setComments((prev) => {
              // append if not already present
              if (prev.some((c) => c.id === normalized.id)) return prev;
              return [...prev, normalized];
            });
          }
        )
        .subscribe();
    } catch (err) {
      // older client fallback
      try {
        const sub = supabase
          .from(`comments:deal_id=eq.${id}`)
          .on("INSERT", (payload) => {
            const row = payload?.new;
            if (!row) return;
            const normalized = normalizeComment(row);
            normalized.profiles = {
              username: row.profiles?.username ?? null,
              avatar_url: row.profiles?.avatar_url ?? null,
              coins: row.profiles?.coins ?? 0,
              posts_count: row.profiles?.posts_count ?? null,
              user_id: row.profiles?.user_id ?? row.profiles?.id ?? row.user_id ?? null,
            };
            setComments((prev) => {
              if (prev.some((c) => c.id === normalized.id)) return prev;
              return [...prev, normalized];
            });
          })
          .subscribe();

        channel = sub;
      } catch (err2) {
        console.warn("Realtime comments not available:", err2);
      }
    }

    return () => {
      // unsubscribe on unmount
      try {
        if (channel?.unsubscribe) channel.unsubscribe();
        // older style:
        if (channel?.subscription) channel.subscription.unsubscribe?.();
      } catch (e) {}
    };
  }, [id]);

  // ---------- initial load ----------
  useEffect(() => {
    mountedRef.current = true;
    if (id) {
      fetchDeal();
      fetchComments();
      fetchLikes();
    }
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------- render ----------
  if (loadingDeal) return <p className="text-center py-6">Loading deal…</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!deal) return <p className="text-center py-6">Deal not found.</p>;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6 mt-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* IMAGE */}
        <div className="w-full md:w-48 flex-shrink-0">
          <img
            src={deal.image || "/placeholder.png"}
            alt={deal.title}
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>

        {/* DETAILS */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{deal.title}</h1>
          <p className="text-gray-600 mt-2">{deal.description}</p>

          <div className="mt-4 flex items-center gap-4">
            <div>
              <div className="text-lg font-bold">₹{deal.price ?? "—"}</div>
              {deal.old_price ? <div className="text-xs text-gray-500 line-through">₹{deal.old_price}</div> : null}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleToggleLike}
                disabled={likesLoading}
                className={`px-3 py-1 rounded-lg ${userLiked ? "bg-green-300" : "bg-green-100 hover:bg-green-200"}`}
              >
                👍 {userLiked ? "Liked" : "Like"} ({likesCount})
              </button>

              <a
                href={deal.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-yellow-800 text-white rounded-lg hover:bg-yellow-900"
              >
                Shop Now
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* DESCRIPTION */}
      {deal.description ? (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Description</h2>
          <p className="text-gray-700">{deal.description}</p>
        </div>
      ) : null}

      {/* COMMENTS */}
      <div className="mt-6">
        <h2 className="font-semibold mb-3">Comments</h2>

        {/* add comment */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await handleAddComment();
          }}
          className="flex gap-2 mb-4"
        >
          <input
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="Write a comment..."
            aria-label="Add comment"
          />
          <button type="submit" className="px-4 py-2 bg-yellow-800 text-white rounded-lg">
            Post
          </button>
        </form>

        {commentsLoading ? (
          <p className="text-gray-500">Loading comments…</p>
        ) : comments.length === 0 ? (
          <p className="text-gray-500">No comments yet.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3 items-start border-b pb-3">
                {/* avatar + popup */}
                <div className="relative group">
                  {c.profiles?.avatar_url ? (
                    <img src={c.profiles.avatar_url} alt={c.profiles?.username} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold">
                      {(c.profiles?.username?.[0] || "A").toUpperCase()}
                    </div>
                  )}

                  {/* popup */}
                  <div className="absolute hidden group-hover:flex flex-col gap-2 top-12 left-0 bg-white shadow-xl rounded-xl p-4 w-64 z-10 border">
                    <div className="flex items-center gap-3">
                      {c.profiles?.avatar_url ? (
                        <img src={c.profiles.avatar_url} alt={c.profiles?.username} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold text-lg">
                          {(c.profiles?.username?.[0] || "A").toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{c.profiles?.username || "Anonymous"}</p>
                        <span className="text-xs bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full">⭐ Badge</span>
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <p>Posts: {c.posts_count ?? c.profiles?.posts_count ?? 0}</p>
                      <p>Coins: {c.profiles?.coins ?? 0}</p>
                      <p>Leaderboard Rank: Coming soon</p>
                    </div>
                  </div>
                </div>

                {/* text */}
                <div className="flex-1">
                  <div className="text-gray-800">{c.text}</div>
                  <div className="text-xs text-gray-500 mt-1">{new Date(c.created_at).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
                }
