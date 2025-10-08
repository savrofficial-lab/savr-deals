// src/components/MyCoins.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";

/*
  MyCoins.jsx
  - Shows coin balance by:
      1) trying coins table (balance/pending)
      2) falling back to summing coins_ledger.amount for the user
  - Subscribes to realtime changes on coins_ledger (for the user) and profiles (for username/coins)
  - Shows leaderboard (tries leaderboard view, falls back to profiles)
  - Safe: does not change DB; only reads and listens.
*/

export default function MyCoins({ userId: propUserId }) {
  const mountedRef = useRef(true);
  const [uid, setUid] = useState(propUserId || null);
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState(null);

  // derive current user id if prop not passed
  useEffect(() => {
    mountedRef.current = true;
    if (propUserId) {
      setUid(propUserId);
      return;
    }
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (mountedRef.current) setUid(user?.id ?? null);
      } catch (err) {
        console.error("Could not get user:", err);
      }
    })();
    return () => {
      mountedRef.current = false;
    };
  }, [propUserId]);

  // load balance: prefer coins table, fallback sum of coins_ledger.amount
  async function loadBalanceForUser(userId) {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // 1) try coins table
      const { data: coinData, error: coinErr } = await supabase
        .from("coins")
        .select("balance,pending")
        .eq("user_id", userId)
        .maybeSingle();

      if (!coinErr && coinData) {
        if (mountedRef.current) {
          setBalance(Number(coinData.balance || 0));
          setPending(Number(coinData.pending || 0));
        }
        setLoading(false);
        return;
      }

      // 2) fallback to summing coins_ledger (server may contain rewards)
      const { data: ledgerRows, error: ledgerErr } = await supabase
        .from("coins_ledger")
        .select("amount")
        .eq("user_id", userId);

      if (!ledgerErr && ledgerRows) {
        const sum = ledgerRows.reduce((acc, r) => acc + Number(r?.amount || 0), 0);
        if (mountedRef.current) {
          setBalance(sum);
          setPending(0);
        }
        setLoading(false);
        return;
      }

      // If both fail:
      console.warn("Could not fetch coins or ledger:", coinErr ?? ledgerErr);
      if (mountedRef.current) {
        setBalance(0);
        setPending(0);
      }
    } catch (err) {
      console.error("loadBalanceForUser error:", err);
      if (mountedRef.current) setError(String(err));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  // load username (from profiles)
  async function loadProfile(userId) {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, coins")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        if (mountedRef.current) {
          setUsername(data.username || "");
          // if profiles.coins exists and coins table missing, prefer profiles.coins
          if ((Number(data.coins) || 0) > 0 && (balance === 0 || balance === null)) {
            setBalance(Number(data.coins || 0));
          }
        }
      }
    } catch (err) {
      console.error("loadProfile error:", err);
    }
  }

  // load leaderboard — try view 'leaderboard' first, fallback to profiles
  async function loadLeaderboard() {
    try {
      const { data, error } = await supabase.from("leaderboard").select("*").order("rank", { ascending: true });
      if (!error && data && data.length) {
        if (mountedRef.current) setLeaderboard(data);
        return;
      }

      // fallback to profiles
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("user_id,username,coins")
        .order("coins", { ascending: false })
        .limit(10);

      if (!pErr && profs) {
        // create rank from order
        const ranked = profs.map((p, i) => ({
          user_id: p.user_id,
          username: p.username,
          coins: Number(p.coins || 0),
          rank: i + 1,
        }));
        if (mountedRef.current) setLeaderboard(ranked);
      }
    } catch (err) {
      console.error("loadLeaderboard error:", err);
    }
  }

  // subscribe to realtime updates: coins_ledger (user) and profiles (user or global leaderboard)
  useEffect(() => {
    if (!uid) return;
    let subRefs = [];

    // helper to remove subscriptions later
    const cleanup = () => {
      try {
        subRefs.forEach((s) => {
          // supabase v2: removeChannel, v1: removeSubscription
          try {
            supabase.removeChannel(s);
          } catch (e) {
            try {
              supabase.removeSubscription?.(s);
            } catch (e2) {}
          }
        });
      } catch (e) {
        console.warn("error cleaning subs:", e);
      }
      subRefs = [];
    };

    // create channel style subscription if available
    try {
      // coins_ledger changes for this user
      const ch1 = supabase
        .channel(`coins_ledger_user_${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "coins_ledger", filter: `user_id=eq.${uid}` },
          (payload) => {
            // refresh balance whenever ledger changed for this user
            loadBalanceForUser(uid);
          }
        )
        // also watch profiles updates for username/coins change
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${uid}` },
          (payload) => {
            // payload.new may have updated coins or username
            if (payload?.new) {
              if (mountedRef.current) {
                setUsername(payload.new.username ?? username);
                if (payload.new.coins !== undefined && payload.new.coins !== null) {
                  setBalance(Number(payload.new.coins || 0));
                }
              }
            }
            // refresh leaderboard too (if global)
            loadLeaderboard();
          }
        )
        .subscribe();

      subRefs.push(ch1);
    } catch (err) {
      console.warn("channel subscribe failed, falling back to .from() style:", err);

      try {
        const s1 = supabase
          .from(`coins_ledger:user_id=eq.${uid}`)
          .on("*", (payload) => {
            loadBalanceForUser(uid);
          })
          .subscribe();
        const s2 = supabase
          .from(`profiles:user_id=eq.${uid}`)
          .on("UPDATE", (payload) => {
            if (payload?.new) {
              if (mountedRef.current) {
                setUsername(payload.new.username ?? username);
                if (payload.new.coins !== undefined && payload.new.coins !== null) {
                  setBalance(Number(payload.new.coins || 0));
                }
              }
            }
            loadLeaderboard();
          })
          .subscribe();

        subRefs.push(s1, s2);
      } catch (err2) {
        console.warn("fallback .from() subscribe also failed:", err2);
      }
    }

    // also subscribe to profiles updates globally to keep leaderboard fresh
    try {
      const chL = supabase
        .channel(`profiles_leaderboard`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          () => loadLeaderboard()
        )
        .subscribe();
      subRefs.push(chL);
    } catch (err) {
      try {
        const sL = supabase.from("profiles").on("*", () => loadLeaderboard()).subscribe();
        subRefs.push(sL);
      } catch (e) {}
    }

    // cleanup on unmount or uid change
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // initial loads when uid available
  useEffect(() => {
    if (!uid) return;
    loadProfile(uid);
    loadBalanceForUser(uid);
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // manual refresh
  const refresh = async () => {
    if (!uid) return;
    await loadBalanceForUser(uid);
    await loadProfile(uid);
    await loadLeaderboard();
  };

  if (!uid) {
    return (
      <div className="py-8 text-center text-gray-500">
        You must be signed in to view your coins. Tap the <strong>You</strong> tab and sign in.
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6 text-center">
          <div className="text-sm text-gray-500">Available Coins</div>
          <div className="text-4xl font-bold text-yellow-600 mt-2">{balance}</div>
          <div className="text-sm text-gray-400 mt-1">{pending} pending</div>

          <div className="mt-4 flex justify-center gap-3">
            <button onClick={refresh} className="px-4 py-2 bg-gray-100 rounded">Refresh</button>
            <button className="px-4 py-2 bg-yellow-700 text-white rounded">Redeem (soon)</button>
          </div>

          {error && <div className="text-red-600 mt-3">{error}</div>}
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow p-4">
          <h3 className="font-semibold mb-2">Top Hunters</h3>
          {leaderboard && leaderboard.length ? (
            <ul className="divide-y">
              {leaderboard.map((u, idx) => (
                <li key={u.user_id ?? u.username ?? idx} className="flex justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-yellow-700">#{u.rank ?? idx + 1}</span>
                    <span>{u.username ?? u.user_id}</span>
                  </div>
                  <div className="font-semibold text-yellow-600">{u.coins ?? 0} 🪙</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No leaderboard data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
