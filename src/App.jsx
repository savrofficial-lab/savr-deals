// src/App.jsx
import React, { useEffect, useState } from "react";
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
function IconCoin({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7v10M9 10h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
/* ---------------------------------------------------- */

export default function App() {
  // top tabs
  const [activeTopTab, setActiveTopTab] = useState("Frontpage");
  // bottom nav highlight
  const [activeBottom, setActiveBottom] = useState("Home");

  // raw typed search (updates as user types)
  const [searchRaw, setSearchRaw] = useState("");
  // debounced search (updated after user stops typing)
  const [search, setSearch] = useState("");

  // account menu
  const [showUserMenu, setShowUserMenu] = useState(false);

  // debounce: update `search` 400ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchRaw.trim()), 400);
    return () => clearTimeout(t);
  }, [searchRaw]);

  // close user menu when switching bottom nav or clicking home/post/coins
  useEffect(() => {
    // whenever bottom nav changes, close the user menu
    setShowUserMenu(false);
  }, [activeBottom]);

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(135deg,#fdf6e3,#fceabb,#f8d778)]">
      {/* ================= HEADER (logo left + search) ================= */}
      <header className="bg-gradient-to-b from-[#ffffffcc] to-[#f8f1e8cc] backdrop-blur-md sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto px-3 py-2 flex items-center gap-4">
          {/* Logo */}
          <a href="/" className="flex-shrink-0">
            <img src="/savrdeals-logo.png" alt="Savrdeals" className="h-14 w-auto object-contain" />
          </a>

          {/* Search input (single search for the whole app) */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <IconSearch className="h-5 w-5" />
            </span>
            <input
              type="search"
              aria-label="Search deals"
              placeholder="Search deals, phones, brands..."
              value={searchRaw}
              onChange={(e) => setSearchRaw(e.target.value)}
              className="w-full pl-11 pr-4 py-2 rounded-full border border-yellow-200 bg-white/95 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* small spacer for symmetry on larger screens */}
          <div className="hidden sm:block w-8" />
        </div>
      </header>

      {/* ================= TOP TABS (Frontpage | Forums | Hot Deals) ================= */}
      <div className="bg-gradient-to-b from-[#f8f1e8cc] to-[#f8f1e8cc] sticky top-[72px] z-40">
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

      {/* ================= MAIN CONTENT (contains footer for SEO) ================= */}
      <main className="flex-1 max-w-5xl mx-auto px-3 py-6 w-full">
        {/* small title */}
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gray-800">{activeTopTab}</h2>
        </div>

        {/* show content */}
        {activeTopTab === "Frontpage" && <DealsGrid search={search} />}
        {activeTopTab === "Forums" && (
          <div className="text-center text-gray-500 py-12">Forums coming soon — will allow user posts & comments.</div>
        )}
        {activeTopTab === "Hot Deals" && (
          <div className="text-center text-gray-500 py-12">Hot Deals coming soon — curated short-list of today's best offers.</div>
        )}

        {/* ================= FOOTER (kept inside main for SEO) ================= */}
        <div className="mt-8 pb-6">
          <div className="bg-white/95 rounded-2xl shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* About */}
              <div>
                <p className="font-semibold text-lg mb-2">About Us</p>
                <p className="text-sm text-gray-700">
                  Savrdeals is building an easy-to-use place to discover the best online deals across multiple e-commerce stores.
                  We curate big discounts and present them in a simple feed so you don't have to jump between apps. Currently running in beta.
                </p>
              </div>

              {/* Contact */}
              <div>
                <p className="font-semibold text-lg mb-2">Contact</p>
                <p className="text-sm text-gray-700">
                  Email:{" "}
                  <a href="mailto:savrofficialdeals@email.com" className="text-yellow-800 underline">
                    savrofficialdeals@email.com
                  </a>
                  <br />
                  Instagram:{" "}
                  <a href="https://instagram.com/savrofficialdeals" className="text-yellow-800 underline" target="_blank" rel="noreferrer">
                    @savrofficialdeals
                  </a>
                </p>
              </div>

              {/* Links + copyright */}
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
              <button
                onClick={() => {
                  setActiveBottom("Home");
                  setActiveTopTab("Frontpage");
                }}
                className={`flex flex-col items-center text-xs ${activeBottom === "Home" ? "text-yellow-800" : "text-gray-600"}`}
              >
                <IconHome />
                <span>Home</span>
              </button>

              {/* Post (big plus, centered elevated) */}
              <div className="relative -mt-6">
                <button
                  onClick={() => {
                    setActiveBottom("Post");
                    setShowUserMenu(false);
                    alert("Post flow coming soon (admin only for now).");
                  }}
                  className="bg-yellow-800 hover:bg-yellow-900 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
                  aria-label="Post a deal"
                >
                  <IconPlus className="h-6 w-6" />
                </button>
                <div className="text-center text-xs text-gray-700 mt-1">Post</div>
              </div>

              {/* My Coins */}
              <button
                onClick={() => {
                  setActiveBottom("Coins");
                  setActiveTopTab("Frontpage");
                  setShowUserMenu(false);
                  // open coins panel in future
                  alert("My Coins — feature coming soon.");
                }}
                className={`flex flex-col items-center text-xs ${activeBottom === "Coins" ? "text-yellow-800" : "text-gray-600"}`}
              >
                <span className="text-xl">©️</span>
                <span>My Coins</span>
              </button>

              {/* You / Account */}
              <div className="relative">
                <button
                  onClick={() => {
                    setActiveBottom("You");
                    setShowUserMenu((s) => !s);
                  }}
                  className={`flex flex-col items-center text-xs ${activeBottom === "You" ? "text-yellow-800" : "text-gray-600"}`}
                >
                  <IconUser />
                  <span>You</span>
                </button>

                {/* Small account dropdown */}
                {showUserMenu && (
                  <div className="absolute bottom-12 right-0 bg-white border rounded-lg shadow-lg w-44 text-sm">
                    {[
                      { label: "Profile", action: () => alert("Profile (coming soon)") },
                      { label: "My Orders", action: () => alert("My Orders (coming soon)") },
                      { label: "Notifications", action: () => alert("Notifications (coming soon)") },
                      { label: "Wishlist", action: () => alert("Wishlist (coming soon)") },
                      { label: "Logout", action: () => alert("Logout (not implemented)") },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          item.action();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
