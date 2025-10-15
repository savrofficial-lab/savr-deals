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

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [reports, setReports] = useState([]);
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);

  const addDebug = (msg) =>
    setDebugInfo((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  // fetch role
  useEffect(() => {
    let mounted = true;
    const fetchRole = async () => {
      if (!user) return setLoading(false);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        if (error) throw error;
        if (mounted) setRole(data?.role || "user");
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchRole();
    return () => (mounted = false);
  }, [user?.id]);

  // fetch data for each tab
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      if (!user || !["admin", "moderator"].includes(role)) return;
      setLoading(true);
      setError(null);
      try {
        if (activeTab === "reports") {
          const { data: rawReports, error: reportsErr } = await supabase
            .from("reports")
            .select("id, deal_id, reported_by, reason, status, created_at")
            .order("created_at", { ascending: false });
          if (reportsErr) throw reportsErr;

          const dealIds = [
            ...new Set(rawReports.map((r) => r.deal_id).filter(Boolean)),
          ];
          const reporterIds = [
            ...new Set(rawReports.map((r) => r.reported_by).filter(Boolean)),
          ];

          let dealsMap = {};
          let profilesMap = {};

          if (dealIds.length) {
            const { data: dealsData } = await supabase
              .from("deals")
              .select("id, title, description, image, posted_by, created_at")
              .in("id", dealIds);
            dealsMap = (dealsData || []).reduce((acc, d) => {
              acc[d.id] = d;
              return acc;
            }, {});
          }

          if (reporterIds.length) {
            const { data: profs } = await supabase
              .from("profiles")
              .select("user_id, username, avatar_url")
              .in("user_id", reporterIds);
            profilesMap = (profs || []).reduce((acc, p) => {
              acc[p.user_id] = p;
              return acc;
            }, {});
          }

          const enriched = rawReports.map((r) => ({
            ...r,
            deal: dealsMap[r.deal_id],
            reporter: profilesMap[r.reported_by],
          }));
          if (mounted) setReports(enriched);
        } else if (activeTab === "deals") {
          const { data, error } = await supabase
            .from("deals")
            .select("id, title, description, image, posted_by, created_at")
            .order("created_at", { ascending: false });
          if (error) throw error;
          if (mounted) setDeals(data || []);
        } else if (activeTab === "users" && role === "admin") {
          const { data, error } = await supabase
            .from("profiles")
            .select("user_id, username, email, role, created_at");
          if (error) throw error;
          if (mounted) setUsers(data || []);
        }
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => (mounted = false);
  }, [activeTab, role, user?.id]);

  const deleteDeal = async (id) => {
    if (!confirm("Delete this deal?")) return;
    try {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
      setDeals((prev) => prev.filter((d) => d.id !== id));
      setReports((prev) => prev.filter((r) => r.deal_id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const markReviewed = async (reportId) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: "reviewed" })
        .eq("id", reportId);
      if (error) throw error;
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, status: "reviewed" } : r
        )
      );
    } catch (e) {
      setError(e.message);
    }
  };

  const changeUserRole = async (id, newRole) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ roles: newRole }) // 👈 change to 'role' if that's the actual column name
      .eq("user_id", id)
      .select();

    if (error) throw error;

    console.log("Updated role:", data); // debug in console
    setUsers((prev) =>
      prev.map((u) => (u.user_id === id ? { ...u, roles: newRole } : u))
    );
  } catch (e) {
    console.error("Error:", e.message);
    setError(e.message);
  }
};

  // guards
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-600">
        <Loader2 className="animate-spin mb-4 h-12 w-12" />
        <p>Loading dashboard...</p>
      </div>
    );

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1">Login Required</h2>
          <p className="text-gray-600 mb-4">
            Please log in to access the admin dashboard.
          </p>
          <a
            href="/"
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Go Home
          </a>
        </div>
      </div>
    );

  if (!["admin", "moderator"].includes(role))
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1">Access Denied</h2>
          <p className="text-gray-600 mb-4">You are not authorized.</p>
          <a
            href="/"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Home
          </a>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-red-100 border-b border-red-400 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
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

      {/* sidebar */}
      <aside className="w-full md:w-60 bg-white border-b md:border-r shadow-sm p-4 flex flex-row md:flex-col gap-3 overflow-x-auto">
        <h2 className="text-xl font-bold text-sky-600 mb-2 flex items-center gap-2">
          <Shield size={20} /> Admin Panel
        </h2>
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === "reports"
              ? "bg-sky-600 text-white shadow-md"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          Reports
        </button>
        <button
          onClick={() => setActiveTab("deals")}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === "deals"
              ? "bg-sky-600 text-white shadow-md"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          Deals
        </button>
        {role === "admin" && (
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "users"
                ? "bg-sky-600 text-white shadow-md"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Users
          </button>
        )}
      </aside>

      <motion.main
        className="flex-1 p-4 md:p-6 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
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
              reports.map((r) => (
                <div key={r.id} className="bg-white rounded-lg shadow p-4 border">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {r.deal?.title ?? "Unknown Deal"}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Reported by:{" "}
                        <span className="font-medium">
                          {r.reporter?.username ?? "Unknown"}
                        </span>
                      </p>
                      <p className="text-gray-500 text-sm italic">
                        Reason: {r.reason ?? "No reason"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Status: {r.status || "pending"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteDeal(r.deal_id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                      <button
                        onClick={() => markReviewed(r.id)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center gap-1"
                      >
                        <CheckCircle2 size={14} /> Reviewed
                      </button>
                      <a
                        href={`/deal/${r.deal_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                      >
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
              deals.map((d) => (
                <div
                  key={d.id}
                  className="bg-white rounded-lg shadow overflow-hidden border"
                >
                  {d.image && (
                    <img
                      src={d.image}
                      alt={d.title}
                      className="h-40 w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold">{d.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {d.description?.slice(0, 100)}...
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteDeal(d.id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                      <a
                        href={`/deal/${d.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                      >
                        View
                      </a>
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
                <div
                  key={u.user_id}
                  className="bg-white rounded-lg shadow p-4 border"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium">{u.username}</h3>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      <p className="text-xs text-gray-400">
                        Joined:{" "}
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString()
                          : "Unknown"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                        {u.role || "user"}
                      </span>
                      <button
                        onClick={() =>
                          changeUserRole(
                            u.user_id,
                            u.role === "user" ? "moderator" : "user"
                          )
                        }
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm rounded-lg flex items-center gap-1"
                      >
                        <UserCog size={14} />{" "}
                        {u.role === "user" ? "Make Mod" : "Revoke"}
                      </button>
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
