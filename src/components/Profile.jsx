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
    console.log("👤 Profile mounted with userId:", userId);
    
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
        console.log("✅ Profile data loaded:", data);
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

    console.log("💾 Saving profile payload:", payload);

    // upsert uses primary key (user_id) to insert or update
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

  // small UI for avatar preview
  const AvatarPreview = ({ src }) =>
    src ? (
      <img src={src} alt="avatar" className="h-20 w-20 rounded-full object-cover" />
    ) : (
      <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
        A
      </div>
    );

  if (!userId) {
    return (
      <div className="py-8 text-center text-gray-500">
        You must be signed in to view your profile. Tap the You tab and sign in.
      </div>
    );
  }

  if (loading) return <p className="text-center text-gray-500 py-8">Loading profile…</p>;

  return (
    <div className="py-6 max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center gap-4">
          <AvatarPreview src={profile.avatar_url} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">
                  {profile.full_name || "No name yet"}
                </div>
                <div className="text-sm text-gray-500">
                  @{profile.username || "username"}
                </div>
              </div>
              <button
                onClick={() => setEditing((s) => !s)}
                className="px-3 py-1 text-sm border rounded"
              >
                {editing ? "Cancel" : "Edit"}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {profile.bio || "No bio yet."}
            </p>
          </div>
        </div>

        {editing && (
          <form onSubmit={saveProfile} className="mt-4 space-y-3">
            <input
              value={profile.full_name}
              onChange={(e) =>
                setProfile((p) => ({ ...p, full_name: e.target.value }))
              }
              placeholder="Full name"
              className="w-full border rounded px-3 py-2"
            />
            <input
              value={profile.username}
              onChange={(e) =>
                setProfile((p) => ({ ...p, username: e.target.value }))
              }
              placeholder="Username (unique)"
              type="text"
              autoComplete="off"
              className="w-full border rounded px-3 py-2"
            />
            <input
              value={profile.email}
              onChange={(e) =>
                setProfile((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="Email"
              type="email"
              className="w-full border rounded px-3 py-2"
            />
            <input
              value={profile.avatar_url}
              onChange={(e) =>
                setProfile((p) => ({ ...p, avatar_url: e.target.value }))
              }
              placeholder="Avatar image URL (optional)"
              className="w-full border rounded px-3 py-2"
            />
            <textarea
              value={profile.bio}
              onChange={(e) =>
                setProfile((p) => ({ ...p, bio: e.target.value }))
              }
              placeholder="Short bio"
              className="w-full border rounded px-3 py-2"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-yellow-800 text-white rounded"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* show this user's posted deals */}
      <div className="mt-6">
        <h3 className="font-semibold mb-3">Your posts</h3>
        <UserDealsTable userId={userId} />
      </div>
    </div>
  );
}
