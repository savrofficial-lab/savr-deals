// src/components/MyCoins.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

/**
 * MyCoins component
 * - expects prop `userId` (uuid string) from parent App
 * - if row doesn't exist it will create one for the logged-in user
 * - all reads/inserts use the client anon key + RLS (so user must be signed in)
 */

export default function MyCoins({ userId: propUserId }) {
  const [userId, setUserId] = useState(propUserId || "");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState(0);
  const [ledger, setLedger] = useState([]); // optional: if you later store ledger in DB

  useEffect(() => {
    if (propUserId) setUserId(propUserId);
  }, [propUserId]);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    setLoading(true);

    async function load() {
      // Try to fetch coins row for this user
      const { data, error } = await supabase
        .from("coins")
        .select("balance, pending, created_at")
        .eq("user_id", userId)
        .single();

      // If no row exists, create one automatically (safe because we added an INSERT policy)
      if (error && error.code === "PGRST116") {
        // this covers "No rows found" path for PostgREST; fallback logic below will also handle other cases
      }

      if (error && (error.message?.includes("No rows found") || error.status === 406)) {
        // Insert initial row
        const { error: insertErr } = await supabase
          .from("coins")
          .insert({ user_id: userId, balance: 0, pending: 0 });
        if (insertErr) {
          console.error("Error inserting initial coins row:", insertErr);
          setBalance(0);
          setPending(0);
        } else {
          setBalance(0);
          setPending(0);
        }
      } else if (data) {
        if (!mounted) return;
        setBalance(Number(data.balance || 0));
        setPending(Number(data.pending || 0));
      } else if (error && !data) {
        // Generic fallback: try again or set empty
        console.error("Error reading coins row:", error);
        setBalance(0);
        setPending(0);
      }

      // (Optional) if you later add a ledger table, you can fetch it here.
      if (mounted) setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [userId]);

  // quick refresh
  async function refresh() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("coins")
      .select("balance, pending")
      .eq("user_id", userId)
      .single();

    if (data) {
      setBalance(Number(data.balance || 0));
      setPending(Number(data.pending || 0));
    } else {
      console.error("refresh error:", error);
    }
    setLoading(false);
  }

  if (!userId) {
    return (
      <div className="py-8 text-center text-gray-500">
        You must be signed in to view your coins. Tap the <strong>You</strong> tab and sign in.
      </div>
    );
  }

  if (loading) {
    return <p className="text-center text-gray-500 py-8">Loading coins…</p>;
  }

  return (
    <div className="py-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-4 mb-4 text-center">
          <div className="text-sm text-gray-500">Available coins</div>
          <div className="text-3xl font-bold text-yellow-800 mt-1">
            {balance} <span className="text-sm text-gray-500">coins</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">{pending} pending</div>

          <div className="mt-4 flex justify-center gap-3">
            <button onClick={refresh} className="px-4 py-2 bg-gray-100 rounded">Refresh</button>
            <button className="px-4 py-2 bg-yellow-800 text-white rounded">Redeem (coming soon)</button>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Activity (coming soon)</h3>
          {ledger.length === 0 && <p className="text-sm text-gray-500">No activity yet.</p>}
        </div>
      </div>
    </div>
  );
}
