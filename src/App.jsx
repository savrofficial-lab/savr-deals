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

/* ---------- Small inline icons (kept from your original) ---------- */
function IconHome({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 11.5L12 4l9 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21V12h14v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSearch({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconCoin({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <text x="12" y="15" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor">c</text>
    </svg>
  );
}
function IconUser({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 20c1-4 7-4 8-4s7 0 8 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPlus({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
/* ---------------------------- */

export default function App() {
  const [user, setUser] = useState(null);

  // UI states
  const [activeTopTab, setActiveTopTab] = useState("Frontpage");
  const [activeBottom, setActiveBottom] = useState("Home");
  const [searchRaw, setSearchRaw] = useState("");
  const [search, setSearch] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [intendedTab, setIntendedTab] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Category-related
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
    // initial user
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));

    // listener
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u && intendedTab) {
        setActiveBottom(intendedTab);
        setIntendedTab(null);
        setShowLoginModal(false);
      }
    });

    // cleanup
    return () => {
      try {
        listener?.subscription?.unsubscribe?.();
      } catch (e) {}
    };
  }, [intendedTab]);

  // ---------------- SEARCH debounce ----------------
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchRaw.trim()), 300);
    return () => clearTimeout(t);
  }, [searchRaw]);

  function requireLoginFor(tabName) {
    if (user) {
      setActiveBottom(tabName);
    } else {
      setIntendedTab(tabName);
      setShowLoginModal(true);
    }
    setShowUserMenu(false);
  }

  // ---------------- FETCH CATEGORIES (merge defaults + db) ----------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.from("deals").select("category").eq("published", true);
        if (error) {
          console.warn("Could not load categories:", error);
          return;
        }
        if (!mounted) return;
        const catsFromDb = Array.from(
          new Set((data || []).map((r) => (r.category || "").toString().trim()).filter(Boolean))
        );
        // merge default + db categories, preserve order
        const merged = Array.from(new Set([...DEFAULT_CATEGORIES.filter(Boolean), ...catsFromDb]));
        setCategories(merged);
      } catch (err) {
        console.error("Unexpected categories error:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // NOTE: removed outside-click handler as requested (dropdown will not auto-close on outside clicks)

  // ---------------- Main render logic (keeps your previous structure) ----------------
  function renderMain() {
    if (activeBottom === "Home") {
      return (
        <>
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {selectedCategory ? selectedCategory : activeTopTab}
            </h2>
          </div>

          {/* Show DealsGrid: hide header categories inside the grid (we moved them to top) */}
          {activeTopTab === "Frontpage" && (
            <DealsGrid search={search} selectedCategory={selectedCategory} hideHeaderCategories={true} />
          )}

          {activeTopTab === "Forums" && <div className="text-center text-gray-500 py-12">Forums coming soon.</div>}
          {activeTopTab === "Hot Deals" && <div className="text-center text-gray-500 py-12">Hot Deals coming soon.</div>}
        </>
      );
    }

    if (activeBottom === "Post") {
      return <PostDeal userId={user?.id} onPosted={() => setActiveBottom("Home")} />;
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
        {/* Header */}
        <header className="bg-gradient-to-b from-[#ffffffcc] to-[#f8f1e8cc] backdrop-blur-md sticky top-0 z-50 shadow-md">
          <div className="max-w-5xl mx-auto px-3 py-2 flex items-center gap-4">
            <a href="/" className="flex-shrink-0">
              <img src="/savrdeals-logo.png" alt="Savrdeals" className="h-14 w-auto object-contain" />
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
            <div className="hidden sm:block w-8" />
          </div>

          {/* Top tabs */}
          {activeBottom === "Home" && (
            <div className="bg-gradient-to-b from-[#f8f1e8cc] to-[#f8f1e8cc] sticky top-[72px] z-40">
              <div className="max-w-5xl mx-auto px-3 py-2">
                <div className="flex items-center gap-3 overflow-auto">
                  {/* Frontpage */}
                  <button
                    onClick={() => {
                      setActiveTopTab("Frontpage");
                      setSelectedCategory("");
                    }}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition ${
                      activeTopTab === "Frontpage" ? "bg-yellow-800 text-white" : "bg-white text-gray-700 border hover:bg-gray-100"
                    }`}
                  >
                    Frontpage
                  </button>

                  {/* Categories dropdown (between Frontpage and Forums) */}
                  <div className="relative" ref={categoriesRef}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCategories((p) => !p);
                        // keep top tab as Frontpage so deals grid is shown; we'll just set selectedCategory
                        setActiveTopTab("Frontpage");
                      }}
                      className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 flex items-center gap-2`}
                    >
                      Categories
                      <svg
                        className={`w-4 h-4 transition-transform ${showCategories ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown panel */}
                    {showCategories && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 mt-2 w-56 bg-white shadow-xl rounded-xl p-2 z-50 border max-h-[340px] overflow-y-auto"
                      >
                        <button
                          onClick={() => {
                            setSelectedCategory("");
                            setSearchRaw("");
                            setShowCategories(false);
                          }}
                          className={`block w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm ${selectedCategory === "" ? "bg-yellow-100 text-yellow-800" : ""}`}
                        >
                          All
                        </button>

                        {categories.length === 0 && (
                          <div className="text-center text-gray-500 text-sm py-2">No categories</div>
                        )}

                        {categories
                          .filter((cat) => cat && cat !== "All")
                          .map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                setSelectedCategory(cat);
                                setSearchRaw("");
                                setShowCategories(false);
                                // keep top tab as Frontpage so grid shows filtered deals
                                setActiveTopTab("Frontpage");
                              }}
                              className={`block w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm ${
                                selectedCategory === cat ? "bg-yellow-100 text-yellow-800" : ""
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Forums */}
                  <button
                    onClick={() => {
                      setActiveTopTab("Forums");
                      setSelectedCategory("");
                    }}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition ${
                      activeTopTab === "Forums" ? "bg-yellow-800 text-white" : "bg-white text-gray-700 border hover:bg-gray-100"
                    }`}
                  >
                    Forums
                  </button>

                  {/* Hot Deals */}
                  <button
                    onClick={() => {
                      setActiveTopTab("Hot Deals");
                      setSelectedCategory("");
                    }}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition ${
                      activeTopTab === "Hot Deals" ? "bg-yellow-800 text-white" : "bg-white text-gray-700 border hover:bg-gray-100"
                    }`}
                  >
                    Hot Deals
                  </button>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Main with Routes */}
        <main className="flex-1 max-w-5xl mx-auto px-3 py-6 w-full">
          <Routes>
            <Route path="/" element={renderMain()} />
            <Route path="/deal/:id" element={<DealDetail />} />
            {/* you can add more routes (profile, forum, etc.) */}
          </Routes>

          {/* Footer stays same */}
          <div className="mt-8 pb-6">
            <div className="bg-white/95 rounded-2xl shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="font-semibold text-lg mb-2">About Us</p>
                  <p className="text-sm text-gray-700">
                    Savrdeals helps you discover the best online deals across multiple stores.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-lg mb-2">Contact</p>
                  <p className="text-sm text-gray-700">
                    Email:{" "}
                    <a href="mailto:savrofficialdeals@email.com" className="text-yellow-800 underline">
                      savrofficialdeals@email.com
                    </a>
                    <br />
                    Instagram:{" "}
                    <a href="https://instagram.com/savrofficialdeals" className="text-yellow-800 underline">
                      @savrofficialdeals
                    </a>
                  </p>
                </div>
                <div className="flex flex-col justify-between items-start md:items-end">
                  <nav className="flex gap-4 mb-2"></nav>
                  <p className="text-xs text-gray-500">© {new Date().getFullYear()} Savrdeals. All rights reserved.</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Bottom nav */}
        <nav className="fixed left-0 right-0 bottom-0 z-50 bg-white/95 border-t border-yellow-100 shadow-inner">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex justify-between items-center py-2">
              <button
                onClick={() => {
                  setActiveBottom("Home");
                  setActiveTopTab("Frontpage");
                  setSelectedCategory("");
                }}
                className={`flex flex-col items-center text-xs ${activeBottom === "Home" ? "text-yellow-800" : "text-gray-600"}`}
              >
                <IconHome />
                <span>Home</span>
              </button>

              {/* Post (requires login) */}
              <div className="relative -mt-6">
                <button
                  onClick={() => requireLoginFor("Post")}
                  className="bg-yellow-800 hover:bg-yellow-900 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
                  aria-label="Post"
                >
                  <IconPlus className="h-6 w-6" />
                </button>
                <div className="text-center text-xs text-gray-700 mt-1">Post</div>
              </div>

              {/* Coins (protected) */}
              <button
                onClick={() => requireLoginFor("Coins")}
                className={`flex flex-col items-center text-xs ${activeBottom === "Coins" ? "text-yellow-800" : "text-gray-600"}`}
              >
                <IconCoin />
                <span>My Coins</span>
              </button>

              {/* You (protected) */}
              <div className="relative">
                <button
                  onClick={() => requireLoginFor("You")}
                  className={`flex flex-col items-center text-xs ${activeBottom === "You" ? "text-yellow-800" : "text-gray-600"}`}
                >
                  <IconUser />
                  <span>You</span>
                </button>

                {showUserMenu && user && (
                  <div className="absolute bottom-12 right-0 bg-white border rounded-lg shadow-lg w-44 text-sm">
                    <button onClick={() => setActiveBottom("You")} className="w-full text-left px-4 py-2 hover:bg-gray-100">Profile</button>
                    <button onClick={() => setActiveBottom("Coins")} className="w-full text-left px-4 py-2 hover:bg-gray-100">My Coins</button>
                    <button onClick={async () => { await supabase.auth.signOut(); setUser(null); setActiveBottom("Home"); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100">Logout</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      </div>
    </Router>
  );
}
