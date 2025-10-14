// src/components/DealsGrid.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowUp, Clock } from "lucide-react";

/**
 * DealsGrid
 *
 * Props:
 *  - search: string (optional)          => server-side ilike on title
 *  - selectedCategory: string (optional) => category filter passed from parent ("" or "All" means no filter)
 *  - hideHeaderCategories: boolean      => if true, DON'T render the top categories bar (App provides categories)
 *  - filterHotDeals: boolean            => if true, show only hot deals (>=55% discount) sorted by likes
 *
 * Notes:
 *  - The component fetches published deals from Supabase and also loads like counts for the visible deals.
 *  - Timer shown on each card counts down from created_at + 7 days (if created_at exists).
 *  - Category bar is shown at top unless hideHeaderCategories is true.
 *  - If parent passes selectedCategory prop, it is respected (internal state mirrors it).
 */

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
  const [allCategories, setAllCategories] = useState(FIXED_CATEGORIES);
  const [selectedCategoryInternal, setSelectedCategoryInternal] = useState(
    propSelectedCategory === "" || propSelectedCategory == null ? "All" : propSelectedCategory
  );
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDropdown, setShowDropdown] = useState(false); // for local header dropdown if used
  const [currentTime, setCurrentTime] = useState(Date.now());
  const dropdownRef = useRef(null);

  // Keep internal selection in sync when parent passes a category
  useEffect(() => {
    if (propSelectedCategory === "" || propSelectedCategory == null) {
      setSelectedCategoryInternal("All");
    } else {
      setSelectedCategoryInternal(propSelectedCategory);
    }
  }, [propSelectedCategory]);

  // Clock: update every 15s for smoother timer UI (but light on CPU)
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleDocClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, [showDropdown]);

  // Helpers (safe field lookups)
  const imgFor = (d) => d.image || d.image_url || d.img || d.thumbnail || "/placeholder.png";
  const linkFor = (d) => d.link || d.affiliate_link || d.url || "#";
  const priceFor = (d) => d.price ?? d.discounted_price ?? d.amount ?? "";
  const oldPriceFor = (d) => d.oldPrice ?? d.old_price ?? d.mrp ?? d.previous_price ?? "";

  // Load categories from DB and merge with fixed list to show dynamic ones too
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.from("deals").select("category").eq("published", true);
        if (error) {
          console.warn("Could not load categories:", error);
          return;
        }
        if (!mounted) return;
        const cats = Array.from(new Set((data || []).map((r) => (r.category || "").toString().trim()).filter(Boolean)));
        // merge preserving fixed order, and append unknown ones
        const merged = Array.from(new Set([...FIXED_CATEGORIES.filter(Boolean), ...cats]));
        setAllCategories(merged);
      } catch (err) {
        console.error("Unexpected categories error:", err);
      }
    })();
    return () => (mounted = false);
  }, []);

  // Calculate discount percentage helper
  const calcDiscountPercent = (d) => {
    const price = parseFloat(priceFor(d)) || 0;
    const oldPrice = parseFloat(oldPriceFor(d)) || 0;
    if (!isNaN(price) && !isNaN(oldPrice) && oldPrice > price && oldPrice > 0) {
      return Math.round(((oldPrice - price) / oldPrice) * 100);
    }
    return 0;
  };

  // Time-remaining helper (returns null if expired)
  const getTimeRemaining = (createdAt) => {
    if (!createdAt) {
      // no date -> assume full 7 days remaining
      return { days: 7, hours: 0, minutes: 0 };
    }
    // Track live time
const [currentTime, setCurrentTime] = useState(Date.now());

useEffect(() => {
  const timer = setInterval(() => setCurrentTime(Date.now()), 1000); // update every second
  return () => clearInterval(timer);
}, []);
    // Normalize createdAt: Supabase can return ISO string; sometimes it's nested
    const createdMs = typeof createdAt === "number" ? createdAt : new Date(createdAt).getTime();
    if (!createdMs || Number.isNaN(createdMs)) {
      return { days: 7, hours: 0, minutes: 0 };
    }
    const expiresAt = createdMs + 7 * 24 * 60 * 60 * 1000; // 7 days
    const remaining = expiresAt - currentTime;
    if (remaining <= 0) return null; // expired
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return { days, hours, minutes };
  };

  // Fetch deals + like counts whenever selectedCategoryInternal, search, or filterHotDeals changes
  useEffect(() => {
    let mounted = true;

    async function fetchDeals() {
      setLoading(true);
      setErrorMsg("");

      try {
        let query = supabase.from("deals").select("*").eq("published", true);

        // server-side category filtering for real categories (but treat "Hot Deals" specially)
        const finalCategory = selectedCategoryInternal || "All";
        if (finalCategory && finalCategory !== "All" && finalCategory !== "Hot Deals") {
          query = query.eq("category", finalCategory);
        }

        // search filter
        if (search && search.trim() !== "") {
          query = query.ilike("title", `%${search.trim()}%`);
        }

        // Ordering: for normal view order by created_at desc; for hot deals we'll sort client-side by likes after filtering
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

        // Fetch like counts *only for visible deals* (single query)
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

        // Merge like counts and compute discounts
        let merged = list.map((d) => {
          const discount = calcDiscountPercent(d);
          return {
            ...d,
            like_count: likeCounts[d.id] || 0,
            discountPercent: discount,
          };
        });

        // Combine filterHotDeals prop or top-tab "Hot Deals" (if selectedCategoryInternal === "Hot Deals")
        const hotFlag = filterHotDeals || selectedCategoryInternal === "Hot Deals";
        if (hotFlag) {
          // Client-side filter for >= 55% discount and sort by like_count desc
          merged = merged.filter((d) => d.discountPercent >= 55).sort((a, b) => b.like_count - a.like_count);
        }

        // Final set
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
  }, [selectedCategoryInternal, search, filterHotDeals, currentTime]);

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
      {/* Top category bar (hidden when parent provides categories/header) */}
      {!hideHeaderCategories && (
        <div className="sticky top-0 z-30 bg-gradient-to-b from-white/95 to-white/80 backdrop-blur-sm py-3">
          <div className="max-w-5xl mx-auto px-3">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
              {allCategories.map((cat) => {
                const active = (selectedCategoryInternal === cat) || (cat === "All" && (selectedCategoryInternal === "" || selectedCategoryInternal === "All"));
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategoryInternal(cat === "All" ? "" : cat);
                      setShowDropdown(false);
                    }}
                    className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-shadow transition-colors
                      ${active ? "bg-yellow-800 text-white shadow-lg" : "bg-white text-gray-700 border hover:bg-gray-100"}`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Small dropdown fallback for mobile or when headerCategories hidden */}
      {!hideHeaderCategories && (
        <div className="hidden" ref={dropdownRef} aria-hidden>
          {/* kept for future use; present to avoid linter warnings */}
        </div>
      )}

      {/* Deals grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mt-4">
        {deals.map((deal, idx) => {
          const imageSrc = imgFor(deal);
          const price = priceFor(deal);
          const oldPrice = oldPriceFor(deal);

          const timeRemaining = getTimeRemaining(deal.created_at);

          // discount badge
          let discountBadge = null;
          if (deal.discountPercent && deal.discountPercent > 0) {
            discountBadge = `${deal.discountPercent}% OFF`;
          } else {
            // fallback compute in case not present
            const p = parseFloat(price);
            const op = parseFloat(oldPrice);
            if (!Number.isNaN(p) && !Number.isNaN(op) && op > p) {
              const percent = Math.round(((op - p) / op) * 100);
              if (percent > 0) discountBadge = `${percent}% OFF`;
            }
          }

          return (
            <div
              key={deal.id ?? idx}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-transform hover:-translate-y-1 flex flex-col p-3 relative"
            >
              {/* Timer (top-left area above image) */}
              {timeRemaining && (
                <div className="mb-2 inline-flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg w-fit shadow-sm">
                  <Clock className="w-3 h-3" />
                  <span className="whitespace-nowrap text-[11px]">
                    {timeRemaining.days > 0 ? `${timeRemaining.days}d ` : ""}
                    {timeRemaining.hours}h {timeRemaining.minutes}m
                  </span>
                </div>
              )}

              {/* Like count badge top-right (unclickable) */}
              <div className="absolute top-3 right-3 bg-white/95 rounded-full px-2 py-1 flex items-center gap-2 shadow-sm text-sm font-medium text-gray-700 z-20">
                <ArrowUp className="w-4 h-4 text-yellow-700" />
                <span>{deal.like_count ?? 0}</span>
              </div>

              {/* Image + discount badge */}
              <div className="relative mb-3">
                <img
                  src={imageSrc}
                  alt={deal.title || "Deal image"}
                  loading="lazy"
                  className="w-full h-36 object-contain bg-white rounded-lg"
                />
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
