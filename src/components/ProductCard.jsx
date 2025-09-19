import React from "react";

export default function ProductCard({ product }) {
  return (
    <div className="bg-white rounded-2xl shadow p-3 flex flex-col h-full">
      <div className="relative">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-44 object-cover rounded-xl"
        />
        {product.badge && product.badge.length > 0 && (
          <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
            {product.badge}
          </div>
        )}
      </div>

      <h3 className="mt-3 text-sm font-medium overflow-hidden">{product.title}</h3>

      <div className="flex items-baseline gap-3 mt-2">
        <div className="text-lg font-bold">₹{product.price}</div>
        {product.oldPrice && (
          <div className="text-sm text-gray-400 line-through">₹{product.oldPrice}</div>
        )}
      </div>

      <div className="text-xs text-gray-500 mt-1">{product.source}</div>

      <div className="mt-3 flex items-center gap-3">
        <a
          href={product.affiliate_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center bg-blue-600 text-white py-2 rounded-lg"
        >
          Shop Now
        </a>
        <button className="p-2 rounded-lg bg-gray-100">♡</button>
      </div>
    </div>
  );
}

