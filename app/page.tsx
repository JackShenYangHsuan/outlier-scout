"use client";

import { useState, useCallback } from "react";
import { DataTable } from "@/components/data-table";
import { NetworkGraph } from "@/components/network-graph";
import { NetworkList } from "@/components/network-list";
import { RecSimilarityGraph } from "@/components/graphs/rec-similarity";
import { HubClustersGraph } from "@/components/graphs/hub-clusters";
import { BipartiteGraph } from "@/components/graphs/bipartite";
import { ConcentricRingsGraph } from "@/components/graphs/concentric-rings";
import type { Person } from "@/lib/types";
import type { GraphData } from "@/lib/graph-types";
import peopleData from "@/data/people.json";
import graphData from "@/data/graph_data.json";

type Tab = "people" | "network";
type GraphView = "similarity" | "clusters" | "bipartite" | "rings";

const graphViewLabels: Record<GraphView, string> = {
  similarity: "Similarity",
  clusters: "Hub Clusters",
  bipartite: "Bipartite",
  rings: "Rings",
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("people");
  const [graphView, setGraphView] = useState<GraphView>("similarity");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterMainstream, setFilterMainstream] = useState(true);

  const handleSelectNode = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  return (
    <main className="min-h-screen flex flex-col max-w-[1600px] mx-auto">
      {/* Header + tabs */}
      <div className="flex-none px-6 pt-6 pb-0">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">KV Scout</h1>
            <p className="text-muted-foreground text-sm">
              Outlier database — find exceptional people before they raise
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b">
          <button
            onClick={() => setTab("people")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "people"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            People
          </button>
          <button
            onClick={() => setTab("network")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "network"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Network
          </button>

          {/* Filter toggle (only on network tab) */}
          {tab === "network" && (
            <div className="ml-auto flex items-center gap-2 pb-1">
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterMainstream}
                  onChange={(e) => setFilterMainstream(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Hide 1M+ followers
              </label>
              <span className="text-xs text-gray-400">
                {(graphData as GraphData).stats.total_recommendations} recs ·{" "}
                {(graphData as GraphData).stats.hubs_fetched} hubs
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {tab === "people" ? (
        <div className="flex-1 p-6">
          <DataTable data={peopleData as Person[]} />
        </div>
      ) : (
        <>
          {/* Graph view sub-tabs */}
          <div className="flex-none flex gap-1 px-6 pt-2">
            {(Object.keys(graphViewLabels) as GraphView[]).map((v) => (
              <button
                key={v}
                onClick={() => setGraphView(v)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  graphView === v
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {graphViewLabels[v]}
              </button>
            ))}
          </div>

          <div className="flex overflow-hidden" style={{ height: "calc(100vh - 152px)" }}>
            {/* Graph (60%) */}
            <div className="w-[60%] h-full p-4">
              {graphView === "similarity" && (
                <RecSimilarityGraph
                  data={graphData as GraphData}
                  selectedId={selectedId}
                  onSelectNode={handleSelectNode}
                  filterMainstream={filterMainstream}
                />
              )}
              {graphView === "clusters" && (
                <HubClustersGraph
                  data={graphData as GraphData}
                  selectedId={selectedId}
                  onSelectNode={handleSelectNode}
                  filterMainstream={filterMainstream}
                />
              )}
              {graphView === "bipartite" && (
                <BipartiteGraph
                  data={graphData as GraphData}
                  selectedId={selectedId}
                  onSelectNode={handleSelectNode}
                  filterMainstream={filterMainstream}
                />
              )}
              {graphView === "rings" && (
                <ConcentricRingsGraph
                  data={graphData as GraphData}
                  selectedId={selectedId}
                  onSelectNode={handleSelectNode}
                  filterMainstream={filterMainstream}
                />
              )}
            </div>
            {/* List (40%) */}
            <div className="w-[40%] h-full border-l bg-white">
              <NetworkList
                data={graphData as GraphData}
                selectedId={selectedId}
                onSelectNode={handleSelectNode}
                filterMainstream={filterMainstream}
              />
            </div>
          </div>
        </>
      )}
    </main>
  );
}
