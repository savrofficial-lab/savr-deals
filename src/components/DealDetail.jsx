// src/components/DealDetail.jsx
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
  const [liked, setLiked] = useState(false);

  // ✅ Fetch deal info
  useEffect(() => {
    async function fetchDeal() {
      setLoading(true);
      try {
        let { data, error } = await supabase
          .from("deals")
          .select("id, title, description, image, price, old_price, link, posted_by")
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

  // ✅ Fetch comments with user info
useEffect(() => {
  async function fetchComments() {
    let { data } = await supabase
      .from("comments")
      .select(`
        id, text, created_at, user_id,
        profiles (username, avatar_url)
      `)
      .eq("deal_id", id)
      .order("created_at", { ascending: true });
    setComments(data || []);
  }
  fetchComments();
}, [id]);

  // ✅ Handle Like (localStorage based)
  function handleLike() {
    if (liked) return; // prevent multiple likes
    setLiked(true);
    localStorage.setItem(`liked_deal_${id}`, "true");
  }

  useEffect(() => {
    if (localStorage.getItem(`liked_deal_${id}`)) {
      setLiked(true);
    }
  }, [id]);

  // ✅ Handle Report
  async function handleReport(reason) {
    setReporting(false);
    await supabase.from("reports").insert({
      deal_id: id,
      reason,
    });
    alert("Thanks for reporting!");
  }

  // ✅ Handle Comment
async function addComment(e) {
  e.preventDefault();
  const text = e.target.comment.value.trim();
  if (!text) return;

  // get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("You must be logged in to comment.");
    return;
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      deal_id: id,
      text,
      user_id: user.id, // ✅ link comment to user
    })
    .select(
      `id, text, created_at, user_id,
       profiles (username, avatar_url)` // ✅ fetch user data immediately
    )
    .single();

  if (!error) {
    setComments([...comments, data]);
    e.target.reset();
  } else {
    alert("Failed to comment: " + error.message);
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
          <div className="mt-2">
                          <div className="text-sm font-bold text-gray-900">
  ₹{deal.price}
</div>
{deal.old_price && (
  <div className="text-xs text-gray-500 line-through">
    ₹{deal.old_price}
  </div>

           )}
          </div>
          {/* ✅ Shop Now button */}
          <a
            href={deal.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block px-4 py-2 bg-yellow-800 text-white rounded-lg hover:bg-yellow-900"
          >
            Shop Now
          </a>
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
          disabled={liked}
          className={`px-3 py-1 rounded-lg ${
            liked ? "bg-green-300" : "bg-green-100 hover:bg-green-200"
          }`}
        >
          👍 {liked ? "Liked" : "Like"}
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
          <button
            type="submit"
            className="px-4 py-2 bg-yellow-800 text-white rounded-lg"
          >
            Post
          </button>
        </form>

        {comments.length === 0 && <p className="text-gray-500">No comments yet.</p>}
        <ul className="space-y-2">
  {comments.map((c) => (
    <li key={c.id} className="flex items-start gap-2 border-b pb-2">
      {/* Avatar with Popup */}
      <div className="relative group">
        <img
          src={c.profiles?.avatar_url || "/default-avatar.png"}
          alt={c.profiles?.username}
          className="w-8 h-8 rounded-full cursor-pointer"
        />
        {/* Popup on hover */}
        <div className="absolute hidden group-hover:block top-10 left-0 bg-white shadow-lg rounded-xl p-3 w-48 z-10">
          <p className="font-semibold">{c.profiles?.username}</p>
          <p className="text-xs text-gray-500">Coins: {c.profiles?.coins || 0}</p>
          <p className="text-xs text-gray-500">Posts: {c.profiles?.posts_count || 0}</p>
        </div>
      </div>

      {/* Comment text */}
      <div>
        <p className="text-gray-800">{c.text}</p>
        <span className="text-xs text-gray-500">
          {new Date(c.created_at).toLocaleString()}
        </span>
      </div>
    </li>
  ))}
</ul>
      </div>
    </div>
  );
}
