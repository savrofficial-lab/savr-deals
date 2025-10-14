// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Loader2, Shield, Trash2, CheckCircle2, UserCog, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <div className="bg-red-100 p-4 rounded mb-4">
              <p className="font-semibold mb-2">Error:</p>
              <p className="text-sm text-red-800">{this.state.error?.toString()}</p>
            </div>
            {this.state.errorInfo && (
              <div className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-64">
                <p className="font-semibold mb-2">Stack Trace:</p>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </div>
            )}
            <button 
              onClick={() => window.location.href = '/'}
              className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AdminDashboardContent({ user }) {
  const [activeTab, setActiveTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [reports, setReports] = useState([]);
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);

  const addDebug = (message) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Fetch current user's role
  useEffect(() => {
    const fetchRole = async () => {
      try {
        addDebug("Starting role fetch");
        
        if (!user) {
          addDebug("No user provided");
          setLoading(false);
          return;
        }
        
        addDebug(`User found: ${user.email || user.id}`);
        
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        if (error) {
          addDebug(`Error fetching role: ${error.message}`);
          setError(`Error fetching role: ${error.message}`);
        } else if (data) {
          addDebug(`Role fetched: ${data.role || "no role set"}`);
          setRole(data.role || "");
        } else {
          addDebug("No profile data returned");
          setRole("");
        }
      } catch (e) {
        addDebug(`Unexpected error: ${e.message}`);
        setError(`Unexpected error: ${e.message}`);
      } finally {
        setLoading(false);
      }
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
          {debugInfo.length > 0 && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-left text-xs max-h-40 overflow-auto">
              <p className="font-semibold mb-1">Debug Log:</p>
              {debugInfo.map((log, i) => <p key={i}>{log}</p>)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show access denied
  if (!loading && user && role !== "admin" && role !== "moderator") {
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
          {debugInfo.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded text-left text-xs max-h-40 overflow-auto">
              <p className="font-semibold mb-1">Debug Log:</p>
              {debugInfo.map((log, i) => <p key={i}>{log}</p>)}
            </div>
          )}
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
      if (!user || !role || (role !== "admin" && role !== "moderator")) {
        addDebug("Skipping data fetch - user not authorized");
        return;
      }
      
      setLoading(true);
      setError(null);
      addDebug(`Fetching ${activeTab} data`);
      
      try {
        if (activeTab === "reports") {
          const { data, error } = await supabase
            .from("reports")
            .select("*, deals(title, description, id, image), profiles(username)")
            .order("created_at", { ascending: false });
          
          if (error) {
            addDebug(`Reports error: ${error.message}`);
            setError(`Error loading reports: ${error.message}`);
          } else {
            addDebug(`Loaded ${data?.length || 0} reports`);
            setReports(data || []);
          }
        } else if (activeTab === "deals") {
          const { data, error } = await supabase
            .from("deals")
            .select("*")
            .order("created_at", { ascending: false });
          
          if (error) {
            addDebug(`Deals error: ${error.message}`);
            setError(`Error loading deals: ${error.message}`);
          } else {
            addDebug(`Loaded ${data?.length || 0} deals`);
            setDeals(data || []);
          }
        } else if (activeTab === "users") {
          const { data, error } = await supabase
            .from("profiles")
            .select("user_id, username, email, role, created_at");
          
          if (error) {
            addDebug(`Users error: ${error.message}`);
            setError(`Error loading users: ${error.message}`);
          } else {
            addDebug(`Loaded ${data?.length || 0} users`);
            setUsers(data || []);
          }
        }
      } catch (e) {
        addDebug(`Unexpected error in fetchData: ${e.message}`);
        setError(`Unexpected error: ${e.message}`);
      }
      
      setLoading(false);
    };
    
    fetchData();
  }, [activeTab, user, role]);

  // Handle actions
  const deleteDeal = async (id) => {
    try {
      addDebug(`Deleting deal: ${id}`);
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) {
        setError(`Failed to delete: ${error.message}`);
      } else {
        setDeals(deals.filter((d) => d.id !== id));
        setReports(reports.filter((r) => r.deals?.id !== id));
        addDebug("Deal deleted successfully");
      }
    } catch (e) {
      setError(`Error: ${e.message}`);
    }
  };

  const markReviewed = async (id) => {
    try {
      addDebug(`Marking report as reviewed: ${id}`);
      const { error } = await supabase.from("reports").delete().eq("deal_id", id);
      if (error) {
        setError(`Failed to mark reviewed: ${error.message}`);
      } else {
        setReports(reports.filter((r) => r.deal_id !== id));
        addDebug("Report marked as reviewed");
      }
    } catch (e) {
      setError(`Error: ${e.message}`);
    }
  };

  const changeUserRole = async (id, newRole) => {
    try {
      addDebug(`Changing user role: ${id} to ${newRole}`);
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("user_id", id);
      if (error) {
        setError(`Failed to change role: ${error.message}`);
      } else {
        setUsers(users.map((u) => (u.user_id === id ? { ...u, role: newRole } : u)));
        addDebug("User role changed successfully");
      }
    } catch (e) {
      setError(`Error: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-600 bg-gray-50 p-4">
        <Loader2 className="animate-spin mb-4 h-12 w-12" />
        <p className="text-lg mb-4">Loading dashboard...</p>
        {debugInfo.length > 0 && (
          <div className="p-4 bg-blue-50 rounded text-sm max-w-2xl w-full max-h-60 overflow-auto">
            <p className="font-semibold mb-2">Debug Log:</p>
            {debugInfo.map((log, i) => <p key={i} className="text-xs">{log}</p>)}
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
            <p className="text-red-800 text-sm flex-1">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 text-xl"
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
                    <div className="flex gap-2 flex-wrap">
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
                <div key={user.user_id} className="bg-white rounded-lg shadow p-4 border">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium">{user.username || "No username"}</h3>
                      <p className="text-sm text-gray-500">{user.email || "No email"}</p>
                      <p className="text-xs text-gray-400">
                        Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                        {user.role || "user"}
                      </span>
                      <button
                        onClick={() =>
                          changeUserRole(
                            user.user_id,
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

export default function AdminDashboard({ user }) {
  return (
    <ErrorBoundary>
      <AdminDashboardContent user={user} />
    </ErrorBoundary>
  );
        }
