"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import type { Recommendation, GraphData } from "@/lib/graph-types";

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

interface Props {
  data: GraphData;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
  filterMainstream: boolean;
}

export function NetworkList({ data, selectedId, onSelectNode, filterMainstream }: Props) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  let recs = data.recommendations;
  if (filterMainstream) {
    recs = recs.filter((r) => r.followers_count < 1_000_000);
  }
  if (search) {
    const q = search.toLowerCase();
    recs = recs.filter(
      (r) =>
        r.username?.toLowerCase().includes(q) ||
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }

  // Scroll to selected card when graph node is clicked
  useEffect(() => {
    if (selectedId) {
      const el = cardRefs.current.get(selectedId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      setExpandedId(selectedId);
    }
  }, [selectedId]);

  const maxHubs = recs.length > 0 ? recs[0].hub_count : 1;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Recommendations
          </h2>
          <span className="text-xs text-gray-500">{recs.length} accounts</span>
        </div>
        <Input
          placeholder="Search by name or handle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {recs.map((rec, i) => {
          const isSelected = rec.username === selectedId || rec.id === selectedId;
          const isExpanded = expandedId === rec.username || expandedId === rec.id;

          return (
            <div
              key={rec.id}
              ref={(el) => {
                if (el) {
                  cardRefs.current.set(rec.username, el);
                  cardRefs.current.set(rec.id, el);
                }
              }}
              className={`px-4 py-3 border-b cursor-pointer transition-colors hover:bg-gray-50 ${
                isSelected ? "bg-amber-50 border-l-2 border-l-amber-400" : ""
              }`}
              onClick={() => {
                const id = rec.username || rec.id;
                if (isExpanded) {
                  setExpandedId(null);
                  onSelectNode(null);
                } else {
                  setExpandedId(id);
                  onSelectNode(id);
                }
              }}
            >
              {/* Main card */}
              <div className="flex items-start gap-3">
                {/* Rank */}
                <span className="flex-none text-xs text-gray-400 w-5 pt-1 text-right">
                  {i + 1}
                </span>

                {/* Profile pic */}
                <img
                  src={`https://unavatar.io/twitter/${rec.username}`}
                  alt=""
                  className="flex-none w-9 h-9 rounded-full bg-gray-200 object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.name || rec.username)}&size=36&background=random`;
                  }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {rec.name}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      @{rec.username}
                    </span>
                  </div>

                  {/* Hub count bar */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{
                          width: `${(rec.hub_count / maxHubs) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="flex-none text-xs font-medium text-emerald-700">
                      {rec.hub_count} hubs
                    </span>
                  </div>

                  {/* Bio snippet */}
                  {rec.description && !isExpanded && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {rec.description}
                    </p>
                  )}
                </div>

                {/* Followers + X link */}
                <div className="flex-none flex flex-col items-end gap-1">
                  <span className="text-xs text-gray-500">
                    {formatFollowers(rec.followers_count)}
                  </span>
                  <a
                    href={`https://x.com/${rec.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
                  >
                    View ↗
                  </a>
                </div>
              </div>

              {/* Expanded detail card */}
              {isExpanded && (
                <div className="mt-3 ml-8 pl-3 border-l-2 border-gray-200">
                  {rec.description && (
                    <p className="text-xs text-gray-600 mb-2">
                      {rec.description}
                    </p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-500 mb-2">
                    <span>{formatFollowers(rec.followers_count)} followers</span>
                    <span>{formatFollowers(rec.following_count)} following</span>
                  </div>
                  {rec.followed_by && rec.followed_by.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-700">
                        Followed by:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rec.followed_by.slice(0, 15).map((hub) => (
                          <span
                            key={hub}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full"
                          >
                            <img
                              src={`https://unavatar.io/twitter/${hub}`}
                              alt=""
                              className="w-3 h-3 rounded-full"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                            @{hub}
                          </span>
                        ))}
                        {rec.followed_by.length > 15 && (
                          <span className="text-[10px] text-gray-400">
                            +{rec.followed_by.length - 15} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
