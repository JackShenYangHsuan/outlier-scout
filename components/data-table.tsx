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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Person } from "@/lib/types";
import { countryFlag } from "@/lib/country-flags";

const SPIKE_TAGS: { key: string; char: string; color: string }[] = [
  { key: "Academic Research", char: "A", color: "bg-blue-100 text-blue-700" },
  { key: "Technical Builder", char: "T", color: "bg-emerald-100 text-emerald-700" },
  { key: "Operator/Exec", char: "O", color: "bg-amber-100 text-amber-700" },
  { key: "Creative/Media", char: "M", color: "bg-purple-100 text-purple-700" },
  { key: "Competition Winner", char: "W", color: "bg-rose-100 text-rose-700" },
];
const SPIKE_TAG_MAP = Object.fromEntries(SPIKE_TAGS.map((t) => [t.key, t]));

function parseSpikeTags(text: string): { tags: string[]; rest: string } {
  const tags: string[] = [];
  let remaining = text;
  const re = /^\[([^\]]+)\]/;
  let match;
  while ((match = re.exec(remaining))) {
    tags.push(match[1]);
    remaining = remaining.slice(match[0].length);
  }
  return { tags, rest: remaining.trim() };
}


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
    accessorKey: "outlierScore",
    header: "Outlier",
    size: 55,
    cell: ({ row }) => <ScoreBadge score={row.original.outlierScore} palette="blue" />,
    sortDescFirst: true,
  },
  {
    accessorKey: "name",
    header: "Name",
    size: 130,
    cell: ({ row }) => {
      const handle = row.original.twitter;
      const name = row.original.name;
      if (handle) {
        const clean = handle.replace(/^@/, "");
        return (
          <a
            href={`https://x.com/${clean}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm whitespace-nowrap truncate text-blue-600 hover:underline block"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </a>
        );
      }
      return <div className="font-medium text-sm whitespace-nowrap truncate">{name}</div>;
    },
  },
  {
    accessorKey: "achievements",
    header: "Spikes",
    size: 180,
    cell: ({ row }) => {
      const text = row.original.achievements;
      if (!text) return <span className="text-muted-foreground/40 text-sm">-</span>;
      const { tags, rest } = parseSpikeTags(text);
      return (
        <div className="flex items-center gap-1 min-w-0">
          {tags.map((tag) => (
            <span key={tag} className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium ${(SPIKE_TAG_MAP[tag]?.color || "bg-gray-100 text-gray-700")}`} title={tag}>{SPIKE_TAG_MAP[tag]?.char || tag[0]}</span>
          ))}
          {rest && <span className="text-xs text-muted-foreground truncate">{rest}</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "company",
    header: "Company",
    size: 130,
    cell: ({ row }) => {
      const val = row.original.company;
      const url = row.original.companyUrl;
      if (!val) return <span className="text-muted-foreground/40 text-sm">-</span>;
      const domain = url ? new URL(url).hostname : null;
      const favicon = domain ? `https://www.google.com/s2/favicons?sz=16&domain=${domain}` : null;
      return (
        <div className="flex items-center gap-1.5 min-w-0">
          {favicon && <img src={favicon} alt="" width={16} height={16} className="shrink-0 rounded-sm" />}
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium truncate text-blue-600 hover:text-blue-800 hover:underline">{val}</a>
          ) : (
            <span className="text-sm font-medium truncate">{val}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "fundingSeries",
    header: "Stage",
    size: 70,
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
    size: 160,
    cell: ({ row }) => {
      const val = row.original.investors;
      if (!val) return <span className="text-muted-foreground/40 text-sm">-</span>;
      return <div className="text-sm text-muted-foreground truncate">{val}</div>;
    },
  },
  {
    id: "kv",
    header: "KV",
    size: 35,
    cell: ({ row }) => {
      const inv = row.original.investors || "";
      const isKV = /khosla/i.test(inv);
      return isKV
        ? <span className="inline-flex px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">yes</span>
        : <span className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 text-xs font-medium">no</span>;
    },
  },
  {
    accessorKey: "fundingInfo",
    header: "Funding",
    size: 150,
    cell: ({ row }) => {
      const val = row.original.fundingInfo;
      if (!val) return <span className="text-muted-foreground/40 text-sm">-</span>;
      return <div className="text-sm text-muted-foreground truncate">{val}</div>;
    },
  },
  {
    accessorKey: "currentActivity",
    header: "Current",
    size: 150,
    cell: ({ row }) => {
      const val = row.original.currentActivity;
      if (!val) return <span className="text-muted-foreground/40 text-sm">-</span>;
      return <div className="text-sm text-muted-foreground truncate">{val}</div>;
    },
  },
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
    { id: "outlierScore", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [companyOnly, setCompanyOnly] = useState(true);
  const [kvFilter, setKvFilter] = useState<Set<string>>(new Set(["no"]));
  const [stageFilters, setStageFilters] = useState<Set<string>>(new Set(["Seed", "Series A", "Series B", "Bootstrapped"]));
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const hasActiveFilters = stageFilters.size > 0 || companyOnly || kvFilter.size > 0;

  const resetFilters = () => {
    setStageFilters(new Set(["Seed", "Series A", "Series B", "Bootstrapped"]));
    setCompanyOnly(true);
    setKvFilter(new Set(["no"]));
  };

  const filteredData = useMemo(() => {
    let d = data;
    if (companyOnly) d = d.filter((p) => p.company);
    if (kvFilter.size > 0 && kvFilter.size < 2) {
      if (kvFilter.has("yes")) d = d.filter((p) => /khosla/i.test(p.investors || ""));
      if (kvFilter.has("no")) d = d.filter((p) => !/khosla/i.test(p.investors || ""));
    }
    if (stageFilters.size > 0) d = d.filter((p) => stageFilters.has(p.fundingSeries));
    return d;
  }, [data, companyOnly, kvFilter, stageFilters]);


  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const withTwitter = data.filter((p) => p.twitter).length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex gap-6 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{data.length.toLocaleString()}</strong> people</span>
        <span><strong className="text-foreground">{withTwitter}</strong> with Twitter</span>
        <span><strong className="text-foreground">{filteredData.length.toLocaleString()}</strong> showing</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={companyOnly}
            onChange={(e) => setCompanyOnly(e.target.checked)}
            className="rounded"
          />
          Has Company
        </label>
        <MultiSelectDropdown
          label="KV"
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          selected={kvFilter}
          onChange={setKvFilter}
        />
        <MultiSelectDropdown
          label="Stage"
          options={STAGES.map((s) => ({ value: s, label: s }))}
          selected={stageFilters}
          onChange={setStageFilters}
        />
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Spike legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        <span className="font-medium">Spike types:</span>
        {SPIKE_TAGS.map((t) => (
          <span key={t.key} className="flex items-center gap-1">
            <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-medium ${t.color}`}>{t.char}</span>
            {t.key}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto flex-1" style={{ maxHeight: "calc(100vh - 220px)" }}>
        <Table className="table-fixed min-w-[1060px]">
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
                    row.original.outlierScore >= 90 ? "bg-green-50/50" : ""
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
                {/* Score */}
                <div className="rounded-lg bg-muted p-3 inline-flex flex-col">
                  <div className="text-xs text-muted-foreground mb-1">Outlier Score</div>
                  <div className="text-2xl font-bold">{selectedPerson.outlierScore}</div>
                </div>

                {/* Key info */}
                <div className="space-y-3">
                  {selectedPerson.company && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Company</div>
                      <div className="flex items-center gap-1.5">
                        {selectedPerson.companyUrl && (() => { try { const d = new URL(selectedPerson.companyUrl).hostname; return <img src={`https://www.google.com/s2/favicons?sz=16&domain=${d}`} alt="" width={16} height={16} className="shrink-0 rounded-sm" />; } catch { return null; } })()}
                        {selectedPerson.companyUrl ? (
                          <a href={selectedPerson.companyUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">{selectedPerson.company}</a>
                        ) : (
                          <div className="text-sm font-medium">{selectedPerson.company}</div>
                        )}
                      </div>
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
                    <span className="text-muted-foreground">{countryFlag(selectedPerson.country)} {selectedPerson.country}</span>
                  )}
                </div>

                {/* Achievements */}
                {selectedPerson.achievements && (() => {
                  const { tags, rest } = parseSpikeTags(selectedPerson.achievements);
                  return (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Achievements / Spikes</div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {tags.map((tag) => (
                            <span key={tag} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${(SPIKE_TAG_MAP[tag]?.color || "bg-gray-100 text-gray-700")}`}><span className="font-bold">{SPIKE_TAG_MAP[tag]?.char || tag[0]}</span>{tag}</span>
                          ))}
                        </div>
                      )}
                      {rest && (
                        <div className="space-y-1">
                          {rest.split(" | ").filter(Boolean).map((item, i) => (
                            <div key={i} className="text-sm pl-3 border-l-2 border-muted-foreground/20">{item}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
