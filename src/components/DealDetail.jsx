// src/components/DealDetail.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ArrowLeft, Share2, Heart, ShoppingCart, ExternalLink } from "lucide-react";

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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
      .eq("user_id", currentUserId);

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

  // ---------- Share ----------
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: deal.title,
          text: `Check out this deal: ${deal.title}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  useEffect(() => {
    if (id) {
      fetchDeal();
      fetchComments();
      fetchLikes();
    }
  }, [id, currentUserId]);

  if (!deal) return <p className="text-center py-6">Loading deal…</p>;

  // Calculate discount percentage
  const discountPercent = deal.old_price
    ? Math.round(((deal.old_price - deal.price) / deal.old_price) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <button
            onClick={handleShare}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <Share2 className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-4">
        {/* Product Image Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
          <div className="relative w-full" style={{ paddingBottom: "75%" }}>
            <img
              src={deal.image}
              alt={deal.title}
              className="absolute inset-0 w-full h-full object-contain bg-gray-50 p-4"
            />
            {discountPercent > 0 && (
              <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg">
                {discountPercent}% OFF
              </div>
            )}
          </div>
        </div>

        {/* Product Details Card */}
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
          <h1 className="text-xl font-bold text-gray-900 leading-tight mb-3">
            {deal.title}
          </h1>

          {/* Price Section */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-green-600">
              ₹{deal.price?.toLocaleString()}
            </span>
            {deal.old_price && deal.old_price > deal.price && (
              <>
                <span className="text-lg text-gray-400 line-through">
                  ₹{deal.old_price?.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                  Save ₹{(deal.old_price - deal.price)?.toLocaleString()}
                </span>
              </>
            )}
          </div>

          {/* Description */}
          {deal.description && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">About this deal</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {deal.description}
              </p>
            </div>
          )}

          {/* Category & Store */}
          <div className="flex flex-wrap gap-2 mb-4">
            {deal.category && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                {deal.category}
              </span>
            )}
            {deal.store && (
              <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                🏪 {deal.store}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleToggleLike}
              className={`flex-1 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                userLiked
                  ? "bg-red-50 text-red-600 border-2 border-red-200"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Heart
                className={`h-5 w-5 ${userLiked ? "fill-current" : ""}`}
              />
              {userLiked ? "Liked" : "Like"} ({likesCount})
            </button>

            <a
              href={deal.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-xl font-bold hover:from-yellow-700 hover:to-yellow-800 transition flex items-center justify-center gap-2 shadow-lg"
            >
              <ShoppingCart className="h-5 w-5" />
              Shop Now
            </a>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            💬 Comments
            <span className="text-sm font-normal text-gray-500">
              ({comments.length})
            </span>
          </h2>

          {/* Add comment box */}
          <form onSubmit={handleAddComment} className="flex gap-2 mb-6">
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="Write a comment..."
            />
            <button
              type="submit"
              className="px-6 py-3 bg-yellow-800 text-white rounded-xl font-semibold hover:bg-yellow-900 transition"
            >
              Post
            </button>
          </form>

          {comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No comments yet.</p>
              <p className="text-sm text-gray-400 mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="relative flex gap-3 items-start pb-4 border-b border-gray-100 last:border-0"
                >
                  {/* Avatar with popup */}
                  <div className="relative group">
                    {c.profiles?.avatar_url ? (
                      <img
                        src={c.profiles.avatar_url}
                        alt={c.profiles?.username}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-yellow-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold ring-2 ring-yellow-200">
                        {(c.profiles?.username?.[0] || "A").toUpperCase()}
                      </div>
                    )}

                    {/* Hover popup */}
                    <div className="absolute hidden group-hover:flex flex-col gap-2 top-12 left-0 bg-white shadow-2xl rounded-2xl p-4 w-64 z-10 border-2 border-yellow-100">
                      <div className="flex items-center gap-3">
                        {c.profiles?.avatar_url ? (
                          <img
                            src={c.profiles.avatar_url}
                            alt={c.profiles?.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-lg">
                            {(c.profiles?.username?.[0] || "A").toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {c.profiles?.username || "Anonymous"}
                          </p>
                          <span className="text-xs bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full">
                            ⭐ Member
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-gray-600 space-y-1 bg-gray-50 rounded-lg p-3">
                        <p className="flex justify-between">
                          <span>Posts:</span>
                          <span className="font-semibold">{c.profiles?.posts_count ?? 0}</span>
                        </p>
                        <p className="flex justify-between">
                          <span>Coins:</span>
                          <span className="font-semibold text-yellow-600">
                            {c.profiles?.coins ?? 0}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Comment content */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {c.profiles?.username || "Anonymous"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(c.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      {/* ⋮ Menu visible only to comment owner */}
                      {c.user_id === currentUserId && (
                        <div className="relative">
                          <button
                            className="text-gray-400 hover:text-gray-700 p-1"
                            onClick={(e) => {
                              const menu = e.currentTarget.nextSibling;
                              menu.classList.toggle("hidden");
                            }}
                          >
                            ⋮
                          </button>

                          <div className="hidden absolute right-0 top-6 bg-white shadow-lg rounded-lg w-28 border z-10">
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-700 mt-2 leading-relaxed">{c.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
            }
