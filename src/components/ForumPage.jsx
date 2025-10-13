// src/components/ForumPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { MessageSquare, Heart, Plus, Zap, Star, Flame, Clock } from "lucide-react";
import NewThreadModal from "./NewThreadModal";
import { useNavigate } from "react-router-dom";

export default function ForumPage() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
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

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-orange-900/20"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/30 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-yellow-500/20 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '2s'}}></div>
        
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:100px_100px]"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8">
        {/* Glassmorphic Header */}
        <div className="mb-8 backdrop-blur-xl bg-white/5 rounded-3xl p-8 border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-orange-600 rounded-2xl blur-xl opacity-75 animate-pulse"></div>
                <div className="relative p-4 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 rounded-2xl">
                  <Flame className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-white via-purple-200 to-orange-200 bg-clip-text text-transparent mb-2">
                  Community Forum
                </h1>
                <p className="text-gray-400 text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Where ideas spark and conversations ignite
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowModal(true)}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-orange-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
              <div className="relative px-8 py-4 bg-gradient-to-r from-purple-600 to-orange-600 rounded-xl leading-none flex items-center gap-3">
                <Plus className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-lg">Create Thread</span>
              </div>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl group-hover:scale-110 transition-transform">
                  <Star className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <div className="text-3xl font-black text-white">{threads.length}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Active Threads</div>
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-xl group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <div className="text-3xl font-black text-white">
                    {threads.reduce((acc, t) => acc + (t.comment_count || 0), 0)}
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Total Comments</div>
                </div>
              </div>
            </div>
            
            <div className="backdrop-blur-sm bg-white/5 rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl group-hover:scale-110 transition-transform">
                  <Heart className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <div className="text-3xl font-black text-white">
                    {threads.reduce((acc, t) => acc + (t.likes_count || 0), 0)}
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Total Reactions</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Threads List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-24 h-24 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              <Zap className="w-10 h-10 text-yellow-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-gray-400 mt-6 font-semibold text-lg">Loading amazing content...</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/5 rounded-3xl p-16 text-center border border-white/10">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-orange-600 rounded-full blur-2xl opacity-50"></div>
              <div className="relative w-32 h-32 bg-gradient-to-br from-purple-600 to-orange-600 rounded-full flex items-center justify-center">
                <MessageSquare className="w-16 h-16 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-white mb-4">No Threads Yet</h3>
            <p className="text-gray-400 mb-8 text-lg">Be the pioneer and start the first conversation!</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-orange-600 rounded-xl text-white font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
            >
              Create First Thread
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {threads.map((t, idx) => (
              <div
                key={t.id}
                className="group relative backdrop-blur-xl bg-gradient-to-r from-white/5 to-white/10 rounded-3xl border border-white/10 overflow-hidden cursor-pointer hover:border-purple-500/50 transition-all duration-500"
                onClick={() => navigate(`/thread/${t.id}`)}
                style={{
                  animation: `slideInLeft 0.6s ease-out ${idx * 0.1}s both`
                }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/5 to-orange-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Animated border */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 animate-spin-slow" style={{padding: '1px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude'}}></div>
                </div>

                <div className="relative p-8">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {t.profiles?.avatar_url ? (
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-orange-600 rounded-full blur-md opacity-75"></div>
                            <img
                              src={t.profiles.avatar_url}
                              alt={t.profiles.username}
                              className="relative w-12 h-12 rounded-full object-cover border-2 border-white/20"
                            />
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-orange-600 rounded-full blur-md opacity-75"></div>
                            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-orange-600 flex items-center justify-center text-white text-lg font-black border-2 border-white/20">
                              {(t.profiles?.username?.[0] || "U").toUpperCase()}
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-white font-bold">{t.profiles?.username || "Anonymous"}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            {new Date(t.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </div>
                        </div>
                      </div>
                      
                      <h2 className="font-black text-2xl text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-orange-400 group-hover:bg-clip-text transition-all duration-300 mb-3 leading-tight">
                        {t.title}
                      </h2>
                      <p className="text-gray-300 leading-relaxed line-clamp-2">
                        {t.content}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-6 border-t border-white/10">
                    <div className="flex items-center gap-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(t.id);
                        }}
                        className="group/btn flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-pink-500/20 border border-white/10 hover:border-red-500/50 transition-all duration-300"
                      >
                        <Heart
                          className={`w-5 h-5 transition-all duration-300 group-hover/btn:scale-125 ${
                            t.likes_count > 0 ? "fill-red-500 text-red-500" : "text-gray-400"
                          }`}
                        />
                        <span className={`font-bold ${t.likes_count > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {t.likes_count}
                        </span>
                      </button>
                      
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <MessageSquare className="w-5 h-5 text-purple-400" />
                        <span className="font-bold text-purple-400">{t.comment_count || 0}</span>
                      </div>
                    </div>

                    <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/10 to-orange-500/10 border border-purple-500/20 text-xs text-purple-300 font-semibold uppercase tracking-wider">
                      View Discussion →
                    </div>
                  </div>
                </div>

                {/* Bottom glow */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <NewThreadModal onClose={() => setShowModal(false)} onPost={fetchThreads} />}

      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
