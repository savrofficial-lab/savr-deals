import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function DealDetail() {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [reporting, setReporting] = useState(false);

  // Fetch deal info
  useEffect(() => {
    async function fetchDeal() {
      setLoading(true);
      try {
        let { data, error } = await supabase
          .from("deals")
          .select("id, title, description, image, old_price, new_price, likes, posted_by, created_at")
          .eq("id", id)
          .single();
        if (error) throw error;
        setDeal(data);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }
    fetchDeal();
  }, [id]);

  // Fetch comments
  useEffect(() => {
    async function fetchComments() {
      let { data, error } = await supabase
        .from("comments")
        .select("id, text, posted_by, created_at")
        .eq("deal_id", id)
        .order("created_at", { ascending: true });
      if (!error) {
        setComments(data || []); // ✅ ensures no crash if data = null
      }
    }
    fetchComments();
  }, [id]);

  async function handleLike() {
    if (!deal) return;
    const newLikes = (deal.likes || 0) + 1;
    setDeal({ ...deal, likes: newLikes });
    await supabase.from("deals").update({ likes: newLikes }).eq("id", id);
  }

  async function handleReport(reason) {
    setReporting(false);
    await supabase.from("reports").insert({
      deal_id: id,
      reason,
    });
    alert("Thanks for reporting!");
  }

  async function addComment(e) {
    e.preventDefault();
    const text = e.target.comment.value.trim();
    if (!text) return;
    const { data, error } = await supabase
      .from("comments")
      .insert({ deal_id: id, text })
      .select()
      .single();
    if (!error) {
      setComments([...comments, data]);
      e.target.reset();
    }
  }

  if (loading) return <p className="text-center py-6">Loading...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!deal) return <p className="text-center">Deal not found</p>;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6">
      {/* Image & Title */}
      <div className="flex gap-4">
        <img
          src={deal.image || "/placeholder.png"}
          alt={deal.title}
          className="w-40 h-40 object-cover rounded-lg"
        />
        <div className="flex-1">
          <h1 className="text-xl font-bold">{deal.title}</h1>
          <p className="text-gray-600 mt-1">Posted on {new Date(deal.created_at).toLocaleDateString()}</p>
          <div className="mt-2">
            <span className="line-through text-gray-500 mr-2">₹{deal.old_price}</span>
            <span className="text-lg text-green-600 font-semibold">₹{deal.new_price}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      {deal.description && (
        <div className="mt-4">
          <h2 className="font-semibold text-lg">Description</h2>
          <p className="text-gray-700 mt-1">{deal.description}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={handleLike}
          className="px-3 py-1 bg-green-100 hover:bg-green-200 rounded-lg"
        >
          👍 {deal.likes || 0}
        </button>

        <button
          onClick={() => setReporting(true)}
          className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg"
        >
          🚩 Report
        </button>
      </div>

      {/* Report Popup */}
      {reporting && (
        <div className="mt-3 border p-3 rounded-lg bg-gray-50">
          <p className="font-medium mb-2">Why would you like to report?</p>
          <div className="flex gap-2 flex-wrap">
            {["Spam", "Incorrect Info", "Repost"].map((r) => (
              <button
                key={r}
                onClick={() => handleReport(r)}
                className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-200"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="mt-6">
        <h2 className="font-semibold text-lg mb-2">Comments</h2>
        <form onSubmit={addComment} className="flex gap-2 mb-4">
          <input
            type="text"
            name="comment"
            placeholder="Write a comment..."
            className="flex-1 border px-3 py-2 rounded-lg"
          />
          <button type="submit" className="px-4 py-2 bg-yellow-800 text-white rounded-lg">
            Post
          </button>
        </form>

        {comments.length === 0 && <p className="text-gray-500">No comments yet.</p>}
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="border-b pb-2">
              <p className="text-gray-800">{c.text}</p>
              <span className="text-xs text-gray-500">
                {new Date(c.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
