// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DealsGrid from "./components/DealsGrid";
import MyCoins from "./components/MyCoins";
import LoginModal from "./components/LoginModal";
import Profile from "./components/Profile";
import PostDeal from "./components/PostDeal";
import { supabase } from "./supabaseClient";
import YouTab from "./components/YouTab";
import DealDetail from "./components/DealDetail";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

/* ---------------------------------------------------------------------------
   Small inline icons (kept from your original)
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

  const DEFAULT_CATEGORIES = [
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

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
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

  // ---------------- SEARCH ----------------
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchRaw.trim()), 300);
    return () => clearTimeout(t);
  }, [searchRaw]);

  // ---------------- LOGIN CHECK ----------------
  function requireLoginFor(tabName) {
    if (user) {
      setActiveBottom(tabName);
    } else {
      setIntendedTab(tabName);
      setShowLoginModal(true);
    }
  }

  // ---------------- FETCH CATEGORIES ----------------
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("category")
        .eq("published", true);
      if (!error && data) {
        const cats = Array.from(
          new Set(
            data.map((d) => (d.category || "").trim()).filter(Boolean)
          )
        );
        setCategories([...DEFAULT_CATEGORIES, ...cats]);
      }
    })();
  }, []);

  // ---------------- OUTSIDE CLICK ----------------
  useEffect(() => {
    function handleClickOutside(e) {
      if (categoriesRef.current && !categoriesRef.current.contains(e.target)) {
        setShowCategories(false);
      }
    }

    // Delay attaching after opening
    let listener;
    if (showCategories) {
      setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
        listener = handleClickOutside;
      }, 50);
    }

    return () => {
      if (listener) document.removeEventListener("click", listener);
    };
  }, [showCategories]);

  // ---------------- MAIN RENDER ----------------
  function renderMain() {
    if (activeBottom === "Home") {
      return (
        <>
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {activeTopTab}
            </h2>
          </div>

          {activeTopTab === "Frontpage" && (
            <DealsGrid
              search={search}
              selectedCategory={selectedCategory}
              hideHeaderCategories={true}
            />
          )}

          {activeTopTab === "Forums" && (
            <div className="text-center text-gray-500 py-12">
              Forums coming soon.
            </div>
          )}
          {activeTopTab === "Hot Deals" && (
            <div className="text-center text-gray-500 py-12">
              Hot Deals coming soon.
            </div>
          )}
        </>
      );
    }

    if (activeBottom === "Post") {
      return (
        <PostDeal userId={user?.id} onPosted={() => setActiveBottom("Home")} />
      );
    }

    if (activeBottom === "Coins") {
      return <MyCoins userId={user?.id} />;
    }

    if (activeBottom === "You") {
      return <YouTab />;
    }

    return null;
  }

  // ---------------- JSX ----------------
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[linear-gradient(135deg,#fdf6e3,#fceabb,#f8d778)]">
        {/* HEADER */}
        <header className="bg-gradient-to-b from-[#ffffffcc] to-[#f8f1e8cc] backdrop-blur-md sticky top-0 z-50 shadow-md">
          <div className="max-w-5xl mx-auto px-3 py-2 flex items-center gap-4">
            <a href="/" className="flex-shrink-0">
              <img
                src="/savrdeals-logo.png"
                alt="Savrdeals"
                className="h-14 w-auto object-contain"
              />
            </a>

            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <IconSearch />
              </span>
              <input
                value={searchRaw}
                onChange={(e) => setSearchRaw(e.target.value)}
                placeholder="Search deals, phones, brands..."
                className="w-full pl-11 pr-4 py-2 rounded-full border border-yellow-200 bg-white/95 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>
          {/* TOP TABS */}
<div className="bg-gradient-to-b from-[#f8f1e8cc] to-[#f8f1e8cc] sticky top-[72px] z-40 pb-2">
  <div className="max-w-5xl mx-auto px-3 pt-2">
    <div className="flex items-center gap-3">
      <button
        onClick={() => {
          setActiveTopTab("Frontpage");
          setSelectedCategory("");
        }}
        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition ${
          activeTopTab === "Frontpage"
            ? "bg-yellow-800 text-white"
            : "bg-white text-gray-700 border hover:bg-gray-100"
        }`}
      >
        Frontpage
      </button>

      {/* CATEGORIES DROPDOWN */}
      <div className="relative" ref={categoriesRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowCategories((p) => !p);
            setActiveTopTab("Frontpage");
          }}
          className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 flex items-center gap-2"
        >
          Categories{" "}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              showCategories ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 mt-2 w-56 bg-white shadow-xl rounded-xl p-2 border max-h-[340px] overflow-y-auto"
              style={{ zIndex: 99999 }}
              onClick={(e) => e.stopPropagation()}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={() => setActiveTopTab("Forums")}
        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition ${
          activeTopTab === "Forums"
            ? "bg-yellow-800 text-white"
            : "bg-white text-gray-700 border hover:bg-gray-100"
        }`}
      >
        Forums
      </button>

      <button
        onClick={() => setActiveTopTab("Hot Deals")}
        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition ${
          activeTopTab === "Hot Deals"
            ? "bg-yellow-800 text-white"
            : "bg-white text-gray-700 border hover:bg-gray-100"
        }`}
      >
        Hot Deals
      </button>
    </div>
  </div>
</div>
          
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 max-w-5xl mx-auto px-3 py-6 w-full">
          <Routes>
            <Route path="/" element={renderMain()} />
            <Route path="/deal/:id" element={<DealDetail />} />
          </Routes>
        </main>

        {/* FOOTER */}
        <div className="mt-8 pb-6">
          <div className="bg-white/95 rounded-2xl shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="font-semibold text-lg mb-2">About Us</p>
                <p className="text-sm text-gray-700">
                  Savrdeals helps you discover the best online deals across
                  multiple stores.
                </p>
              </div>
              <div>
                <p className="font-semibold text-lg mb-2">Contact</p>
                <p className="text-sm text-gray-700">
                  Email:{" "}
                  <a
                    href="mailto:savrofficialdeals@email.com"
                    className="text-yellow-800 underline"
                  >
                    savrofficialdeals@email.com
                  </a>
                  <br />
                  Instagram:{" "}
                  <a
                    href="https://instagram.com/savrofficialdeals"
                    className="text-yellow-800 underline"
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
          </div>
        </div>

        {/* BOTTOM NAV */}
        <nav className="fixed left-0 right-0 bottom-0 z-50 bg-white/95 border-t border-yellow-100 shadow-inner">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex justify-between items-center py-2">
              <button
                onClick={() => {
                  setActiveBottom("Home");
                  setActiveTopTab("Frontpage");
                }}
                className={`flex flex-col items-center text-xs ${
                  activeBottom === "Home"
                    ? "text-yellow-800"
                    : "text-gray-600"
                }`}
              >
                <IconHome />
                <span>Home</span>
              </button>

              <div className="relative -mt-6">
                <button
                  onClick={() => requireLoginFor("Post")}
                  className="bg-yellow-800 hover:bg-yellow-900 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
                  aria-label="Post"
                >
                  <IconPlus className="h-6 w-6" />
                </button>
                <div className="text-center text-xs text-gray-700 mt-1">
                  Post
                </div>
              </div>

              <button
                onClick={() => requireLoginFor("Coins")}
                className={`flex flex-col items-center text-xs ${
                  activeBottom === "Coins"
                    ? "text-yellow-800"
                    : "text-gray-600"
                }`}
              >
                <IconCoin />
                <span>My Coins</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => requireLoginFor("You")}
                  className={`flex flex-col items-center text-xs ${
                    activeBottom === "You"
                      ? "text-yellow-800"
                      : "text-gray-600"
                  }`}
                >
                  <IconUser />
                  <span>You</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {showLoginModal && (
          <LoginModal onClose={() => setShowLoginModal(false)} />
        )}
      </div>
    </Router>
  );
} 
