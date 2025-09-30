// src/components/YouTab.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import LoginModal from "./LoginModal";
import Profile from "./Profile";

export default function YouTab() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // get current user
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      setLoading(false);
    });

    // listen for login/logout changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return <p className="text-center py-6">Loading…</p>;
  }

  if (!user) {
    // not logged in → show login form/modal
    return (
      <div className="py-8">
        <LoginModal onClose={() => {}} /> 
        <p className="text-center text-gray-500 mt-4">
          Please log in to see your profile.
        </p>
      </div>
    );
  }

  // logged in → show profile
  return <Profile userId={user.id} />;
}
