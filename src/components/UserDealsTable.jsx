// src/components/UserDealsTable.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function UserDealsTable({ userId }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchDeals() {
    setLoading(true);

    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .eq("posted_by", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading deals:", error.message);
      setDeals([]);
    } else {
      setDeals(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(dealId) {
    if (!window.confirm("Are you sure you want to delete this deal?")) return;

    const { error } = await supabase
      .from("deals")
      .delete()
      .eq("id", dealId)
      .eq("posted_by", userId); // make sure only owner can delete

    if (error) {
      alert("Error deleting: " + error.message);
    } else {
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
    }
  }

  useEffect(() => {
    if (userId) fetchDeals();
  }, [userId]);

  if (loading) return <div className="text-gray-500 text-sm">Loading your posts…</div>;

  return (
    <div>
      {deals.length === 0 ? (
        <div className="text-gray-500 text-sm">You haven’t posted any deals yet.</div>
      ) : (
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
      )}
    </div>
  );
}
