// src/components/DealRemoved.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function DealRemoved() {
  const location = useLocation();
  const navigate = useNavigate();

  // Notification data passed through query params
  const query = new URLSearchParams(location.search);
  const title = query.get("title") || "your deal";
  const reason = query.get("reason") || "violating posting guidelines";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-center mb-4">
          <AlertCircle className="text-red-500 w-12 h-12" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-3">
          🚫 Deal Removed
        </h1>
        <p className="text-gray-700 mb-2 font-medium">
          Your deal <span className="text-sky-600">"{title}"</span> has been removed by a moderator.
        </p>
        <p className="text-gray-600 text-sm mb-4">
          <strong>Reason:</strong> {reason}.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Please make sure future posts follow our community rules to avoid restrictions.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-all"
        >
          Return Home
        </button>
      </motion.div>
    </div>
  );
}
