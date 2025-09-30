import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function AuthForm({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      // login flow
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) alert(error.message);
      else onAuth(data.user);
    } else {
      // signup flow
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) alert(error.message);
      else alert("Signup successful! Please check your email to confirm.");
    }

    setLoading(false);
  }

  return (
    <div className="max-w-sm mx-auto bg-white p-5 rounded shadow">
      <h2 className="text-lg font-semibold mb-3">
        {isLogin ? "Log in" : "Sign up"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-800 text-white py-2 rounded"
        >
          {loading ? "Please wait..." : isLogin ? "Log in" : "Sign up"}
        </button>
      </form>
      <p className="text-sm mt-3 text-center">
        {isLogin ? "New user?" : "Already have an account?"}{" "}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-yellow-800 underline"
        >
          {isLogin ? "Sign up" : "Log in"}
        </button>
      </p>
    </div>
  );
}
