// src/components/NewThreadModal.jsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function NewThreadModal({ onClose, onPost }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return alert("Please log in first!");

    if (!title.trim()) return alert("Title is required.");

    await supabase.from("forum_threads").insert({
      title: title.trim(),
      content: content.trim(),
      posted_by: user.id,
    });

    onClose();
    onPost();
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4">📝 New Thread</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Thread title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-yellow-400 outline-none"
          />
          <textarea
            placeholder="Write something..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 h-32 resize-none focus:ring-2 focus:ring-yellow-400 outline-none"
          />
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-yellow-700 text-white rounded-xl font-semibold hover:bg-yellow-800 transition"
            >
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
