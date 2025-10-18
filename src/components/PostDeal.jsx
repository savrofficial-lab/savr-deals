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
  const [focusedField, setFocusedField] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  async function handleImageUpload(file) {
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.25,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
      });

      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("deal-image")
        .upload(fileName, compressedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("deal-image")
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.error("❌ Image upload error:", err);
      alert("Failed to upload image.");
      return null;
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
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
      created_at: new Date().toISOString(),
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
      setImagePreview(null);
      if (typeof onPosted === "function") onPosted();
    }
  }

  const calculateDiscount = () => {
    if (form.price && form.old_price && Number(form.old_price) > Number(form.price)) {
      return Math.round(((Number(form.old_price) - Number(form.price)) / Number(form.old_price)) * 100);
    }
    return 0;
  };

  const discount = calculateDiscount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
              ✨ Share Amazing Deals
            </div>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent mb-2">
            Post a Deal
          </h2>
          <p className="text-gray-600 text-lg">Help the community save money on great products</p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-100">
          {/* Decorative Top Bar */}
          <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"></div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Title Field */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                Deal Title *
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onFocus={() => setFocusedField('title')}
                onBlur={() => setFocusedField(null)}
                placeholder="e.g., iPhone 15 Pro Max at 50% Off"
                required
                className={`w-full border-2 rounded-xl px-4 py-3.5 text-gray-800 placeholder-gray-400 transition-all duration-300 ${
                  focusedField === 'title' 
                    ? 'border-amber-500 ring-4 ring-amber-100 shadow-lg' 
                    : 'border-gray-200 hover:border-amber-300'
                }`}
              />
            </div>

            {/* Product Link Field */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                Product Link *
              </label>
              <input
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                onFocus={() => setFocusedField('link')}
                onBlur={() => setFocusedField(null)}
                placeholder="https://amazon.in/... or https://flipkart.com/..."
                required
                className={`w-full border-2 rounded-xl px-4 py-3.5 text-gray-800 placeholder-gray-400 transition-all duration-300 ${
                  focusedField === 'link' 
                    ? 'border-amber-500 ring-4 ring-amber-100 shadow-lg' 
                    : 'border-gray-200 hover:border-amber-300'
                }`}
              />
            </div>

            {/* Price Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="bg-gradient-to-r from-amber-600 to-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">3</span>
                  Current Price
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                  <input
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    onFocus={() => setFocusedField('price')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="9,999"
                    type="number"
                    className={`w-full border-2 rounded-xl pl-8 pr-4 py-3.5 text-gray-800 placeholder-gray-400 transition-all duration-300 ${
                      focusedField === 'price' 
                        ? 'border-green-500 ring-4 ring-green-100 shadow-lg' 
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <span className="bg-gray-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">4</span>
                  Original Price
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                  <input
                    value={form.old_price}
                    onChange={(e) => setForm({ ...form, old_price: e.target.value })}
                    onFocus={() => setFocusedField('old_price')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="19,999"
                    type="number"
                    className={`w-full border-2 rounded-xl pl-8 pr-4 py-3.5 text-gray-800 placeholder-gray-400 transition-all duration-300 ${
                      focusedField === 'old_price' 
                        ? 'border-amber-500 ring-4 ring-amber-100 shadow-lg' 
                        : 'border-gray-200 hover:border-amber-300'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Discount Badge Preview */}
            {discount > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">🎉</span>
                  <div>
                    <span className="text-2xl font-bold text-green-700">{discount}% OFF</span>
                    <p className="text-sm text-green-600">Amazing savings for your community!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Image Upload Field */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">📸</span>
                Product Image
              </label>
              
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className={`w-full border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
                    focusedField === 'image' || imagePreview
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                  }`}
                >
                  {imagePreview ? (
                    <div className="space-y-3">
                      <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg mx-auto shadow-md" />
                      <p className="text-sm text-gray-600">
                        {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
                      </p>
                      <p className="text-xs text-purple-600 font-semibold">Click to change image</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-5xl">📷</div>
                      <p className="text-gray-600 font-semibold">Click to upload product image</p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Category Field */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">🏷️</span>
                Category
              </label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                onFocus={() => setFocusedField('category')}
                onBlur={() => setFocusedField(null)}
                placeholder="e.g., Mobiles, Electronics, Fashion, Home & Kitchen"
                className={`w-full border-2 rounded-xl px-4 py-3.5 text-gray-800 placeholder-gray-400 transition-all duration-300 ${
                  focusedField === 'category' 
                    ? 'border-blue-500 ring-4 ring-blue-100 shadow-lg' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              />
            </div>

            {/* Description Field */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">✍️</span>
                Description <span className="text-gray-400 text-xs font-normal ml-1">(Optional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                onFocus={() => setFocusedField('description')}
                onBlur={() => setFocusedField(null)}
                placeholder="Share more details: Why is this deal amazing? Any coupon codes? Limited time offer? Special features?"
                rows="4"
                className={`w-full border-2 rounded-xl px-4 py-3.5 text-gray-800 placeholder-gray-400 transition-all duration-300 resize-none ${
                  focusedField === 'description' 
                    ? 'border-teal-500 ring-4 ring-teal-100 shadow-lg' 
                    : 'border-gray-200 hover:border-teal-300'
                }`}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Posting Deal...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <span className="text-xl mr-2">🚀</span>
                    Post Deal
                  </span>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setForm({ title: "", description: "", price: "", old_price: "", link: "", category: "" });
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="px-6 py-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-amber-100 text-center transform hover:scale-105 transition-transform duration-300">
            <div className="text-4xl mb-2">💰</div>
            <h4 className="font-bold text-gray-800 mb-1">Save Big</h4>
            <p className="text-sm text-gray-600">Share deals that help others save money</p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-amber-100 text-center transform hover:scale-105 transition-transform duration-300">
            <div className="text-4xl mb-2">🏆</div>
            <h4 className="font-bold text-gray-800 mb-1">Earn Rewards</h4>
            <p className="text-sm text-gray-600">Get coins for posting verified deals</p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-amber-100 text-center transform hover:scale-105 transition-transform duration-300">
            <div className="text-4xl mb-2">🤝</div>
            <h4 className="font-bold text-gray-800 mb-1">Build Community</h4>
            <p className="text-sm text-gray-600">Help fellow deal hunters find the best offers</p>
          </div>
        </div>
      </div>
    </div>
  );
                  }
