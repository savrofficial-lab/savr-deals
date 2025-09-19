import React from "react";
import DealsGrid from "./components/DealsGrid";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Savr</h1>
          <nav className="space-x-4 text-sm text-gray-700 hidden sm:flex">
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
    </div>
  );
}

