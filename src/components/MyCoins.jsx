// src/components/MyCoins.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Trophy, RefreshCw, Gift, Crown, Award, TrendingUp } from "lucide-react";

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

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Award className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <TrendingUp className="w-4 h-4 text-blue-400" />;
  };

  const getRankGradient = (rank) => {
    if (rank === 1) return "from-yellow-400 via-yellow-500 to-amber-600";
    if (rank === 2) return "from-gray-300 via-gray-400 to-gray-500";
    if (rank === 3) return "from-amber-500 via-amber-600 to-amber-700";
    return "from-blue-400 via-blue-500 to-blue-600";
  };

  if (!uid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border-2 border-orange-200 shadow-2xl max-w-md">
          <div className="text-center">
            <Trophy className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Sign In Required</h3>
            <p className="text-gray-600">
              You must be signed in to view your coins. Tap the <span className="font-semibold text-orange-600">You</span> tab and sign in.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 pb-24">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(217, 119, 6, 0.3); }
          50% { box-shadow: 0 0 30px rgba(217, 119, 6, 0.5); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
        .pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        {/* Coin Balance Card */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 rounded-3xl blur-xl opacity-30"></div>
          <div className="relative bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-500 rounded-3xl p-8 shadow-2xl overflow-hidden border-2 border-orange-600/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -ml-24 -mb-24"></div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4 float-animation">
                <span className="text-4xl">🪙</span>
              </div>
              
              <div className="text-white/95 text-sm font-medium uppercase tracking-wider mb-2">
                Available Coins
              </div>
              
              <div className="text-7xl font-black text-white drop-shadow-lg mb-2 tracking-tight">
                {balance}
              </div>
              
              {pending > 0 && (
                <div className="inline-flex items-center gap-2 bg-white/25 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white font-medium text-sm">{pending} pending</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="group relative px-6 py-3 bg-white/25 backdrop-blur-sm rounded-xl hover:bg-white/35 transition-all duration-300 border border-white/40 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  <RefreshCw className={`w-5 h-5 text-white inline mr-2 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  <span className="text-white font-semibold drop-shadow">Refresh</span>
                </button>
                
                <button className="group relative px-6 py-3 bg-white backdrop-blur-sm rounded-xl hover:bg-white/95 transition-all duration-300 border border-orange-200 hover:scale-105 overflow-hidden shadow-lg">
                  <div className="absolute inset-0 shimmer"></div>
                  <Gift className="w-5 h-5 text-orange-600 inline mr-2" />
                  <span className="relative text-orange-700 font-semibold">Redeem Soon</span>
                </button>
              </div>

              {loading && (
                <div className="mt-4 text-white/80 text-sm flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              )}
              
              {error && (
                <div className="mt-4 bg-red-500/20 backdrop-blur-sm border border-red-400/50 rounded-xl px-4 py-2">
                  <p className="text-red-100 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard Card */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500 rounded-3xl blur-xl opacity-20"></div>
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-orange-200/50 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/25 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white drop-shadow">Top Hunters</h3>
                    <p className="text-white/80 text-sm">Global Leaderboard</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Leaderboard List */}
            <div className="p-4">
              {leaderboard && leaderboard.length ? (
                <div className="space-y-3">
                  {leaderboard.map((u, idx) => (
                    <div
                      key={u.user_id ?? u.username ?? idx}
                      className={`group relative bg-white/60 backdrop-blur-sm rounded-2xl p-4 border-2 border-orange-100 hover:bg-white/80 hover:border-orange-200 transition-all duration-300 shadow-md ${
                        u.rank <= 3 ? 'hover:scale-[1.02]' : ''
                      }`}
                    >
                      {u.rank <= 3 && (
                        <div className={`absolute inset-0 bg-gradient-to-r ${getRankGradient(u.rank)} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}></div>
                      )}
                      
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Rank Badge */}
                          <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                            u.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white' :
                            u.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                            u.rank === 3 ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white' :
                            'bg-white/10 text-white/70'
                          }`}>
                            {u.rank <= 3 ? getRankIcon(u.rank) : `#${u.rank ?? idx + 1}`}
                          </div>

                          {/* Username */}
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold truncate ${
                              u.rank === 1 ? 'text-yellow-600 text-lg' :
                              u.rank === 2 ? 'text-gray-600 text-lg' :
                              u.rank === 3 ? 'text-amber-700 text-lg' :
                              'text-gray-700'
                            }`}>
                              {u.username ?? u.user_id}
                            </div>
                            {u.rank <= 3 && (
                              <div className="text-gray-500 text-xs mt-1">
                                {u.rank === 1 ? '👑 Champion' : u.rank === 2 ? '🥈 Runner Up' : '🥉 Third Place'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Coins */}
                        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-amber-100 backdrop-blur-sm px-4 py-2 rounded-xl border-2 border-yellow-300/50 shadow-sm">
                          <span className={`font-bold text-lg ${
                            u.rank === 1 ? 'text-yellow-600' : 'text-yellow-700'
                          }`}>
                            {u.coins ?? 0}
                          </span>
                          <span className="text-xl">🪙</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-orange-400" />
                  </div>
                  <p className="text-gray-600 font-medium">No leaderboard data yet.</p>
                  <p className="text-gray-400 text-sm mt-2">Be the first to earn coins!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
                }
