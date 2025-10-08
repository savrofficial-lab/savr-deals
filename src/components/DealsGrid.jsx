// src/components/DealsGrid.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function DealsGrid({ search, externalCategory = undefined, hideInlineCategories = false }) {
  const [deals, setDeals] = useState([]);
  const [allCategories, setAllCategories] = useState(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Helpers
  const imgFor = (d) => d.image || d.image_url || d.img || d.thumbnail || "/placeholder.png";
  const linkFor = (d) => d.link || d.affiliate_link || d.url || "#";
  const priceFor = (d) => d.price ?? d.discounted_price ?? "";
  const oldPriceFor = (d) => d.oldPrice ?? d.old_price ?? d.mrp ?? "";

  // Keep in sync with externalCategory (parent-controlled)
  useEffect(() => {
    if (externalCategory !== undefined) {
      setSelectedCategory(externalCategory && externalCategory !== "" ? externalCategory : "All");
    }
  }, [externalCategory]);

  // Load categories (used by dropdown generation or internal buttons)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("deals")
          .select("category")
          .eq("published", true);

        if (error) {
          console.error("Error fetching categories:", error);
          return;
        }
        if (!mounted) return;
        const cats = Array.from(
          new Set(
            (data || [])
              .map((r) => (r.category || "").toString().trim())
              .filter(Boolean)
          )
        );
        setAllCategories(["All", ...cats]);
      } catch (err) {
        console.error("Unexpected error fetching categories:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch deals when category/search changes
  useEffect(() => {
    let mounted = true;
    async function fetchDeals() {
      setLoading(true);
      setErrorMsg("");
      try {
        let query = supabase.from("deals").select("*").eq("published", true);

        if (selectedCategory && selectedCategory !== "All") {
          // server-side exact match
          query = query.eq("category", selectedCategory);
        }

        if (search && search.trim() !== "") {
          query = query.ilike("title", `%${search.trim()}%`);
        }

        const { data, error } = await query;

        if (!mounted) return;
        if (error) {
          console.error("Supabase query error:", error);
          setErrorMsg(error.message || "Could not load deals. Please refresh.");
          setDeals([]);
        } else {
          setDeals(Array.isArray(data) ? data : []);
          setErrorMsg("");
        }
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
  }, [selectedCategory, search]);

  if (loading) return <div className="text-center text-gray-500 py-8">Loading deals…</div>;
  if (errorMsg) return <div className="text-center text-red-600 py-8">Error: {errorMsg}</div>;
  if (!deals || deals.length === 0) return <div className="text-center text-gray-500 py-8">No deals yet.</div>;

  return (
    <div>
      {/* Category buttons (only when not explicitly hidden) */}
      {!hideInlineCategories && (
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
      )}

      {/* Deals grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {deals.map((deal, idx) => {
          const imageSrc = imgFor(deal);
          const href = linkFor(deal);
          const price = priceFor(deal);
          const oldPrice = oldPriceFor(deal);

          // discount badge calc
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
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-transform hover:-translate-y-1 flex flex-col p-3"
            >
              <div className="relative">
                <img
                  src={imageSrc}
                  alt={deal.title || "Deal image"}
                  loading="lazy"
                  className="w-full h-36 object-contain mb-3"
                />
                {discountBadge && (
                  <div className="absolute left-3 top-3 bg-yellow-800 text-white text-xs font-semibold px-2 py-1 rounded">
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
                  <div className="text-sm font-bold text-gray-900">₹{price}</div>
                  {oldPrice && <div className="text-xs text-gray-500 line-through">₹{oldPrice}</div>}
                </div>

                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-yellow-800 hover:bg-yellow-900 text-white font-semibold px-3 py-2 rounded-lg text-xs"
                >
                  Shop Now
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
