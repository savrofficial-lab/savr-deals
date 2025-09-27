// api/deals.js
// Simple Vercel serverless function that returns deals from public/deals.json
// Supports optional query params: ?q=searchText and ?category=CategoryName

import fs from "fs/promises";

export default async function handler(req, res) {
  try {
    // Read public/deals.json from the deployed project
    const filePath = new URL("../public/deals.json", import.meta.url);
    const raw = await fs.readFile(filePath, "utf8");
    let deals = JSON.parse(raw || "[]");

    // parse query params (works inside Vercel serverless)
    const baseUrl = `http://${req.headers.host}`;
    const { searchParams } = new URL(req.url, baseUrl);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const category = (searchParams.get("category") || "").trim();

    // Filter by search text if provided
    if (q) {
      deals = deals.filter((d) =>
        (d.title || "").toLowerCase().includes(q) ||
        (d.category || "").toLowerCase().includes(q)
      );
    }

    // Filter by category (if provided and not "All")
    if (category && category.toLowerCase() !== "all") {
      deals = deals.filter((d) => (d.category || "") === category);
    }

    // Return results
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(deals);
  } catch (err) {
    console.error("api/deals error:", err);
    // If reading file failed, return empty array rather than crash
    return res.status(200).json([]);
  }
}
