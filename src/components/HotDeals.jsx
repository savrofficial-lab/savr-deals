// src/components/HotDeals.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";

export default function HotDeals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    async function fetchHotDeals() {
      setLoading(true);
      setErrorMsg("");

      try {
        // Step 1: fetch all published deals
        const { data: allDeals, error } = await supabase
          .from("deals")
          .select("*")
          .eq("published", true);

        if (error) throw error;
        if (!mounted) return;

        // Step 2: calculate discounts and filter > 55%
        const discounted = allDeals.filter((d) => {
          const price = parseFloat(d.price);
          const oldPrice = parseFloat(d.old_price);
          if (Number.isNaN(price) || Number.isNaN(oldPrice) || oldPrice <= price)
            return false;
          const discount = Math.round(((oldPrice - price) / oldPrice) * 100);
          return discount >= 55;
        });

        if (discounted.length === 0) {
          setDeals([]);
          setLoading(false);
          return;
        }

        // Step 3: get like counts for filtered deals
        const ids = discounted.map((d) => d.id);
        const { data: likesData, error: likesError } = await supabase
          .from("likes")
          .select("deal_id")
          .in("deal_id", ids);

        if (likesError) throw likesError;

        const likeCounts = likesData.reduce((acc, l) => {
          acc[l.deal_id] = (acc[l.deal_id] || 0) + 1;
          return acc;
        }, {});

        // Step 4: merge and sort by likes (descending)
        const finalDeals = discounted
          .map((d) => ({
            ...d,
            like_count: likeCounts[d.id] || 0,
          }))
          .sort((a, b) => b.like_count - a.like_count);

        setDeals(finalDeals);
      } catch (err) {
        console.error("🔥 Error loading hot deals:", err);
        setErrorMsg(err.message || "Failed to load hot deals");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchHotDeals();

    return () => {
      mounted = false;
    };
  }, []);

  // currency formatter
  const fmt = (v) => {
    if (v == null || v === "") return "";
    const n = Number(v);
    if (Number.isNaN(n)) return v;
    return n.toLocaleString();
  };

  if (loading) return <div className="text-center text-gray-500 py-8">Loading Hot Deals…</div>;
  if (errorMsg) return <div className="text-center text-red-600 py-8">Error: {errorMsg}</div>;
  if (deals.length === 0)
    return <div className="text-center text-gray-500 py-8">No hot deals found 🔥</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2">
        🔥 Hot Deals
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {deals.map((deal) => {
          const price = parseFloat(deal.price);
          const oldPrice = parseFloat(deal.old_price);
          const discountPercent = Math.round(((oldPrice - price) / oldPrice) * 100);

          return (
            <div
              key={deal.id}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-transform hover:-translate-y-1 flex flex-col p-3 relative"
            >
              {/* like count badge top-right */}
              <div className="absolute top-3 right-3 bg-white/95 rounded-full px-2 py-1 flex items-center gap-2 shadow-sm text-sm font-medium text-gray-700 z-20">
                <ArrowUp className="w-4 h-4 text-yellow-700" />
                <span>{deal.like_count ?? 0}</span>
              </div>

              <div className="relative">
                <img
                  src={deal.image}
                  alt={deal.title}
                  className="w-full h-36 object-contain mb-3 bg-white"
                />
                {discountPercent > 0 && (
                  <div className="absolute left-3 top-3 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded z-10">
                    {discountPercent}% OFF
                  </div>
                )}
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-1 line-clamp-2">
                {deal.title}
              </h3>
              <p className="text-xs text-gray-600 mb-2 line-clamp-3">{deal.description}</p>

              <div className="mt-auto flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-gray-900">₹{fmt(price)}</div>
                  {oldPrice && (
                    <div className="text-xs text-gray-500 line-through">₹{fmt(oldPrice)}</div>
                  )}
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
