//src/components/ModeratorDashboard.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Loader2, Shield, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ModeratorDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [reports, setReports] = useState([]);
  const [deals, setDeals] = useState([]);
  const [error, setError] = useState(null);

  // Fetch current user's role
  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setRole(data.role || "user");
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, [user?.id]);

  // Restrict access
  if (!loading && role !== "moderator" && role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1">Access Denied</h2>
          <p className="text-gray-600 mb-4">You are not authorized to access this page.</p>
          <a
            href="/"
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  // Fetch reports or deals
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!user || (role !== "moderator" && role !== "admin")) return;
      setLoading(true);
      try {
        if (activeTab === "reports") {
          const { data, error } = await supabase
            .from("reports")
            .select(`
              id,
              reason,
              deal_id,
              reported_by,
              created_at,
              deals:deal_id ( id, title, description, image ),
              profiles:reported_by ( username )
            `)
            .order("created_at", { ascending: false });
          if (error) throw error;
          if (isMounted) setReports(data || []);
        } else if (activeTab === "deals") {
          const { data, error } = await supabase
            .from("deals")
            .select("id, title, description, image, created_at")
            .order("created_at", { ascending: false });
          if (error) throw error;
          if (isMounted) setDeals(data || []);
        }
      } catch (e) {
        if (isMounted) setError(e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [activeTab, user?.id, role]);

  const deleteDeal = async (id) => {
    try {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
      setDeals((prev) => prev.filter((d) => d.id !== id));
      setReports((prev) => prev.filter((r) => r.deal_id !== id));
    } catch (e) {
      setError(`Failed to delete: ${e.message}`);
    }
  };

  const markReviewed = async (id) => {
    try {
      const { error } = await supabase.from("reports").delete().eq("deal_id", id);
      if (error) throw error;
      setReports((prev) => prev.filter((r) => r.deal_id !== id));
    } catch (e) {
      setError(`Failed to mark reviewed: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-600 bg-gray-50">
        <Loader2 className="animate-spin mb-4 h-12 w-12" />
        <p className="text-lg">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-red-100 border-b-2 border-red-400 p-4 z-50">
          <div className="flex items-center gap-2 max-w-5xl mx-auto">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-full md:w-60 bg-white border-b md:border-r shadow-sm p-4 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-x-visible">
        <h2 className="text-xl font-bold text-sky-600 mb-0 md:mb-3 flex items-center gap-2 whitespace-nowrap">
          <Shield size={20} /> Moderator Panel
        </h2>
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeTab === "reports"
              ? "bg-sky-600 text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Reports
        </button>
        <button
          onClick={() => setActiveTab("deals")}
          className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeTab === "deals"
              ? "bg-sky-600 text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Deals
        </button>
      </aside>

      {/* Main Content */}
      <motion.main
        className="flex-1 p-4 md:p-6 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-2xl font-bold mb-6">
          {activeTab === "reports" && "Reported Deals"}
          {activeTab === "deals" && "All Deals"}
        </h1>

        {/* Reports */}
        {activeTab === "reports" && (
          <div className="grid gap-4">
            {reports.length === 0 ? (
              <p className="text-gray-500">No reports found 🎉</p>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="bg-white rounded-lg shadow p-4 border">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {report?.deals?.title ?? "Unknown Deal"}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        Reported by:{" "}
                        <span className="font-medium">
                          {report?.profiles?.username ?? "Unknown"}
                        </span>
                      </p>
                      <p className="text-gray-500 text-sm italic">
                        Reason: {report?.reason ?? "No reason provided"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteDeal(report.deal_id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-all text-sm"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                      <button
                        onClick={() => markReviewed(report.deal_id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-all text-sm"
                      >
                        <CheckCircle2 size={16} /> Reviewed
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Deals */}
        {activeTab === "deals" && (
          <div className="grid md:grid-cols-2 gap-4">
            {deals.length === 0 ? (
              <p className="text-gray-500">No deals found</p>
            ) : (
              deals.map((deal) => (
                <div key={deal.id} className="bg-white rounded-lg shadow overflow-hidden border">
                  {deal.image && (
                    <img
                      src={deal.image}
                      alt={deal.title || "deal image"}
                      className="h-40 w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold">{deal.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {deal.description ? `${deal.description.slice(0, 100)}...` : ""}
                    </p>
                    <button
                      onClick={() => deleteDeal(deal.id)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </motion.main>
    </div>
  );
        }
