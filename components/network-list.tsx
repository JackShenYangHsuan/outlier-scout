"use client";

import { useState, useMemo } from "react";
import type { GraphData, Recommendation } from "@/lib/graph-types";
import companiesRaw from "@/data/network_companies.json";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const companiesDb = companiesRaw as Record<string, { name: string; description: string; stage: string; investors: string; website?: string }>;

const ROLE_PATTERNS: { label: string; re: RegExp; bg: string; text: string; border: string }[] = [
  { label: "Founder", re: /\b(founder|co-founder|cofounder|founded|co-founded|cofounded|building\s|ceo)\b/i, bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  { label: "Researcher", re: /\b(research|professor|prof\b|phd|ph\.d|scientist|postdoc|lab\b|academic)/i, bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  { label: "Engineer", re: /\b(engineer|developer|dev\b|cto|hacker|software|infra|backend|frontend|fullstack|swe\b)/i, bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  { label: "Investor", re: /\b(investor|vc\b|venture|angel|partner at|gp at|capital|fund\b)/i, bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-200" },
  { label: "Creator", re: /\b(creator|podcast|host|writer|author|journalist|newsletter|blogger|youtuber|content)/i, bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  { label: "Operator", re: /\b(coo|vp\b|director|head of|chief|president|gm\b|general manager|operator)/i, bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200" },
];

const OTHER_STYLE = { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };

const CORP_RE = /\b(official|inc\.|llc|ltd|corp\b|we are|our team|our mission|platform for|join us|we're hiring|open.source project|the leading)\b|[™®]/i;
const CORP_NAME_RE = /\b(AI|Labs|HQ|App|Bot|News|Official|Inc|Podcast)$/;
const NON_STARTUP = /vc firm|nonprofit|open source|google product|intercom product/i;

function isCorporate(rec: Recommendation): boolean {
  const desc = rec.description || "";
  const name = rec.name || "";
  return CORP_RE.test(desc) || CORP_RE.test(name) || CORP_NAME_RE.test(name);
}

function detectPrimaryRole(rec: Recommendation): string {
  const desc = rec.description || "";
  for (const p of ROLE_PATTERNS) {
    if (p.re.test(desc)) return p.label;
  }
  return "Other";
}

interface CompanyInfo {
  handle: string;
  name: string;
  stage: string;
  investors: string;
  website?: string;
  inDb: boolean;
}

/** Extract ALL @mentions from bio as companies, mark which ones are in our DB */
function extractAllCompanies(rec: Recommendation): CompanyInfo[] {
  const desc = rec.description || "";
  const mentions = desc.match(/@(\w+)/g);
  if (!mentions) return [];
  const seen = new Set<string>();
  const result: CompanyInfo[] = [];
  for (const m of mentions) {
    const handle = m.slice(1).toLowerCase();
    if (handle === rec.username.toLowerCase()) continue;
    if (seen.has(handle)) continue;
    seen.add(handle);
    const dbEntry = companiesDb[handle];
    if (dbEntry) {
      result.push({ handle, name: dbEntry.name, stage: dbEntry.stage, investors: dbEntry.investors, website: dbEntry.website, inDb: true });
    } else {
      result.push({ handle, name: `@${handle}`, stage: "", investors: "", inDb: false });
    }
  }
  return result;
}

/** Get primary startup company (first DB match that's a startup) for stage/investors */
function getPrimaryStartup(companies: CompanyInfo[]): CompanyInfo | null {
  for (const co of companies) {
    if (co.inDb && !NON_STARTUP.test(co.stage)) return co;
  }
  return null;
}

type SortKey = "mutual" | "followers" | "name" | "company" | "stage";
type SortDir = "asc" | "desc";

interface EnrichedRec {
  rec: Recommendation;
  role: string;
  companies: CompanyInfo[];
  primary: CompanyInfo | null;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function Avatar({ username, name, size = 24 }: { username: string; name?: string; size?: number }) {
  return (
    <img
      src={`https://unavatar.io/twitter/${username}`}
      alt={name || username}
      width={size}
      height={size}
      className="rounded-full bg-gray-200 object-cover shrink-0"
      loading="lazy"
      onError={(e) => {
        (e.target as HTMLImageElement).src =
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name || username)}&size=${size}&background=random&font-size=0.4`;
      }}
    />
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return null;
  return <span className="text-gray-700 ml-0.5">{dir === "asc" ? "↑" : "↓"}</span>;
}

function CompanyCell({ companies, primary }: { companies: CompanyInfo[]; primary: CompanyInfo | null }) {
  const [expanded, setExpanded] = useState(false);

  if (companies.length === 0) return null;

  const rest = companies.filter((c) => c !== primary);
  const shown = expanded ? companies : primary ? [primary] : [companies[0]];
  const hiddenCount = companies.length - shown.length;

  return (
    <div className="flex flex-col gap-0.5">
      {shown.map((co) => (
        <div key={co.handle} className="flex items-center gap-1">
          {co.inDb && <Avatar username={co.handle} name={co.name} size={16} />}
          <a
            href={co.website || `https://x.com/${co.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`hover:underline cursor-pointer truncate ${co.inDb ? "font-medium text-gray-900" : "text-gray-400"}`}
          >
            {co.name}
          </a>
        </div>
      ))}
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          className="text-[10px] text-blue-500 hover:text-blue-700 cursor-pointer text-left"
        >
          +{hiddenCount} more
        </button>
      )}
      {expanded && rest.length > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
          className="text-[10px] text-blue-500 hover:text-blue-700 cursor-pointer text-left"
        >
          show less
        </button>
      )}
    </div>
  );
}

interface Props {
  data: GraphData;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
}

export function NetworkList({ data }: Props) {
  const [roleFilters, setRoleFilters] = useState<Set<string>>(new Set());
  const [showMethodology, setShowMethodology] = useState(false);
  const [hideCorp, setHideCorp] = useState(true);
  const [filterMainstream, setFilterMainstream] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("mutual");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const enriched = useMemo(() => {
    let recs = data.recommendations;
    if (filterMainstream) recs = recs.filter((r) => r.followers_count < 1_000_000);
    if (hideCorp) recs = recs.filter((r) => !isCorporate(r));
    if (roleFilters.size > 0) {
      recs = recs.filter((r) => {
        const role = detectPrimaryRole({ ...r } as Recommendation);
        return roleFilters.has(role);
      });
    }
    return recs.map((rec) => {
      const companies = extractAllCompanies(rec);
      return {
        rec,
        role: detectPrimaryRole(rec),
        companies,
        primary: getPrimaryStartup(companies),
      };
    });
  }, [data.recommendations, filterMainstream, hideCorp, roleFilters]);

  const sortFn = (a: EnrichedRec, b: EnrichedRec) => {
    let cmp = 0;
    switch (sortKey) {
      case "mutual": cmp = a.rec.hub_count - b.rec.hub_count; break;
      case "followers": cmp = a.rec.followers_count - b.rec.followers_count; break;
      case "name": cmp = (a.rec.name || "").localeCompare(b.rec.name || ""); break;
      case "company": cmp = (a.primary?.name || "zzz").localeCompare(b.primary?.name || "zzz"); break;
      case "stage": cmp = (a.primary?.stage || "zzz").localeCompare(b.primary?.stage || "zzz"); break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  };

  const grouped = useMemo(() => {
    const groups: Record<string, EnrichedRec[]> = {};
    for (const item of enriched) {
      if (!groups[item.role]) groups[item.role] = [];
      groups[item.role].push(item);
    }
    const order = ROLE_PATTERNS.map((p) => p.label);
    return Object.entries(groups)
      .sort(([a], [b]) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
      .map(([role, items]) => [role, [...items].sort(sortFn)] as const);
  }, [enriched, sortKey, sortDir]);

  const thClass = "text-left px-2 h-8 font-medium text-muted-foreground text-sm cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap bg-background";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Surface people your network follows but you don&apos;t &mdash; hidden in the overlap between trusted Twitter accounts.
      </p>

      {/* Stats bar */}
      <div className="flex gap-6 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{enriched.length.toLocaleString()}</strong> accounts</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <MultiSelectDropdown
          label="Role"
          options={ROLE_PATTERNS.map((p) => ({ value: p.label, label: p.label }))}
          selected={roleFilters}
          onChange={setRoleFilters}
        />
        <span className="text-xs text-muted-foreground">Orgs and 1M+ celebrity accounts filtered out</span>
        <button
          onClick={() => setShowMethodology(true)}
          className="text-xs text-blue-600 hover:underline cursor-pointer"
        >
          Methodology
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        <span>Mutual = accounts Ethan doesn{"'"}t follow, but # of people he follows also follow</span>
      </div>

      {/* Methodology modal */}
      <Dialog open={showMethodology} onOpenChange={setShowMethodology}>
        <DialogContent>
          <DialogTitle className="text-lg">How this works</DialogTitle>
          <div className="mt-3 space-y-4 text-sm">
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold">1</span>
                <p>Start with Ethan{"'"}s <strong>{data.stats.ethan_following.toLocaleString()}</strong> Twitter followings</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold">2</span>
                <p>Pick <strong>{data.stats.hubs_fetched}</strong> of them as &ldquo;seed&rdquo; accounts and scrape who each one follows</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold">3</span>
                <p>Find accounts that <strong>Ethan doesn{"'"}t follow</strong> but <strong>{data.stats.min_hub_threshold}+ seeds do</strong></p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold">4</span>
                <p>Rank by <strong>mutual count</strong> &mdash; how many seeds follow them. Higher = stronger signal from Ethan{"'"}s trusted network</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              Result: <strong>{data.stats.total_recommendations}</strong> people in Ethan{"'"}s extended network blind spot &mdash; followed by many of his trusted connections but not by him directly.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="border rounded-lg overflow-auto flex-1" style={{ maxHeight: "calc(100vh - 220px)" }}>
        <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-background border-b">
              <tr className="border-b">
                <th className={`${thClass} text-right`} style={{ width: 50 }} onClick={() => handleSort("mutual")}>
                  Mutual <SortIcon active={sortKey === "mutual"} dir={sortDir} />
                </th>
                <th className={thClass} style={{ width: 160 }} onClick={() => handleSort("name")}>
                  Name <SortIcon active={sortKey === "name"} dir={sortDir} />
                </th>
                <th className={thClass} style={{ width: 70 }} onClick={() => handleSort("followers")}>
                  Followers <SortIcon active={sortKey === "followers"} dir={sortDir} />
                </th>
                <th className={`${thClass}`}>Bio</th>
                <th className={thClass} onClick={() => handleSort("company")}>
                  Company <SortIcon active={sortKey === "company"} dir={sortDir} />
                </th>
                <th className={thClass} onClick={() => handleSort("stage")}>
                  Stage <SortIcon active={sortKey === "stage"} dir={sortDir} />
                </th>
                <th className={thClass}>Investors</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {grouped.map(([role, items]) => {
                const style = ROLE_PATTERNS.find((p) => p.label === role) || OTHER_STYLE;
                return [
                  <tr key={`header-${role}`} className="border-b">
                    <td colSpan={7} className={`px-3 py-1.5 ${style.bg} border-y ${style.border}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${style.text}`}>{role}</span>
                        <span className={`text-[10px] ${style.text} opacity-60`}>{items.length}</span>
                      </div>
                    </td>
                  </tr>,
                  ...items.map(({ rec, companies, primary }) => (
                    <tr key={rec.id} className="border-b transition-colors hover:bg-muted/60">
                      <td className="px-2 py-1 text-right whitespace-nowrap">
                        <span className="text-sm font-medium text-emerald-600">{rec.hub_count}</span>
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar username={rec.username} name={rec.name} size={24} />
                          <a
                            href={`https://x.com/${rec.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-sm text-blue-600 hover:underline cursor-pointer truncate"
                          >
                            {rec.name}
                          </a>
                        </div>
                      </td>
                      <td className="px-2 py-1 text-sm text-muted-foreground whitespace-nowrap">
                        {formatFollowers(rec.followers_count)}
                      </td>
                      <td className="px-2 py-1">
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-snug max-w-[250px]">{rec.description}</p>
                      </td>
                      <td className="px-2 py-1 text-sm">
                        <CompanyCell companies={companies} primary={primary} />
                      </td>
                      <td className="px-2 py-1 text-sm text-muted-foreground whitespace-nowrap">
                        {primary?.stage || ""}
                      </td>
                      <td className="px-2 py-1">
                        {primary?.investors && (
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">{primary.investors}</p>
                        )}
                      </td>
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
    </div>
  );
}
