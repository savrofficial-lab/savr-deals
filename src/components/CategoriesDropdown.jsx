// src/components/CategoriesDropdown.jsx
import React, { useEffect, useRef } from "react";

/**
 * CategoriesDropdown
 * - onSelectCategory(categoryString)
 * - onClose()
 *
 * By default uses a simple static categories list. Replace the list with a fetch if you keep categories in DB.
 */
export default function CategoriesDropdown({ onSelectCategory = () => {}, onClose = () => {} }) {
  const containerRef = useRef(null);

  const categories = [
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

  // close when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [onClose]);

  return (
    <div ref={containerRef} className="p-3">
      <div className="grid grid-cols-1 gap-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => {
              onSelectCategory(c);
              // close after selection
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
