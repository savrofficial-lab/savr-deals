// src/components/UserDealsTable.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function UserDealsTable({ userId }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // fetch user deals
  async function fetchDeals() {
    setLoading(true);
    console.log("🔎 Fetching deals for userId:", userId);

    const { data, error } = await supabase
      .from("deals")
      .select("id, title, category, link, created_at, posted_by")
      .eq("posted_by", userId) // ✅ filter by posted_by
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error loading user deals:", error);
      setDeals([]);
    } else {
      console.log("✅ Deals fetched:", data);
      setDeals(data || []);
    }
    setLoading(false);
  }

  // delete a deal
  async function handleDelete(id) {
    if (!window.confirm("Delete this deal?")) return;
    const { error } = await supabase
      .from("deals")
      .delete()
      .eq("id", id)
      .eq("posted_by", userId);

    if (error) {
      alert("Could not delete: " + error.message);
    } else {
      setDeals((prev) => prev.filter((d) => d.id !== id));
    }
  }

  useEffect(() => {
    if (userId) {
      console.log("📌 UserDealsTable mounted with userId:", userId);
      fetchDeals();
    } else {
      console.warn("⚠️ No userId provided to UserDealsTable");
    }
  }, [userId]);

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading your posts…</div>;
  }

  if (deals.length === 0) {
    console.warn("⚠️ No deals found for userId:", userId);
    return (
      <div className="text-gray-500 text-sm">
        You haven’t posted any deals yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">Product</th>
            <th className="px-4 py-2 text-left">Category</th>
            <th className="px-4 py-2 text-left">Visit</th>
            <th className="px-4 py-2 text-left">Delete</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id} className="border-t">
              <td className="px-4 py-2">{deal.title}</td>
              <td className="px-4 py-2">{deal.category || "-"}</td>
              <td className="px-4 py-2">
                {deal.link ? (
                  <a
                    href={deal.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-800 font-semibold hover:underline"
                  >
                    Go
                  </a>
                ) : (
                  <span className="text-gray-400">No link</span>
                )}
              </td>
              <td className="px-4 py-2">
                <button
                  onClick={() => handleDelete(deal.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
