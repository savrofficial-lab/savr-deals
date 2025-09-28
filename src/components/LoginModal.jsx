// src/components/LoginModal.jsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function LoginModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!email) {
      alert("Please enter your email.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        alert("Error: " + error.message);
      } else {
        alert("Check your email for a magic link to sign in. (It may take a minute.)");
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg">
        <h3 className="text-lg font-semibold mb-3">Sign in to continue</h3>
        <p className="text-sm text-gray-600 mb-3">Enter your email and we'll send a magic link.</p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border rounded px-3 py-2 mb-3"
        />

        <div className="flex gap-2">
          <button
            onClick={handleSend}
            className="flex-1 bg-yellow-800 text-white rounded py-2 font-medium"
            disabled={loading}
          >
            {loading ? "Sending…" : "Send magic link"}
          </button>
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
        </div>

        <p className="text-xs text-gray-500 mt-4">After clicking the link in email you'll be signed in and returned to the site.</p>
      </div>
    </div>
  );
}
