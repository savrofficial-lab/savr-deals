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
   // ---------------- REQUESTED DEAL SUBMIT (called when user clicks Search or presses Enter) ----------------
       // inside App.jsx (anywhere above return)
async function handleSearchSubmit() {
  const q = searchRaw.trim();
  if (!q) return;

  console.log("Submitting search for:", q);
  setSearch(q); // this triggers DealsGrid query

  try {
    // get current user
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    if (!user) {
      console.log("⚠️  No user logged in, skipping insert");
      return;
    }

    // check if already requested
    const { data: existing, error: checkErr } = await supabase
      .from("requested_deals")
      .select("id")
      .eq("query", q)
      .eq("fulfilled", false)
      .limit(1);

    if (checkErr) throw checkErr;

    if (!existing || existing.length === 0) {
      const { error: insertErr } = await supabase
        .from("requested_deals")
        .insert([{ user_id: user.id, query: q, fulfilled: false }]);

      if (insertErr) throw insertErr;
      console.log("✅  Request inserted successfully for:", q);
    } else {
      console.log("ℹ️  Request already exists for:", q);
    }
  } catch (err) {
    console.error("❌  handleSearchSubmit failed:", err);
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
              search={search}
              selectedCategory={selectedCategory}
              hideHeaderCategories={true}
            />
          )}

          {activeTopTab === "Hot Deals" && (
            <DealsGrid
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
          <PostDeal userId={user?.id} onPosted={() => setActiveBottom("Home")} />
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
            <div className="flex items-center gap-4">
              <Link to="/" className="flex-shrink-0">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <img
                    src="/savrdeals-logo.png"
                    alt="Savrdeals"
                    className="h-14 w-auto object-contain drop-shadow-md"
                  />
                </motion.div>
              </Link>

              {/* SEARCH + NOTIFICATION */}
              <div className="relative flex items-center gap-3 flex-1">
      
                 {/* SEARCH BOX (with submit button) */}
  <div className="relative flex-1 group flex items-center">
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600 pointer-events-none transition-all group-focus-within:scale-110">
      <IconSearch />
    </span>

    <input
      value={searchRaw}
      onChange={(e) => setSearchRaw(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSearchSubmit();
        }
      }}
      placeholder="Search deals, phones, brands..."
      className="flex-1 pl-12 pr-28 py-2.5 rounded-2xl border-2 border-amber-200/50 bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all shadow-sm hover:shadow-md"
    />

    {/* Search button (right inside the input area) */}
    <button
      onClick={handleSearchSubmit}
      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm shadow"
    >
      Search
    </button>
  </div>
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
            </div>
          </div>

          {/* TOP TABS */}
          <div className="bg-gradient-to-r from-amber-50/80 to-yellow-50/80 backdrop-blur-md sticky top-[88px] z-40 border-t border-amber-100/30">
            <div className="max-w-5xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
              <div className="flex items-center gap-2 overflow-visible">
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
              
