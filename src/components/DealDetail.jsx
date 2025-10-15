// src/components/DealDetail.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ArrowLeft, Share2, Heart, ShoppingCart } from "lucide-react";

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  const [deal, setDeal] = useState(null);
  const [comments, setComments] = useState([]);
  const [replies, setReplies] = useState({});
  const [commentDraft, setCommentDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
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

  // ✅ Real-time coin updates for current user (fixed to use user_id)
  useEffect(() => {
    if (!currentUserId) return;

    const coinSubscription = supabase
      .channel("profile-coins-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          // You can use this to update local profile display if needed
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

  // ---------- Fetch replies ----------
  async function fetchReplies() {
    const { data, error } = await supabase
      .from("comment_replies")
      .select(`
        id,
        comment_id,
        text,
        created_at,
        user_id,
        profiles ( username, avatar_url, coins, posts_count )
      `)
      .order("created_at", { ascending: true });

    if (!error && data) {
      // group replies by comment_id
      const grouped = data.reduce((acc, r) => {
        if (!acc[r.comment_id]) acc[r.comment_id] = [];
        acc[r.comment_id].push(r);
        return acc;
      }, {});
      setReplies(grouped);
    }
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
    } else if (error) {
      console.error("Add comment error:", error);
      alert("Could not post comment: " + (error.message || "unknown"));
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

  // ---------- Add reply ----------
  async function handleAddReply(commentId) {
    const text = (replyDrafts[commentId] || "").trim();
    if (!text) return alert("Please write something");
    if (!currentUserId) return alert("Please log in to reply");

    const { data, error } = await supabase
      .from("comment_replies")
      .insert({
        comment_id: commentId,
        user_id: currentUserId,
        text,
      })
      .select("*, profiles ( username, avatar_url, coins, posts_count )")
      .single();

    if (!error && data) {
      setReplies((prev) => ({
        ...prev,
        [commentId]: [...(prev[commentId] || []), data],
      }));
      setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
    } else if (error) {
      console.error("Add reply error:", error);
      alert("Could not post reply: " + (error.message || "unknown"));
    }
  }

  // ---------- Delete reply ----------
  async function handleDeleteReply(replyId, commentId) {
    if (!window.confirm("Delete this reply?")) return;
    const { error } = await supabase.from("comment_replies").delete().eq("id", replyId);
    if (!error) {
      setReplies((prev) => ({
        ...prev,
        [commentId]: (prev[commentId] || []).filter((r) => r.id !== replyId),
      }));
    }
  }

  // ---------- Likes ----------
  async function fetchLikes() {
    const { data } = await supabase.from("likes").select("user_id").eq("deal_id", id);
    const list = data || [];
    setLikesCount(list.length);
    if (currentUserId) {
      setUserLiked(list.some((r) => r.user_id === currentUserId));
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

  // ---------- Report deal ----------
  // Opens a prompt (simple) to collect reason and inserts a row into reports table
  async function handleReportDeal() {
    if (!currentUserId) {
      alert("Please log in to report a deal.");
      return;
    }

    // Ask user for reason (simple UI). You can replace with a modal later.
    const reason = window.prompt("Why are you reporting this deal? (Please be specific)");
    if (reason === null) return; // user cancelled
    const trimmed = (reason || "").trim();
    if (!trimmed) {
      return alert("Please provide a reason to report.");
    }

    try {
      const payload = {
        deal_id: id,
        comment_id: null,
        reported_by: currentUserId,
        reason: trimmed,
      };
      const { data, error } = await supabase.from("reports").insert([payload]).select().single();
      if (error) {
        console.error("Report insert error:", error);
        alert("Could not submit report: " + (error.message || "unknown"));
      } else {
        alert("Report submitted. Moderators will review it shortly.");
        // optionally you can push a realtime notification or update UI — dashboards will pick this up
      }
    } catch (e) {
      console.error("Report error:", e);
      alert("Could not submit report: " + e.message);
    }
  }

  // ---------- Share ----------
  const handleShare = async () => {
    if (!deal) return;
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

  // ---------- Init ----------
  useEffect(() => {
    mountedRef.current = true;
    if (id) {
      fetchDeal();
      fetchComments();
      fetchReplies();
      fetchLikes();
    }
    return () => {
      mountedRef.current = false;
    };
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <div className="text-sm font-medium text-gray-800">{deal.title?.slice(0, 60)}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 hover:bg-gray-100 rounded-full transition"
              title="Share"
            >
              <Share2 className="h-5 w-5 text-gray-700" />
            </button>

            {/* Report (three-dots) - placed next to share */}
            <div className="relative">
              <button
                onClick={(e) => {
                  // show a small simple menu with Report option
                  const menu = e.currentTarget.nextSibling;
                  if (menu) menu.classList.toggle("hidden");
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition text-gray-700"
                title="More"
              >
                ⋮
              </button>
              <div className="hidden absolute right-0 mt-2 w-44 bg-white shadow-lg rounded-lg border z-50">
                <button
                  onClick={() => {
                    // hide menu by toggling parent; then handle report
                    handleReportDeal();
                    // ensure menu hidden (in case)
                    const menus = document.querySelectorAll(".report-menu-toggle");
                    menus.forEach((m) => m.classList?.add("hidden"));
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  🚩 Report deal
                </button>
                <div className="report-menu-toggle hidden" />
              </div>
            </div>
          </div>
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
              <p className="text-gray-600 text-sm leading-relaxed">{deal.description}</p>
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
              <Heart className={`h-5 w-5 ${userLiked ? "fill-current" : ""}`} />
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
            <span className="text-sm font-normal text-gray-500">({comments.length})</span>
          </h2>

          {/* Add comment box */}
          <form onSubmit={handleAddComment} className="flex gap-2 mb-6">
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="Write a comment..."
            />
            <button type="submit" className="px-6 py-3 bg-yellow-800 text-white rounded-xl font-semibold hover:bg-yellow-900 transition">
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
                <li key={c.id} className="relative flex gap-3 items-start pb-4 border-b border-gray-100 last:border-0">
                  {/* Avatar with popup */}
                  <div className="relative group">
                    {c.profiles?.avatar_url ? (
                      <img src={c.profiles.avatar_url} alt={c.profiles?.username} className="w-10 h-10 rounded-full object-cover ring-2 ring-yellow-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold ring-2 ring-yellow-200">
                        {(c.profiles?.username?.[0] || "A").toUpperCase()}
                      </div>
                    )}

                    {/* Hover popup */}
                    <div className="absolute hidden group-hover:flex flex-col gap-2 top-12 left-0 bg-white shadow-2xl rounded-2xl p-4 w-64 z-10 border-2 border-yellow-100">
                      <div className="flex items-center gap-3">
                        {c.profiles?.avatar_url ? (
                          <img src={c.profiles.avatar_url} alt={c.profiles?.username} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-lg">
                            {(c.profiles?.username?.[0] || "A").toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{c.profiles?.username || "Anonymous"}</p>
                          <span className="text-xs bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full">⭐ Member</span>
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-gray-600 space-y-1 bg-gray-50 rounded-lg p-3">
                        <p className="flex justify-between"><span>Posts:</span><span className="font-semibold">{c.profiles?.posts_count ?? 0}</span></p>
                        <p className="flex justify-between"><span>Coins:</span><span className="font-semibold text-yellow-600">{c.profiles?.coins ?? 0}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Comment content */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{c.profiles?.username || "Anonymous"}</p>
                        <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>

                      {/* ⋮ Menu visible only to comment owner */}
                      {c.user_id === currentUserId && (
                        <div className="relative">
                          <button className="text-gray-400 hover:text-gray-700 p-1" onClick={(e) => { const menu = e.currentTarget.nextSibling; menu.classList.toggle("hidden"); }}>
                            ⋮
                          </button>

                          <div className="hidden absolute right-0 top-6 bg-white shadow-lg rounded-lg w-28 border z-10">
                            <button onClick={() => handleDeleteComment(c.id)} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">🗑️ Delete</button>
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-700 mt-2 leading-relaxed">{c.text}</p>

                       {/* Reply button */}
                    <button className="text-xs text-yellow-700 mt-2 hover:text-yellow-800 font-medium" onClick={() => setReplyDrafts((prev) => ({ ...prev, [c.id]: prev[c.id] === undefined ? "" : undefined }))}>💬 Reply</button>

                    {/* Reply input box */}
                    {replyDrafts[c.id] !== undefined && (
                      <div className="mt-3 flex gap-2">
                        <input value={replyDrafts[c.id] || ""} onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Write a reply..." />
                        <button onClick={() => handleAddReply(c.id)} className="px-4 py-2 bg-yellow-700 text-white rounded-lg text-sm font-semibold hover:bg-yellow-800">Post</button>
                      </div>
                    )}

                    {/* Replies */}
                    {replies[c.id]?.length > 0 && (
                      <div className="mt-4 ml-8 space-y-3">
                        {replies[c.id].map((r) => (
                          <div key={r.id} className="bg-gray-50 p-3 rounded-lg flex gap-3 items-start">
                            {/* Reply avatar */}
                            <div className="relative group">
                              {r.profiles?.avatar_url ? (
                                <img src={r.profiles.avatar_url} alt={r.profiles?.username} className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">{(r.profiles?.username?.[0] || "A").toUpperCase()}</div>
                              )}

                              {/* Hover popup for replies */}
                              <div className="absolute hidden group-hover:flex flex-col gap-2 top-10 left-0 bg-white shadow-2xl rounded-2xl p-4 w-64 z-10 border-2 border-blue-100">
                                <div className="flex items-center gap-3">
                                  {r.profiles?.avatar_url ? (
                                    <img src={r.profiles.avatar_url} alt={r.profiles?.username} className="w-12 h-12 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">{(r.profiles?.username?.[0] || "A").toUpperCase()}</div>
                                  )}
                                  <div>
                                    <p className="font-semibold text-gray-900">{r.profiles?.username || "Anonymous"}</p>
                                    <span className="text-xs bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">⭐ Member</span>
                                  </div>
                                </div>

                                <div className="mt-2 text-sm text-gray-600 space-y-1 bg-gray-50 rounded-lg p-3">
                                  <p className="flex justify-between"><span>Posts:</span><span className="font-semibold">{r.profiles?.posts_count ?? 0}</span></p>
                                  <p className="flex justify-between"><span>Coins:</span><span className="font-semibold text-yellow-600">{r.profiles?.coins ?? 0}</span></p>
                                </div>
                              </div>
                            </div>

                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{r.profiles?.username || "Anonymous"}</p>
                                  <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                                </div>

                                {r.user_id === currentUserId && (
                                  <button onClick={() => handleDeleteReply(r.id, c.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 mt-1">{r.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
