//src/components/Blog.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";

export default function Blog() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogs();
  }, []);

  async function fetchBlogs() {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Error loading blogs:", error);
    else setBlogs(data);
    setLoading(false);
  }

  if (loading) {
    return <p className="text-center mt-10 text-gray-600">Loading blogs...</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-10">
      <h1 className="text-3xl font-bold text-center text-amber-800 mb-6">SavrDeals Blog</h1>
      <div className="max-w-4xl mx-auto grid gap-6 px-4">
        {blogs.map((post) => (
          <motion.div
            key={post.id}
            className="bg-white shadow rounded-2xl overflow-hidden p-5 border border-amber-100"
            whileHover={{ scale: 1.02 }}
          >
            {post.image && (
              <img
                src={post.image}
                alt={post.title}
                className="rounded-xl mb-4 w-full object-cover h-60"
              />
            )}
            <h2 className="text-xl font-semibold text-gray-900">{post.title}</h2>
            <p className="text-gray-700 mt-2 line-clamp-3">{post.content}</p>
            <p className="text-sm text-gray-500 mt-3">
              {new Date(post.created_at).toLocaleDateString()} • {post.author}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
