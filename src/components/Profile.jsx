// src/components/Profile.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import UserDealsTable from "./UserDealsTable";

export default function Profile({ userId }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    full_name: "",
    username: "",
    email: "",
    avatar_url: "",
    bio: "",
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let mounted = true;

    (async function load() {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,username,email,avatar_url,bio,created_at")
        .eq("user_id", userId)
        .single();

      if (!mounted) return;

      if (error && error.code === "PGRST116") {
        console.warn("⚠️ No profile row yet for userId:", userId);
        setProfile({
          full_name: "",
          username: "",
          email: "",
          avatar_url: "",
          bio: "",
        });
      } else if (data) {
        setProfile({
          full_name: data.full_name || "",
          username: data.username || "",
          email: data.email || "",
          avatar_url: data.avatar_url || "",
          bio: data.bio || "",
        });
      } else if (error) {
        console.error("❌ Profile load error:", error);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  async function saveProfile(e) {
    e.preventDefault();
    if (!userId) return alert("Sign in first.");
    setLoading(true);

    const payload = {
      user_id: userId,
      full_name: profile.full_name,
      username: profile.username || null,
      email: profile.email || null,
      avatar_url: profile.avatar_url || null,
      bio: profile.bio || null,
    };

    const { error } = await supabase.from("profiles").upsert(payload);
    if (error) {
      alert("Error saving profile: " + error.message);
      console.error(error);
    } else {
      alert("Profile saved.");
      setEditing(false);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  const AvatarPreview = ({ src, name }) => (
    <div className="relative group">
      {src ? (
        <img 
          src={src} 
          alt="avatar" 
          className="h-24 w-24 rounded-2xl object-cover shadow-lg ring-4 ring-white group-hover:scale-105 transition-transform duration-300" 
        />
      ) : (
        <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-white group-hover:scale-105 transition-transform duration-300">
          {name?.charAt(0) || "A"}
        </div>
      )}
      {editing && (
        <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-amber-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-8 px-4">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Profile Card */}
        <div className="backdrop-blur-xl bg-white/90 rounded-3xl shadow-2xl overflow-hidden border border-amber-100/50 mb-6">
          {/* Header gradient */}
          <div className="h-32 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
          </div>

          <div className="px-4 sm:px-6 pb-6">
            {/* Avatar and Info - Mobile Optimized */}
            <div className="flex flex-col items-center -mt-12 mb-4">
              <AvatarPreview src={profile.avatar_url} name={profile.full_name} />
              
              <div className="text-center mt-3 w-full">
                <h2 className="text-2xl font-bold text-gray-800">
                  {profile.full_name || "No name yet"}
                </h2>
                <p className="text-amber-600 font-medium">
                  @{profile.username || "username"}
                </p>
                <p className="text-gray-600 text-sm leading-relaxed mt-2 px-4">
                  {profile.bio || "No bio yet."}
                </p>
              </div>
            </div>

            {/* Action Buttons - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => setEditing(!editing)}
                className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {editing ? "Cancel" : "Edit"}
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>

            {/* Edit Form */}
            {editing && (
              <div className="mt-6 space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Full Name</label>
                    <input
                      value={profile.full_name}
                      onChange={(e) => setProfile(p => ({ ...p, full_name: e.target.value }))}
                      placeholder="Enter your full name"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200 outline-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Username</label>
                    <input
                      value={profile.username}
                      onChange={(e) => setProfile(p => ({ ...p, username: e.target.value }))}
                      placeholder="Choose a unique username"
                      type="text"
                      autoComplete="off"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200 outline-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Email</label>
                    <input
                      value={profile.email}
                      onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                      placeholder="your.email@example.com"
                      type="email"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200 outline-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Avatar URL</label>
                    <input
                      value={profile.avatar_url}
                      onChange={(e) => setProfile(p => ({ ...p, avatar_url: e.target.value }))}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200 outline-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Bio</label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all duration-200 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={saveProfile}
                    className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="w-full px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Your Posts Section */}
        <div className="backdrop-blur-xl bg-white/90 rounded-3xl shadow-2xl overflow-hidden border border-amber-100/50">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Your Posts
            </h3>
          </div>
          
          <div className="p-4 sm:p-6">
            {userId && <UserDealsTable userId={userId} />}
          </div>
        </div>
      </div>
    </div>
  );
}
