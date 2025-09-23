    import React from "react";
import DealsGrid from "./components/DealsGrid";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top header: only logo */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-center px-6 py-3">
          <a href="/" className="flex items-center">
            <img
              src="/savrdeals-new-logo.png"
              alt="Savrdeals"
              className="h-14 w-auto object-contain"
            />
          </a>
        </div>
      </header>

      {/* Hero / big banner – compact on small screens */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold">
            🔥 Savr — Best Mobile Deals Today
          </h1>
          <p className="mt-2 sm:mt-3 text-base sm:text-lg max-w-2xl mx-auto">
            Updated daily with real discounts — scroll, discover, buy at the best price.
          </p>
        </div>
      </div>

      {/* Main content (Deals grid) */}
      <main className="flex-1 max-w-6xl mx-auto p-4 w-full">
        <DealsGrid />
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 mt-8 py-8 px-4 text-gray-700 text-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* About */}
          <div>
            <p className="font-semibold text-lg mb-2">About Us</p>
            <p className="mb-4">
              We are building an easy-to-use platform to help you discover the best online deals
              across multiple e-commerce stores. Currently running in beta and non-profit.
            </p>
          </div>

          {/* Contact */}
          <div>
            <p className="font-semibold text-lg mb-2">Contact</p>
            <p>
              Email:{" "}
              <a
                href="mailto:savrofficialdeals@email.com"
                className="text-blue-600 underline"
              >
                savrofficialdeals@email.com
              </a>
              <br />
              Instagram:{" "}
              <a
                href="https://instagram.com/savrofficialdeals"
                className="text-blue-600 underline"
              >
                @savrofficialdeals
              </a>
            </p>
          </div>

          {/* Bottom nav + copyright */}
          <div className="flex flex-col justify-between items-center md:items-end">
            <nav className="flex gap-6 mb-4">
              <a href="#" className="hover:text-sky-600">Home</a>
              <a href="#" className="hover:text-sky-600">Categories</a>
              <a href="#" className="hover:text-sky-600">Posts</a>
              <a href="#" className="hover:text-sky-600">Reels</a>
            </nav>

            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Savrdeals. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
             
