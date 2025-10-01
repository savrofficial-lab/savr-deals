// src/pages/DealDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function DealDetail() {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    async function fetchDeal() {
      setLoading(true);

      // fetch deal info
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, link, category, description, image_url, old_price, new_price, posted_by, created_at")
        .eq("id", id)
        .single();

      if (error) console.error("❌ Deal fetch error:", error);
      setDeal(data);

      // fetch comments
      const { data: cdata, error: cerror } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id")
        .eq("deal_id", id)
        .order("created_at", { ascending: true });

      if (cerror) console.error("❌ Comments fetch error:", cerror);
      setComments(cdata || []);

      setLoading(false);
    }

    fetchDeal();
  }, [id]);

  async function handleComment() {
    if (!newComment.trim()) return;
    const { data, error } = await supabase
      .from("comments")
      .insert([{ deal_id: id, content: newComment }])
      .select()
      .single();

    if (error) {
      alert("Could not add comment");
      return;
    }
    setComments((prev) => [...prev, data]);
    setNewComment("");
  }

  if (loading) return <p className="text-center py-6">Loading deal…</p>;
  if (!deal) return <p className="text-center py-6">Deal not found.</p>;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Product section */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <img
          src={deal.image_url || "https://via.placeholder.com/400"}
          alt={deal.title}
          className="w-full h-60 object-cover rounded-lg mb-4"
        />
        <h1 className="text-xl font-bold">{deal.title}</h1>
        <p className="text-sm text-gray-500">{deal.category}</p>
        <div className="flex items-center gap-3 mt-2">
          {deal.old_price && (
            <span className="text-gray-400 line-through">₹{deal.old_price}</span>
          )}
          {deal.new_price && (
            <span className="text-green-600 font-bold">₹{deal.new_price}</span>
          )}
        </div>
        <a
          href={deal.link}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-4 bg-yellow-800 text-white px-4 py-2 rounded"
        >
          Shop Now
        </a>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mb-6">
        <button className="px-3 py-1 bg-gray-100 rounded">👍 Like</button>
        <button className="px-3 py-1 bg-gray-100 rounded">🚫 Report</button>
        <span className="text-gray-500 text-sm">
          Posted on {new Date(deal.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold mb-2">Description</h2>
        <p className="text-sm text-gray-700">{deal.description || "No description provided."}</p>
      </div>

      {/* Poster info (stub for now) */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold mb-2">Posted by</h2>
        <p className="text-sm text-gray-700">User: {deal.posted_by}</p>
        {/* Later: join with profiles for username, coins, leaderboard */}
      </div>

      {/* Comments */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold mb-3">Comments</h2>
        <div className="space-y-2 mb-3">
          {comments.length === 0 && <p className="text-gray-500 text-sm">No comments yet.</p>}
          {comments.map((c) => (
            <div key={c.id} className="border-b py-2">
              <p className="text-sm">{c.content}</p>
              <p className="text-xs text-gray-400">
                {new Date(c.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment…"
            className="flex-1 border rounded px-3 py-2 text-sm"
          />
          <button
            onClick={handleComment}
            className="bg-yellow-800 text-white px-4 py-2 rounded"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
        }
