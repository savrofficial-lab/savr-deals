// src/components/LoginModal.jsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function LoginModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        // signup
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // after signup, create an empty profile row
        if (data.user) {
          await supabase.from("profiles").insert([
            {
              user_id: data.user.id,
              email: data.user.email,
              full_name: "",
              username: "",
              bio: "",
            },
          ]);
        }

        alert("Signup successful! Please check your email to confirm your account.");
        onClose();
      } else {
        // login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        alert("Login successful!");
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg">
        <h3 className="text-lg font-semibold mb-3">
          {isSignup ? "Create an account" : "Sign in"}
        </h3>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border rounded px-3 py-2 mb-3"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border rounded px-3 py-2 mb-3"
        />

        <div className="flex gap-2">
          <button
            onClick={handleAuth}
            className="flex-1 bg-yellow-800 text-white rounded py-2 font-medium"
            disabled={loading}
          >
            {loading ? (isSignup ? "Signing up…" : "Signing in…") : (isSignup ? "Sign up" : "Sign in")}
          </button>
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
        </div>

        <p className="text-sm text-gray-600 mt-4 text-center">
          {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
          <button
            onClick={() => setIsSignup(!isSignup)}
            className="text-yellow-800 font-medium underline"
          >
            {isSignup ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
