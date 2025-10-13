// src/components/ThreadDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ArrowLeft, Heart, Send, MessageSquare } from "lucide-react";

export default function ThreadDetail() {
  const { id } = useParams();
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchThread();
    fetchReplies();
    getCurrentUser();
  }, [id]);

  async function getCurrentUser() {
    const { data } = await supabase.auth.getUser();
    setCurrentUserId(data?.user?.id || null);
  }

  async function fetchThread() {
    const { data, error } = await supabase
      .from("forum_threads_with_likes")
      .select("*, profiles(username, avatar_url)")
      .eq("id", id)
      .single();
    
    if (error) {
      console.error("Error fetching thread:", error);
    } else {
      setThread(data);
    }
  }

  async function fetchReplies() {
    const { data, error } = await supabase
      .from("forum_replies")
      .select("*, profiles(username, avatar_url)")
      .eq("thread_id", id)
      .order("created_at", { ascending: true });
    
    if (error) {
      console.error("Error fetching replies:", error);
    } else {
      setReplies(data || []);
    }
  }

  async function handleAddReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (!currentUserId) return alert("Please log in to reply.");

    const { error } = await supabase.from("forum_replies").insert({
      thread_id: id,
      reply_by: currentUserId,
      content: replyText.trim(),
    });

    if (error) {
      console.error("Error adding reply:", error);
      alert("Failed to add reply. Please try again.");
    } else {
      setReplyText("");
      fetchReplies();
    }
  }

  async function handleLike() {
    if (!currentUserId) return alert("Please log in to like.");
    
    const { data: existing } = await supabase
      .from("forum_likes")
      .select("*")
      .eq("thread_id", id)
      .eq("liked_by", currentUserId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("forum_likes")
        .delete()
        .eq("thread_id", id)
        .eq("liked_by", currentUserId);
      
      if (error) console.error("Error unliking:", error);
    } else {
      const { error } = await supabase
        .from("forum_likes")
        .insert({ thread_id: id, liked_by: currentUserId });
      
      if (error) console.error("Error liking:", error);
    }
    fetchThread();
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-amber-700 mt-4 font-semibold">Loading thread...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(251,191,36,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,.05)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-amber-200/40 to-orange-300/40 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-200/40 to-amber-300/40 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="group mb-4 sm:mb-6 flex items-center gap-2 px-4 py-2 backdrop-blur-xl bg-white/60 rounded-xl sm:rounded-2xl border border-amber-200/50 text-amber-800 hover:bg-white/80 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold text-sm sm:text-base">Back</span>
        </button>

        {/* Main Thread Card */}
        <div className="backdrop-blur-xl bg-white/70 rounded-2xl sm:rounded-3xl border border-amber-200/50 shadow-2xl overflow-hidden mb-4 sm:mb-6">
          <div className="p-4 sm:p-6 md:p-8">
            {/* Author Info */}
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              {thread.profiles?.avatar_url ? (
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full blur-md opacity-60"></div>
                  <img
                    src={thread.profiles.avatar_url}
                    alt={thread.profiles.username}
                    className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full object-cover border-2 sm:border-3 border-white shadow-xl"
                  />
                </div>
              ) : (
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full blur-md opacity-60"></div>
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-lg sm:text-xl md:text-2xl font-black border-2 sm:border-3 border-white shadow-xl">
                    {(thread.profiles?.username?.[0] || "U").toUpperCase()}
                  </div>
                </div>
              )}
              <div>
                <div className="text-base sm:text-lg md:text-xl font-bold text-amber-900">{thread.profiles?.username || "Anonymous"}</div>
                <div className="text-xs sm:text-sm text-amber-600">
                  {new Date(thread.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
              </div>
            </div>

            {/* Thread Content */}
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-amber-900 mb-3 sm:mb-4 md:mb-6 leading-tight">
              {thread.title}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-amber-800 leading-relaxed whitespace-pre-wrap mb-4 sm:mb-6">
              {thread.content}
            </p>

            {/* Like Button */}
            <button
              onClick={handleLike}
              className="group/btn flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-white/50 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 border border-amber-200/50 hover:border-red-300/50 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Heart
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 group-hover/btn:scale-125 ${
                  thread.likes_count > 0 ? "fill-red-500 text-red-500" : "text-amber-600"
                }`}
              />
              <span className={`font-bold text-sm sm:text-base ${thread.likes_count > 0 ? 'text-red-600' : 'text-amber-700'}`}>
                {thread.likes_count} {thread.likes_count === 1 ? 'Like' : 'Likes'}
              </span>
            </button>
          </div>
          
          {/* Bottom accent line */}
          <div className="h-1 sm:h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400"></div>
        </div>

        {/* Replies Section */}
        <div className="backdrop-blur-xl bg-white/70 rounded-2xl sm:rounded-3xl border border-amber-200/50 shadow-2xl overflow-hidden">
          <div className="p-4 sm:p-6 md:p-8">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700" />
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-amber-900">
                  Replies ({replies.length})
                </h2>
              </div>
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleAddReply} className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 border-2 border-amber-200/50 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 md:py-4 text-sm sm:text-base bg-white/50 backdrop-blur-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-200/50 outline-none transition-all duration-300 placeholder-amber-400"
                  placeholder="Write your reply..."
                />
                <button
                  type="submit"
                  className="group relative flex-shrink-0"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl sm:rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                  <div className="relative px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300">
                    <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    <span className="text-white font-bold text-sm sm:text-base">Reply</span>
                  </div>
                </button>
              </div>
            </form>

            {/* Replies List */}
            {replies.length === 0 ? (
              <div className="text-center py-8 sm:py-12 md:py-16">
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-amber-600" />
                </div>
                <p className="text-amber-700 font-semibold text-sm sm:text-base md:text-lg">No replies yet. Be the first to comment!</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {replies.map((r, idx) => (
                  <div
                    key={r.id}
                    className="group backdrop-blur-sm bg-white/50 rounded-xl sm:rounded-2xl border border-amber-200/50 p-3 sm:p-4 md:p-5 hover:bg-white/70 hover:border-amber-300/70 transition-all duration-300 shadow-md hover:shadow-lg"
                    style={{
                      animation: `fadeInUp 0.4s ease-out ${idx * 0.1}s both`
                    }}
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3 md:gap-4">
                      {r.profiles?.avatar_url ? (
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full blur-sm opacity-50"></div>
                          <img
                            src={r.profiles.avatar_url}
                            alt={r.profiles.username}
                            className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-white shadow-lg"
                          />
                        </div>
                      ) : (
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full blur-sm opacity-50"></div>
                          <div className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-xs sm:text-sm md:text-base font-black border-2 border-white shadow-lg">
                            {(r.profiles?.username?.[0] || "U").toUpperCase()}
                          </div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1.5 sm:mb-2">
                          <span className="font-bold text-sm sm:text-base text-amber-900 truncate">
                            {r.profiles?.username || "Anonymous"}
                          </span>
                          <span className="text-xs text-amber-600">
                            {new Date(r.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <p className="text-sm sm:text-base text-amber-800 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
