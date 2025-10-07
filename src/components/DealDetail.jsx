// src/components/DealDetail.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function DealDetail() {
  const { id } = useParams();
  const mountedRef = useRef(true);

  const [deal, setDeal] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [likesCount, setLikesCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Fetch current user once
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);
  // ✅ Real-time coin updates for current user
  useEffect(() => {
    if (!currentUserId) return;

    const coinSubscription = supabase
      .channel("profile-coins-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${currentUserId}` },
        (payload) => {
          console.log("💰 Coins updated:", payload.new.coins);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(coinSubscription);
    };
  }, [currentUserId]);

  const normalizeComment = (c) => ({
    id: c.id,
    text: c.text ?? "",
    created_at: c.created_at,
    user_id: c.user_id,
    profiles: c.profiles ?? null,
    posts_count: c.posts_count ?? null,
  });

  // ---------- Fetch deal ----------
  async function fetchDeal() {
    const { data } = await supabase.from("deals").select("*").eq("id", id).single();
    setDeal(data);
  }

  // ---------- Fetch comments ----------
  async function fetchComments() {
    const { data } = await supabase
      .from("comments")
      .select(`
        id,
        text,
        created_at,
        user_id,
        profiles ( user_id, username, avatar_url, coins, posts_count )
      `)
      .eq("deal_id", id)
      .order("created_at", { ascending: true });

    setComments((data || []).map((c) => normalizeComment(c)));
  }

  // ---------- Add comment ----------
  async function handleAddComment(e) {
    e?.preventDefault?.();
    const text = commentDraft.trim();
    if (!text) return;

    if (!currentUserId) return alert("Please log in to comment!");

    const { data, error } = await supabase
      .from("comments")
      .insert({
        deal_id: id,
        text,
        user_id: currentUserId,
      })
      .select(
        `
        id,
        text,
        created_at,
        user_id,
        profiles ( user_id, username, avatar_url, coins, posts_count )
      `
      )
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, normalizeComment(data)]);
      setCommentDraft("");
    }
  }

  // ---------- Delete comment ----------
  async function handleDeleteComment(commentId) {
    if (!window.confirm("Delete this comment?")) return;
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", currentUserId); // protection

    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  // ---------- Likes ----------
  async function fetchLikes() {
    const { data } = await supabase.from("likes").select("user_id").eq("deal_id", id);
    setLikesCount(data.length);
    if (currentUserId) {
      setUserLiked(data.some((r) => r.user_id === currentUserId));
    }
  }

  async function handleToggleLike() {
    if (!currentUserId) return alert("Please log in to like.");

    if (userLiked) {
      await supabase.from("likes").delete().eq("deal_id", id).eq("user_id", currentUserId);
    } else {
      await supabase.from("likes").insert({ deal_id: id, user_id: currentUserId });
    }
    fetchLikes();
  }

  useEffect(() => {
    if (id) {
      fetchDeal();
      fetchComments();
      fetchLikes();
    }
  }, [id, currentUserId]);

  if (!deal) return <p className="text-center py-6">Loading deal…</p>;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6 mt-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-48">
          <img
            src={deal.image}
            alt={deal.title}
            className="w-full h-48 object-cover rounded-lg"
          />
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">{deal.title}</h1>
          <p className="text-gray-600 mt-2">{deal.description}</p>

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleToggleLike}
              className={`px-3 py-1 rounded-lg ${
                userLiked ? "bg-green-300" : "bg-green-100 hover:bg-green-200"
              }`}
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

      {/* COMMENTS */}
      <div className="mt-6">
        <h2 className="font-semibold mb-3">Comments</h2>

        {/* Add comment box */}
        <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
          <input
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="Write a comment..."
          />
          <button type="submit" className="px-4 py-2 bg-yellow-800 text-white rounded-lg">
            Post
          </button>
        </form>

        {comments.length === 0 ? (
          <p className="text-gray-500">No comments yet.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="relative flex gap-3 items-start border-b pb-3">
                {/* Avatar with popup */}
                <div className="relative group">
                  {c.profiles?.avatar_url ? (
                    <img
                      src={c.profiles.avatar_url}
                      alt={c.profiles?.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold">
                      {(c.profiles?.username?.[0] || "A").toUpperCase()}
                    </div>
                  )}

                  {/* Hover popup */}
                  <div className="absolute hidden group-hover:flex flex-col gap-2 top-12 left-0 bg-white shadow-xl rounded-xl p-4 w-64 z-10 border">
                    <div className="flex items-center gap-3">
                      {c.profiles?.avatar_url ? (
                        <img
                          src={c.profiles.avatar_url}
                          alt={c.profiles?.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold text-lg">
                          {(c.profiles?.username?.[0] || "A").toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{c.profiles?.username || "Anonymous"}</p>
                        <span className="text-xs bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full">
                          ⭐ Badge
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <p>Posts: {c.profiles?.posts_count ?? 0}</p>
                      <p>Coins: {c.profiles?.coins ?? 0}</p>
                      <p>Leaderboard Rank: Coming soon</p>
                    </div>
                  </div>
                </div>

                {/* Comment content */}
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="font-semibold text-gray-900">
                      {c.profiles?.username || "Anonymous"}
                    </p>

                    {/* ⋮ Menu visible only to comment owner */}
                    {c.user_id === currentUserId && (
                      <div className="relative">
                        <button
                          className="text-gray-400 hover:text-gray-700"
                          onClick={(e) => {
                            const menu = e.currentTarget.nextSibling;
                            menu.classList.toggle("hidden");
                          }}
                        >
                          ⋮
                        </button>

                        <div className="hidden absolute right-0 top-6 bg-white shadow-md rounded-lg w-24 border z-10">
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="block w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-gray-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-800 mt-1">{c.text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
