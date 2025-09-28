// src/components/MyCoins.jsx
import React, { useEffect, useState } from "react";

export default function MyCoins() {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(0);
  const [pending, setPending] = useState(0);
  const [ledger, setLedger] = useState([]);
  const [userId, setUserId] = useState(() => {
    // Try to read saved user id (for now we use localStorage because there's no auth)
    try { return localStorage.getItem("savr_user_id") || ""; } catch { return ""; }
  });
  const [inputUserId, setInputUserId] = useState(userId);
  const [error, setError] = useState(null);
  const [backendInfo, setBackendInfo] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/coins?user_id=${encodeURIComponent(userId)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          // backend not ready or returned helpful message
          setBackendInfo(json || { status: res.status, text: await res.text() });
          setAvailable(0);
          setPending(0);
          setLedger([]);
          setLoading(false);
          return;
        }
        // expected shape: { available: number, pending: number, ledger: [ ... ] }
        setAvailable(json.available ?? 0);
        setPending(json.pending ?? 0);
        setLedger(Array.isArray(json.ledger) ? json.ledger : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Network error fetching coins.");
        setLoading(false);
      });
  }, [userId]);

  function saveUserId() {
    if (!inputUserId) return;
    try { localStorage.setItem("savr_user_id", inputUserId); } catch {}
    setUserId(inputUserId);
  }

  function clearUserId() {
    try { localStorage.removeItem("savr_user_id"); } catch {}
    setUserId("");
    setInputUserId("");
  }

  return (
    <div className="py-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-4 flex gap-2">
          <input value={inputUserId} onChange={(e) => setInputUserId(e.target.value)} placeholder="Enter your user id (required)" className="flex-1 border rounded-lg px-3 py-2" />
          <button onClick={saveUserId} className="px-4 py-2 bg-yellow-800 text-white rounded-lg">Save</button>
          <button onClick={clearUserId} className="px-3 py-2 border rounded-lg">Clear</button>
        </div>

        {!userId && (
          <div className="bg-white rounded-lg shadow p-4 text-sm text-gray-700">
            <p><strong>Why user id?</strong> Right now we don't have login. To fetch your coins we need an id. After you (or your brother) build auth this will be automatic.</p>
            <p className="mt-2 text-xs text-gray-500">Tip: use "1" for testing once you set up backend sample user.</p>
          </div>
        )}

        {loading && <p className="text-center text-gray-500 py-6">Loading your coins…</p>}

        {!loading && userId && backendInfo && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4 text-sm text-gray-700">
            <p className="font-semibold mb-2">Backend not configured yet</p>
            <p>To see real coins you must set up the backend. The server responded with:</p>
            <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">{JSON.stringify(backendInfo, null, 2)}</pre>
            <p className="mt-2">Read the quick setup below or ask me and I'll give exact SQL and steps.</p>
          </div>
        )}

        {!loading && userId && !backendInfo && (
          <>
            <div className="bg-white rounded-2xl shadow p-4 mb-4 text-center">
              <div className="text-sm text-gray-500">Available coins</div>
              <div className="text-3xl font-bold text-yellow-800 mt-1">{available} <span className="text-sm text-gray-500">coins</span></div>
              <div className="text-sm text-gray-500 mt-1">{pending} pending</div>
              <div className="mt-4">
                <button className="px-4 py-2 bg-yellow-800 text-white rounded-lg">Redeem (coming soon)</button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2">Pending</h3>
              {ledger.filter(l => l.status === "PENDING").length === 0 && <p className="text-sm text-gray-500">No pending transactions.</p>}
              {ledger.filter(l => l.status === "PENDING").map((l) => (
                <div key={l.id} className="flex justify-between items-start border-b py-3">
                  <div>
                    <div className="text-sm font-medium">{l.description || "Pending credit"}</div>
                    <div className="text-xs text-gray-500">Created: {new Date(l.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-yellow-800 font-semibold">+{l.amount}</div>
                </div>
              ))}
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
          </>
        )}

        {error && <p className="text-red-600 mt-4">{error}</p>}
      </div>
    </div>
  );
                                     }
