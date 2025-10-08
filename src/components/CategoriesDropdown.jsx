// src/components/CategoriesDropdown.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";

export default function CategoriesDropdown({ selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState(["All"]);
  const ref = useRef();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("deals")
          .select("category")
          .eq("published", true);

        if (error) {
          console.error("Could not load categories:", error);
          return;
        }

        if (!mounted) return;
        const unique = Array.from(
          new Set(
            (data || [])
              .map((r) => (r.category || "").toString().trim())
              .filter(Boolean)
          )
        );
        setCats(["All", ...unique]);
      } catch (err) {
        console.error("Unexpected categories error:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // close on outside click
  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  function choose(cat) {
    onSelect?.(cat === "All" ? "" : cat);
    setOpen(false);
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border text-sm shadow-sm"
      >
        <span>{selected && selected !== "" ? selected : "All Categories"}</span>
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
        </svg>
      </button>

      {open && (
        <div className="absolute mt-2 bg-white border rounded-lg shadow-lg w-64 z-40">
          <ul className="max-h-56 overflow-auto">
            {cats.map((c) => (
              <li key={c}>
                <button
                  onClick={() => choose(c)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
