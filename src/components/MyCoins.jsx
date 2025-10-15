// src/components/MyCoins.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Trophy, RefreshCw, Gift, Crown, Award, Medal, Sparkles } from "lucide-react";

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

  // Load leaderboard - LIMITED TO TOP 10
  async function loadLeaderboard() {
    try {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("rank", { ascending: true })
        .limit(10);

      if (!error && data && data.length) {
        if (mountedRef.current) setLeaderboard(data);
        return;
      }

      // Fallback to profiles - LIMITED TO TOP 10
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
    if (rank === 1) return <Crown className="w-5 h-5" />;
    if (rank === 2) return <Medal className="w-5 h-5" />;
    if (rank === 3) return <Award className="w-5 h-5" />;
    return null;
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return "👑 Champion";
    if (rank === 2) return "🥈 Runner Up";
    if (rank === 3) return "🥉 Third Place";
    return `#${rank}`;
  };

  if (!uid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-10 border border-white/20 shadow-2xl max-w-md">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-3">Sign In Required</h3>
            <p className="text-gray-300 text-lg">
              Please sign in to view your coins and leaderboard rankings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-24">
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.3), 0 0 80px rgba(251, 191, 36, 0.1); }
          50% { box-shadow: 0 0 60px rgba(251, 191, 36, 0.5), 0 0 100px rgba(251, 191, 36, 0.2); }
        }
        @keyframes shimmer-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes scale-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .gradient-animate {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        .float-coin {
          animation: float 4s ease-in-out infinite;
        }
        .glow-effect {
          animation: glow-pulse 3s ease-in-out infinite;
        }
        .shimmer-overlay {
          position: relative;
          overflow: hidden;
        }
        .shimmer-overlay::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          animation: shimmer-slide 3s infinite;
        }
        .scale-in-animation {
          animation: scale-in 0.4s ease-out;
        }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">
        {/* Coin Balance Card - Premium Design */}
        <div className="relative glow-effect">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-[32px] blur-2xl opacity-40"></div>
          <div className="relative bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 rounded-[32px] p-1 gradient-animate">
            <div className="bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 rounded-[28px] p-8 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 text-center">
                {/* Animated Coin Icon */}
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full mb-6 shadow-2xl float-coin border-4 border-white/30">
                  <span className="text-5xl">🪙</span>
                </div>
                
                <div className="text-white/90 text-xs font-bold uppercase tracking-[0.3em] mb-3">
                  Available Coins
                </div>
                
                <div className="text-[80px] font-black text-white mb-3 leading-none tracking-tighter drop-shadow-2xl">
                  {balance}
                </div>
                
                {pending > 0 && (
                  <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/20 mb-6">
                    <div className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse shadow-lg shadow-yellow-400"></div>
                    <span className="text-white/95 font-semibold text-sm">{pending} pending</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-8 flex justify-center gap-4">
                  <button
                    onClick={refresh}
                    disabled={loading}
                    className="group relative px-8 py-4 bg-white/20 backdrop-blur-xl rounded-2xl hover:bg-white/30 transition-all duration-300 border-2 border-white/30 hover:border-white/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl active:scale-95"
                  >
                    <RefreshCw className={`w-5 h-5 text-white inline mr-2 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
                    <span className="text-white font-bold tracking-wide">Refresh</span>
                  </button>
                  
                  <button className="shimmer-overlay group relative px-8 py-4 bg-white backdrop-blur-xl rounded-2xl hover:bg-white transition-all duration-300 border-2 border-white/50 hover:scale-105 shadow-xl active:scale-95">
                    <Gift className="w-5 h-5 text-orange-600 inline mr-2 group-hover:scale-110 transition-transform" />
                    <span className="relative text-orange-700 font-bold tracking-wide">Redeem Soon</span>
                  </button>
                </div>

                {loading && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce shadow-lg"></div>
                    <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce shadow-lg" style={{animationDelay: '0.15s'}}></div>
                    <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce shadow-lg" style={{animationDelay: '0.3s'}}></div>
                  </div>
                )}
                
                {error && (
                  <div className="mt-6 bg-red-500/20 backdrop-blur-xl border-2 border-red-400/50 rounded-2xl px-5 py-3">
                    <p className="text-red-100 font-medium">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Card - Ultra Premium */}
        <div className="relative scale-in-animation">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-[32px] blur-2xl opacity-20"></div>
          <div className="relative bg-white/10 backdrop-blur-2xl rounded-[32px] border border-white/20 overflow-hidden shadow-2xl">
            {/* Premium Header */}
            <div className="relative bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 p-7 gradient-animate">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-xl">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white drop-shadow-lg tracking-tight">Top Hunters</h3>
                  <p className="text-white/80 font-medium text-sm mt-0.5">Global Leaderboard • Top 10</p>
                </div>
              </div>
            </div>

            {/* Leaderboard List */}
            <div className="p-5">
              {leaderboard && leaderboard.length ? (
                <div className="space-y-3">
                  {leaderboard.map((u, idx) => (
                    <div
                      key={u.user_id ?? u.username ?? idx}
                      className={`group relative backdrop-blur-xl rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                        u.rank === 1 ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-400/40 shadow-lg shadow-yellow-500/20' :
                        u.rank === 2 ? 'bg-gradient-to-r from-gray-400/20 to-slate-400/20 border-2 border-gray-300/40 shadow-lg shadow-gray-400/20' :
                        u.rank === 3 ? 'bg-gradient-to-r from-orange-500/20 to-amber-600/20 border-2 border-orange-400/40 shadow-lg shadow-orange-500/20' :
                        'bg-white/5 border-2 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Rank Badge */}
                          <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center font-black text-lg shadow-xl transition-transform group-hover:scale-110 ${
                            u.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white' :
                            u.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-600 text-white' :
                            u.rank === 3 ? 'bg-gradient-to-br from-orange-500 to-amber-700 text-white' :
                            'bg-white/10 text-white border-2 border-white/20'
                          }`}>
                            {u.rank <= 3 ? getRankIcon(u.rank) : `#${u.rank ?? idx + 1}`}
                          </div>

                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className={`font-bold text-lg truncate mb-1 ${
                              u.rank === 1 ? 'text-yellow-300' :
                              u.rank === 2 ? 'text-gray-300' :
                              u.rank === 3 ? 'text-orange-300' :
                              'text-white'
                            }`}>
                              {u.username ?? u.user_id}
                            </div>
                            <div className={`text-xs font-semibold ${
                              u.rank <= 3 ? 'text-white/70' : 'text-white/50'
                            }`}>
                              {getRankBadge(u.rank)}
                            </div>
                          </div>
                        </div>

                        {/* Coins Badge */}
                        <div className="flex items-center gap-2.5 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 backdrop-blur-xl px-5 py-3 rounded-xl border-2 border-yellow-400/30 shadow-lg">
                          <span className="font-black text-xl text-yellow-300">
                            {u.coins ?? 0}
                          </span>
                          <span className="text-2xl">🪙</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-5 backdrop-blur-xl border-2 border-orange-400/30">
                    <Trophy className="w-10 h-10 text-orange-400" />
                  </div>
                  <p className="text-white font-bold text-xl mb-2">No Rankings Yet</p>
                  <p className="text-white/60 font-medium">Be the first to earn coins and claim the top spot!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
          }
