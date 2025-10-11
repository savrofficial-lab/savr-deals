// src/components/PostDeal.jsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import imageCompression from "browser-image-compression";

export default function PostDeal({ onPosted }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    old_price: "",
    link: "",
    category: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleImageUpload(file) {
    try {
      // 1️⃣ Compress image
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.25, // ~250 KB
        maxWidthOrHeight: 1080,
        useWebWorker: true,
      });

      // 2️⃣ Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("deal-images")
        .upload(fileName, compressedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // 3️⃣ Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from("deal-images")
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.error("❌ Image upload error:", err);
      alert("Failed to upload image.");
      return null;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      alert("You must be signed in to post a deal.");
      setLoading(false);
      return;
    }

    const user = userData.user;
    let imageUrl = null;

    // If user selected an image, upload it first
    if (imageFile) {
      imageUrl = await handleImageUpload(imageFile);
    }

    const payload = {
      title: form.title,
      description: form.description || null,
      price: form.price ? Number(form.price) : null,
      old_price: form.old_price ? Number(form.old_price) : null,
      image: imageUrl || null,
      link: form.link,
      category: form.category || null,
      posted_by: user.id,
      published: true,
    };

    const { data, error } = await supabase.from("deals").insert([payload]).select();

    setLoading(false);
    if (error) {
      console.error("❌ Insert error:", error);
      alert("Could not post: " + error.message);
    } else {
      alert("✅ Deal posted successfully!");
      setForm({
        title: "",
        description: "",
        price: "",
        old_price: "",
        link: "",
        category: "",
      });
      setImageFile(null);
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
            required
          />
          <input
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            placeholder="Product link (Amazon/Flipkart)"
            className="w-full border rounded px-3 py-2"
            required
          />

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

          {/* 📸 File Upload */}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            className="w-full border rounded px-3 py-2"
          />
          {imageFile && (
            <p className="text-sm text-gray-500">
              Selected: {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
            </p>
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
              disabled={loading}
              className="px-4 py-2 bg-yellow-800 text-white rounded"
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
