       import React, { useState } from "react";
import DealsGrid from "./components/DealsGrid";

/* Inline SVG icons (no external package needed) */
function IconHome({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 11.5L12 4l9 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 21V12h14v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconSearch({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconPlus({ className = "h-8 w-8" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconForum({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function App() {
  const [activeTopTab, setActiveTopTab] = useState("Frontpage"); // UI-only tabs
  const [activeBottom, setActiveBottom] = useState("Home"); // tracks bottom nav highlight

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* === Header: small area with profile avatar on left and logo centered-ish === */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 py-3 flex items-center justify-between">
          {/* Left: profile circle (placeholder) */}
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600">
              {/* placeholder avatar icon */}
              <span className="font-medium">S</span>
            </div>
          </div>

          {/* Center: small logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <a href="/">
              <img src="/savrdeals-new-logo.png" alt="Savrdeals" className="h-10 w-auto object-contain" />
            </a>
          </div>

          {/* Right: empty (keeps logo centered visually) */}
          <div style={{ width: 32 }} />
        </div>
      </header>

      {/* === Top Tabs (pills) like Slickdeals: Frontpage | Popular | Hot Deals === */}
      <div className="bg-white sticky top-[56px] z-20"> {/* stuck below header */}
        <div className="max-w-7xl mx-auto px-3 py-3">
          <div className="flex items-center gap-3 overflow-auto">
            {["Frontpage", "Popular", "Hot Deals"].map((t) => {
              const active = t === activeTopTab;
              return (
                <button
                  key={t}
                  onClick={() => setActiveTopTab(t)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium ${
                    active ? "bg-black text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* === Main scrollable area with extra bottom padding so footer is reachable and not covered by bottom nav === */}
      <main className="flex-1 overflow-y-auto pb-36">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 pt-4">
          {/* Optional: small section heading */}
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-gray-800">{activeTopTab}</h2>
          </div>

          {/* Deals grid (keeps your existing logic & looks) */}
          <DealsGrid />
        </div>

        {/* Footer (About / Contact) — kept in page so Google & users can see SEO content */}
        <footer className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 mt-10 pb-6">
          <div className="bg-white rounded-2xl shadow p-5">
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
                  <a href="mailto:savrofficialdeals@email.com" className="text-blue-600 underline">
                    savrofficialdeals@email.com
                  </a>
                  <br />
                  Instagram:{" "}
                  <a href="https://instagram.com/savrofficialdeals" className="text-blue-600 underline">
                    @savrofficialdeals
                  </a>
                </p>
              </div>

              <div className="flex flex-col justify-between items-start md:items-end">
                <nav className="flex gap-4 mb-2">
                  <a href="#" className="text-sm text-gray-700 hover:text-sky-600">Home</a>
                  <a href="#" className="text-sm text-gray-700 hover:text-sky-600">Categories</a>
                  <a href="#" className="text-sm text-gray-700 hover:text-sky-600">Posts</a>
                  <a href="#" className="text-sm text-gray-700 hover:text-sky-600">Reels</a>
                </nav>
                <p className="text-xs text-gray-500">© {new Date().getFullYear()} Savrdeals. All rights reserved.</p>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* === Bottom navigation (sticky) === */}
      <nav className="fixed left-0 right-0 bottom-0 z-40 bg-white border-t shadow-md">
        <div className="max-w-5xl mx-auto px-6">
          <div className="relative">
            <div className="flex justify-between items-center py-2">
              {/* Home */}
              <button
                onClick={() => setActiveBottom("Home")}
                className={`flex flex-col items-center text-xs ${activeBottom === "Home" ? "text-sky-600" : "text-gray-600"}`}
              >
                <IconHome className={activeBottom === "Home" ? "h-6 w-6 text-current" : "h-6 w-6 text-current"} />
                <span>Home</span>
              </button>

              {/* Search */}
              <button
                onClick={() => setActiveBottom("Search")}
                className={`flex flex-col items-center text-xs ${activeBottom === "Search" ? "text-sky-600" : "text-gray-600"}`}
              >
                <IconSearch />
                <span>Search</span>
              </button>

              {/* Post (big plus) centered — elevated */}
              <div className="relative -mt-6">
                <button
                  onClick={() => setActiveBottom("Post")}
                  className="bg-sky-600 hover:bg-sky-700 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
                  aria-label="Post a deal"
                >
                  <IconPlus className="h-6 w-6" />
                </button>
                <div className="text-center text-xs text-gray-700 mt-1">Post</div>
              </div>

              {/* Forums */}
              <button
                onClick={() => setActiveBottom("Forums")}
                className={`flex flex-col items-center text-xs ${activeBottom === "Forums" ? "text-sky-600" : "text-gray-600"}`}
              >
                <IconForum />
                <span>Forums</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}         
