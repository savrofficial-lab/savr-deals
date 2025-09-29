// src/components/DealsGrid.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function DealsGrid({ search }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeals() {
      setLoading(true);
      // fetch published deals from supabase
      let query = supabase
        .from("deals")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      // add search filter if user typed something
      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching deals:", error);
        setDeals([]);
      } else {
        setDeals(data);
      }
      setLoading(false);
    }
    fetchDeals();
  }, [search]);

  if (loading) {
    return <div className="p-4 text-center text-gray-600">Loading deals…</div>;
  }

  if (!deals.length) {
    return <div className="p-4 text-center text-gray-500">No deals yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {deals.map((deal) => (
        <div key={deal.id} className="bg-white rounded-xl shadow p-4">
          {deal.image_url && (
            <img
              src={deal.image_url}
              alt={deal.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          )}
          <h2 className="text-lg font-bold mt-2">{deal.title}</h2>
          <p className="text-gray-600 text-sm line-clamp-3">{deal.description}</p>
          <div className="flex justify-between items-center mt-3">
            <span className="text-green-700 font-semibold">₹{deal.price}</span>
            <a
              href={deal.affiliate_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-800 underline"
            >
              Shop now
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
