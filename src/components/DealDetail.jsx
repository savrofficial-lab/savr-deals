import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function DealDetail() {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetchDeal();
    fetchLikes();
    fetchComments();
  }, [id]);

  // ✅ Fetch Deal Info
  const fetchDeal = async () => {
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .eq("id", id)
      .single();
    if (!error) setDeal(data);
  };

  // ✅ Fetch Likes (Universal)
  const fetchLikes = async () => {
    const { data, error } = await supabase
      .from("likes")
      .select("user_id")
      .eq("deal_id", id);

    if (!error) {
      setLikesCount(data.length);

      const { data: user } = await supabase.auth.getUser();
      const liked = data.some((like) => like.user_id === user?.user?.id);
      setUserLiked(liked);
    }
  };

  // ✅ Handle Like Button
  const handleLike = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return alert("Please log in to like!");

    if (userLiked) {
      // Remove like
      await supabase
        .from("likes")
        .delete()
        .eq("deal_id", id)
        .eq("user_id", user.user.id);
    } else {
      // Add like
      await supabase.from("likes").insert([
        {
          deal_id: id,
          user_id: user.user.id,
        },
      ]);
    }
    fetchLikes();
  };

  // ✅ Fetch Comments (with profiles)
  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select(
        `
        id,
        content,
        created_at,
        user_id,
        profiles (
          username,
          avatar_url,
          coins,
          posts_count
        )
      `
      )
      .eq("deal_id", id)
      .order("created_at", { ascending: false });

    if (!error) setComments(data || []);
  };

  // ✅ Add New Comment
  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return alert("Please log in to comment!");

    const { error } = await supabase.from("comments").insert([
      {
        deal_id: id,
        content: newComment,
        user_id: user.user.id,
      },
    ]);

    if (error) {
      console.error("Error adding comment:", error);
    } else {
      setNewComment("");
      await fetchComments(); // ✅ Refresh comments instantly
    }
  };

  if (!deal) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-md mt-6">
      <img
        src={deal.image}
        alt={deal.title}
        className="w-full h-64 object-cover rounded-xl mb-4"
      />
      <h1 className="text-2xl font-bold mb-2">{deal.title}</h1>
      <p className="text-gray-700 mb-4">{deal.description}</p>

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleLike}
          className={`px-4 py-2 rounded-xl text-white ${
            userLiked ? "bg-red-500" : "bg-gray-400"
          }`}
        >
          ❤️ Like ({likesCount})
        </button>

        <a
          href={deal.link}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600"
        >
          🛒 Shop Now
        </a>
      </div>

      <hr className="my-4" />

      {/* Comments Section */}
      <h2 className="text-xl font-semibold mb-3">Comments</h2>
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500">No comments yet.</p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="bg-gray-50 p-3 rounded-xl border border-gray-200"
            >
              {/* Avatar + Popup */}
              <div className="relative group inline-block">
                {c.profiles?.avatar_url ? (
                  <img
                    src={c.profiles.avatar_url}
                    alt={c.profiles?.username}
                    className="w-8 h-8 rounded-full cursor-pointer border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold cursor-pointer">
                    {c.profiles?.username?.[0]?.toUpperCase() || "A"}
                  </div>
                )}

                {/* Popup */}
                <div className="absolute hidden group-hover:flex flex-col gap-2 top-10 left-0 bg-white shadow-xl rounded-xl p-4 w-64 z-10 border">
                  <div className="flex items-center gap-3">
                    {c.profiles?.avatar_url ? (
                      <img
                        src={c.profiles.avatar_url}
                        alt={c.profiles?.username}
                        className="w-12 h-12 rounded-full border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold text-lg">
                        {c.profiles?.username?.[0]?.toUpperCase() || "A"}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {c.profiles?.username || "Anonymous"}
                      </p>
                      <span className="text-xs bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full">
                        ⭐ Badge
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <p>Posts: {c.profiles?.posts_count || 0}</p>
                    <p>Coins: {c.profiles?.coins || 0}</p>
                    <p>Leaderboard Rank: Coming soon</p>
                  </div>
                </div>
              </div>

              {/* Comment content */}
              <div className="ml-3 mt-1 text-gray-800">{c.content}</div>
            </div>
          ))
        )}
      </div>

      {/* Add comment box */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Add a comment..."
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <button
          onClick={handleCommentSubmit}
          className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600"
        >
          Post
        </button>
      </div>
    </div>
  );
}
