// src/components/NewThreadModal.jsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { X, Sparkles, Send } from "lucide-react";

export default function NewThreadModal({ onClose, onPost }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      setIsSubmitting(false);
      return alert("Please log in first!");
    }

    if (!title.trim()) {
      setIsSubmitting(false);
      return alert("Title is required.");
    }

    await supabase.from("forum_threads").insert({
      title: title.trim(),
      content: content.trim(),
      posted_by: user.id,
    });

    setIsSubmitting(false);
    onClose();
    onPost();
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4">
      <div 
        className="relative w-full max-w-2xl"
        style={{
          animation: 'modalSlideIn 0.3s ease-out'
        }}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 rounded-2xl sm:rounded-3xl blur-xl opacity-30"></div>
        
        {/* Modal content */}
        <div className="relative backdrop-blur-xl bg-white/90 rounded-2xl sm:rounded-3xl border border-amber-200/50 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white">Create New Thread</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-white/20 rounded-xl transition-all duration-300 group"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
            {/* Title Input */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-amber-900 mb-2 uppercase tracking-wider">
                Thread Title *
              </label>
              <input
                type="text"
                placeholder="Enter an engaging title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-2 border-amber-200/50 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 md:py-4 text-sm sm:text-base bg-white/50 backdrop-blur-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-200/50 outline-none transition-all duration-300 placeholder-amber-400 font-semibold"
                maxLength={200}
              />
              <p className="text-xs text-amber-600 mt-1.5 sm:mt-2">{title.length}/200 characters</p>
            </div>

            {/* Content Input */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-amber-900 mb-2 uppercase tracking-wider">
                Content
              </label>
              <textarea
                placeholder="Share your thoughts, ideas, or questions..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border-2 border-amber-200/50 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 md:py-4 h-32 sm:h-40 md:h-48 resize-none text-sm sm:text-base bg-white/50 backdrop-blur-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-200/50 outline-none transition-all duration-300 placeholder-amber-400"
                maxLength={5000}
              />
              <p className="text-xs text-amber-600 mt-1.5 sm:mt-2">{content.length}/5000 characters</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2 sm:pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-xl sm:rounded-2xl border-2 border-amber-200 text-amber-800 font-bold hover:bg-amber-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="group relative disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl sm:rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300">
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-white font-bold text-sm sm:text-base">Posting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      <span className="text-white font-bold text-sm sm:text-base">Post Thread</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>

          {/* Bottom accent line */}
          <div className="h-1 sm:h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400"></div>
        </div>
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
