import React from "react";
import DealsGrid from "./components/DealsGrid";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-sky-500 shadow-md">
  <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
    <img
      src="/savrdeals-new-logo.png"
      alt="mavrdeals"
      className="h-16 w-auto object-contain" 
    />
    <nav className="space-x-4 text-sm text-white hidden sm:flex">
      <a href="#" className="hover:underline">Home</a>
      <a href="#" className="hover:underline">Categories</a>
      <a href="#" className="hover:underline">Reels</a>
      <a href="#" className="hover:underline">Coupons</a>
    </nav>
  </div>
</header>
  {/* Navigation on the right */}
    <nav className="space-x-8 text-white text-lg font-medium hidden md:flex">
      <a href="#" className="hover:underline">Home</a>
      <a href="#" className="hover:underline">Categories</a>
      <a href="#" className="hover:underline">Reels</a>
      <a href="#" className="hover:underline">Coupons</a>
    </nav>
  </div>
</header>
   <main className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <section className="lg:col-span-3">
          <DealsGrid />
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <div className="bg-white rounded-2xl shadow p-4 h-[600px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm text-gray-500">Ad space</div>
                <div className="mt-4 font-semibold">Tall Ad (Desktop)</div>
              </div>
            </div>
          </div>
        </aside>
      </main>
      <footer className="bg-gray-100 mt-8 py-6 px-4 text-center text-gray-700 text-sm">
  <div className="max-w-3xl mx-auto">
    <p className="font-semibold text-lg mb-2">About Us</p>
    <p className="mb-4">
      We are building an easy-to-use platform to help you discover the best online deals
      across multiple e-commerce stores. Currently running in beta and non-profit.
    </p>

    <p className="font-semibold text-lg mb-2">Contact</p>
    <p>
      Email: <a href="mailto:savrofficialdeals@email.com" className="text-blue-600 underline">savrofficialdeals@email.com</a> <br />
      Instagram: <a href="https://instagram.com/savrofficialdeals" className="text-blue-600 underline">@savrofficialdeals</a>
    </p>

    <p className="mt-4 text-xs text-gray-500">
      © {new Date().getFullYear()} YourBrandName. All rights reserved.
    </p>
  </div>
</footer>
    </div>
  );
}

