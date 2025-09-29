// src/components/Profile.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Profile({ userId }) {
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
    setLoading(true);
    let mounted = true;

    (async function load() {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,username,avatar_url,bio,created_at")
        .eq("user_id", userId)
        .single();
      if (!mounted) return;
      if (error && error.code === "PGRST116") {
        // no row — leave defaults
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
      avatar_url: profile.avatar_url || null,
      bio: profile.bio || null,
    };

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
    <div className="py-6 max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center gap-4">
          <AvatarPreview src={profile.avatar_url} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{profile.full_name || "No name yet"}</div>
                <div className="text-sm text-gray-500">@{profile.username || "username"}</div>
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

      {/* show this user's posted deals */}
      <div className="mt-6">
        <h3 className="font-semibold mb-3">Your posts</h3>
        <UserDealsList userId={userId} />
      </div>
    </div>
  );
}

/* Small helper to list user's deals and allow delete/edit */
function UserDealsList({ userId }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("deals")
        .select("id,title,price,old_price,image,created_at,published")
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
    <div className="space-y-3">
      {deals.map((d) => (
        <div key={d.id} className="bg-white rounded-lg p-3 shadow flex gap-3 items-center">
          <img src={d.image || "/placeholder.png"} alt={d.title} className="h-16 w-16 object-contain rounded" />
          <div className="flex-1">
            <div className="font-medium">{d.title}</div>
            <div className="text-xs text-gray-500">₹{d.price} {d.old_price ? <span className="line-through text-xs ml-2">₹{d.old_price}</span> : null}</div>
            <div className="text-xs text-gray-400">{new Date(d.created_at).toLocaleString()}</div>
          </div>
          <div className="text-right text-xs">
            <div className={`px-2 py-1 rounded ${d.published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
              {d.published ? "Published" : "Pending"}
            </div>
            <button onClick={() => handleDelete(d.id)} className="mt-2 text-red-600 text-sm">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
