// src/components/DealsGrid.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowUp, Clock, Sparkles, TrendingUp } from "lucide-react";

export default function DealsGrid({
  search = "",
  selectedCategory: propSelectedCategory = "",
  hideHeaderCategories = false,
  filterHotDeals = false,
}) {
  const [deals, setDeals] = useState([]);
  const [allCategories, setAllCategories] = useState(["All"]);
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
    }, 60000); // Update every minute
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
  const oldPriceFor = (d) => d.oldPrice ?? d.old_price ?? d.mrp ?? "";

  // Calculate time remaining
  const getTimeRemaining = (createdAt) => {
    if (!createdAt) {
      console.log("No created_at timestamp found");
      return null;
    }
    
    const created = new Date(createdAt).getTime();
    const expiresAt = created + (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
    const remaining = expiresAt - currentTime;
    
    if (remaining <= 0) return { expired: true };
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    return { days, hours, minutes, expired: false };
  };

  // Load categories
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
        const cats = Array.from(
          new Set((data || []).map((r) => (r.category || "").toString().trim()).filter(Boolean))
        );
        setAllCategories(["All", ...cats]);
      } catch (err) {
        console.error("Unexpected categories error:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch deals + like counts
  useEffect(() => {
    let mounted = true;

    async function fetchDeals() {
      setLoading(true);
      setErrorMsg("");

      try {
        let query = supabase
          .from("deals")
          .select("id, title, image, category, link, posted_by, published, description, old_price, created_at, price, expires_at")
          .eq("published", true);

        const finalCategory = (selectedCategoryInternal || "All");

        // Special handling for "Hot Deals" - we'll filter it client-side
        if (finalCategory && finalCategory !== "All" && finalCategory !== "Hot Deals") {
          query = query.eq("category", finalCategory);
        }

        // search filter (server-side)
        if (search && search.trim() !== "") {
          query = query.ilike("title", `%${search.trim()}%`);
        }

        // Order newest first
        const { data: dealsData, error: dealsError } = await query.order("id", { ascending: false });

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

        // Debug: Check if created_at is being fetched
        console.log("First deal created_at:", list[0]?.created_at);

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
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-700 to-yellow-900 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold"
          >
            <Sparkles className="w-4 h-4" />
            Categories <ChevronDown className="w-5 h-5" />
          </button>

          {/* Popup */}
          {showDropdown && (
            <div className="absolute top-16 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-64 z-10 animate-fadeIn">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategoryInternal(cat);
                    setShowDropdown(false);
                  }}
                  className={`block w-full text-left px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 mb-1 ${
                    selectedCategoryInternal === cat 
                      ? "bg-gradient-to-r from-yellow-700 to-yellow-900 text-white shadow-md transform scale-105" 
                      : "hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 text-gray-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deals grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {deals.map((deal, idx) => {
          const imageSrc = imgFor(deal);
          const price = priceFor(deal);
          const oldPrice = oldPriceFor(deal);
          const timeRemaining = getTimeRemaining(deal.created_at);

          // Debug log for each deal
          console.log(`Deal ${deal.id} - created_at:`, deal.created_at, "timeRemaining:", timeRemaining);

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
              className="group bg-gradient-to-br from-white via-white to-gray-50 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 flex flex-col p-4 relative overflow-hidden border border-gray-100"
            >
              {/* Animated gradient background on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/0 via-orange-50/0 to-red-50/0 group-hover:from-yellow-50/40 group-hover:via-orange-50/40 group-hover:to-red-50/40 transition-all duration-500 rounded-3xl"></div>
              
              {/* Decorative corner accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-200/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>

              {/* 7-Day Timer - Top of card with enhanced design */}
              {timeRemaining && !timeRemaining.expired && (
                <div className="relative bg-gradient-to-r from-red-500 via-red-600 to-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl mb-3 flex items-center gap-2 shadow-lg z-10 animate-pulse-slow">
                  <Clock className="w-4 h-4 animate-spin-slow" />
                  <span className="flex items-center gap-1">
                    {timeRemaining.days > 0 && (
                      <span className="bg-white/20 px-2 py-0.5 rounded-md">{timeRemaining.days}d</span>
                    )}
                    <span className="bg-white/20 px-2 py-0.5 rounded-md">{timeRemaining.hours}h</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-md">{timeRemaining.minutes}m</span>
                  </span>
                  <Sparkles className="w-3 h-3 ml-auto" />
                </div>
              )}

              {/* like count badge top-right with enhanced design */}
              <div className="absolute top-4 right-4 bg-gradient-to-br from-white to-gray-50 backdrop-blur-sm rounded-2xl px-3 py-2 flex items-center gap-2 shadow-xl text-sm font-bold text-gray-800 z-20 border border-gray-200 group-hover:scale-110 transition-transform duration-300">
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-1 rounded-full">
                  <ArrowUp className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  {deal.like_count ?? 0}
                </span>
              </div>

              <div className="relative z-10">
                {/* Image container with overlay effects */}
                <div className="relative rounded-2xl overflow-hidden bg-white mb-4 group-hover:scale-105 transition-transform duration-500">
                  <img
                    src={imageSrc}
                    alt={deal.title || "Deal image"}
                    loading="lazy"
                    className="w-full h-40 object-contain p-3"
                  />
                  
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {discountBadge && (
                    <div className="absolute left-3 top-3 z-10">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl blur-md opacity-75"></div>
                        <div className="relative bg-gradient-to-r from-yellow-700 to-orange-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-2xl flex items-center gap-1.5 border-2 border-white/30">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {discountBadge}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-yellow-800 transition-colors duration-300">
                  {deal.title}
                </h3>

                {deal.description && (
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                    {deal.description}
                  </p>
                )}

                <div className="mt-auto pt-3 border-t border-gray-100">
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                          ₹{fmt(price)}
                        </span>
                        {oldPrice && (
                          <span className="text-xs text-gray-400 line-through font-medium">
                            ₹{fmt(oldPrice)}
                          </span>
                        )}
                      </div>
                      {oldPrice && (
                        <span className="text-xs font-semibold text-green-600">
                          Save ₹{fmt(parseFloat(oldPrice) - parseFloat(price))}
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/deal/${deal.id}`}
                      className="relative px-4 py-2.5 bg-gradient-to-r from-yellow-700 to-yellow-900 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden group/btn"
                    >
                      <span className="relative z-10 flex items-center gap-1">
                        View Deal
                        <Sparkles className="w-3 h-3" />
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-orange-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
      }
