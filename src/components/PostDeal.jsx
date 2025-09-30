// src/components/PostDeal.jsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function PostDeal({ onPosted }) {
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

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    // get current logged-in user from Supabase (guaranteed source)
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      alert("You must be signed in to post a deal.");
      setLoading(false);
      return;
    }
    const user = userData.user;
    console.log("🔐 Posting as user:", user.id);

    if (!form.title || !form.link) {
      alert("Please provide at least a title and a product link.");
      setLoading(false);
      return;
    }

    const payload = {
      title: form.title,
      description: form.description || null,
      price: form.price ? Number(form.price) : null,
      old_price: form.old_price ? Number(form.old_price) : null,
      image: form.image || null,
      link: form.link,
      category: form.category || null,
      posted_by: user.id,        // <-- guaranteed user id
      published: true,
    };

    console.log("🧾 Insert payload:", payload);
    const { data, error } = await supabase.from("deals").insert([payload]).select();

    setLoading(false);
    if (error) {
      console.error("❌ Insert error:", error);
      alert("Could not post: " + error.message);
    } else {
      console.log("✅ Insert result:", data);
      alert("Posted! Your deal is live.");
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
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full border rounded px-3 py-2" />
          <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="Product link (Amazon/Flipkart)" className="w-full border rounded px-3 py-2" />
          <div className="flex gap-2">
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price" className="w-1/2 border rounded px-3 py-2" />
            <input value={form.old_price} onChange={(e) => setForm({ ...form, old_price: e.target.value })} placeholder="Old price" className="w-1/2 border rounded px-3 py-2" />
          </div>
          <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Image URL (optional)" className="w-full border rounded px-3 py-2" />
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category (e.g. Mobiles)" className="w-full border rounded px-3 py-2" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description (optional)" className="w-full border rounded px-3 py-2" />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-yellow-800 text-white rounded">{loading ? "Posting…" : "Post deal"}</button>
            <button type="button" onClick={() => setForm({ title: "", description: "", price: "", old_price: "", image: "", link: "", category: "" })} className="px-4 py-2 border rounded">Clear</button>
          </div>
        </form>
      </div>
    </div>
  );
}
