// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import DealsGrid from "./components/DealsGrid";
import MyCoins from "./components/MyCoins";
import LoginModal from "./components/LoginModal";
import Profile from "./components/Profile";
import PostDeal from "./components/PostDeal";
import { supabase } from "./supabaseClient";
import YouTab from "./components/YouTab";
import DealDetail from "./components/DealDetail";
import { motion } from "framer-motion";
import { ChevronDown, Sparkles, Bell } from "lucide-react";
import ForumPage from "./components/ForumPage";
import ThreadDetail from "./components/ThreadDetail";
import AdminDashboard from "./components/AdminDashboard";
import ModeratorDashboard from "./components/ModeratorDashboard";
import Notifications from "./components/Notifications";
import NotificationDetail from "./components/NotificationDetail";
import DealRemoved from "./components/DealRemoved";
import RewardsPage from './components/RewardsPage';
import Blog from "./components/Blog";

/* ---------------------------------------------------------------------------
   Small inline icons
--------------------------------------------------------------------------- */
function IconHome({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 11.5L12 4l9 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 21V12h14v9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconSearch({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 21l-4.35-4.35"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconCoin({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <text
        x="12"
        y="15"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="currentColor"
      >
        c
      </text>
    </svg>
  );
}
function IconUser({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 20c1-4 7-4 8-4s7 0 8 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconPlus({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   FIXED CATEGORIES - SINGLE SOURCE OF TRUTH
--------------------------------------------------------------------------- */
const FIXED_CATEGORIES = [
  "All",
  "Mobiles",
  "Laptops & Computers",
  "Men's fashion",
  "Electronics",
  "Watches",
  "TVs",
  "Women's Fashion",
  "Grocery",
  "Health & Fitness",
  "Bags & Luggage",
  "Toys",
  "Baby products",
  "Kids fashion",
  "Sports",
  "Gaming",
  "Home Appliances",
  "Accessories",
  "Beauty",
  "Books",
  "Movies & Music",
  "Pets",
  "Cars, Bikes & Industrial",
];

/* ---------------------------------------------------------------------------
   MAIN APP
--------------------------------------------------------------------------- */
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTopTab, setActiveTopTab] = useState("Frontpage");
  const [activeBottom, setActiveBottom] = useState("Home");
  const [searchRaw, setSearchRaw] = useState("");
  const [search, setSearch] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [intendedTab, setIntendedTab] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // USE FIXED CATEGORIES - NO DYNAMIC LOADING
  const [categories, setCategories] = useState(FIXED_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCategories, setShowCategories] = useState(false);
  const categoriesRef = useRef(null);

  // ✅ DEALS REFRESH TRIGGER - Force DealsGrid to re-fetch when a deal is posted
  const [dealsRefreshTrigger, setDealsRefreshTrigger] = useState(0);

  // ---------------- AUTH ----------------
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u && intendedTab) {
          setActiveBottom(intendedTab);
          setIntendedTab(null);
          setShowLoginModal(false);
        }
      }
    );
    return () => listener.subscription.unsubscribe();
  }, [intendedTab]);

  // ---------------- FETCH UNREAD NOTIFICATIONS COUNT ----------------
  useEffect(() => {
    if (!user) return;
    
    const fetchUnreadCount = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("read", false);
      
      if (!error && data) {
        setUnreadCount(data.length);
      }
    };

    fetchUnreadCount();

    // Realtime subscription for new notifications
    const channel = supabase
      .channel("notification-count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.new.user_id === user.id) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);


  // ---------------- LOGIN CHECK ----------------
  function requireLoginFor(tabName) {
    if (user) {
      setActiveBottom(tabName);
    } else {
      setIntendedTab(tabName);
      setShowLoginModal(true);
    }
  }

  // ---------------- SMART NORMALIZE FUNCTION ----------------
  // Normalize text by removing punctuation/spaces and lowercasing.
  function normalizeText(text = "") {
    return String(text)
      .toLowerCase()
      .replace(/[\u2018\u2019\u201C\u201D]/g, "") // fix smart quotes if any
      .replace(/[^a-z0-9]/g, ""); // remove everything except alphanumerics
  }

  // ---------------- REQUESTED DEAL SUBMIT (called when user clicks Search or presses Enter)
  async function handleSearchSubmit() {
    const q = searchRaw.trim();
    if (!q) {
      alert("❌ Please type something before searching");
      return;
    }

    setSearch(q);
    const normalizedQuery = normalizeText(q);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user ?? null;

      const { data: serverMatches, error: serverErr } = await supabase
        .from("deals")
        .select("id, title, description, category, published")
        .eq("published", true)
        .or(
          `title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (serverErr) {
        console.warn("Server search error:", serverErr.message || serverErr);
      }

      if (Array.isArray(serverMatches) && serverMatches.length > 0) {
        setSearch(q);
        return;
      }

      const { data: allPublished, error: allErr } = await supabase
        .from("deals")
        .select("id, title, description, category, published")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(500);

      if (allErr) {
        console.warn("Error fetching published deals for normalized search:", allErr);
      }

      let matched = [];
      if (Array.isArray(allPublished) && allPublished.length > 0) {
        matched = allPublished.filter((d) => {
          const t = normalizeText(d.title || "");
          const desc = normalizeText(d.description || "");
          const cat = normalizeText(d.category || "");
          return (
            (t && t.includes(normalizedQuery)) ||
            (desc && desc.includes(normalizedQuery)) ||
            (cat && cat.includes(normalizedQuery))
          );
        });
      }

      if (matched.length > 0) {
        setSearch(q);
        return;
      }

      if (!currentUser) {
        setShowLoginModal(true);
        return;
      }

      const { data: existingExact, error: existingErr } = await supabase
        .from("requested_deals")
        .select("id, query")
        .eq("fulfilled", false)
        .eq("query", q)
        .limit(1);

      if (existingErr) {
        console.warn("Error checking existing requested_deals:", existingErr);
      }

      if (Array.isArray(existingExact) && existingExact.length > 0) {
        alert(`ℹ️ Request already exists for: ${q}`);
        return;
      }

      const { data: recentReqs, error: recentErr } = await supabase
        .from("requested_deals")
        .select("id, query, user_id, created_at")
        .eq("fulfilled", false)
        .order("created_at", { ascending: false })
        .limit(500);

      if (recentErr) {
        console.warn("Error fetching recent requested_deals:", recentErr);
      }

      let duplicateFound = false;
      if (Array.isArray(recentReqs)) {
        for (const r of recentReqs) {
          if (normalizeText(r.query || "") === normalizedQuery) {
            duplicateFound = true;
            break;
          }
        }
      }

      if (duplicateFound) {
        alert(`ℹ️ A similar request already exists for: ${q}`);
        return;
      }

      const { error: insertErr } = await supabase.from("requested_deals").insert([
        {
          user_id: currentUser.id,
          query: q.trim(),
          fulfilled: false,
        },
      ]);

      if (insertErr) {
        console.error("Error inserting requested_deal:", insertErr);
        alert("❌ Failed to send request: " + (insertErr.message || insertErr));
        return;
      }

      alert(
        `✅ Request successfully added for: "${q}". We'll notify you when it's live.`
      );
      setSearch(q);
    } catch (err) {
      console.error("Search submit error:", err);
      alert("❌ Error: " + (err.message || String(err)));
    }
  } 

// ---------------- OUTSIDE CLICK ----------------
  useEffect(() => {
    if (!showCategories) return;

    function handleClickOutside(e) {
      if (categoriesRef.current && !categoriesRef.current.contains(e.target)) {
        setShowCategories(false);
      }
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showCategories]);

  // ---------------- MAIN RENDER ----------------
  function renderMain() {
    if (activeBottom === "Home") {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-800 bg-clip-text text-transparent flex items-center gap-2">
              {activeTopTab}
              {activeTopTab === "Hot Deals" && (
                <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              )}
            </h2>
          </div>

          {activeTopTab === "Forums" && <ForumPage user={user} />}

          {activeTopTab === "Frontpage" && (
            <DealsGrid
              key={dealsRefreshTrigger}
              search={search}
              selectedCategory={selectedCategory}
              hideHeaderCategories={true}
            />
          )}

          {activeTopTab === "Hot Deals" && (
            <DealsGrid
              key={dealsRefreshTrigger}
              search={search}
              selectedCategory={selectedCategory}
              hideHeaderCategories={true}
              filterHotDeals={true}
            />
          )}
        </motion.div>
      );
    }

    if (activeBottom === "Post") {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <PostDeal 
            userId={user?.id} 
            onPosted={() => {
              setDealsRefreshTrigger(prev => prev + 1);
              setActiveBottom("Home");
            }} 
          />
        </motion.div>
      );
    }

    if (activeBottom === "Coins") {
      return (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MyCoins userId={user?.id} />
        </motion.div>
      );
    }

    if (activeBottom === "You") {
      return (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <YouTab />
        </motion.div>
      );
    }

    return null;
  }

  // ---------------- JSX ----------------
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        {/* HEADER */}
        <header className="backdrop-blur-xl bg-white/80 sticky top-0 z-50 shadow-lg border-b border-amber-100/50">
          <div className="max-w-5xl mx-auto px-4 py-3">
            {/* Logo and Notification Row */}
            <div className="flex items-center justify-between mb-3">
              <Link to="/" className="flex-shrink-0">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <img
                    src="/savrdeals-logo.png"
                    alt="Savrdeals"
                    className="h-12 sm:h-14 w-auto object-contain drop-shadow-md"
                  />
                </motion.div>
              </Link>

              {/* NOTIFICATION ICON */}
              <Link
                to="/notifications"
                className="flex items-center justify-center relative p-2 rounded-full hover:bg-amber-50 transition-all"
                aria-label="Notifications"
              >
                <Bell className="w-6 h-6 text-amber-600 hover:text-amber-700 transition-transform hover:scale-110" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>

            {/* SEARCH BAR - Full Width Below */}
            <div className="relative flex items-center gap-2 group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600 pointer-events-none transition-all group-focus-within:scale-110 z-10">
                <IconSearch />
              </span>

              <input
                type="text"
                value={searchRaw}
                onChange={(e) => setSearchRaw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                placeholder="Search deals..."
                className="w-full pl-12 pr-3 py-3 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white/90 backdrop-blur-sm text-gray-700 placeholder-gray-400 transition-all shadow-sm"
              />

              <button
                onClick={handleSearchSubmit}
                className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </div>

          {/* TOP TABS */}
          <div className="bg-gradient-to-r from-amber-50/80 to-yellow-50/80 backdrop-blur-md sticky top-[88px] z-40 border-t border-amber-100/30">
            <div className="max-w-5xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setActiveTopTab("Frontpage");
                    setSelectedCategory("");
                  }}
                  className={`whitespace-nowrap px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm flex-shrink-0 ${
                    activeTopTab === "Frontpage"
                      ? "bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-md"
                      : "bg-white/90 text-gray-700 border-2 border-amber-100 hover:bg-amber-50 hover:border-amber-200"
                  }`}
                >
                  Frontpage
                </motion.button>

                {/* CATEGORIES DROPDOWN */}
                <div className="relative flex-shrink-0" ref={categoriesRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategories((p) => !p);
                      setActiveTopTab("Frontpage");
                    }}
                    className="whitespace-nowrap px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold bg-white/90 text-gray-700 hover:bg-amber-50 border-2 border-amber-100 hover:border-amber-200 flex items-center gap-1 sm:gap-2 shadow-sm transition-all"
                  >
                    Categories{" "}
                    <ChevronDown
                      className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 ${
                        showCategories ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showCategories && (
                    <div
                      className="absolute left-0 mt-2 w-56 bg-white shadow-xl rounded-xl p-2 border max-h-[340px] overflow-y-auto"
                      style={{ zIndex: 99999 }}
                    >
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat === "All" ? "" : cat);
                            setSearchRaw("");
                            setShowCategories(false);
                          }}
                          className={`block w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm ${
                            selectedCategory === cat
                              ? "bg-yellow-100 text-yellow-800"
                              : ""
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTopTab("Forums")}
                  className={`whitespace-nowrap px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm flex-shrink-0 ${
                    activeTopTab === "Forums"
                      ? "bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-md"
                      : "bg-white/90 text-gray-700 border-2 border-amber-100 hover:bg-amber-50 hover:border-amber-200"
                  }`}
                >
                  Forums
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTopTab("Hot Deals")}
                  className={`whitespace-nowrap px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-1 sm:gap-2 flex-shrink-0 ${
                    activeTopTab === "Hot Deals"
                      ? "bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-md"
                      : "bg-white/90 text-gray-700 border-2 border-amber-100 hover:bg-amber-50 hover:border-amber-200"
                  }`}
                >
                  Hot Deals
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                </motion.button>

                <Link to="/blog">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="whitespace-nowrap px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm flex-shrink-0 bg-white/90 text-gray-700 border-2 border-amber-100 hover:bg-amber-50 hover:border-amber-200"
                  >
                    Blog
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full relative z-10 pb-28">
          <Routes>
            <Route path="/" element={renderMain()} />
            <Route path="/deal/:id" element={<DealDetail />} />
            <Route path="/thread/:id" element={<ThreadDetail />} />
            <Route path="/admin" element={<AdminDashboard user={user} />} />
            <Route path="/moderator" element={<ModeratorDashboard user={user} />} />
            <Route path="/notifications" element={<Notifications user={user} />} />
            <Route path="/notification/:reportId" element={<NotificationDetail user={user} />} />
            <Route path="/deal-removed" element={<DealRemoved />} />
            <Route path="/rewards" element={<RewardsPage />} /> 
            <Route path="/blog" element={<Blog />} /> 
          </Routes>
        </main>

        {/* FOOTER */}
        <div className="mt-12 pb-24 px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-5xl mx-auto bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border-2 border-amber-100"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="font-bold text-xl mb-3 bg-gradient-to-r from-amber-700 to-yellow-600 bg-clip-text text-transparent">
                  About Us
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Savrdeals helps you discover the best online deals across
                  multiple stores. Majority deals you see here are affiliated — we earn some commission on those deals.
                </p>
              </div>
              <div>
                <p className="font-bold text-xl mb-3 bg-gradient-to-r from-amber-700 to-yellow-600 bg-clip-text text-transparent">
                  Contact
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Email:{" "}
                  <a
                    href="mailto:savrofficialdeals@email.com"
                    className="text-amber-700 hover:text-amber-600 underline font-medium transition-colors"
                  >
                    savrofficialdeals@email.com
                  </a>
                  <br />
                  Instagram:{" "}
                  <a
                    href="https://instagram.com/savrofficialdeals"
                    className="text-amber-700 hover:text-amber-600 underline font-medium transition-colors"
                  >
                    @savrofficialdeals
                  </a>
                </p>
              </div>
              <div className="flex flex-col justify-between items-start md:items-end">
                <p className="text-xs text-gray-500">
                  © {new Date().getFullYear()} Savrdeals. All rights reserved.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* BOTTOM NAV */}
        <nav className="fixed left-0 right-0 bottom-0 z-50 backdrop-blur-xl bg-white/90 border-t-2 border-amber-100 shadow-2xl">
          <div className="max-w-5xl mx-auto px-2">
            <div className="flex justify-around items-center py-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setActiveBottom("Home");
                  setActiveTopTab("Frontpage");
                }}
                className={`flex flex-col items-center text-xs font-medium transition-all ${
                  activeBottom === "Home"
                    ? "text-amber-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <motion.div
                  animate={
                    activeBottom === "Home"
                      ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }
                      : {}
                  }
                  transition={{ duration: 0.3 }}
                >
                  <IconHome className="h-6 w-6" />
                </motion.div>
                <span className="mt-1">Home</span>
              </motion.button>

              <div className="relative -mt-6">
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => requireLoginFor("Post")}
                  className="bg-gradient-to-br from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white rounded-full p-4 shadow-2xl flex items-center justify-center border-4 border-white"
                  aria-label="Post"
                >
                  <IconPlus className="h-6 w-6" />
                </motion.button>
                <div className="text-center text-xs font-medium text-gray-700 mt-2">
                  Post
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => requireLoginFor("Coins")}
                className={`flex flex-col items-center text-xs font-medium transition-all ${
                  activeBottom === "Coins"
                    ? "text-amber-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <motion.div
                  animate={
                    activeBottom === "Coins"
                      ? { scale: [1, 1.2, 1], rotate: [0, 360] }
                      : {}
                  }
                  transition={{ duration: 0.5 }}
                >
                  <IconCoin className="h-6 w-6" />
                </motion.div>
                <span className="mt-1">My Coins</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => requireLoginFor("You")}
                className={`flex flex-col items-center text-xs font-medium transition-all ${
                  activeBottom === "You"
                    ? "text-amber-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <motion.div
                  animate={
                    activeBottom === "You"
                      ? { scale: [1, 1.2, 1] }
                      : {}
                  }
                  transition={{ duration: 0.3 }}
                >
                  <IconUser className="h-6 w-6" />
                </motion.div>
                <span className="mt-1">You</span>
              </motion.button>
            </div>
          </div>
        </nav>

        {showLoginModal && (
          <LoginModal onClose={() => setShowLoginModal(false)} />
        )}
      </div>

      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </Router>
  );
}
