// src/components/UserDealsTable.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function UserDealsTable({ userId }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchDeals() {
    setLoading(true);

    // fetch ALL deals
    const { data, error } = await supabase.from("deals").select("*");

    if (error) {
      console.error("Error loading deals:", error.message);
      setDeals([]);
      setLoading(false);
      return;
    }

    // filter manually
    const filtered = (data || []).filter((d) => d.posted_by === userId);

    setDeals(filtered);
    setLoading(false);
  }

  useEffect(() => {
    if (userId) fetchDeals();
    else {
      setDeals([]);
      setLoading(false);
    }
  }, [userId]);

  if (loading) return <div className="text-gray-500 text-sm">Loading your posts…</div>;

  return (
    <div>
      {deals.length === 0 ? (
        <div className="text-gray-500 text-sm">You haven't posted any deals yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Product</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Visit</th>
                <th className="px-4 py-2 text-left">Delete</th>
                <th className="px-4 py-2 text-left">Posted_by</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="border-t">
                  <td className="px-4 py-2">{deal.title}</td>
                  <td className="px-4 py-2">{deal.category || "-"}</td>
                  <td className="px-4 py-2">
                    {deal.link ? (
                      
                        href={deal.link}
                        target="_blank"
                        rel="noreferrer"
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
                      onClick={() => alert("Delete disabled in debug mode")}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500 break-all">{deal.posted_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
