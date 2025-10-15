// src/components/ForumPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { MessageSquare, Heart, Plus, Star, TrendingUp, MoreVertical, Trash2 } from "lucide-react";
import NewThreadModal from "./NewThreadModal";
import { useNavigate } from "react-router-dom";

export default function ForumPage() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchThreads();
    getCurrentUser();
  }, []);

  async function getCurrentUser() {
    const { data } = await supabase.auth.getUser();
    setCurrentUserId(data?.user?.id || null);
  }

  async function fetchThreads() {
    setLoading(true);
    const { data, error } = await supabase
      .from("forum_threads_with_likes")
      .select("*, profiles(username, avatar_url)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching threads:", error);
    } else {
      setThreads(data);
    }
    setLoading(false);
  }

  async function handleLike(threadId) {
    if (!currentUserId) return alert("Please log in to like threads.");

    const { data: existing } = await supabase
      .from("forum_likes")
      .select("*")
      .eq("thread_id", threadId)
      .eq("liked_by", currentUserId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("forum_likes")
        .delete()
        .eq("thread_id", threadId)
        .eq("liked_by", currentUserId);
      
      if (error) console.error("Error unliking:", error);
    } else {
      const { error } = await supabase
        .from("forum_likes")
        .insert({ thread_id: threadId, liked_by: currentUserId });
      
      if (error) console.error("Error liking:", error);
    }
    fetchThreads();
  }

  async function handleDeleteThread(threadId, postedBy) {
    if (currentUserId !== postedBy) {
      alert("You can only delete your own threads!");
      return;
    }

    if (!confirm("Are you sure you want to delete this thread? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase
      .from("forum_threads")
      .delete()
      .eq("id", threadId);

    if (error) {
      console.error("Error deleting thread:", error);
      alert("Failed to delete thread. Please try again.");
    } else {
      fetchThreads();
      setOpenMenuId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(251,191,36,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,.05)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-amber-200/40 to-orange-300/40 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-200/40 to-amber-300/40 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Header Section */}
        <div className="mb-6 md:mb-8 backdrop-blur-xl bg-white/60 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-amber-200/50 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl sm:rounded-2xl blur-lg opacity-60 animate-pulse"></div>
                <div className="relative p-2.5 sm:p-3 md:p-4 bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 rounded-xl sm:rounded-2xl shadow-lg">
                  <Star className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-amber-800 via-orange-700 to-amber-900 bg-clip-text text-transparent">
                  Community Forum
                </h1>
                <p className="text-xs sm:text-sm text-amber-700/80 mt-1 hidden sm:block">
                  Share ideas, connect, and grow together
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto relative group flex-shrink-0"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl sm:rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 shadow-lg hover:shadow-xl transition-all duration-300">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                <span className="text-white font-bold text-sm sm:text-base md:text-lg">Create Thread</span>
              </div>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <div className="backdrop-blur-sm bg-white/50 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 md:p-4 border border-amber-200/50 hover:bg-white/70 transition-all duration-300 group">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-700" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-amber-900">{threads.length}</div>
                  <div className="text-[10px] sm:text-xs text-amber-700 uppercase tracking-wider font-semibold">Threads</div>
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-sm bg-white/50 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 md:p-4 border border-amber-200/50 hover:bg-white/70 transition-all duration-300 group">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-orange-700" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-amber-900">
                    {threads.reduce((acc, t) => acc + (t.comment_count || 0), 0)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-amber-700 uppercase tracking-wider font-semibold">Comments</div>
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-sm bg-white/50 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 md:p-4 border border-amber-200/50 hover:bg-white/70 transition-all duration-300 group">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-red-100 to-pink-200 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-600" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-amber-900">
                    {threads.reduce((acc, t) => acc + (t.likes_count || 0), 0)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-amber-700 uppercase tracking-wider font-semibold">Likes</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Threads List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 md:py-32">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
              <Star className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-amber-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-amber-700 mt-4 sm:mt-6 font-semibold text-sm sm:text-base md:text-lg">Loading threads...</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/60 rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 text-center border border-amber-200/50 shadow-xl">
            <div className="relative inline-block mb-4 sm:mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full blur-xl sm:blur-2xl opacity-50"></div>
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                <MessageSquare className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 text-white" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-amber-900 mb-2 sm:mb-4">No Threads Yet</h3>
            <p className="text-amber-700 mb-6 sm:mb-8 text-sm sm:text-base md:text-lg">Be the first to start a conversation!</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 sm:px-8 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl sm:rounded-2xl text-white font-bold text-sm sm:text-base md:text-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Create First Thread
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {threads.map((t, idx) => (
              <div
                key={t.id}
                className="group relative backdrop-blur-xl bg-white/70 rounded-2xl sm:rounded-3xl border border-amber-200/50 overflow-hidden cursor-pointer hover:border-amber-400/70 hover:bg-white/80 transition-all duration-500 shadow-lg hover:shadow-2xl"
                onClick={() => navigate(`/thread/${t.id}`)}
                style={{
                  animation: `slideInUp 0.5s ease-out ${idx * 0.08}s both`
                }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-100/0 via-amber-100/30 to-orange-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative p-4 sm:p-5 md:p-6 lg:p-8">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        {t.profiles?.avatar_url ? (
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full blur-md opacity-60"></div>
                            <img
                              src={t.profiles.avatar_url}
                              alt={t.profiles.username}
                              className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-white shadow-lg"
                            />
                          </div>
                        ) : (
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full blur-md opacity-60"></div>
                            <div className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm sm:text-base md:text-lg font-black border-2 border-white shadow-lg">
                              {(t.profiles?.username?.[0] || "U").toUpperCase()}
                            </div>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-amber-900 font-bold text-sm sm:text-base truncate">{t.profiles?.username || "Anonymous"}</div>
                          <div className="text-xs sm:text-sm text-amber-600">
                            {new Date(t.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </div>
                        </div>
                      </div>
                      
                      <h2 className="font-black text-lg sm:text-xl md:text-2xl text-amber-900 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-amber-700 group-hover:to-orange-700 group-hover:bg-clip-text transition-all duration-300 mb-2 sm:mb-3 leading-tight line-clamp-2">
                        {t.title}
                      </h2>
                      <p className="text-amber-800 text-sm sm:text-base leading-relaxed line-clamp-2">
                        {t.content}
                      </p>
                    </div>

                    {/* Three-dot menu for author */}
                    {currentUserId === t.posted_by && (
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === t.id ? null : t.id);
                          }}
                          className="p-2 hover:bg-amber-100 rounded-lg transition-colors duration-200"
                        >
                          <MoreVertical className="w-5 h-5 text-amber-700" />
                        </button>
                        
                        {openMenuId === t.id && (
                          <div className="absolute right-0 top-full mt-2 z-10 bg-white rounded-xl shadow-xl border border-amber-200 overflow-hidden min-w-[150px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteThread(t.id, t.posted_by);
                              }}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors duration-200 text-red-600 font-semibold"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 sm:pt-4 md:pt-6 border-t border-amber-200/50 gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(t.id);
                        }}
                        className="group/btn flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/50 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 border border-amber-200/50 hover:border-red-300/50 transition-all duration-300 shadow-sm hover:shadow-md"
                      >
                        <Heart
                          className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 group-hover/btn:scale-125 ${
                            t.likes_count > 0 ? "fill-red-500 text-red-500" : "text-amber-600"
                          }`}
                        />
                        <span className={`font-bold text-xs sm:text-sm ${t.likes_count > 0 ? 'text-red-600' : 'text-amber-700'}`}>
                          {t.likes_count}
                        </span>
                      </button>
                      
                      <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/50 border border-amber-200/50 shadow-sm">
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                        <span className="font-bold text-amber-700 text-xs sm:text-sm">{t.comment_count || 0}</span>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300/50 text-[10px] sm:text-xs text-amber-800 font-bold uppercase tracking-wider text-center shadow-sm">
                      View Discussion →
                    </div>
                  </div>
                </div>

                {/* Bottom accent line */}
                <div className="h-1 sm:h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <NewThreadModal onClose={() => setShowModal(false)} onPost={fetchThreads} />}

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
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
