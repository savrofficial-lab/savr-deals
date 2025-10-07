// src/components/MyCoins.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";
import { Trophy, RefreshCw } from "lucide-react";

export default function MyCoins({ userId: propUserId }) {
  const [userId, setUserId] = useState(propUserId || "");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState(0);
  const [username, setUsername] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    if (propUserId) setUserId(propUserId);
  }, [propUserId]);

  // ✅ Fetch coin balance + profile
  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    async function loadData() {
      // Fetch balance from coins table
      // Fetch balance from profiles table directly
const { data: profileData, error: profileErr } = await supabase
  .from("profiles")
  .select("username, coins")
  .eq("id", userId)
  .single();

if (profileData) {
  setUsername(profileData.username);
  setBalance(Number(profileData.coins || 0));
}

      // Fetch username from profiles table
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();

      if (coinData) {
        setBalance(Number(coinData.balance || 0));
        setPending(Number(coinData.pending || 0));
      }
      if (profileData) setUsername(profileData.username);

      setLoading(false);
    }

    loadData();

    // ✅ Real-time updates via Supabase channel
    const subscription = supabase
      .channel("coins-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coins" },
        (payload) => {
          if (payload.new?.user_id === userId) {
            setBalance(Number(payload.new.balance || 0));
            setPending(Number(payload.new.pending || 0));
          }
        }
      )
      .subscribe();
    // ✅ Real-time listener for profiles.coins (instant updates)
    const profileSub = supabase
      .channel("profile-coins")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const newCoins = Number(payload.new?.coins || 0);
          console.log("⚡ Profile coins updated:", newCoins);
          setBalance(newCoins);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      supabase.removeChannel(profileSub);
    };
  }, [userId]);

  // ✅ Fetch leaderboard (top 5)
  useEffect(() => {
  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("rank", { ascending: true });

      if (error) {
        console.error("Leaderboard fetch error:", error.message);
      } else {
        console.log("Leaderboard data:", data); // 👈 for debugging
        setLeaderboard(data || []);
      }
    } catch (err) {
      console.error("Unexpected leaderboard error:", err);
    }
  };

  fetchLeaderboard();
}, []);

  const refresh = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("coins")
      .select("balance, pending")
      .eq("user_id", userId)
      .single();
    if (data) {
      setBalance(Number(data.balance || 0));
      setPending(Number(data.pending || 0));
    }
    setLoading(false);
  };

  if (!userId) {
    return (
      <div className="py-8 text-center text-gray-500">
        You must be signed in to view your coins. Tap the <strong>You</strong>{" "}
        tab and sign in.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-orange-50 to-white p-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-yellow-800">
            {username ? `${username}'s Wallet` : "My Coins"}
          </h2>
          <p className="text-sm text-gray-500">
            Earn coins by posting deals, commenting, and getting upvotes!
          </p>
        </div>

        {/* Coin Display */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white shadow-lg rounded-2xl p-6 text-center"
        >
          <div className="text-gray-500 text-sm mb-1">Available Coins</div>
          <motion.div
            key={balance}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-5xl font-extrabold text-yellow-500 drop-shadow-sm"
          >
            {balance}
          </motion.div>
          <div className="text-sm text-gray-400 mt-1">{pending} pending</div>

          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg shadow hover:bg-yellow-700 transition">
              Redeem (soon)
            </button>
          </div>
        </motion.div>

        {/* Leaderboard Section */}
        <div className="mt-8 bg-white shadow-md rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Top 5 Deal Hunters
            </h3>
          </div>

          {leaderboard.length > 0 ? (
            <ul className="divide-y">
              {leaderboard.map((u, idx) => (
                <li
                  key={u.username}
                  className="flex justify-between items-center py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-yellow-700">
                      #{idx + 1}
                    </span>
                    <span className="font-medium text-gray-800">
                      {u.username}
                    </span>
                  </div>
                  <span className="font-semibold text-yellow-600">
                    {u.coins || 0} 🪙
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm text-center">
              No leaderboard data yet.
            </p>
          )}
        </div>

        {/* Activity Placeholder */}
        <div className="mt-8 bg-white rounded-2xl shadow p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Activity</h3>
          <p className="text-sm text-gray-500">
            Coming soon: your deal posts, likes, and bonus milestones will show
            up here!
          </p>
        </div>
      </div>
    </div>
  );
}
