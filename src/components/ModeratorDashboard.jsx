// src/components/ModeratorDashboard.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Loader2, Shield, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

/**
 * ModeratorDashboard
 *
 * - Shows tabs: reports, deals
 * - Moderator can view reports and delete deals and mark reports reviewed
 * - Uses profiles.user_id (not id) when querying roles/profiles
 */

export default function ModeratorDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [reports, setReports] = useState([]);
  const [deals, setDeals] = useState([]);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);

  const addDebug = (txt) => setDebugInfo((p) => [...p, `${new Date().toLocaleTimeString()}: ${txt}`]);

  // Fetch current user's role from profiles.user_id
  useEffect(() => {
    let mounted = true;
    const fetchRole = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!user) {
          if (mounted) setLoading(false);
          return;
        }
        addDebug(`fetchRole: ${user.id || user.email}`);
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        if (error) {
          addDebug(`role fetch error: ${error.message}`);
          if (mounted) setRole("");
        } else {
          if (mounted) setRole(data?.role || "");
          addDebug(`role=${data?.role || "none"}`);
        }
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchRole();
    return () => (mounted = false);
  }, [user?.id]);

  // Fetch reports & deals (when authorized)
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (!user || !["moderator", "admin"].includes(role)) {
        addDebug("Not authorized; skipping fetchData");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (activeTab === "reports") {
          // fetch raw reports
          const { data: rawReports, error: reportsErr } = await supabase
            .from("reports")
            .select("id, deal_id, reported_by, reason, status, created_at")
            .order("created_at", { ascending: false });
          if (reportsErr) throw reportsErr;
          const reportsList = Array.isArray(rawReports) ? rawReports : [];

          if (reportsList.length === 0) {
            if (mounted) setReports([]);
            return;
          }

          // batch fetch deals & reporter profiles
          const dealIds = Array.from(new Set(reportsList.map((r) => r.deal_id).filter(Boolean)));
          const reporterIds = Array.from(new Set(reportsList.map((r) => r.reported_by).filter(Boolean)));

          let dealsMap = {};
          if (dealIds.length) {
            const { data: dealsData, error: dealsError } = await supabase
              .from("deals")
              .select("id, title, description, image, posted_by, created_at")
              .in("id", dealIds);
            if (!dealsError && dealsData) {
              dealsMap = (dealsData || []).reduce((acc, d) => {
                acc[d.id] = d;
                return acc;
              }, {});
            }
          }

          let profilesMap = {};
          if (reporterIds.length) {
            const { data: profilesData, error: profilesError } = await supabase
              .from("profiles")
              .select("user_id, username, avatar_url")
              .in("user_id", reporterIds);
            if (!profilesError && profilesData) {
              profilesMap = (profilesData || []).reduce((acc, p) => {
                acc[p.user_id] = p;
                return acc;
              }, {});
            }
          }

          const enriched = reportsList.map((r) => ({
            ...r,
            deal: dealsMap[r.deal_id] ?? null,
            reporter: profilesMap[r.reported_by] ?? null,
          }));

          if (mounted) {
            setReports(enriched);
            addDebug(`Loaded ${enriched.length} reports`);
          }
        } else if (activeTab === "deals") {
          const { data: dealsData, error: dealsError } = await supabase
            .from("deals")
            .select("id, title, description, image, posted_by, created_at")
            .order("created_at", { ascending: false });
          if (dealsError) throw dealsError;
          if (mounted) {
            setDeals(dealsData || []);
            addDebug(`Loaded ${dealsData?.length ?? 0} deals`);
          }
        }
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [activeTab, user?.id, role]);

  // Actions: deleteDeal, markReviewed
  const deleteDeal = async (id) => {
    if (!confirm("Delete this deal? This cannot be undone.")) return;
    setError(null);
    try {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
      setDeals((p) => p.filter((d) => d.id !== id));
      setReports((p) => p.filter((r) => r.deal_id !== id));
    } catch (e) {
      setError(`Failed to delete: ${e.message}`);
    }
  };

  // ✅ Mark report as reviewed + send notification to deal poster
const markReviewed = async (report) => {
  try {
    // 1️⃣ Mark the report as reviewed (instead of deleting)
    const { error: reportError } = await supabase
      .from("reports")
      .update({ status: "reviewed" })
      .eq("id", report.id);

    if (reportError) throw reportError;

    // 2️⃣ Fetch the related deal to get who posted it
    const { data: dealData, error: dealError } = await supabase
      .from("deals")
      .select("id, title, posted_by")
      .eq("id", report.deal_id)
      .single();

    if (dealError) throw dealError;

    // 3️⃣ Insert a notification for that user
    const { error: notifError } = await supabase.from("notifications").insert([
      {
        user_id: dealData.posted_by,
        type: "deal_reviewed",
        message: `✅ Your deal "${dealData.title}" has been reviewed by a moderator.`,
        link: `/deal/${dealData.id}`,
        read: false,
      },
    ]);

    if (notifError) throw notifError;

    // 4️⃣ Update local UI
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id ? { ...r, status: "reviewed" } : r
      )
    );

    alert("✅ Deal marked as reviewed and user notified!");
  } catch (e) {
    console.error("Error marking reviewed:", e);
    alert("❌ Error marking reviewed. Check console.");
  }
};
 
  <button
  onClick={() => handleReview(report.id)}
  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
>
  Reviewed
</button>

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-600 bg-gray-50">
        <Loader2 className="animate-spin mb-4 h-12 w-12" />
        <p className="text-lg">Loading moderator dashboard...</p>
      </div>
    );
  }

  // Access guard
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1">Login Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access this panel.</p>
          <a href="/" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition">Go Home</a>
        </div>
      </div>
    );
  }

  if (!["moderator", "admin"].includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1">Access Denied</h2>
          <p className="text-gray-600 mb-4">You are not authorized to access this page.</p>
          <a href="/" className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition">Go Home</a>
        </div>
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
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
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
          className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "reports" ? "bg-sky-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          Reports
        </button>
        <button
          onClick={() => setActiveTab("deals")}
          className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "deals" ? "bg-sky-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          Deals
        </button>
      </aside>
      

      {/* Main */}
      <motion.main className="flex-1 p-4 md:p-6 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                      <h3 className="font-semibold text-lg">{report.deal?.title ?? "Unknown Deal"}</h3>
                      <p className="text-gray-600 text-sm mb-2">Reported by: <span className="font-medium">{report.reporter?.username ?? "Unknown"}</span></p>
                      <p className="text-gray-500 text-sm italic">Reason: {report.reason ?? "No reason provided"}</p>
                      <p className="text-xs text-gray-400 mt-2">Status: {report.status ?? "pending"}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => deleteDeal(report.deal_id)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-all text-sm">
                        <Trash2 size={16} /> Delete
                      </button>
                      <button
  onClick={() => markReviewed(report)}
  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-all text-sm"
>
  <CheckCircle2 size={16} /> Reviewed
</button>
                      <a href={`/deal/${report.deal_id}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">View Deal</a>
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
                  {deal.image && <img src={deal.image} alt={deal.title} className="h-40 w-full object-cover" />}
                  <div className="p-4">
                    <h3 className="font-semibold">{deal.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">{deal.description ? `${deal.description.slice(0, 100)}...` : ""}</p>
                    <div className="flex gap-2">
                      <button onClick={() => deleteDeal(deal.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg flex items-center gap-1 transition-all"><Trash2 size={14} /> Delete</button>
                      <a href={`/deal/${deal.id}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">View</a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Debug/log */}
        {debugInfo.length > 0 && (
          <div className="mt-6 p-3 bg-gray-50 rounded text-xs text-left max-w-4xl">
            <p className="font-semibold mb-1">Debug Log (recent):</p>
            {debugInfo.slice(-8).map((d, i) => <div key={i} className="text-xs text-gray-600">{d}</div>)}
          </div>
        )}
      </motion.main>
    </div>
  );
                                                                                                            }
