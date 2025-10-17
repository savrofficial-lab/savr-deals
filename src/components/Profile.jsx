// src/components/Profile.jsx - WITH BADGE DISPLAY
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import UserDealsTable from "./UserDealsTable";
import BadgeDisplay from "./BadgeDisplay";

export default function Profile({ userId }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    full_name: "",
    username: "",
    email: "",
    avatar_url: "",
    bio: "",
    equipped_badge: null,
  });
  const [userCoins, setUserCoins] = useState(0);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let mounted = true;

    (async function load() {
      // Fetch profile WITH equipped_badge
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name,username,email,avatar_url,bio,created_at,equipped_badge")
        .eq("user_id", userId)
        .single();

      // Fetch coins
      const { data: coinsData, error: coinsError } = await supabase
        .from("coins")
        .select("balance")
        .eq("user_id", userId)
        .single();

      if (!mounted) return;

      if (profileError && profileError.code === "PGRST116") {
        setProfile({
          full_name: "",
          username: "",
          email: "",
          avatar_url: "",
          bio: "",
          equipped_badge: null,
        });
      } else if (profileData) {
        setProfile({
          full_name: profileData.full_name || "",
          username: profileData.username || "",
          email: profileData.email || "",
          avatar_url: profileData.avatar_url || "",
          bio: profileData.bio || "",
          equipped_badge: profileData.equipped_badge || null,
        });
      }

      if (coinsData && !coinsError) {
        setUserCoins(coinsData.balance || 0);
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
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-8 px-4">
      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Profile Card */}
        <div className="backdrop-blur-xl bg-white/90 rounded-3xl shadow-2xl overflow-hidden border border-amber-100/50 mb-6">
          {/* Header gradient */}
          <div className="h-32 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600"></div>

          <div className="px-4 sm:px-6 pb-6">
            {/* Avatar and Info */}
            <div className="flex flex-col items-center -mt-12 mb-4">
              <AvatarPreview src={profile.avatar_url} name={profile.full_name} />
              
              <div className="text-center mt-3 w-full">
                {/* Name with Badge */}
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {profile.full_name || "No name yet"}
                  </h2>
                  {profile.equipped_badge && (
                    <BadgeDisplay badgeId={profile.equipped_badge} size="md" />
                  )}
                </div>
                
                <p className="text-amber-600 font-medium">
                  @{profile.username || "username"}
                </p>
                
                {/* Coins Display */}
                <div className="flex items-center justify-center gap-2 mt-2 bg-amber-50 rounded-full px-4 py-2 inline-flex">
                  <span className="text-2xl">🪙</span>
                  <span className="font-bold text-amber-700">{userCoins} Coins</span>
                </div>
                
                <p className="text-gray-600 text-sm leading-relaxed mt-3 px-4">
                  {profile.bio || "No bio yet."}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
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
              
              {/* View Rewards Button */}
              <a
                href="/rewards"
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Rewards
              </a>
              
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
