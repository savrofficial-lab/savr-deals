import React, { useEffect, useState } from "react";

export default function DealsGrid() {
  const [deals, setDeals] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    fetch("/deals.json")
      .then((res) => res.json())
      .then((data) => setDeals(data))
      .catch((err) => console.error("Error loading deals:", err));
  }, []);

  // Get unique categories
  const categories = ["All", ...new Set(deals.map((d) => d.category))];

  // Filter deals based on category
  const filteredDeals =
    selectedCategory === "All"
      ? deals
      : deals.filter((d) => d.category === selectedCategory);

  if (!deals || deals.length === 0) {
    return (
      <p className="text-center text-gray-500">
        No deals yet — update public/deals.json
      </p>
    );
  }

  return (
    <div>
      {/* Category Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              selectedCategory === cat
                ? "bg-sky-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Deals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredDeals.map((deal, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl shadow hover:shadow-lg transition p-4 flex flex-col"
          >
            <img
              src={deal.image}
              alt={deal.title}
              className="w-full h-40 object-contain mb-4"
            />
            <h2 className="text-base font-semibold mb-2 text-gray-800">
              {deal.title}
            </h2>

            <div className="mt-2 flex items-center space-x-2">
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
              className="mt-auto bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg text-center"
            >
              Shop Now
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
