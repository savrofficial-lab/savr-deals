// src/components/MyCoins.jsx
import React, { useEffect, useState } from "react";

export default function MyCoins({ userId: propUserId }) {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(0);
  const [pending, setPending] = useState(0);
  const [ledger, setLedger] = useState([]);
  const [userId, setUserId] = useState(propUserId || "");

  useEffect(() => {
    // If parent passed userId prop, use that. Otherwise fall back to localStorage approach (legacy).
    if (propUserId) setUserId(propUserId);
  }, [propUserId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/coins?user_id=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) => {
        // If the server returned a helpful error structure, show nothing (server handles)
        if (data && typeof data.available !== "undefined") {
          setAvailable(Number(data.available || 0));
          setPending(Number(data.pending || 0));
          setLedger(Array.isArray(data.ledger) ? data.ledger : []);
        } else {
          setAvailable(0);
          setPending(0);
          setLedger([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching coins:", err);
        setAvailable(0);
        setPending(0);
        setLedger([]);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) {
    return (
      <div className="py-8 text-center text-gray-500">
        You must be signed in to view your coins. Tap the <strong>You</strong> tab and sign in.
      </div>
    );
  }

  if (loading) {
    return <p className="text-center text-gray-500 py-8">Loading coins…</p>;
  }

  return (
    <div className="py-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-4 mb-4 text-center">
          <div className="text-sm text-gray-500">Available coins</div>
          <div className="text-3xl font-bold text-yellow-800 mt-1">{available} <span className="text-sm text-gray-500">coins</span></div>
          <div className="text-sm text-gray-500 mt-1">{pending} pending</div>
          <div className="mt-4">
            <button className="px-4 py-2 bg-yellow-800 text-white rounded-lg">Redeem (coming soon)</button>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">History</h3>
          {ledger.length === 0 && <p className="text-sm text-gray-500">No history yet.</p>}
          {ledger.map((l) => (
            <div key={l.id} className="flex justify-between items-start border-b py-3">
              <div>
                <div className="text-sm font-medium">{l.description || (l.type === "CREDIT" ? "Credit" : "Debit")}</div>
                <div className="text-xs text-gray-500">Status: {l.status} • {new Date(l.created_at).toLocaleString()}</div>
              </div>
              <div className={`${l.type === "CREDIT" ? "text-green-600" : "text-red-600"} font-semibold`}>
                {l.type === "CREDIT" ? "+" : "-"}{l.amount}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
