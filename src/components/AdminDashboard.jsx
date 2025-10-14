// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Loader2, Shield, Trash2, CheckCircle2, UserCog } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [reports, setReports] = useState([]);
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);

  // Fetch current user's role
  useEffect(() => {
    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (data) setRole(data.role);
      setLoading(false);
    };
    if (user) fetchRole();
  }, [user]);

  // Redirect non-admin/moderators
  if (!loading && role !== "admin" && role !== "moderator") {
    return (
      <div className="text-center mt-20 text-red-600 text-xl font-semibold">
        Access Denied ❌ — You are not authorized to view this page.
      </div>
    );
  }

  // Fetch reports, deals, users
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (activeTab === "reports") {
        const { data, error } = await supabase
          .from("reports")
          .select("*, deals(title, description, id, image), profiles(username)")
          .order("created_at", { ascending: false });
        if (data) setReports(data);
      } else if (activeTab === "deals") {
        const { data } = await supabase
          .from("deals")
          .select("*")
          .order("created_at", { ascending: false });
        if (data) setDeals(data);
      } else if (activeTab === "users") {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, email, role, created_at");
        if (data) setUsers(data);
      }
      setLoading(false);
    };
    fetchData();
  }, [activeTab]);

  // Handle actions
  const deleteDeal = async (id) => {
    await supabase.from("deals").delete().eq("id", id);
    setDeals(deals.filter((d) => d.id !== id));
    setReports(reports.filter((r) => r.deals?.id !== id));
  };

  const markReviewed = async (id) => {
    await supabase.from("reports").delete().eq("deal_id", id);
    setReports(reports.filter((r) => r.deal_id !== id));
  };

  const changeUserRole = async (id, newRole) => {
    await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    setUsers(users.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        <Loader2 className="animate-spin mr-2" /> Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r shadow-sm p-4 flex flex-col gap-3">
        <h2 className="text-xl font-bold text-sky-600 mb-3 flex items-center gap-2">
          <Shield size={20} /> Admin Panel
        </h2>
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "reports"
              ? "bg-sky-600 text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Reports
        </button>
        <button
          onClick={() => setActiveTab("deals")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "deals"
              ? "bg-sky-600 text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Deals
        </button>
        {role === "admin" && (
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === "users"
                ? "bg-sky-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Users
          </button>
        )}
      </aside>

      {/* Main Content */}
      <motion.main
        className="flex-1 p-6 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-2xl font-bold mb-6">
          {activeTab === "reports" && "Reported Deals"}
          {activeTab === "deals" && "All Deals"}
          {activeTab === "users" && "User Management"}
        </h1>

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="grid gap-4">
            {reports.length === 0 ? (
              <p className="text-gray-500">No reports found 🎉</p>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="bg-white rounded-lg shadow p-4 border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {report.deals?.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        Reported by:{" "}
                        <span className="font-medium">
                          {report.profiles?.username || "Unknown"}
                        </span>
                      </p>
                      <p className="text-gray-500 text-sm italic">
                        Reason: {report.reason}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteDeal(report.deal_id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-all"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                      <button
                        onClick={() => markReviewed(report.deal_id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-all"
                      >
                        <CheckCircle2 size={16} /> Mark Reviewed
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Deals Tab */}
        {activeTab === "deals" && (
          <div className="grid md:grid-cols-2 gap-4">
            {deals.map((deal) => (
              <div key={deal.id} className="bg-white rounded-lg shadow overflow-hidden border">
                <img
                  src={deal.image}
                  alt={deal.title}
                  className="h-40 w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="font-semibold">{deal.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {deal.description?.slice(0, 100)}...
                  </p>
                  <button
                    onClick={() => deleteDeal(deal.id)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && role === "admin" && (
          <div className="grid gap-4">
            {users.map((user) => (
              <div key={user.id} className="bg-white rounded-lg shadow p-4 border">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{user.username}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                      {user.role}
                    </span>
                    <button
                      onClick={() =>
                        changeUserRole(
                          user.id,
                          user.role === "user" ? "moderator" : "user"
                        )
                      }
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm rounded-lg flex items-center gap-1 transition-all"
                    >
                      <UserCog size={14} />{" "}
                      {user.role === "user" ? "Make Mod" : "Revoke"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.main>
    </div>
  );
}
