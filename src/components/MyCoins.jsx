// src/components/MyCoins.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function MyCoins({ userId: propUserId }) {
  const mountedRef = useRef(true);
  const [uid, setUid] = useState(propUserId || null);
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState(null);

  // Get current user id
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

  // Load balance - ALWAYS prefer profiles.coins first, then fallback to coins_ledger
  async function loadBalanceForUser(userId) {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // 1) FIRST: Try profiles.coins (this is where triggers update)
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("username, coins")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profileErr && profileData) {
        if (mountedRef.current) {
          setUsername(profileData.username || "");
          setBalance(Number(profileData.coins || 0));
          setPending(0);
        }
        setLoading(false);
        return;
      }

      // 2) FALLBACK: Try coins table
      const { data: coinData, error: coinErr } = await supabase
        .from("coins")
        .select("balance, pending")
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

      // 3) LAST RESORT: Sum coins_ledger
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

      // If all fail
      console.warn("Could not fetch coins:", profileErr ?? coinErr ?? ledgerErr);
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

  // Load leaderboard
  async function loadLeaderboard() {
    try {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("rank", { ascending: true });

      if (!error && data && data.length) {
        if (mountedRef.current) setLeaderboard(data);
        return;
      }

      // Fallback to profiles
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, username, coins")
        .order("coins", { ascending: false })
        .limit(10);

      if (!pErr && profs) {
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

  // Real-time subscriptions
  useEffect(() => {
    if (!uid) return;
    let subRefs = [];

    const cleanup = () => {
      try {
        subRefs.forEach((s) => {
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

    try {
      // Watch coins_ledger for this user
      const ch1 = supabase
        .channel(`coins_ledger_user_${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "coins_ledger",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            console.log("💰 Coins ledger changed:", payload);
            loadBalanceForUser(uid);
          }
        )
        .subscribe();

      // Watch profiles updates for this user
      const ch2 = supabase
        .channel(`profiles_user_${uid}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            console.log("👤 Profile updated:", payload);
            if (payload?.new && mountedRef.current) {
              setUsername(payload.new.username || username);
              setBalance(Number(payload.new.coins || 0));
            }
            loadLeaderboard();
          }
        )
        .subscribe();

      // Watch all profiles for leaderboard updates
      const ch3 = supabase
        .channel(`profiles_leaderboard`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          () => {
            console.log("📊 Leaderboard update");
            loadLeaderboard();
          }
        )
        .subscribe();

      subRefs.push(ch1, ch2, ch3);
    } catch (err) {
      console.warn("Subscription failed:", err);
    }

    return () => {
      cleanup();
    };
  }, [uid]);

  // Initial loads
  useEffect(() => {
    if (!uid) return;
    loadBalanceForUser(uid);
    loadLeaderboard();
  }, [uid]);

  // Manual refresh
  const refresh = async () => {
    if (!uid) return;
    console.log("🔄 Manual refresh triggered");
    await loadBalanceForUser(uid);
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
          {pending > 0 && (
            <div className="text-sm text-gray-400 mt-1">{pending} pending</div>
          )}

          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={refresh}
              className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 transition"
            >
              🔄 Refresh
            </button>
            <button className="px-4 py-2 bg-yellow-700 text-white rounded hover:bg-yellow-800 transition">
              🎁 Redeem (soon)
            </button>
          </div>

          {loading && <div className="text-gray-500 mt-3">Loading...</div>}
          {error && <div className="text-red-600 mt-3">{error}</div>}
        </div>

        <div className="mt-6 bg-white rounded-2xl shadow p-4">
          <h3 className="font-semibold mb-2">🏆 Top Hunters</h3>
          {leaderboard && leaderboard.length ? (
            <ul className="divide-y">
              {leaderboard.map((u, idx) => (
                <li
                  key={u.user_id ?? u.username ?? idx}
                  className="flex justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-yellow-700">
                      #{u.rank ?? idx + 1}
                    </span>
                    <span>{u.username ?? u.user_id}</span>
                  </div>
                  <div className="font-semibold text-yellow-600">
                    {u.coins ?? 0} 🪙
                  </div>
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
