// src/components/DealsGrid.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowUp, Clock, Sparkles } from "lucide-react";

// FIXED CATEGORIES LIST
const FIXED_CATEGORIES = [
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

export default function DealsGrid({
  search = "",
  selectedCategory: propSelectedCategory = "",
  hideHeaderCategories = false,
  filterHotDeals = false,
}) {
  const [deals, setDeals] = useState([]);
  const [allCategories, setAllCategories] = useState(FIXED_CATEGORIES); // USE FIXED LIST
  const [selectedCategoryInternal, setSelectedCategoryInternal] = useState(
    propSelectedCategory === "" || propSelectedCategory == null ? "All" : propSelectedCategory
  );
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every minute for timer updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Keep internal selection in sync when parent passes a category
  useEffect(() => {
    if (propSelectedCategory === "" || propSelectedCategory == null) {
      setSelectedCategoryInternal("All");
    } else {
      setSelectedCategoryInternal(propSelectedCategory);
    }
  }, [propSelectedCategory]);

  // Helpers (safe field lookups)
  const imgFor = (d) => d.image || d.image_url || d.img || d.thumbnail || "/placeholder.png";
  const priceFor = (d) => d.price ?? d.discounted_price ?? d.amount ?? "";
  const oldPriceFor = (d) => d.old_price ?? d.oldPrice ?? d.mrp ?? "";

  // Calculate time remaining - IMPROVED VERSION
  const getTimeRemaining = (createdAt) => {
    // If no created_at, return default 7 days
    if (!createdAt) {
      return { days: 7, hours: 0, minutes: 0, isDefault: true };
    }
    
    try {
      // Try to parse the date
      let created;
      
      // If it's already a timestamp number
      if (typeof createdAt === 'number') {
        created = createdAt;
      } else {
        // Parse as date string
        created = new Date(createdAt).getTime();
      }
      
      // Check if valid
      if (isNaN(created) || created <= 0) {
        return { days: 7, hours: 0, minutes: 0, isDefault: true };
      }
      
      const expiresAt = created + (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
      const remaining = expiresAt - currentTime;
      
      // If expired, don't show timer
      if (remaining <= 0) {
        return null;
      }
      
      const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
      const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      
      return { days, hours, minutes, isDefault: false };
    } catch (e) {
      return { days: 7, hours: 0, minutes: 0, isDefault: true };
    }
  };

  // Fetch deals + like counts
  useEffect(() => {
    let mounted = true;

    async function fetchDeals() {
      setLoading(true);
      setErrorMsg("");

      try {
        let query = supabase.from("deals").select("*").eq("published", true);

        const finalCategory = (selectedCategoryInternal || "All");

        if (finalCategory && finalCategory !== "All" && finalCategory !== "Hot Deals") {
          query = query.eq("category", finalCategory);
        }

        if (search && search.trim() !== "") {
          query = query.ilike("title", `%${search.trim()}%`);
        }

        // Order by created_at instead of id for proper chronological order
        const { data: dealsData, error: dealsError } = await query.order("created_at", { ascending: false });

        if (!mounted) return;

        if (dealsError) {
          console.error("Supabase query error (deals):", dealsError);
          setErrorMsg(dealsError.message || "Could not load deals.");
          setDeals([]);
          setLoading(false);
          return;
        }

        const list = Array.isArray(dealsData) ? dealsData : [];

        if (list.length === 0) {
          setDeals([]);
          setLoading(false);
          return;
        }

        // Fetch like counts
        const ids = list.map((d) => d.id).filter(Boolean);
        let likeCounts = {};
        if (ids.length > 0) {
          const { data: likesData, error: likesError } = await supabase
            .from("likes")
            .select("deal_id")
            .in("deal_id", ids);

          if (likesError) {
            console.warn("Could not fetch likes counts:", likesError);
            likeCounts = {};
          } else {
            likeCounts = likesData.reduce((acc, l) => {
              acc[l.deal_id] = (acc[l.deal_id] || 0) + 1;
              return acc;
            }, {});
          }
        }

        // Merge like counts and calculate discount for ALL deals
        let merged = list.map((d) => {
          const price = parseFloat(d.price ?? d.discounted_price ?? 0);
          const oldPrice = parseFloat(d.old_price ?? d.oldPrice ?? d.mrp ?? 0);
          let discountPercent = 0;
          
          if (!Number.isNaN(price) && !Number.isNaN(oldPrice) && oldPrice > price) {
            discountPercent = Math.round(((oldPrice - price) / oldPrice) * 100);
          }
          
          return {
            ...d,
            like_count: likeCounts[d.id] || 0,
            discountPercent: discountPercent
          };
        });
        
        // Apply Hot Deals filter if needed
        const isHotDeals = selectedCategoryInternal === "Hot Deals" || filterHotDeals;
        
        if (isHotDeals) {
          merged = merged
            .filter((d) => d.discountPercent >= 55)
            .sort((a, b) => b.like_count - a.like_count);
        }

        setDeals(merged);
      } catch (err) {
        console.error("Unexpected fetch error:", err);
        setErrorMsg(String(err));
        setDeals([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchDeals();

    return () => {
      mounted = false;
    };
  }, [selectedCategoryInternal, search, filterHotDeals]);

  // UI states
  if (loading) return <div className="text-center text-gray-500 py-8">Loading deals…</div>;
  if (errorMsg) return <div className="text-center text-red-600 py-8">Error: {errorMsg}</div>;
  if (!deals || deals.length === 0) return <div className="text-center text-gray-500 py-8">No deals yet.</div>;

  // currency formatter helper
  const fmt = (v) => {
    if (v == null || v === "") return "";
    const n = Number(v);
    if (Number.isNaN(n)) return v;
    return n.toLocaleString();
  };

  return (
    <div className="relative">
      {/* If parent didn't provide header categories, show small dropdown here */}
      {!hideHeaderCategories && (
        <div className="flex justify-center mb-6 relative">
          <button
            onClick={() => setShowDropdown((s) => !s)}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-100 transition"
          >
            Categories <ChevronDown className="w-4 h-4" />
          </button>

          {/* Popup */}
          {showDropdown && (
            <div className="absolute top-12 bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-56 z-10">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategoryInternal(cat);
                    setShowDropdown(false);
                  }}
                  className={`block w-full text-left px-4 py-2 rounded-lg text-sm ${
                    selectedCategoryInternal === cat ? "bg-yellow-800 text-white" : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deals grid - BACK TO ORIGINAL: 2 cols mobile, 3 cols sm, 4 cols lg */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {deals.map((deal, idx) => {
          const imageSrc = imgFor(deal);
          const price = priceFor(deal);
          const oldPrice = oldPriceFor(deal);
          const timeRemaining = getTimeRemaining(deal.created_at);

          // discount percent
          let discountBadge = null;
          const p = parseFloat(price);
          const op = parseFloat(oldPrice);
          if (!Number.isNaN(p) && !Number.isNaN(op) && op > p) {
            const percent = Math.round(((op - p) / op) * 100);
            discountBadge = percent > 0 ? `${percent}% OFF` : null;
          }

          return (
            <div
              key={deal.id ?? idx}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-transform hover:-translate-y-1 flex flex-col p-3 relative"
            >
              {/* 7-Day Timer - Always show unless expired */}
              {timeRemaining && (
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg mb-2 flex items-center gap-1 w-fit max-w-[65%]">
                  <Clock className="w-3 h-3" />
                  <span className="whitespace-nowrap text-[10px] sm:text-xs">
                    {timeRemaining.days > 0 && `${timeRemaining.days}d `}
                    {timeRemaining.hours}h {timeRemaining.minutes}m
                  </span>
                </div>
              )}

              {/* like count badge top-right */}
              <div className="absolute top-3 right-3 bg-white/95 rounded-full px-2 py-1 flex items-center gap-2 shadow-sm text-sm font-medium text-gray-700 z-20">
                <ArrowUp className="w-4 h-4 text-yellow-700" />
                <span>{deal.like_count ?? 0}</span>
              </div>

              {/* Image container with discount badge INSIDE */}
              <div className="relative mb-3">
                <img
                  src={imageSrc}
                  alt={deal.title || "Deal image"}
                  loading="lazy"
                  className="w-full h-36 object-contain bg-white"
                />
                {/* Discount badge positioned at top-left corner of image */}
                {discountBadge && (
                  <div className="absolute left-2 top-2 bg-yellow-800 text-white text-xs font-semibold px-2 py-1 rounded z-10">
                    {discountBadge}
                  </div>
                )}
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-1 line-clamp-2">
                {deal.title}
              </h3>

              {deal.description && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-3">{deal.description}</p>
              )}

              <div className="mt-auto flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-gray-900">₹{fmt(price)}</div>
                  {oldPrice && <div className="text-xs text-gray-500 line-through">₹{fmt(oldPrice)}</div>}
                </div>

                <Link
                  to={`/deal/${deal.id}`}
                  className="px-3 py-2 bg-yellow-800 text-white rounded"
                >
                  View Deal
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
