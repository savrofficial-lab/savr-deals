// src/components/ForumPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { MessageSquare, Heart, Plus, TrendingUp, Sparkles } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-100">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-amber-900 to-gray-900 bg-clip-text text-transparent">
                  Community Forum
                </h1>
                <p className="text-sm text-gray-600 mt-1">Share ideas, ask questions, connect with others</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="group relative bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Plus size={20} className="relative z-10" />
              <span className="relative z-10">New Thread</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-900">{threads.length}</span> Threads
                </span>
              </div>
              <div className="h-4 w-px bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-900">
                    {threads.reduce((acc, t) => acc + (t.comment_count || 0), 0)}
                  </span> Comments
                </span>
              </div>
              <div className="h-4 w-px bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-amber-600" />
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-900">
                    {threads.reduce((acc, t) => acc + (t.likes_count || 0), 0)}
                  </span> Likes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Threads List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-200 border-t-amber-600 rounded-full animate-spin"></div>
              <Sparkles className="w-6 h-6 text-amber-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-gray-500 mt-4 font-medium">Loading threads...</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-10 h-10 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No threads yet</h3>
            <p className="text-gray-600 mb-6">Be the first to start a conversation!</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
            >
              Create First Thread
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((t, idx) => (
              <div
                key={t.id}
                className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 hover:border-amber-200 transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => navigate(`/thread/${t.id}`)}
                style={{
                  animation: `fadeInUp 0.4s ease-out ${idx * 0.05}s both`
                }}
              >
                {/* Hover gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-50/0 via-amber-50/50 to-amber-50/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative p-6">
                  {/* Thread Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-xl text-gray-900 group-hover:text-amber-900 transition-colors duration-300 line-clamp-2">
                        {t.title}
                      </h2>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                        {new Date(t.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Thread Content */}
                  <p className="text-gray-600 leading-relaxed line-clamp-2 mb-4">
                    {t.content}
                  </p>

                  {/* Thread Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    {/* Interaction Stats */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(t.id);
                        }}
                        className="flex items-center gap-1.5 text-gray-600 hover:text-red-500 transition-colors duration-200 group/like"
                      >
                        <Heart
                          className={`h-5 w-5 transition-all duration-300 group-hover/like:scale-110 ${
                            t.likes_count > 0 ? "fill-red-500 text-red-500" : ""
                          }`}
                        />
                        <span className="font-semibold text-sm">{t.likes_count}</span>
                      </button>
                      
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <MessageSquare className="w-5 h-5" />
                        <span className="font-semibold text-sm">{t.comment_count || 0}</span>
                      </div>
                    </div>

                    {/* Author Info */}
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm text-gray-600 font-medium">
                        {t.profiles?.username || "Anonymous"}
                      </span>
                      {t.profiles?.avatar_url ? (
                        <img
                          src={t.profiles.avatar_url}
                          alt={t.profiles.username}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 text-white flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-white">
                          {(t.profiles?.username?.[0] || "U").toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom accent line */}
                <div className="h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <NewThreadModal onClose={() => setShowModal(false)} onPost={fetchThreads} />}

      <style>{`
        @keyframes fadeInUp {
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
