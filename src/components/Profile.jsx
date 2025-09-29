// src/components/Profile.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Profile({ userId, userEmail }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    full_name: "",
    username: "",
    avatar_url: "",
    bio: "",
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,username,avatar_url,bio,created_at")
        .eq("user_id", userId)
        .single();

      if (!mounted) return;
      if (error && error.code === "PGRST116") {
        // no row yet
        setProfile({
          full_name: "",
          username: "",
          avatar_url: "",
          bio: "",
        });
      } else if (data) {
        setProfile({
          full_name: data.full_name || "",
          username: data.username || "",
          avatar_url: data.avatar_url || "",
          bio: data.bio || "",
        });
      } else if (error) {
        console.error("Profile load error:", error);
      }
      setLoading(false);
    })();
    return () => (mounted = false);
  }, [userId]);

  async function saveProfile(e) {
    e.preventDefault();
    if (!userId) return alert("Sign in first.");
    setLoading(true);
    const payload = {
      user_id: userId,
      full_name: profile.full_name,
      username: profile.username || null,
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

  const AvatarPreview = ({ src }) =>
    src ? (
      <img src={src} alt="avatar" className="h-20 w-20 rounded-full object-cover" />
    ) : (
      <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">A</div>
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
    <div className="py-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center gap-4">
          <AvatarPreview src={profile.avatar_url} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{profile.full_name || "No name yet"}</div>
                <div className="text-sm text-gray-500">@{profile.username || "username"}</div>
                {/* show email too */}
                {userEmail && (
                  <div className="text-xs text-gray-400">{userEmail}</div>
                )}
              </div>
              <button
                onClick={() => setEditing((s) => !s)}
                className="px-3 py-1 text-sm border rounded"
              >
                {editing ? "Cancel" : "Edit"}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600">{profile.bio || "No bio yet."}</p>
          </div>
        </div>

        {editing && (
          <form onSubmit={saveProfile} className="mt-4 space-y-3">
            <input
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Full name"
              className="w-full border rounded px-3 py-2"
            />
            <input
              value={profile.username}
              onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
              placeholder="Username (unique)"
              className="w-full border rounded px-3 py-2"
            />
            <input
              value={profile.avatar_url}
              onChange={(e) => setProfile((p) => ({ ...p, avatar_url: e.target.value }))}
              placeholder="Avatar image URL (optional)"
              className="w-full border rounded px-3 py-2"
            />
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Short bio"
              className="w-full border rounded px-3 py-2"
            />
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-yellow-800 text-white rounded">Save</button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border rounded">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* user's posted deals table */}
      <div className="mt-6">
        <h3 className="font-semibold mb-3">Your posts</h3>
        <UserDealsTable userId={userId} />
      </div>
    </div>
  );
}

/* horizontal mini-table of user deals */
function UserDealsTable({ userId }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("deals")
        .select("id,title,category,link")
        .eq("posted_by", userId)
        .order("created_at", { ascending: false });

      if (mounted) {
        if (data) setDeals(data);
        else {
          console.error("Error loading user deals:", error);
          setDeals([]);
        }
        setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [userId]);

  async function handleDelete(id) {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) {
      alert("Delete failed: " + error.message);
    } else {
      setDeals((d) => d.filter((x) => x.id !== id));
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading your posts…</p>;
  if (!deals.length) return <p className="text-sm text-gray-500">You haven't posted anything yet.</p>;

  return (
    <div className="divide-y divide-gray-200 border rounded">
      <div className="grid grid-cols-4 font-semibold bg-gray-50 text-sm p-2">
        <div>Product</div>
        <div>Category</div>
        <div className="text-center">Visit</div>
        <div className="text-center">Delete</div>
      </div>
      {deals.map((d) => (
        <div key={d.id} className="grid grid-cols-4 items-center text-sm p-2">
          <div className="truncate">{d.title}</div>
          <div className="truncate">{d.category || "-"}</div>
          <div className="text-center">
            <a
              href={d.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Go
            </a>
          </div>
          <div className="text-center">
            <button
              onClick={() => handleDelete(d.id)}
              className="text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
