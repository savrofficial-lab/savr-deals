// src/components/DealDetail.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function DealDetail() {
  const { id } = useParams();

  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [reporting, setReporting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Fetch deal
  useEffect(() => {
    let mounted = true;
    async function fetchDeal() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("deals")
          .select("id, title, description, image, price, old_price, link, posted_by")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (mounted) setDeal(data || null);
      } catch (err) {
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDeal();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Fetch comments (exposed so we can call it after adding a comment)
  const fetchComments = useCallback(async () => {
    try {
      // join profiles via foreign key relation: comments.user_id -> profiles.user_id
      const { data: commentsData, error } = await supabase
        .from("comments")
        .select(`
          id, text, created_at, user_id,
          profiles:profiles!user_id (id, username, avatar_url, coins, posts_count)
        `)
        .eq("deal_id", id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading comments:", error);
        setComments([]);
        return;
      }
      if (!commentsData) {
        setComments([]);
        return;
      }

      // For each comment, compute posts_count (number of deals posted by that user)
      const enriched = await Promise.all(
        commentsData.map(async (c) => {
          try {
            const { count } = await supabase
              .from("deals")
              .select("id", { count: "exact", head: true })
              .eq("posted_by", c.user_id);

            return { ...c, posts_count: count || 0 };
          } catch (err) {
            return { ...c, posts_count: 0 };
          }
        })
      );

      setComments(enriched);
    } catch (err) {
      console.error("Unexpected comments error:", err);
      setComments([]);
    }
  }, [id]);

  // Fetch likes (count + whether current user liked)
  const fetchLikes = useCallback(async () => {
    try {
      const { count, error: countError } = await supabase
        .from("likes")
        .select("id", { count: "exact", head: true })
        .eq("deal_id", id);

      if (!countError) setLikeCount(count || 0);

      // check if current user has liked
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: existing, error: exErr } = await supabase
          .from("likes")
          .select("id")
          .eq("deal_id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!exErr && existing) setLiked(true);
        else if (!exErr && !existing) setLiked(false);
      } else {
        setLiked(false);
      }
    } catch (err) {
      console.error("Error fetching likes:", err);
    }
  }, [id]);

  // initial comments + likes
  useEffect(() => {
    fetchComments();
    fetchLikes();
  }, [fetchComments, fetchLikes]);

  // Like handler
  async function handleLike() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to like.");
        return;
      }
      if (liked) return;

      // insert like (DB unique index prevents duplicates)
      const { error } = await supabase.from("likes").insert({
        deal_id: id,
        user_id: user.id,
      });

      if (error) {
        // If unique constraint failing, treat as already-liked
        console.error("Like insert error:", error);
        if (error.code === "23505") {
          // unique violation
          setLiked(true);
          await fetchLikes();
          return;
        }
        alert("Could not like: " + error.message);
        return;
      }

      setLiked(true);
      // refresh like count from DB for accuracy
      await fetchLikes();
    } catch (err) {
      console.error("handleLike error:", err);
    }
  }

  // Add comment - insert then refresh comment list
  async function addComment(e) {
    try {
      e.preventDefault();
      const text = e.target.comment.value.trim();
      if (!text) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be signed in to comment.");
        return;
      }

      // Insert comment
      const { error: insertError } = await supabase.from("comments").insert({
        deal_id: id,
        text,
        user_id: user.id,
      });

      if (insertError) {
        alert("Failed to comment: " + insertError.message);
        return;
      }

      // Refresh comments (safer than relying on return payload)
      await fetchComments();

      // Clear input
      e.target.reset();
    } catch (err) {
      console.error("addComment error:", err);
      alert("Failed to comment: " + (err.message || err));
    }
  }

  // Report
  async function handleReport(reason) {
    setReporting(false);
    try {
      await supabase.from("reports").insert({ deal_id: id, reason });
      alert("Thanks for reporting!");
    } catch (err) {
      console.error("Report error:", err);
      alert("Could not submit report.");
    }
  }

  if (loading) return <p className="text-center py-6">Loading...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!deal) return <p className="text-center">Deal not found</p>;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6">
      {/* Image & Title */}
      <div className="flex gap-4">
        <img src={deal.image || "/placeholder.png"} alt={deal.title} className="w-40 h-40 object-cover rounded-lg" />
        <div className="flex-1">
          <h1 className="text-xl font-bold">{deal.title}</h1>
          <div className="mt-2">
            <div className="text-sm font-bold text-gray-900">₹{deal.price}</div>
            {deal.old_price && <div className="text-xs text-gray-500 line-through">₹{deal.old_price}</div>}
          </div>
          <a href={deal.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block px-4 py-2 bg-yellow-800 text-white rounded-lg hover:bg-yellow-900">
            Shop Now
          </a>
        </div>
      </div>

      {/* Description */}
      {deal.description && (
        <div className="mt-4">
          <h2 className="font-semibold text-lg">Description</h2>
          <p className="text-gray-700 mt-1">{deal.description}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-4">
        <button onClick={handleLike} disabled={liked} className={`px-3 py-1 rounded-lg flex items-center gap-1 ${liked ? "bg-green-300" : "bg-green-100 hover:bg-green-200"}`}>
          👍 {liked ? "Liked" : "Like"} ({likeCount})
        </button>

        <button onClick={() => setReporting(true)} className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg">
          🚩 Report
        </button>
      </div>

      {/* Report popup */}
      {reporting && (
        <div className="mt-3 border p-3 rounded-lg bg-gray-50">
          <p className="font-medium mb-2">Why do you want to report?</p>
          <div className="flex gap-2 flex-wrap">
            {["Spam", "Incorrect Info", "Repost"].map((r) => (
              <button key={r} onClick={() => handleReport(r)} className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-200">
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="mt-6">
        <h2 className="font-semibold text-lg mb-2">Comments</h2>

        <form onSubmit={addComment} className="flex gap-2 mb-4">
          <input type="text" name="comment" placeholder="Write a comment..." className="flex-1 border px-3 py-2 rounded-lg" />
          <button type="submit" className="px-4 py-2 bg-yellow-800 text-white rounded-lg">
            Post
          </button>
        </form>

        {comments.length === 0 ? (
          <p className="text-gray-500">No comments yet.</p>
        ) : (
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-2 border-b pb-2">
                {/* Avatar + Popup */}
                <div className="relative group">
                  {c.profiles?.avatar_url ? (
                    <img src={c.profiles.avatar_url} alt={c.profiles.username || "Anonymous"} className="w-8 h-8 rounded-full cursor-pointer object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold cursor-pointer">
                      {(c.profiles?.username?.[0] || "A").toUpperCase()}
                    </div>
                  )}

                  <div className="absolute hidden group-hover:flex flex-col gap-2 top-10 left-0 bg-white shadow-xl rounded-xl p-4 w-64 z-10 border">
                    <div className="flex items-center gap-3">
                      {c.profiles?.avatar_url ? (
                        <img src={c.profiles.avatar_url} alt={c.profiles.username || "Anonymous"} className="w-12 h-12 rounded-full border object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold">{(c.profiles?.username?.[0] || "A").toUpperCase()}</div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{c.profiles?.username || "Anonymous"}</p>
                        <span className="text-xs bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full">⭐ Badge</span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <p>Posts: {c.posts_count || 0}</p>
                      <p>Coins: {c.profiles?.coins || 0}</p>
                      <p>Leaderboard Rank: Coming soon</p>
                    </div>
                  </div>
                </div>

                {/* Comment text */}
                <div>
                  <p className="text-gray-800">{c.text}</p>
                  <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
