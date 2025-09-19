import React, { useEffect, useRef, useState } from "react";
import ProductCard from "./ProductCard";

export default function DealsGrid() {
  const [products, setProducts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(12);
  const loaderRef = useRef(null);

  useEffect(() => {
    fetch("/deals.json")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data || []);
        // ensure at least some visible
        setVisibleCount(Math.min(12, (data || []).length));
      })
      .catch((err) => {
        console.error("Failed to load deals.json", err);
      });
  }, []);

  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((v) => Math.min(v + 6, products.length));
        }
      },
      { root: null, rootMargin: "300px", threshold: 0.1 }
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [products]);

  const visible = products.slice(0, visibleCount);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((p, i) => (
          <React.Fragment key={p.id || i}>
            <div className="w-full h-full">
              <ProductCard product={p} />
            </div>

            {/* After every 6 items (3 rows on mobile: 2 cols * 3 rows = 6), show a full-width mobile ad strip */}
            {(i + 1) % 6 === 0 && (
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="bg-yellow-100 rounded-xl p-3 text-center text-sm">Sponsored / Ad strip</div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div ref={loaderRef} className="h-8" />

      {visibleCount >= products.length && products.length > 0 && (
        <div className="text-center text-gray-500 mt-6">You reached the end of today's deals.</div>
      )}

      {products.length === 0 && (
        <div className="text-center text-gray-500 mt-6">No deals yet — update public/deals.json</div>
      )}
    </div>
  );
}

