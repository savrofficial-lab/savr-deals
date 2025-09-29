// src/components/DealsGrid.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function DealsGrid({ search }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  async function fetchDeals() {
    setLoading(true);
    setErrorMsg("");

    // Base query – always published=true
    let query = supabase
      .from("deals")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    // Optional search on title
    if (search && search.trim() !== "") {
      query = query.ilike("title", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading deals:", error);
      setErrorMsg("Could not load deals. Please refresh.");
      setDeals([]);
    } else {
      setDeals(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  if (loading) return <div className="text-center text-gray-500">Loading deals…</div>;
  if (errorMsg) return <div className="text-center text-red-500">{errorMsg}</div>;
  if (deals.length === 0) return <div className="text-center text-gray-500">No deals yet.</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {deals.map((deal) => (
        <div
          key={deal.id}
          className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden"
        >
          <img
            src={deal.image_url || "/placeholder.png"}
            alt={deal.title}
            className="h-40 w-full object-cover"
          />
          <div className="p-4 flex flex-col gap-2">
            <h3 className="font-semibold text-lg">{deal.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-3">{deal.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-yellow-800 font-bold">
                ₹{deal.price}
              </span>
              <a
                href={deal.link}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-yellow-800 hover:bg-yellow-900 text-white text-sm px-3 py-1 rounded-full"
              >
                Shop Now
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
