// src/components/PostDeal.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function PostDeal({ userId, onPosted }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    old_price: "",
    image: "",
    link: "",
    category: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);

  // Whenever link changes, try to fetch OG image automatically
  useEffect(() => {
    if (!form.link || form.image) return; // only fetch if no image already entered

    async function fetchOgImage() {
      try {
        setFetchingImage(true);
        // free API for OG data
        const res = await fetch(
          `https://api.microlink.io/?url=${encodeURIComponent(form.link)}`
        );
        const json = await res.json();
        const imgUrl =
          json?.data?.image?.url ||
          json?.data?.logo?.url ||
          null;

        if (imgUrl) {
          setForm((f) => ({ ...f, image: imgUrl }));
        }
      } catch (err) {
        console.error("Could not fetch OG image:", err);
      } finally {
        setFetchingImage(false);
      }
    }

    fetchOgImage();
  }, [form.link]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userId) return alert("Please sign in to post a deal.");

    if (!form.title || !form.link) {
      return alert("Please provide at least a title and a product link.");
    }

    setLoading(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      price: form.price ? Number(form.price) : null,
      old_price: form.old_price ? Number(form.old_price) : null,
      image: form.image || null,
      link: form.link,
      category: form.category || null,
      posted_by: userId,
      published: true, // change to false if you want moderation
    };

    const { data, error } = await supabase.from("deals").insert([payload]);
    setLoading(false);
    if (error) {
      alert("Could not post: " + error.message);
      console.error(error);
    } else {
      alert("Posted! Thank you — your deal is live.");
      setForm({
        title: "",
        description: "",
        price: "",
        old_price: "",
        image: "",
        link: "",
        category: "",
      });
      if (typeof onPosted === "function") onPosted();
    }
  }

  return (
    <div className="py-6 max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow p-5">
        <h3 className="font-semibold mb-3">Post a deal</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title"
            className="w-full border rounded px-3 py-2"
          />
          <input
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value, image: "" })}
            placeholder="Product link (Amazon/Flipkart)"
            className="w-full border rounded px-3 py-2"
          />
          {fetchingImage && (
            <div className="text-xs text-gray-500">Fetching product image…</div>
          )}
          <div className="flex gap-2">
            <input
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="Price"
              className="w-1/2 border rounded px-3 py-2"
            />
            <input
              value={form.old_price}
              onChange={(e) => setForm({ ...form, old_price: e.target.value })}
              placeholder="Old price"
              className="w-1/2 border rounded px-3 py-2"
            />
          </div>
          <input
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
            placeholder="Image URL (auto-filled from link)"
            className="w-full border rounded px-3 py-2"
          />
          {form.image && (
            <img
              src={form.image}
              alt="Preview"
              className="h-24 w-auto object-contain border rounded"
            />
          )}
          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="Category (e.g. Mobiles)"
            className="w-full border rounded px-3 py-2"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Short description (optional)"
            className="w-full border rounded px-3 py-2"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-800 text-white rounded"
              disabled={loading}
            >
              {loading ? "Posting…" : "Post deal"}
            </button>
            <button
              type="button"
              onClick={() =>
                setForm({
                  title: "",
                  description: "",
                  price: "",
                  old_price: "",
                  image: "",
                  link: "",
                  category: "",
                })
              }
              className="px-4 py-2 border rounded"
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
