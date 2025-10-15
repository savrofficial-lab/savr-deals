// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [reports, setReports] = useState([]);
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
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
          .eq("user_id", user.id)
          .single();
        
        if (error) {
          console.error("Error:", error);
          setError(error.message);
        } else if (data) {
          setRole(data.role || "");
        }
      } catch (e) {
        console.error("Error:", e);
        setError(e.message);
      }
      
      setLoading(false);
    };
    
    fetchRole();
  }, [user]);

  // Show login required
  if (!loading && !user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Login Required</h2>
        <p>Please log in to access the admin dashboard.</p>
        <a href="/" style={{ color: '#f59e0b', textDecoration: 'underline' }}>Go to Home</a>
      </div>
    );
  }

  // Show access denied
  if (!loading && user && role !== "admin" && role !== "moderator") {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Access Denied</h2>
        <p>You are not authorized to view this page.</p>
        <div style={{ background: '#f3f4f6', padding: '15px', margin: '20px auto', maxWidth: '400px', borderRadius: '8px' }}>
          <p><strong>User:</strong> {user.email || user.id}</p>
          <p><strong>Your Role:</strong> {role || "Not set"}</p>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>
            You need 'admin' or 'moderator' role to access this page.
          </p>
        </div>
        <a href="/" style={{ color: '#f59e0b', textDecoration: 'underline' }}>Go to Home</a>
      </div>
    );
  }

  // Fetch data
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
            setError(error.message);
          } else {
            setReports(data || []);
          }
        } else if (activeTab === "deals") {
          const { data, error } = await supabase
            .from("deals")
            .select("*")
            .order("created_at", { ascending: false });
          
          if (error) {
            setError(error.message);
          } else {
            setDeals(data || []);
          }
        } else if (activeTab === "users") {
          const { data, error } = await supabase
            .from("profiles")
            .select("user_id, username, email, role, created_at");
          
          if (error) {
            setError(error.message);
          } else {
            setUsers(data || []);
          }
        }
      } catch (e) {
        setError(e.message);
      }
      
      setLoading(false);
    };
    
    fetchData();
  }, [activeTab, user, role]);

  // Actions
  const deleteDeal = async (id) => {
    try {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (!error) {
        setDeals(deals.filter((d) => d.id !== id));
        setReports(reports.filter((r) => r.deals?.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markReviewed = async (id) => {
    try {
      const { error } = await supabase.from("reports").delete().eq("deal_id", id);
      if (!error) {
        setReports(reports.filter((r) => r.deal_id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const changeUserRole = async (id, newRole) => {
    try {
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("user_id", id);
      if (!error) {
        setUsers(users.map((u) => (u.user_id === id ? { ...u, role: newRole } : u)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{ width: '240px', background: 'white', borderRight: '1px solid #e5e7eb', padding: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0284c7', marginBottom: '20px' }}>
          🛡️ Admin Panel
        </h2>
        <button
          onClick={() => setActiveTab("reports")}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === "reports" ? '#0284c7' : '#f3f4f6',
            color: activeTab === "reports" ? 'white' : '#374151',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Reports
        </button>
        <button
          onClick={() => setActiveTab("deals")}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === "deals" ? '#0284c7' : '#f3f4f6',
            color: activeTab === "deals" ? 'white' : '#374151',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Deals
        </button>
        {role === "admin" && (
          <button
            onClick={() => setActiveTab("users")}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === "users" ? '#0284c7' : '#f3f4f6',
              color: activeTab === "users" ? 'white' : '#374151',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Users
          </button>
        )}
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        {error && (
          <div style={{ background: '#fee2e2', border: '2px solid #ef4444', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <p style={{ color: '#dc2626' }}>Error: {error}</p>
          </div>
        )}

        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>
          {activeTab === "reports" && "Reported Deals"}
          {activeTab === "deals" && "All Deals"}
          {activeTab === "users" && "User Management"}
        </h1>

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div>
            {reports.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No reports found 🎉</p>
            ) : (
              reports.map((report) => (
                <div key={report.id} style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '15px', border: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontWeight: '600', fontSize: '18px', marginBottom: '10px' }}>
                    {report.deals?.title || "Unknown Deal"}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>
                    Reported by: <strong>{report.profiles?.username || "Unknown"}</strong>
                  </p>
                  <p style={{ fontSize: '14px', color: '#6b7280', fontStyle: 'italic', marginBottom: '15px' }}>
                    Reason: {report.reason}
                  </p>
                  <button
                    onClick={() => deleteDeal(report.deal_id)}
                    style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', marginRight: '10px', cursor: 'pointer' }}
                  >
                    🗑️ Delete
                  </button>
                  <button
                    onClick={() => markReviewed(report.deal_id)}
                    style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    ✓ Mark Reviewed
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Deals Tab */}
        {activeTab === "deals" && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {deals.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No deals found</p>
            ) : (
              deals.map((deal) => (
                <div key={deal.id} style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                  {deal.image && (
                    <img src={deal.image} alt={deal.title} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: '15px' }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '8px' }}>{deal.title}</h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                      {deal.description?.slice(0, 100)}...
                    </p>
                    <button
                      onClick={() => deleteDeal(deal.id)}
                      style={{ padding: '6px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && role === "admin" && (
          <div>
            {users.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No users found</p>
            ) : (
              users.map((user) => (
                <div key={user.user_id} style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '15px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontWeight: '500' }}>{user.username || "No username"}</h3>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>{user.email || "No email"}</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                      Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ padding: '4px 8px', background: '#f3f4f6', fontSize: '12px', borderRadius: '4px' }}>
                      {user.role || "user"}
                    </span>
                    <button
                      onClick={() => changeUserRole(user.user_id, user.role === "user" ? "moderator" : "user")}
                      style={{ padding: '6px 12px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                    >
                      ⚙️ {user.role === "user" ? "Make Mod" : "Revoke"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
    }
