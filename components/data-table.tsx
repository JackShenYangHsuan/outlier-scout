"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Person } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  math: "bg-blue-100 text-blue-800",
  programming: "bg-purple-100 text-purple-800",
  chess: "bg-amber-100 text-amber-800",
  poker: "bg-red-100 text-red-800",
  esports: "bg-green-100 text-green-800",
  career: "bg-indigo-100 text-indigo-800",
  curated: "bg-pink-100 text-pink-800",
  academic: "bg-cyan-100 text-cyan-800",
  security: "bg-orange-100 text-orange-800",
  sports: "bg-emerald-100 text-emerald-800",
};

function ScoreBadge({ score, palette = "green" }: { score: number; palette?: "green" | "blue" | "purple" }) {
  const palettes = {
    green: {
      98: "bg-emerald-200 text-emerald-900",
      95: "bg-green-200 text-green-900",
      90: "bg-green-100 text-green-800",
      80: "bg-lime-100 text-lime-800",
      70: "bg-yellow-100 text-yellow-800",
      50: "bg-orange-100 text-orange-700",
      0: "bg-gray-100 text-gray-500",
    },
    blue: {
      98: "bg-blue-200 text-blue-900",
      95: "bg-blue-100 text-blue-800",
      90: "bg-sky-100 text-sky-800",
      80: "bg-cyan-100 text-cyan-800",
      70: "bg-teal-100 text-teal-700",
      50: "bg-slate-100 text-slate-600",
      0: "bg-gray-100 text-gray-500",
    },
    purple: {
      98: "bg-violet-200 text-violet-900",
      95: "bg-purple-100 text-purple-800",
      90: "bg-fuchsia-100 text-fuchsia-800",
      80: "bg-pink-100 text-pink-800",
      70: "bg-rose-100 text-rose-700",
      50: "bg-slate-100 text-slate-600",
      0: "bg-gray-100 text-gray-500",
    },
  };
  const p = palettes[palette];
  const style = score >= 98 ? p[98] : score >= 95 ? p[95] : score >= 90 ? p[90] : score >= 80 ? p[80] : score >= 70 ? p[70] : score >= 50 ? p[50] : p[0];
  return (
    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-semibold font-mono ${style}`}>
      {score}
    </span>
  );
}

const columns: ColumnDef<Person>[] = [
  {
    accessorKey: "combinedScore",
    header: "Score",
    size: 70,
    cell: ({ row }) => <ScoreBadge score={row.original.combinedScore} />,
    sortDescFirst: true,
  },
  {
    accessorKey: "name",
    header: "Name",
    size: 140,
    cell: ({ row }) => (
      <div className="font-medium text-sm whitespace-nowrap truncate">{row.original.name}</div>
    ),
  },
  {
    accessorKey: "twitter",
    header: "Twitter",
    size: 120,
    cell: ({ row }) => {
      const handle = row.original.twitter;
      if (!handle) return <span className="text-muted-foreground">-</span>;
      const clean = handle.replace("@", "");
      return (
        <a
          href={`https://x.com/${clean}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline whitespace-nowrap text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {handle}
        </a>
      );
    },
  },
  {
    accessorKey: "outlierScore",
    header: "Outlier",
    size: 65,
    cell: ({ row }) => <ScoreBadge score={row.original.outlierScore} palette="blue" />,
    sortDescFirst: true,
  },
  {
    accessorKey: "startupLikelihood",
    header: "Startup",
    size: 65,
    cell: ({ row }) => {
      const s = row.original.startupLikelihood;
      if (s === 0) return <span className="text-muted-foreground text-sm">-</span>;
      return <ScoreBadge score={s} palette="purple" />;
    },
    sortDescFirst: true,
  },
  {
    accessorKey: "company",
    header: "Company",
    size: 150,
    cell: ({ row }) => {
      const val = row.original.company;
      if (!val) return <span className="text-muted-foreground/40 text-sm">-</span>;
      return <div className="text-sm font-medium truncate">{val}</div>;
    },
  },
  {
    accessorKey: "currentActivity",
    header: "Current",
    size: 180,
    cell: ({ row }) => {
      const val = row.original.currentActivity;
      if (!val) return <span className="text-muted-foreground/40 text-sm">-</span>;
      return <div className="text-sm text-muted-foreground truncate">{val}</div>;
    },
  },
  {
    accessorKey: "fundingSeries",
    header: "Stage",
    size: 85,
    cell: ({ row }) => {
      const val = row.original.fundingSeries;
      if (!val) return <span className="text-muted-foreground/40 text-sm">-</span>;
      const colors: Record<string, string> = {
        "Pre-Seed": "bg-gray-100 text-gray-700",
        "Seed": "bg-amber-100 text-amber-800",
        "Series A": "bg-blue-100 text-blue-800",
        "Series B": "bg-indigo-100 text-indigo-800",
        "Series C": "bg-violet-100 text-violet-800",
        "Series D+": "bg-purple-100 text-purple-800",
        "IPO": "bg-emerald-100 text-emerald-800",
        "Acquired": "bg-pink-100 text-pink-800",
        "Bootstrapped": "bg-orange-100 text-orange-700",
      };
      const style = colors[val] || "bg-gray-100 text-gray-700";
      return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${style}`}>{val}</span>;
    },
  },
  {
    accessorKey: "investors",
    header: "Investors",
    size: 200,
    cell: ({ row }) => {
      const val = row.original.investors;
      if (!val) return <span className="text-muted-foreground/40 text-sm">-</span>;
      return <div className="text-sm text-muted-foreground truncate">{val}</div>;
    },
  },
  {
    accessorKey: "fundingInfo",
    header: "Funding",
    size: 200,
    cell: ({ row }) => {
      const val = row.original.fundingInfo;
      if (!val) return <span className="text-muted-foreground/40 text-sm">-</span>;
      return <div className="text-sm text-muted-foreground truncate">{val}</div>;
    },
  },
  {
    accessorKey: "categories",
    header: "Categories",
    size: 110,
    cell: ({ row }) => (
      <div className="flex gap-0.5 overflow-hidden">
        {row.original.categories.slice(0, 2).map((cat) => (
          <span
            key={cat}
            className={`inline-flex px-1.5 py-0 rounded text-[10px] font-medium whitespace-nowrap ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-600"}`}
          >
            {cat}
          </span>
        ))}
        {row.original.categories.length > 2 && (
          <span className="text-[10px] text-muted-foreground/60">+{row.original.categories.length - 2}</span>
        )}
      </div>
    ),
    filterFn: (row, _, filterValue) => {
      if (!filterValue || filterValue === "all") return true;
      return row.original.categories.includes(filterValue);
    },
  },
  {
    accessorKey: "achievements",
    header: "Spikes",
    size: 220,
    cell: ({ row }) => {
      const text = row.original.achievements;
      return <div className="text-xs text-muted-foreground truncate">{text}</div>;
    },
  },
  {
    accessorKey: "notes",
    header: "Notes",
    size: 240,
    cell: ({ row }) => {
      const notes = row.original.notes;
      if (!notes) return null;
      const isRare = notes.includes("RARE COMBO") || notes.includes("rare combo");
      const isMusk = notes.includes("Musk") || notes.includes("xAI") || notes.includes("SpaceX");
      let displayText = notes;
      if (isRare) displayText = displayText.replace(/RARE COMBO[:\s|]*/i, "").trim();
      return (
        <div className="flex items-center gap-1 min-w-0">
          {isRare && <span className="shrink-0 px-1 py-0 rounded text-[10px] font-semibold bg-yellow-400 text-yellow-900">RARE</span>}
          {isMusk && <span className="shrink-0 px-1 py-0 rounded text-[10px] font-semibold bg-violet-400 text-violet-900">MUSK</span>}
          <span className="text-xs text-muted-foreground truncate">{displayText}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "country",
    header: "Country",
    size: 80,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">{row.original.country}</span>
    ),
  },
];

type Preset = "unfunded_founders" | "recently_left" | "pre_raise" | "hidden_gems" | null;

const PRESETS: { id: Preset; label: string; description: string }[] = [
  { id: "unfunded_founders", label: "Unfunded Founders", description: "Startup signal but no funding yet" },
  { id: "recently_left", label: "Recently Left", description: "Just left a major company" },
  { id: "pre_raise", label: "Pre-Raise Startups", description: "All people with startup signal" },
  { id: "hidden_gems", label: "Hidden Gems", description: "High outlier score, no startup signal yet" },
];

function MultiSelectDropdown({
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
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-colors ${
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
                className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50"
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

function toggleSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

const STAGES = ["Seed", "Series A", "Series B", "Series C", "Series D+", "IPO", "Acquired", "Bootstrapped"];

export function DataTable({ data }: { data: Person[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "combinedScore", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [twitterOnly, setTwitterOnly] = useState(false);
  const [startupFilters, setStartupFilters] = useState<Set<string>>(new Set());
  const [fundingFilters, setFundingFilters] = useState<Set<string>>(new Set());
  const [stageFilters, setStageFilters] = useState<Set<string>>(new Set());
  const [activePreset, setActivePreset] = useState<Preset>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const hasActiveFilters = activePreset || startupFilters.size > 0 || fundingFilters.size > 0 || stageFilters.size > 0 || categoryFilters.size > 0 || twitterOnly || globalFilter;

  const applyPreset = (preset: Preset) => {
    if (activePreset === preset) {
      resetFilters();
      return;
    }
    setActivePreset(preset);
    setStageFilters(new Set());
    setCategoryFilters(new Set());
    setTwitterOnly(false);
    setGlobalFilter("");
    switch (preset) {
      case "unfunded_founders":
        setStartupFilters(new Set(["has_signal"]));
        setFundingFilters(new Set(["unfunded"]));
        break;
      case "recently_left":
        setStartupFilters(new Set());
        setFundingFilters(new Set());
        break;
      case "pre_raise":
        setStartupFilters(new Set(["has_signal"]));
        setFundingFilters(new Set());
        break;
      case "hidden_gems":
        setStartupFilters(new Set(["no_signal"]));
        setFundingFilters(new Set());
        break;
    }
  };

  const resetFilters = () => {
    setActivePreset(null);
    setStartupFilters(new Set());
    setFundingFilters(new Set());
    setStageFilters(new Set());
    setCategoryFilters(new Set());
    setTwitterOnly(false);
    setGlobalFilter("");
  };

  const filteredData = useMemo(() => {
    let d = data;
    if (twitterOnly) d = d.filter((p) => p.twitter);
    if (categoryFilters.size > 0) d = d.filter((p) => p.categories.some((c) => categoryFilters.has(c)));
    if (startupFilters.size > 0) {
      d = d.filter((p) => {
        if (startupFilters.has("has_signal") && p.startupLikelihood > 0) return true;
        if (startupFilters.has("no_signal") && p.startupLikelihood === 0) return true;
        return false;
      });
    }
    if (fundingFilters.size > 0) {
      d = d.filter((p) => {
        if (fundingFilters.has("funded") && p.fundingInfo) return true;
        if (fundingFilters.has("unfunded") && !p.fundingInfo) return true;
        return false;
      });
    }
    if (stageFilters.size > 0) d = d.filter((p) => stageFilters.has(p.fundingSeries));
    // Preset-specific filters
    if (activePreset === "recently_left") {
      d = d.filter((p) => /\bleft\b/i.test(p.currentActivity));
    }
    if (activePreset === "hidden_gems") {
      d = d.filter((p) => p.outlierScore >= 95);
    }
    return d;
  }, [data, twitterOnly, categoryFilters, startupFilters, fundingFilters, stageFilters, activePreset]);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    data.forEach((p) => p.categories.forEach((c) => cats.add(c)));
    return Array.from(cats).sort();
  }, [data]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const withTwitter = data.filter((p) => p.twitter).length;
  const withStartup = data.filter((p) => p.startupLikelihood > 0).length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex gap-6 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{data.length.toLocaleString()}</strong> people</span>
        <span><strong className="text-foreground">{withTwitter}</strong> with Twitter</span>
        <span><strong className="text-foreground">{withStartup}</strong> with startup signal</span>
        <span><strong className="text-foreground">{filteredData.length.toLocaleString()}</strong> showing</span>
      </div>

      {/* Preset chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset.id)}
            title={preset.description}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activePreset === preset.id
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {preset.label}
          </button>
        ))}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by name..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-xs"
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={twitterOnly}
              onChange={(e) => setTwitterOnly(e.target.checked)}
              className="rounded"
            />
            Has Twitter
          </label>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MultiSelectDropdown
            label="Startup"
            options={[
              { value: "has_signal", label: "Has Signal" },
              { value: "no_signal", label: "No Signal" },
            ]}
            selected={startupFilters}
            onChange={(next) => { setStartupFilters(next); setActivePreset(null); }}
          />
          <MultiSelectDropdown
            label="Funding"
            options={[
              { value: "funded", label: "Funded" },
              { value: "unfunded", label: "Unfunded" },
            ]}
            selected={fundingFilters}
            onChange={(next) => { setFundingFilters(next); setActivePreset(null); }}
          />
          <MultiSelectDropdown
            label="Stage"
            options={STAGES.map((s) => ({ value: s, label: s }))}
            selected={stageFilters}
            onChange={(next) => { setStageFilters(next); setActivePreset(null); }}
          />
          <MultiSelectDropdown
            label="Category"
            options={allCategories.map((c) => ({ value: c, label: c }))}
            selected={categoryFilters}
            onChange={(next) => { setCategoryFilters(next); setActivePreset(null); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto flex-1" style={{ maxHeight: "calc(100vh - 220px)" }}>
        <Table className="table-fixed min-w-[2200px]">
          <TableHeader className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={`${header.column.getCanSort() ? "cursor-pointer select-none hover:bg-muted/50" : ""} bg-background`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: " \u2191", desc: " \u2193" }[header.column.getIsSorted() as string] ?? ""}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => setSelectedPerson(row.original)}
                  className={`cursor-pointer hover:bg-muted/60 ${
                    row.original.combinedScore >= 90
                      ? "bg-green-50/50"
                      : row.original.startupLikelihood > 0
                        ? "bg-amber-50/30"
                        : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="overflow-hidden py-1.5 px-2" style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-40 hover:bg-muted"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-40 hover:bg-muted"
          >
            Next
          </button>
        </div>
      </div>

      {/* Person detail modal */}
      <Dialog open={!!selectedPerson} onOpenChange={(open) => !open && setSelectedPerson(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selectedPerson && (
            <>
              <DialogTitle className="text-xl">{selectedPerson.name}</DialogTitle>
              <div className="mt-4 space-y-4">
                {/* Score row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-muted p-3">
                    <div className="text-xs text-muted-foreground mb-1">Combined Score</div>
                    <div className="text-2xl font-bold">{selectedPerson.combinedScore}</div>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <div className="text-xs text-muted-foreground mb-1">Outlier Score</div>
                    <div className="text-2xl font-bold">{selectedPerson.outlierScore}</div>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <div className="text-xs text-muted-foreground mb-1">Startup Likelihood</div>
                    <div className="text-2xl font-bold">{selectedPerson.startupLikelihood || "-"}</div>
                  </div>
                </div>

                {/* Key info */}
                <div className="space-y-3">
                  {selectedPerson.company && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Company</div>
                      <div className="text-sm font-medium">{selectedPerson.company}</div>
                    </div>
                  )}
                  {selectedPerson.currentActivity && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Current Activity</div>
                      <div className="text-sm">{selectedPerson.currentActivity}</div>
                    </div>
                  )}
                  {selectedPerson.fundingSeries && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Funding Stage</div>
                      <div className="text-sm font-medium">{selectedPerson.fundingSeries}</div>
                    </div>
                  )}
                  {selectedPerson.investors && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Investors</div>
                      <div className="text-sm">{selectedPerson.investors}</div>
                    </div>
                  )}
                  {selectedPerson.fundingInfo && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Funding</div>
                      <div className="text-sm">{selectedPerson.fundingInfo}</div>
                    </div>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-4 text-sm">
                  {selectedPerson.twitter && (
                    <a
                      href={`https://x.com/${selectedPerson.twitter.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {selectedPerson.twitter}
                    </a>
                  )}
                  {selectedPerson.country && (
                    <span className="text-muted-foreground">{selectedPerson.country}</span>
                  )}
                </div>

                {/* Categories */}
                {selectedPerson.categories.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedPerson.categories.map((cat) => (
                      <Badge key={cat} variant="secondary" className={`${CATEGORY_COLORS[cat] || ""}`}>
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Achievements */}
                {selectedPerson.achievements && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Achievements / Spikes</div>
                    <div className="space-y-1">
                      {selectedPerson.achievements.split(" | ").filter(Boolean).map((item, i) => (
                        <div key={i} className="text-sm pl-3 border-l-2 border-muted-foreground/20">{item}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedPerson.notes && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedPerson.notes}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
