//src/components/Blog.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, User, Tag, Search, ArrowRight } from "lucide-react";

export default function Blog() {
  const [blogs, setBlogs] = useState([]);
  const [filteredBlogs, setFilteredBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    filterBlogs();
  }, [searchTerm, selectedTag, blogs]);

  async function fetchBlogs() {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading blogs:", error);
    } else {
      setBlogs(data);
      extractTags(data);
    }
    setLoading(false);
  }

  function extractTags(blogData) {
    const tags = new Set();
    blogData.forEach((post) => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach((tag) => tags.add(tag));
      }
    });
    setAllTags(Array.from(tags));
  }

  function filterBlogs() {
    let filtered = blogs;

    if (searchTerm) {
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          post.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTag) {
      filtered = filtered.filter(
        (post) => post.tags && post.tags.includes(selectedTag)
      );
    }

    setFilteredBlogs(filtered);
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center px-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="inline-block w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          <p className="mt-6 text-xl text-gray-600 font-medium">Loading amazing content...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50 py-12 px-4">
      {/* Hero Section */}
      <motion.div
        className="max-w-5xl mx-auto mb-16"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-12">
          <motion.h1
            className="text-6xl font-bold bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 bg-clip-text text-transparent mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            SavrDeals Blog
          </motion.h1>
          <motion.p
            className="text-gray-600 text-lg max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Discover insider tips, trending deals, and expert insights to maximize your savings
          </motion.p>
        </div>

        {/* Search Bar */}
        <motion.div
          className="relative mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600 w-5 h-5" />
          <input
            type="text"
            placeholder="Search blogs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 border-2 border-amber-200 rounded-full focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition shadow-sm"
          />
        </motion.div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <motion.div
            className="flex flex-wrap gap-3 justify-center mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-2 rounded-full font-medium transition ${
                selectedTag === null
                  ? "bg-amber-600 text-white shadow-lg"
                  : "bg-white text-gray-700 border-2 border-amber-200 hover:border-amber-600"
              }`}
            >
              All Posts
            </button>
            {allTags.map((tag) => (
              <motion.button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-4 py-2 rounded-full font-medium transition ${
                  selectedTag === tag
                    ? "bg-amber-600 text-white shadow-lg"
                    : "bg-white text-gray-700 border-2 border-amber-200 hover:border-amber-600"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Tag className="w-4 h-4 inline mr-2" />
                {tag}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Results Count */}
        <motion.p
          className="text-center text-gray-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filteredBlogs.length} post{filteredBlogs.length !== 1 ? "s" : ""} found
        </motion.p>
      </motion.div>

      {/* Blog Posts Grid */}
      <motion.div
        className="max-w-5xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {filteredBlogs.length > 0 ? (
            <motion.div className="grid gap-8">
              {filteredBlogs.map((post, index) => (
                <motion.div
                  key={post.id}
                  variants={itemVariants}
                  layout
                  className="group"
                >
                  <motion.div
                    className="bg-white rounded-2xl shadow-md hover:shadow-2xl overflow-hidden border-2 border-amber-100 transition cursor-pointer"
                    whileHover={{ y: -8 }}
                    onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                      {/* Image Section */}
                      {post.image && (
                        <motion.div
                          className="md:col-span-1 relative overflow-hidden h-64 md:h-auto"
                          whileHover={{ scale: 1.05 }}
                        >
                          <img
                            src={post.image}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </motion.div>
                      )}

                      {/* Content Section */}
                      <div className={`p-6 md:p-8 flex flex-col justify-between ${post.image ? "md:col-span-2" : "col-span-1"}`}>
                        <div>
                          {/* Category Badge */}
                          {post.tags && post.tags.length > 0 && (
                            <motion.div
                              className="flex gap-2 mb-3 flex-wrap"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              {post.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-block bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold"
                                >
                                  {tag}
                                </span>
                              ))}
                            </motion.div>
                          )}

                          {/* Title */}
                          <motion.h2
                            className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-amber-700 transition"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            {post.title}
                          </motion.h2>

                          {/* Content Preview */}
                          <motion.p
                            className={`text-gray-600 mb-4 leading-relaxed ${
                              expandedId === post.id ? "" : "line-clamp-3"
                            }`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            {post.content}
                          </motion.p>
                        </div>

                        {/* Meta Information */}
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-amber-600" />
                              {new Date(post.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-amber-600" />
                              {post.author}
                            </div>
                          </div>

                          {/* CTA Button */}
                          <motion.button
                            className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold transition group/btn"
                            whileHover={{ x: 4 }}
                          >
                            {expandedId === post.id ? "Show Less" : "Read More"}
                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No blogs found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm ? "Try adjusting your search terms" : "Check back soon for new content!"}
              </p>
              {(searchTerm || selectedTag) && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedTag(null);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-medium transition"
                >
                  Clear Filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Floating Action Button */}
      <motion.div
        className="fixed bottom-8 right-8"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => window.location.href = "/BlogPoster"}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 shadow-xl hover:shadow-2xl flex items-center justify-center text-white text-2xl transition hidden md:flex"
          title="Create a blog post"
        >
          ✍️
        </motion.button>
      </motion.div>
    </div>
  );
        }
