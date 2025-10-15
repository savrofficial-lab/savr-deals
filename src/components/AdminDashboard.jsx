// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Loader2,
  Shield,
  Trash2,
  CheckCircle2,
  UserCog,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";

/**
 * AdminDashboard
 *
 * - Expects prop `user` (supabase auth user object)
 * - Only allows access to roles "admin" and "moderator"
 * - Tabs: reports, deals, users
 *
 * Note: this version avoids complex DB join syntax to prevent runtime SQL errors.
 * It loads reports, then fetches related deals and reporter profiles with safe queries.
 */

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [reports, setReports] = useState([]); // enriched reports: { ...report, deal, reporter }
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);

  const addDebug = (txt) => setDebugInfo((p) => [...p, `${new Date().toLocaleTimeString()}: ${txt}`]);

  // Fetch current user's role
  useEffect(() => {
    let mounted = true;
    const fetchRole = async () => {
      setLoading(true);
      setError(null);
      if (!user) {
        addDebug("No user logged in");
        setLoading(false);
        return;
      }

      addDebug(`Fetching role for user: ${user.id || user.email}`);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error) {
          addDebug(`Role fetch error: ${error.message}`);
          if (mounted) {
            setRole("");
            setError(`Error fetching role: ${error.message}`);
          }
        } else if (data) {
          addDebug(`Role fetched: ${data.role || "user"}`);
          if (mounted) setRole(data.role || "user");
        } else {
          addDebug("No profile row for user");
          if (mounted) setRole("");
        }
      } catch (e) {
        addDebug(`Unexpected role fetch error: ${e.message}`);
        if (mounted) setError(`Unexpected error: ${e.message}`);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRole();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Access guard UI handled below (after role fetch)

  // Fetch tab data - safe, stepwise fetching
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setError(null);
      if (!user || !role || (role !== "admin" && role !== "moderator")) {
        addDebug("Skipping fetchData — not authorized or missing role/user");
        return;
      }

      setLoading(true);
      addDebug(`Fetching data for tab: ${activeTab}`);

      try {
        if (activeTab === "reports") {
          // 1) fetch raw reports (basic fields)
          const { data: rawReports, error: rawErr } = await supabase
            .from("reports")
            .select("id, deal_id, reported_by, reason, status, created_at")
            .order("created_at", { ascending: false });

          if (rawErr) throw rawErr;

          const reportsList = Array.isArray(rawReports) ? rawReports : [];

          // If no reports, update state and return
          if (reportsList.length === 0) {
            if (isMounted) {
              setReports([]);
              addDebug("No reports found");
            }
            return;
          }

          // 2) fetch all related deals in one query (if any)
          const dealIds = Array.from(new Set(reportsList.map((r) => r.deal_id).filter(Boolean)));
          let dealsMap = {};
          if (dealIds.length > 0) {
            const { data: dealsData, error: dealsError } = await supabase
              .from("deals")
              .select("id, title, description, image, posted_by, created_at")
              .in("id", dealIds);

            if (dealsError) {
              // don't crash — just continue without details
              addDebug(`Could not load deals for reports: ${dealsError.message}`);
              dealsMap = {};
            } else {
              dealsMap = (dealsData || []).reduce((acc, d) => {
                acc[d.id] = d;
                return acc;
              }, {});
            }
          }

          // 3) fetch reporter profiles
          const reporterIds = Array.from(new Set(reportsList.map((r) => r.reported_by).filter(Boolean)));
          let profilesMap = {};
          if (reporterIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from("profiles")
              .select("user_id, username, avatar_url")
              .in("user_id", reporterIds);

            if (profilesError) {
              addDebug(`Could not load reporter profiles: ${profilesError.message}`);
              profilesMap = {};
            } else {
              profilesMap = (profilesData || []).reduce((acc, p) => {
                acc[p.user_id] = p;
                return acc;
              }, {});
            }
          }

          // Merge results
          const enriched = reportsList.map((r) => ({
            ...r,
            deal: dealsMap[r.deal_id] ?? null,
            reporter: profilesMap[r.reported_by] ?? null,
          }));

          if (isMounted) {
            setReports(enriched);
            addDebug(`Loaded ${enriched.length} reports (enriched)`);
          }
        } else if (activeTab === "deals") {
          const { data: dealsData, error: dealsError } = await supabase
            .from("deals")
            .select("id, title, description, image, posted_by, created_at")
            .order("created_at", { ascending: false });

          if (dealsError) throw dealsError;
          if (isMounted) {
            setDeals(dealsData || []);
            addDebug(`Loaded ${dealsData?.length ?? 0} deals`);
          }
        } else if (activeTab === "users") {
          const { data: usersData, error: usersError } = await supabase
            .from("profiles")
            .select("user_id, username, email, role, created_at");

          if (usersError) throw usersError;
          if (isMounted) {
            setUsers(usersData || []);
            addDebug(`Loaded ${usersData?.length ?? 0} users`);
          }
        }
      } catch (e) {
        addDebug(`fetchData error: ${e?.message || "unknown"}`);
        if (isMounted) setError(`Error loading ${activeTab}: ${e?.message || "unknown error"}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [activeTab, user?.id, role]);

  // ACTIONS

  // Delete a deal (admin/mod)
  const deleteDeal = async (id) => {
    if (!confirm("Delete this deal? This cannot be undone.")) return;
    setError(null);
    addDebug(`Deleting deal ${id}...`);
    try {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;

      // Remove from UI
      setDeals((p) => p.filter((d) => d.id !== id));
      setReports((p) => p.filter((r) => r.deal_id !== id));
      addDebug("Deal deleted");
    } catch (e) {
      addDebug(`Delete failed: ${e.message}`);
      setError(`Failed to delete: ${e?.message || "unknown error"}`);
    }
  };

  // Mark a report as reviewed (update status)
  const markReviewed = async (reportId) => {
    setError(null);
    addDebug(`Marking report ${reportId} reviewed...`);
    try {
      const { error } = await supabase.from("reports").update({ status: "reviewed" }).eq("id", reportId);
      if (error) throw error;

      setReports((p) => p.map((r) => (r.id === reportId ? { ...r, status: "reviewed" } : r)));
      addDebug(`Report ${reportId} marked reviewed`);
    } catch (e) {
      addDebug(`Mark reviewed failed: ${e.message}`);
      setError(`Failed to mark reviewed: ${e?.message || "unknown error"}`);
    }
  };

  // Change user role (admin-only)
  const changeUserRole = async (id, newRole) => {
    setError(null);
    addDebug(`Changing role for ${id} -> ${newRole}`);
    try {
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("user_id", id);
      if (error) throw error;

      setUsers((p) => p.map((u) => (u.user_id === id ? { ...u, role: newRole } : u)));
      addDebug("Role updated");
    } catch (e) {
      addDebug(`Change role failed: ${e.message}`);
      setError(`Failed to change role: ${e?.message || "unknown error"}`);
    }
  };

  // UI: loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-600 bg-gray-50">
        <Loader2 className="animate-spin mb-4 h-12 w-12" />
        <p className="text-lg">Loading dashboard...</p>
        {debugInfo.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded text-sm max-w-md">
            <p className="font-semibold mb-1">Debug Info:</p>
            {debugInfo.slice(-6).map((d, i) => <p key={i} className="text-xs">{d}</p>)}
          </div>
        )}
      </div>
    );
  }

  // Access guards
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-amber-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Login Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access the admin dashboard.</p>
          <a href="/" className="inline-block px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition">
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  if (user && role && role !== "admin" && role !== "moderator") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You are not authorized to view this page.</p>
          <div className="bg-gray-100 p-3 rounded text-sm text-left mb-4">
            <p><strong>User:</strong> {user.email || user.id}</p>
            <p><strong>Your Role:</strong> {role || "Not set"}</p>
            <p className="text-xs text-gray-500 mt-2">You need 'admin' or 'moderator' role to access this page.</p>
          </div>
          <a href="/" className="inline-block px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition">
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* error banner */}
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-red-100 border-b-2 border-red-400 p-4 z-50">
          <div className="flex items-center gap-2 max-w-5xl mx-auto">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">✕</button>
          </div>
        </div>
      )}

      {/* sidebar */}
      <aside className="w-full md:w-60 bg-white border-b md:border-r shadow-sm p-4 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-x-visible">
        <h2 className="text-xl font-bold text-sky-600 mb-0 md:mb-3 flex items-center gap-2 whitespace-nowrap">
          <Shield size={20} /> Admin Panel
        </h2>

        <button onClick={() => setActiveTab("reports")} className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "reports" ? "bg-sky-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
          Reports
        </button>

        <button onClick={() => setActiveTab("deals")} className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "deals" ? "bg-sky-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
          Deals
        </button>

        {role === "admin" && (
          <button onClick={() => setActiveTab("users")} className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "users" ? "bg-sky-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            Users
          </button>
        )}
      </aside>

      {/* main content */}
      <motion.main className="flex-1 p-4 md:p-6 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold mb-6">
          {activeTab === "reports" && "Reported Deals"}
          {activeTab === "deals" && "All Deals"}
          {activeTab === "users" && "User Management"}
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
                      <p className="text-gray-600 text-sm mb-2">
                        Reported by: <span className="font-medium">{report.reporter?.username ?? "Unknown"}</span>
                      </p>
                      <p className="text-gray-500 text-sm italic">Reason: {report.reason ?? "No reason provided"}</p>
                      <p className="text-xs text-gray-400 mt-2">Status: {report.status ?? "pending"}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => deleteDeal(report.deal_id)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-all text-sm">
                        <Trash2 size={16} /> Delete
                      </button>
                      <button onClick={() => markReviewed(report.id)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-all text-sm">
                        <CheckCircle2 size={16} /> Reviewed
                      </button>
                      <a href={`/deal/${report.deal_id}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
                        View Deal
                      </a>
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
                  {deal.image ? <img src={deal.image} alt={deal.title || "deal image"} className="h-40 w-full object-cover" /> : null}
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

        {/* Users */}
        {activeTab === "users" && role === "admin" && (
          <div className="grid gap-4">
            {users.length === 0 ? (
              <p className="text-gray-500">No users found</p>
            ) : (
              users.map((u) => (
                <div key={u.user_id} className="bg-white rounded-lg shadow p-4 border">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium">{u.username || "No username"}</h3>
                      <p className="text-sm text-gray-500">{u.email || "No email"}</p>
                      <p className="text-xs text-gray-400">Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString() : "Unknown"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-xs rounded">{u.role || "user"}</span>
                      <button onClick={() => changeUserRole(u.user_id, u.role === "user" ? "moderator" : "user")} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm rounded-lg flex items-center gap-1 transition-all">
                        <UserCog size={14} /> {u.role === "user" ? "Make Mod" : "Revoke"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* debug area */}
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
