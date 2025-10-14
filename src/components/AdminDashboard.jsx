// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Loader2, Shield, Trash2, CheckCircle2, UserCog, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [reports, setReports] = useState([]);
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState("");

  // Fetch current user's role
  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setDebugInfo("No user found - please log in");
        setLoading(false);
        return;
      }
      
      setDebugInfo(`Logged in as: ${user.email || user.id}`);
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (error) {
          setError(`Error fetching role: ${error.message}`);
          setDebugInfo(`${debugInfo} | Error: ${error.message}`);
        } else if (data) {
          setRole(data.role || "user");
          setDebugInfo(`${debugInfo} | Role: ${data.role || "user"}`);
        } else {
          setDebugInfo(`${debugInfo} | No profile found`);
        }
      } catch (e) {
        setError(`Unexpected error: ${e.message}`);
      }
      
      setLoading(false);
    };
    fetchRole();
  }, [user]);

  // Show login required message
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-amber-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Login Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access the admin dashboard.</p>
          <a 
            href="/" 
            className="inline-block px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // Show access denied
  if (!loading && user && role && role !== "admin" && role !== "moderator") {
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
          <a 
            href="/" 
            className="inline-block px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // Fetch reports, deals, users
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !role || (role !== "admin" && role !== "moderator")) return;
      
      setLoading(true);
      setError(null);
      
      try {
        if (activeTab === "reports") {
          const { data, error } = await supabase
            .from("reports")
            .select("*, deals(title, description, id, image), profiles(username)")
            .order("created_at", { ascending: false });
          
          if (error) {
            setError(`Error loading reports: ${error.message}`);
          } else {
            setReports(data || []);
          }
        } else if (activeTab === "deals") {
          const { data, error } = await supabase
            .from("deals")
            .select("*")
            .order("created_at", { ascending: false });
          
          if (error) {
            setError(`Error loading deals: ${error.message}`);
          } else {
            setDeals(data || []);
          }
        } else if (activeTab === "users") {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, username, email, role, created_at");
          
          if (error) {
            setError(`Error loading users: ${error.message}`);
          } else {
            setUsers(data || []);
          }
        }
      } catch (e) {
        setError(`Unexpected error: ${e.message}`);
      }
      
      setLoading(false);
    };
    fetchData();
  }, [activeTab, user, role]);

  // Handle actions
  const deleteDeal = async (id) => {
    try {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) {
        setError(`Failed to delete: ${error.message}`);
      } else {
        setDeals(deals.filter((d) => d.id !== id));
        setReports(reports.filter((r) => r.deals?.id !== id));
      }
    } catch (e) {
      setError(`Error: ${e.message}`);
    }
  };

  const markReviewed = async (id) => {
    try {
      const { error } = await supabase.from("reports").delete().eq("deal_id", id);
      if (error) {
        setError(`Failed to mark reviewed: ${error.message}`);
      } else {
        setReports(reports.filter((r) => r.deal_id !== id));
      }
    } catch (e) {
      setError(`Error: ${e.message}`);
    }
  };

  const changeUserRole = async (id, newRole) => {
    try {
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", id);
      if (error) {
        setError(`Failed to change role: ${error.message}`);
      } else {
        setUsers(users.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
      }
    } catch (e) {
      setError(`Error: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-600 bg-gray-50">
        <Loader2 className="animate-spin mb-4 h-12 w-12" />
        <p className="text-lg">Loading dashboard...</p>
        {debugInfo && (
          <div className="mt-4 p-4 bg-blue-50 rounded text-sm max-w-md">
            <p className="font-semibold mb-1">Debug Info:</p>
            <p className="text-xs">{debugInfo}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Error Banner */}
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
          <Shield size={20} /> Admin Panel
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
        {role === "admin" && (
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
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
        className="flex-1 p-4 md:p-6 overflow-y-auto"
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
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {report.deals?.title || "Unknown Deal"}
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

        {/* Deals Tab */}
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
                      alt={deal.title}
                      className="h-40 w-full object-cover"
                    />
                  )}
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
              ))
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && role === "admin" && (
          <div className="grid gap-4">
            {users.length === 0 ? (
              <p className="text-gray-500">No users found</p>
            ) : (
              users.map((user) => (
                <div key={user.id} className="bg-white rounded-lg shadow p-4 border">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium">{user.username || "No username"}</h3>
                      <p className="text-sm text-gray-500">{user.email || "No email"}</p>
                      <p className="text-xs text-gray-400">
                        Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                        {user.role || "user"}
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
              ))
            )}
          </div>
        )}
      </motion.main>
    </div>
  );
                            }
