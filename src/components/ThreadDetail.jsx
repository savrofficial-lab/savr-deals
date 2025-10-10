// src/components/ThreadDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ArrowLeft, Heart } from "lucide-react";

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

    // FIXED: use reply_by instead of user_id
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
    
    // FIXED: use liked_by instead of user_id
    const { data: existing } = await supabase
      .from("forum_likes")
      .select("*")
      .eq("thread_id", id)
      .eq("liked_by", currentUserId)
      .maybeSingle();

    if (existing) {
      // Unlike
      const { error } = await supabase
        .from("forum_likes")
        .delete()
        .eq("thread_id", id)
        .eq("liked_by", currentUserId);
      
      if (error) console.error("Error unliking:", error);
    } else {
      // Like - FIXED: use liked_by instead of user_id
      const { error } = await supabase
        .from("forum_likes")
        .insert({ thread_id: id, liked_by: currentUserId });
      
      if (error) console.error("Error liking:", error);
    }
    fetchThread();
  }

  if (!thread) return <p className="text-center py-8">Loading thread…</p>;

  return (
    <div className="max-w-3xl mx-auto p-4 min-h-screen bg-gray-50">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 mb-4"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className="bg-white p-5 rounded-2xl shadow">
        <h1 className="text-xl font-bold text-gray-900 mb-2">{thread.title}</h1>
        <p className="text-gray-700 mb-3">{thread.content}</p>

        <button
          onClick={handleLike}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition"
        >
          <Heart
            className={`h-5 w-5 ${
              thread.likes_count > 0 ? "fill-red-500 text-red-500" : ""
            }`}
          />
          {thread.likes_count} Likes
        </button>
      </div>

      {/* Replies Section */}
      <div className="bg-white mt-6 p-5 rounded-2xl shadow">
        <h2 className="font-semibold text-lg mb-3">Replies ({replies.length})</h2>

        <form onSubmit={handleAddReply} className="flex gap-2 mb-5">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2"
            placeholder="Write your reply..."
          />
          <button
            type="submit"
            className="bg-yellow-700 text-white px-5 py-2 rounded-xl font-semibold hover:bg-yellow-800 transition"
          >
            Reply
          </button>
        </form>

        {replies.map((r) => (
          <div key={r.id} className="border-t border-gray-100 py-3">
            <div className="flex items-center gap-3">
              {r.profiles?.avatar_url ? (
                <img
                  src={r.profiles.avatar_url}
                  alt={r.profiles.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold">
                  {(r.profiles?.username?.[0] || "U").toUpperCase()}
                </div>
              )}
              <span className="font-semibold text-gray-800">
                {r.profiles?.username || "Anonymous"}
              </span>
            </div>
            <p className="ml-11 mt-1 text-gray-700">{r.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
