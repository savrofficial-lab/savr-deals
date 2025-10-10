// src/components/ForumPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { MessageSquare, Heart, Plus } from "lucide-react";
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

    // Check if already liked - FIXED: use liked_by instead of user_id
    const { data: existing } = await supabase
      .from("forum_likes")
      .select("*")
      .eq("thread_id", threadId)
      .eq("liked_by", currentUserId)
      .maybeSingle();

    if (existing) {
      // Unlike
      const { error } = await supabase
        .from("forum_likes")
        .delete()
        .eq("thread_id", threadId)
        .eq("liked_by", currentUserId);
      
      if (error) console.error("Error unliking:", error);
    } else {
      // Like - FIXED: use liked_by instead of user_id
      const { error } = await supabase
        .from("forum_likes")
        .insert({ thread_id: threadId, liked_by: currentUserId });
      
      if (error) console.error("Error liking:", error);
    }
    fetchThreads();
  }

  return (
    <div className="max-w-4xl mx-auto p-4 min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🧩 Community Forum</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-yellow-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold hover:bg-yellow-800 transition"
        >
          <Plus size={18} /> New Thread
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-10">Loading threads…</p>
      ) : threads.length === 0 ? (
        <p className="text-center text-gray-500 py-10">No threads yet. Start one!</p>
      ) : (
        <div className="space-y-4">
          {threads.map((t) => (
            <div
              key={t.id}
              className="bg-white p-5 rounded-2xl shadow hover:shadow-lg transition cursor-pointer"
              onClick={() => navigate(`/thread/${t.id}`)}
            >
              <div className="flex justify-between items-start">
                <h2 className="font-semibold text-lg text-gray-900">{t.title}</h2>
                <div className="text-xs text-gray-400">
                  {new Date(t.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>

              <p className="text-gray-600 mt-2 line-clamp-2">{t.content}</p>

              <div className="flex justify-between items-center mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(t.id);
                    }}
                    className="flex items-center gap-1 text-gray-600 hover:text-red-600"
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        t.likes_count > 0 ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                    {t.likes_count}
                  </button>
                  <div className="flex items-center gap-1 text-gray-500">
                    <MessageSquare size={16} />
                    {t.comment_count || 0}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {t.profiles?.avatar_url ? (
                    <img
                      src={t.profiles.avatar_url}
                      alt={t.profiles.username}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold">
                      {(t.profiles?.username?.[0] || "U").toUpperCase()}
                    </div>
                  )}
                  <span className="text-gray-700 text-sm">
                    {t.profiles?.username || "Anonymous"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <NewThreadModal onClose={() => setShowModal(false)} onPost={fetchThreads} />}
    </div>
  );
}
