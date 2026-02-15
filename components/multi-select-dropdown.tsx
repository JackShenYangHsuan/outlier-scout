"use client";

import { useState, useRef, useEffect } from "react";

function toggleSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-colors cursor-pointer ${
          selected.size > 0
            ? "border-foreground/30 bg-foreground/5 text-foreground"
            : "border-border text-muted-foreground hover:border-foreground/20"
        }`}
      >
        {label}
        {selected.size > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background text-xs font-semibold">
            {selected.size}
          </span>
        )}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] bg-popover border rounded-md shadow-md py-1">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/50"
            >
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={() => onChange(toggleSet(selected, opt.value))}
                className="rounded"
              />
              {opt.label}
            </label>
          ))}
          {selected.size > 0 && (
            <>
              <div className="border-t my-1" />
              <button
                onClick={() => onChange(new Set())}
                className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 cursor-pointer"
              >
                Clear all
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
