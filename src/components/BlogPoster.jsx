//src/components/BlogPoster.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";
import { AlertCircle, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BlogPoster() {
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    image: "",
    tags: [],
  });

  const [tagInput, setTagInput] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    checkAuthorization();
  }, []);

  async function checkAuthorization() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      if (!authUser) {
        setIsAuthorized(false);
        setLoading(false);
        navigate("/");
        return;
      }

      // Add a small delay to ensure latest data from database
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authUser.id)
        .single();

      if (error) {
        console.error("Profile fetch error:", error);
        setIsAuthorized(false);
      } else if (profile && profile.role === "blogger") {
        setIsAuthorized(true);
      } else {
        console.log("User role:", profile?.role);
        setIsAuthorized(false);
      }
    } catch (err) {
      console.error("Authorization check error:", err);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function addTag() {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  }

  function removeTag(tagToRemove) {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!formData.title.trim() || !formData.content.trim()) {
      setMessage({ type: "error", text: "Title and content are required!" });
      return;
    }

    setPosting(true);

    try {
      const { error } = await supabase.from("blog_posts").insert([
        {
          title: formData.title,
          content: formData.content,
          image: formData.image || null,
          author: user?.email?.split("@")[0] || "SavrDeals Team",
          tags: formData.tags.length > 0 ? formData.tags : null,
        },
      ]);

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Blog posted successfully! 🎉",
      });
      setFormData({ title: "", content: "", image: "", tags: [] });
      setTimeout(() => {
        navigate("/blog");
      }, 2000);
    } catch (err) {
      console.error("Error posting blog:", err);
      setMessage({
        type: "error",
        text: "Failed to post blog. Please try again.",
      });
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          <p className="mt-4 text-gray-600">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-700 mb-6">
            You don't have permission to access this page. Only users with the "blogger" role can create posts.
          </p>
          <button
            onClick={() => navigate("/blog")}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg transition"
          >
            Go to Blog
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-amber-800 mb-2">Create a Blog Post</h1>
          <p className="text-gray-600">Share your thoughts with the SavrDeals community</p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-lg p-8 border border-amber-100"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {message.text && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                message.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {message.type === "success" ? (
                <Check className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
              {message.text}
            </motion.div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Blog Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter an engaging title..."
              className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="Write your blog content here... (supports markdown-style formatting)"
              rows="12"
              className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition resize-none"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Featured Image URL
            </label>
            <input
              type="url"
              name="image"
              value={formData.image}
              onChange={handleInputChange}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition"
            />
            {formData.image && (
              <motion.img
                src={formData.image}
                alt="Preview"
                className="mt-4 rounded-xl max-h-48 object-cover w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add a tag and press Enter..."
                className="flex-1 px-4 py-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition"
              />
              <button
                type="button"
                onClick={addTag}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-medium transition"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <motion.span
                  key={tag}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-600 transition"
                  >
                    ×
                  </button>
                </motion.span>
              ))}
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={posting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {posting ? "Posting..." : "Publish Blog Post"}
          </motion.button>
        </motion.form>
      </div>
    </motion.div>
  );
}
