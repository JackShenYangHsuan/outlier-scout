"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { NetworkList } from "@/components/network-list";
import type { Person } from "@/lib/types";
import type { GraphData } from "@/lib/graph-types";
import peopleData from "@/data/people.json";
import graphData from "@/data/graph_data.json";

type Tab = "people" | "network";

export default function Home() {
  const [tab, setTab] = useState<Tab>("people");

  return (
    <main className="min-h-screen flex flex-col max-w-[1600px] mx-auto">
      {/* Header + tabs */}
      <div className="flex-none px-6 pt-6 pb-0">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Find founders off your radar</h1>
            <p className="text-muted-foreground text-sm">
              Exceptional builders sourced from outlier signals and Twitter social graph
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b">
          <button
            onClick={() => setTab("people")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              tab === "people"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Outliers
          </button>
          <button
            onClick={() => setTab("network")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              tab === "network"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Twitter
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === "people" ? (
        <div className="flex-1 p-6">
          <DataTable data={peopleData as Person[]} />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden p-6" style={{ height: "calc(100vh - 120px)" }}>
          <NetworkList
            data={graphData as GraphData}
            selectedId={null}
            onSelectNode={() => {}}
          />
        </div>
      )}
    </main>
  );
}
