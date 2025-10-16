// src/components/NotificationDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function NotificationDetail({ user }) {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("reports")
        .select("id, deal_id, reason, status, created_at, deals(title)")
        .eq("id", reportId)
        .eq("reported_by", user.id)
        .single();

      if (error) {
        console.error("Error fetching report:", error);
      } else {
        setReport(data);
      }
      setLoading(false);
    };

    fetchReport();
  }, [reportId, user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-gray-600">
        <p>Please log in to view this notification</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="animate-spin text-amber-600 w-8 h-8" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-gray-600">
        <p>Report not found or you don't have access to it.</p>
        <button
          onClick={() => navigate("/notifications")}
          className="mt-4 text-amber-600 hover:underline"
        >
          ← Back to Notifications
        </button>
      </div>
    );
  }

  const dealTitle = report.deals?.title || "the reported deal";

  return (
    <div className="max-w-2xl mx-auto mt-10 mb-24 px-4">
      <button
        onClick={() => navigate("/notifications")}
        className="flex items-center gap-2 text-gray-600 hover:text-amber-600 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Notifications
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-8 border border-green-200"
      >
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Report Reviewed</h1>
            <p className="text-sm text-gray-500">Status: {report.status}</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <p className="text-gray-800 leading-relaxed">
            Your report for <span className="font-semibold">"{dealTitle}"</span> has been reviewed by our moderation team. 
            The issue has been addressed and appropriate action has been taken.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-semibold">Your report reason:</span>
          </p>
          <p className="text-gray-700 italic">"{report.reason}"</p>
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Thank you for helping keep our community safe and trustworthy. Your feedback is valuable to us!
          </p>
          <p className="text-sm text-gray-500">
            🎉 Keep contributing and reporting issues you find.
          </p>
        </div>

        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={() => navigate("/notifications")}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Back to Notifications
          </button>
          {report.deal_id && (
            <button
              onClick={() => navigate(`/deal/${report.deal_id}`)}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition"
            >
              View Deal
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          Reported on {new Date(report.created_at).toLocaleString()}
        </p>
      </motion.div>
    </div>
  );
}
