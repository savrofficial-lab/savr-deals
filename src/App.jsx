// src/App.jsx
import React, { useState, useEffect } from "react";
import DealsGrid from "./components/DealsGrid";

/* ---------- Inline Icons (no external lib) ---------- */
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
function IconPlus({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconVideo({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M17 8l4-2v12l-4-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
/* ---------------------------------------------------- */

export default function App() {
  const [activeTopTab, setActiveTopTab] = useState("Frontpage");
  const [activeBottom, setActiveBottom] = useState("Home");

  // raw typed search (updates immediately as user types)
  const [search, setSearch] = useState("");
  // debounced search (updates after user stops typing for 400ms)
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // debounce logic
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(135deg,#fdf6e3,#fceabb,#f8d778)]">
      {/* ================= HEADER (logo left + search) ================= */}
      <header className="bg-gradient-to-b from-[#ffffffcc] to-[#f8f1e8cc] backdrop-blur-md sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto px-3 py-2 flex items-center gap-4">
          {/* Logo (keeps original size) */}
          <a href="/" className="flex-shrink-0">
            <img src="/savrdeals-logo.png" alt="Savrdeals" className="h-16 w-auto object-contain" />
          </a>

          {/* Search: icon inside + input expands to remaining width */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <IconSearch className="h-5 w-5" />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search"
              placeholder="Search deals, phones, brands..."
              className="w-full pl-11 pr-4 py-2 rounded-full border border-yellow-200 bg-white/95 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              aria-label="Search deals"
            />
          </div>

          {/* small right spacer */}
          <div className="hidden sm:block w-8" />
        </div>
      </header>

      {/* ================= TOP TABS (Frontpage | Forums | Hot Deals) ================= */}
      <div className="bg-gradient-to-b from-[#f8f1e8cc] to-[#f8f1e8cc] sticky top-[76px] z-40">
        <div className="max-w-5xl mx-auto px-3 py-2">
          <div className="flex items-center gap-3 overflow-auto">
            {["Frontpage", "Forums", "Hot Deals"].map((t) => {
              const active = t === activeTopTab;
              return (
                <button
                  key={t}
                  onClick={() => setActiveTopTab(t)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition ${
                    active ? "bg-yellow-800 text-white" : "bg-white text-gray-700 border border-transparent hover:bg-gray-100"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 max-w-5xl mx-auto px-3 py-6 w-full">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gray-800">{activeTopTab}</h2>
        </div>

        {/* Pass debouncedSearch to DealsGrid so typing doesn't refetch every keystroke */}
        {activeTopTab === "Frontpage" && <DealsGrid search={debouncedSearch} />}

        {activeTopTab === "Forums" && <div className="text-center text-gray-500 py-12">Forums coming soon — will allow user posts & comments.</div>}
        {activeTopTab === "Hot Deals" && <div className="text-center text-gray-500 py-12">Hot Deals coming soon — curated short-list of today’s best offers.</div>}

        {/* ================= Footer block (kept in main for SEO) ================= */}
        <div className="mt-8 pb-6">
          <div className="bg-white/95 rounded-2xl shadow p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="font-semibold text-lg mb-2">About Us</p>
                <p className="text-sm text-gray-700">
                  We are building an easy-to-use platform to help you discover the best online deals
                  across multiple e-commerce stores. Currently running in beta and non-profit.
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
                <nav className="flex gap-4 mb-2">
                  <a href="#" className="text-sm text-gray-700 hover:text-yellow-800">Home</a>
                  <a href="#" className="text-sm text-gray-700 hover:text-yellow-800">Categories</a>
                  <a href="#" className="text-sm text-gray-700 hover:text-yellow-800">Posts</a>
                  <a href="#" className="text-sm text-gray-700 hover:text-yellow-800">Reels</a>
                </nav>
                <p className="text-xs text-gray-500">© {new Date().getFullYear()} Savrdeals. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ================= BOTTOM NAV (fixed) ================= */}
      <nav className="fixed left-0 right-0 bottom-0 z-50 bg-white/95 border-t border-yellow-100 shadow-inner">
        <div className="max-w-5xl mx-auto px-4">
          <div className="relative">
            <div className="flex justify-between items-center py-2">
              {/* Home */}
              <button onClick={() => setActiveBottom("Home")} className={`flex flex-col items-center text-xs ${activeBottom === "Home" ? "text-yellow-800" : "text-gray-600"}`}>
                <IconHome />
                <span>Home</span>
              </button>

              {/* Search */}
              <button onClick={() => setActiveBottom("Search")} className={`flex flex-col items-center text-xs ${activeBottom === "Search" ? "text-yellow-800" : "text-gray-600"}`}>
                <IconSearch />
                <span>Search</span>
              </button>

              {/* Post (big plus) centered elevated */}
              <div className="relative -mt-6">
                <button onClick={() => setActiveBottom("Post")} className="bg-yellow-800 hover:bg-yellow-900 text-white rounded-full p-3 shadow-lg flex items-center justify-center" aria-label="Post a deal">
                  <IconPlus className="h-6 w-6" />
                </button>
                <div className="text-center text-xs text-gray-700 mt-1">Post</div>
              </div>

              {/* Reels */}
              <button onClick={() => setActiveBottom("Reels")} className={`flex flex-col items-center text-xs ${activeBottom === "Reels" ? "text-yellow-800" : "text-gray-600"}`}>
                <IconVideo />
                <span>Reels</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
