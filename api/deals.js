// api/deals.js
// Simple Vercel serverless function that returns deals from public/deals.json
// Supports optional query params: ?q=searchText and ?category=CategoryName

// api/deals.js
// Import JSON directly (works on Vercel too)
// api/deals.js
const path = require("path");
const fs = require("fs");

// Load JSON at runtime (safe on Vercel)
const dealsData = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "public", "deals.json"), "utf-8")
);

module.exports = async (req, res) => {
  try {
    let deals = dealsData;

    const baseUrl = `http://${req.headers.host}`;
    const { searchParams } = new URL(req.url, baseUrl);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const category = (searchParams.get("category") || "").trim();

    if (q) {
      deals = deals.filter((d) =>
        (d.title || "").toLowerCase().includes(q) ||
        (d.category || "").toLowerCase().includes(q)
      );
    }

    if (category && category.toLowerCase() !== "all") {
      deals = deals.filter((d) => (d.category || "") === category);
    }

    res.setHeader("Content-Type", "application/json");
    res.status(200).json(deals);
  } catch (err) {
    console.error("api/deals error:", err);
    res.status(200).json([]);
  }
};
