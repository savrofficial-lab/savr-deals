// src/components/CategoriesDropdown.jsx
import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const categoriesList = [
  "All",
  "Mobiles",
  "Laptops & Computers",
  "Men's fashion",
  "Electronics",
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

export default function CategoriesDropdown({ onSelectCategory }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative max-w-5xl mx-auto px-3 py-2">
      {/* Main button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-yellow-800 text-white px-4 py-2 rounded-lg shadow-md hover:bg-yellow-900 transition"
      >
        <span className="font-semibold">Categories</span>
        {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-yellow-100 rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
            {categoriesList.map((category) => (
              <button
                key={category}
                onClick={() => {
                  onSelectCategory(category);
                  setOpen(false);
                }}
                className="text-left px-3 py-2 text-sm font-medium rounded-lg bg-gray-50 hover:bg-yellow-100 text-gray-700"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
