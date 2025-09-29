import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function DealsGrid() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeals() {
      setLoading(true);
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching deals:", error);
      } else {
        setDeals(data);
      }
      setLoading(false);
    }

    fetchDeals();
  }, []);

  if (loading) {
    return <div className="p-4 text-center">Loading deals…</div>;
  }

  if (!deals.length) {
    return <div className="p-4 text-center">No deals yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {deals.map((deal) => (
        <div key={deal.id} className="bg-white rounded-xl shadow p-4">
          <img
            src={deal.image_url}
            alt={deal.title}
            className="w-full h-48 object-cover rounded-lg"
          />
          <h2 className="text-lg font-bold mt-2">{deal.title}</h2>
          <p className="text-gray-600 text-sm">{deal.description}</p>
          <div className="flex justify-between items-center mt-2">
            <span className="text-green-600 font-semibold">
              ₹{deal.price}
            </span>
            <a
              href={deal.affiliate_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Shop now
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
