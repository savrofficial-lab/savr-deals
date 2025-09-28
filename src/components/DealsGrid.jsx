// src/components/DealsGrid.jsx
import React, { useEffect, useState } from "react";

export default function DealsGrid({ search }) {
  const [deals, setDeals] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [allCategories, setAllCategories] = useState(["All"]);
  const [loading, setLoading] = useState(true);

  // Fetch all categories once
  useEffect(() => {
    fetch("/api/deals")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllCategories([
            "All",
            ...Array.from(new Set(data.map((d) => d.category).filter(Boolean))),
          ]);
        }
      })
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  // Debounced fetch for deals
  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "All") {
        params.set("category", selectedCategory);
      }
      if (search && search.trim() !== "") {
        params.set("q", search.trim());
      }

      fetch(`/api/deals?${params.toString()}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          setDeals(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Error loading deals from /api/deals:", err);
            setDeals([]);
          }
        })
        .finally(() => setLoading(false));
    }, 400); // wait 400ms after typing stops

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedCategory, search]);

  if (loading) {
    return (
      <p className="text-center text-gray-500 py-8">
        Loading deals…
      </p>
    );
  }

  if (!deals || deals.length === 0) {
    return (
      <p className="text-center text-gray-500">
        No deals yet — update public/deals.json or check /api/deals
      </p>
    );
  }

  return (
    <div>
      {/* Category Buttons */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedCategory === cat
                ? "bg-yellow-800 text-white shadow"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Deals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {deals.map((deal, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-gradient-to-b from-[#fff9f2] to-[#fef5e6] border border-yellow-100 shadow-md hover:shadow-xl transition-transform hover:-translate-y-1 flex flex-col p-4"
          >
            <div className="relative">
              <img
                src={deal.image}
                alt={deal.title}
                loading="lazy"
                className="w-full h-48 object-contain mb-3 transition-transform duration-300 hover:scale-105"
              />
            </div>

            <h2 className="text-base sm:text-lg font-semibold mb-1 text-gray-800">
              {deal.title}
            </h2>

            <div className="mt-1 flex items-center space-x-2">
              <span className="text-lg font-bold text-gray-900">
                ₹{deal.price}
              </span>
              {deal.oldPrice && (
                <span className="text-sm text-gray-500 line-through">
                  ₹{deal.oldPrice}
                </span>
              )}
            </div>

            <a
              href={deal.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto bg-yellow-700 hover:bg-yellow-800 text-white font-semibold py-2 px-4 rounded-xl text-center transition-colors"
            >
              Shop Now
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
