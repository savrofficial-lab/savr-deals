//src/components/SearchBar.jsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSearch() {
    if (!query.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Insert the requested deal to Supabase
        const { error } = await supabase.from("requested_deals").insert([
          {
            user_id: user.id,
            query: query.trim(),
            fulfilled: false,
          },
        ]);

        if (error) {
          console.error("Error inserting request:", error);
          setMessage("❌ Failed to send your request. Try again.");
        } else {
          setMessage(`✅ Your request for "${query.trim()}" has been sent. We'll notify you soon!`);
        }
      } else {
        setMessage("⚠️ Please login to request a deal.");
      }

      // Pass the query back to parent (DealsGrid) to show search results
      onSearch(query.trim());
    } catch (err) {
      console.error("Unexpected error:", err);
      setMessage("❌ Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center mb-6">
      <div className="flex items-center w-full max-w-md gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search deals..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-800"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-yellow-800 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-gray-700 text-center">{message}</p>}
    </div>
  );
}
