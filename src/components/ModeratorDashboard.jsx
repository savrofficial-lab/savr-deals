// src/components/ModeratorDashboard.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Loader2,
  Shield,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Store,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function ModeratorDashboard({ user: propUser }) {
  const [user, setUser] = useState(propUser || null);
  const [activeTab, setActiveTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [reports, setReports] = useState([]);
  const [deals, setDeals] = useState([]);
  const [requested, setRequested] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // --- Ensure we always have current user (works if propUser missing or out-of-date) ---
  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      try {
        if (propUser) {
          if (mounted) setUser(propUser);
          return;
        }
        const { data } = await supabase.auth.getUser();
        if (mounted) setUser(data?.user ?? null);
      } catch (e) {
        console.error("loadUser error:", e);
      }
    };
    loadUser();
    return () => (mounted = false);
  }, [propUser]);

  // --- Fetch role from profiles (supports either role string or is_moderator boolean) ---
  useEffect(() => {
    let mounted = true;
    const fetchRole = async () => {
      if (!user) {
        setRole("");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Try fetching role field first
        const { data, error } = await supabase
          .from("profiles")
          .select("role, is_moderator, user_id")
          .eq("user_id", user.id)
          .single();

        if (error) {
          // If no row or error, fallback gracefully
          console.warn("profiles fetch error:", error.message || error);
          if (mounted) setRole("");
        } else {
          let resolvedRole = "";
          if (data?.role) {
            resolvedRole = data.role;
          } else if (data?.is_moderator === true) {
            resolvedRole = "moderator";
          }
          if (mounted) setRole(resolvedRole);
        }
      } catch (e) {
        console.error("fetchRole unexpected:", e);
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRole();
    return () => (mounted = false);
  }, [user?.id]);

  // --- Fetch data depending on activeTab (reports / deals / requested) ---
  useEffect(() => {
    let mounted = true;
    let requestedChannel = null;

    const fetchData = async () => {
      if (!user || !["moderator", "admin"].includes(role)) {
        // not authorized (or role still loading) — keep empty arrays
        return;
      }

      setLoading(true);
      setError(null);
      try {
        if (activeTab === "reports") {
          const { data: rawReports, error: reportsErr } = await supabase
            .from("reports")
            .select("id, deal_id, reported_by, reason, status, created_at")
            .neq("status", "reviewed")
            .order("created_at", { ascending: false });

          if (reportsErr) throw reportsErr;
          const reportsList = Array.isArray(rawReports) ? rawReports : [];

          // batch fetch deals & reporter profiles
          const dealIds = Array.from(new Set(reportsList.map((r) => r.deal_id).filter(Boolean)));
          const reporterIds = Array.from(new Set(reportsList.map((r) => r.reported_by).filter(Boolean)));

          let dealsMap = {};
          if (dealIds.length) {
            const { data: dealsData, error: dealsError } = await supabase
              .from("deals")
              .select("id, title, description, image, posted_by, created_at")
              .in("id", dealIds);
            if (dealsError) console.warn("deals fetch error:", dealsError);
            dealsMap = (dealsData || []).reduce((acc, d) => {
              acc[d.id] = d;
              return acc;
            }, {});
          }

          let profilesMap = {};
          if (reporterIds.length) {
            const { data: profilesData, error: profilesError } = await supabase
              .from("profiles")
              .select("user_id, username, avatar_url")
              .in("user_id", reporterIds);
            if (profilesError) console.warn("profiles fetch error:", profilesError);
            profilesMap = (profilesData || []).reduce((acc, p) => {
              acc[p.user_id] = p;
              return acc;
            }, {});
          }

          const enriched = reportsList.map((r) => ({
            ...r,
            deal: dealsMap[r.deal_id] ?? null,
            reporter: profilesMap[r.reported_by] ?? null,
          }));

          if (mounted) setReports(enriched);
        } else if (activeTab === "deals") {
          const { data: dealsData, error: dealsError } = await supabase
            .from("deals")
            .select("id, title, description, image, posted_by, created_at")
            .order("created_at", { ascending: false });
          if (dealsError) throw dealsError;
          if (mounted) setDeals(dealsData || []);
        } else if (activeTab === "requested") {
          // requested_deals may use column user_id or requested_by — try both
          const { data: reqData, error: reqError } = await supabase
            .from("requested_deals")
            .select("id, user_id, requested_by, query, fulfilled, created_at")
            .eq("fulfilled", false)
            .order("created_at", { ascending: false });

          if (reqError) throw reqError;
          const realReqs = Array.isArray(reqData) ? reqData : [];

          // normalize user id field (prefer user_id; fallback to requested_by)
          const userIds = realReqs.map((r) => r.user_id ?? r.requested_by).filter(Boolean);
          let profilesMap = {};
          if (userIds.length) {
            const { data: profilesData, error: profilesError } = await supabase
              .from("profiles")
              .select("user_id, username")
              .in("user_id", userIds);
            if (profilesError) console.warn("profiles fetch error:", profilesError);
            profilesMap = (profilesData || []).reduce((acc, p) => {
              acc[p.user_id] = p;
              return acc;
            }, {});
          }

          const enrichedReq = realReqs.map((r) => {
            const requesterId = r.user_id ?? r.requested_by ?? null;
            return {
              ...r,
              requester: requesterId ? (profilesMap[requesterId]?.username ?? requesterId) : "Unknown User",
              normalized_user_id: requesterId,
            };
          });

          if (mounted) setRequested(enrichedReq);

          // realtime subscription: update requested list live on insert
          requestedChannel = supabase
            .channel("requested_deals_realtime")
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "requested_deals",
              },
              (payload) => {
                try {
                  const newRow = payload.new;
                  // only add pending ones (fulfilled=false)
                  if (newRow && newRow.fulfilled === false) {
                    const requesterId = newRow.user_id ?? newRow.requested_by ?? null;
                    const newReq = {
                      ...newRow,
                      requester: requesterId || "Unknown User",
                      normalized_user_id: requesterId,
                    };
                    setRequested((prev) => [newReq, ...prev]);
                  }
                } catch (err) {
                  console.error("requested realtime handler error:", err);
                }
              }
            )
            .subscribe();
        }
      } catch (e) {
        console.error("fetchData error:", e);
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (requestedChannel) supabase.removeChannel(requestedChannel);
      // cleanup
    };
  }, [activeTab, user?.id, role]);

  // --- Actions ---
  const deleteDeal = async (id) => {
    if (!confirm("Delete this deal? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
      setDeals((p) => p.filter((d) => d.id !== id));
      setReports((p) => p.filter((r) => r.deal_id !== id));
    } catch (e) {
      setError(`Failed to delete: ${e.message}`);
    }
  };

  const markReviewed = async (reportId) => {
    try {
      const { error } = await supabase.rpc("mark_report_reviewed", {
        target_id: reportId,
      });
      if (error) throw error;
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      alert("✅ Report marked as reviewed!");
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  // Post deal for requested query — mark request fulfilled after confirmation
  const postRequestedDeal = async (query, id) => {
    if (!confirm(`Post a new deal for "${query}"?`)) return;
    try {
      // navigate to post-deal with prefill
      navigate(`/post-deal?prefill=${encodeURIComponent(query)}`);

      // mark the request fulfilled in background (don't block navigation)
      const { error } = await supabase.from("requested_deals").update({ fulfilled: true }).eq("id", id);
      if (error) console.warn("Failed to update requested_deals.fulfilled:", error);
      // remove from UI
      setRequested((p) => p.filter((r) => r.id !== id));
    } catch (e) {
      console.error("postRequestedDeal error:", e);
    }
  };

  // --- Guards / Loading UI ---
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-600 bg-gray-50">
        <Loader2 className="animate-spin mb-4 h-12 w-12" />
        <p className="text-lg">Loading moderator dashboard...</p>
      </div>
    );

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1">Login Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access this panel.</p>
          <a
            href="/"
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
          >
            Go Home
          </a>
        </div>
      </div>
    );

  if (!["moderator", "admin"].includes(role))
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

  // --- UI ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
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
        <button
          onClick={() => setActiveTab("requested")}
          className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeTab === "requested"
              ? "bg-sky-600 text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Requested Deals
        </button>
      </aside>

      {/* Main */}
      <motion.main
        className="flex-1 p-4 md:p-6 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-2xl font-bold mb-6">
          {activeTab === "reports" && "Reported Deals"}
          {activeTab === "deals" && "All Deals"}
          {activeTab === "requested" && "Requested Deals"}
        </h1>

        {/* Requested Deals */}
        {activeTab === "requested" && (
          <div className="grid gap-4">
            {requested.length === 0 ? (
              <p className="text-gray-500">No requested deals found 🎉</p>
            ) : (
              requested.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border rounded-lg shadow p-4 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold text-lg text-sky-700">{req.query}</h3>
                    <p className="text-sm text-gray-600">
                      Requested by{" "}
                      <span className="font-medium">{req.requester}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(req.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => postRequestedDeal(req.query, req.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-all text-sm"
                  >
                    <Store size={16} /> Post Deal
                  </button>
                </div>
              ))
            )}
          </div>
        )}

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
                      <p className="text-gray-600 text-sm mb-2">
                        Reported by: <span className="font-medium">{report.reporter?.username ?? "Unknown"}</span>
                      </p>
                      <p className="text-gray-500 text-sm italic">Reason: {report.reason ?? "No reason provided"}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => deleteDeal(report.deal_id)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm">
                        <Trash2 size={16} /> Delete
                      </button>
                      <button onClick={() => markReviewed(report.id)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm">
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
                  {deal.image && <img src={deal.image} alt={deal.title} className="h-40 w-full object-cover" />}
                  <div className="p-4">
                    <h3 className="font-semibold">{deal.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">{deal.description ? `${deal.description.slice(0, 100)}...` : ""}</p>
                    <div className="flex gap-2">
                      <button onClick={() => deleteDeal(deal.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg flex items-center gap-1 transition-all">
                        <Trash2 size={14} /> Delete
                      </button>
                      <a href={`/deal/${deal.id}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">View</a>
                    </div>
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
