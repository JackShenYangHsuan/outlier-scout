"use client";

import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

import type {
  GraphData,
  GraphNode,
  Recommendation,
} from "@/lib/graph-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GraphViewProps {
  data: GraphData;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
  filterMainstream: boolean;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  ring: "hub" | "rec";
  followers_count: number;
  hub_count: number;
  description?: string;
  followed_by?: string[];
}

interface SimEdge {
  source: string;
  target: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function recRadius(hubCount: number): number {
  return Math.max(6, Math.min(16, 3 + hubCount * 0.25));
}

function recColor(hubCount: number): string {
  return d3.interpolateRgb("#86efac", "#047857")(Math.min(1, hubCount / 50));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BipartiteGraph({
  data,
  selectedId,
  onSelectNode,
  filterMainstream,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 800 });

  // Track latest props in refs so D3 callbacks always see current values
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const onSelectNodeRef = useRef(onSelectNode);
  onSelectNodeRef.current = onSelectNode;

  // -----------------------------------------------------------------------
  // Resize observer
  // -----------------------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // -----------------------------------------------------------------------
  // Main D3 effect
  // -----------------------------------------------------------------------
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !data) return;

    const { width, height } = dims;
    const cx = width / 2;
    const cy = height / 2;
    const innerR = Math.min(width, height) * 0.2; // ~200 at 1000px
    const outerR = Math.min(width, height) * 0.4; // ~400 at 1000px

    // --- Data prep ---------------------------------------------------------
    const hubNodes: SimNode[] = data.nodes
      .filter((n) => n.type === "hub")
      .map((n) => ({
        id: n.id,
        name: n.name,
        ring: "hub" as const,
        followers_count: n.followers_count,
        hub_count: n.hub_count,
        description: n.description,
      }));

    const hubIdSet = new Set(hubNodes.map((h) => h.id));

    const filteredRecs: Recommendation[] = filterMainstream
      ? data.recommendations.filter((r) => r.followers_count < 1_000_000)
      : [...data.recommendations];

    const recNodes: SimNode[] = filteredRecs.map((r) => ({
      id: r.username,
      name: r.name,
      ring: "rec" as const,
      followers_count: r.followers_count,
      hub_count: r.hub_count,
      description: r.description,
      followed_by: r.followed_by,
    }));

    const recIdSet = new Set(recNodes.map((r) => r.id));

    const edges: SimEdge[] = [];
    for (const r of filteredRecs) {
      for (const hubId of r.followed_by) {
        if (hubIdSet.has(hubId) && recIdSet.has(r.username)) {
          edges.push({ source: hubId, target: r.username });
        }
      }
    }

    const allNodes: SimNode[] = [...hubNodes, ...recNodes];

    // Build adjacency index for fast hover lookup
    const adjMap = new Map<string, Set<number>>();
    edges.forEach((e, i) => {
      if (!adjMap.has(e.source)) adjMap.set(e.source, new Set());
      if (!adjMap.has(e.target)) adjMap.set(e.target, new Set());
      adjMap.get(e.source)!.add(i);
      adjMap.get(e.target)!.add(i);
    });

    // --- Simulation --------------------------------------------------------
    const simulation = d3
      .forceSimulation<SimNode>(allNodes)
      .force(
        "radial",
        d3
          .forceRadial<SimNode>(
            (d) => (d.ring === "hub" ? innerR : outerR),
            cx,
            cy,
          )
          .strength(0.8),
      )
      .force(
        "collide",
        d3.forceCollide<SimNode>((d) =>
          d.ring === "hub" ? 12 : recRadius(d.hub_count) + 2,
        ),
      )
      .force("charge", d3.forceManyBody().strength(-10))
      .stop();

    // Run simulation synchronously
    for (let i = 0; i < 300; i++) simulation.tick();

    // --- SVG setup ---------------------------------------------------------
    const root = d3.select(svg);
    root.selectAll("*").remove();
    root.attr("width", width).attr("height", height);

    // Defs for clip paths
    const defs = root.append("defs");

    // Clip path for hub pics (radius 10)
    hubNodes.forEach((d) => {
      defs
        .append("clipPath")
        .attr("id", `clip-hub-${CSS.escape(d.id)}`)
        .append("circle")
        .attr("r", 10)
        .attr("cx", 0)
        .attr("cy", 0);
    });

    // Clip path for large rec pics (radius based on hub_count)
    recNodes
      .filter((d) => d.hub_count >= 35)
      .forEach((d) => {
        const r = recRadius(d.hub_count);
        defs
          .append("clipPath")
          .attr("id", `clip-rec-${CSS.escape(d.id)}`)
          .append("circle")
          .attr("r", r)
          .attr("cx", 0)
          .attr("cy", 0);
      });

    // Main group for zoom/pan
    const g = root.append("g");

    // --- Zoom --------------------------------------------------------------
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    root.call(zoom);

    // --- Ring labels -------------------------------------------------------
    g.append("text")
      .attr("x", cx)
      .attr("y", cy - innerR - 16)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .attr("fill", "#3b82f6")
      .attr("opacity", 0.7)
      .text("Hubs");

    g.append("text")
      .attr("x", cx)
      .attr("y", cy - outerR - 16)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .attr("fill", "#047857")
      .attr("opacity", 0.7)
      .text("Recommendations");

    // --- Edges (invisible by default) --------------------------------------
    const edgeGroup = g.append("g").attr("class", "edges");
    const edgeSel = edgeGroup
      .selectAll<SVGLineElement, SimEdge>("line")
      .data(edges)
      .join("line")
      .attr("x1", (d) => {
        const n = allNodes.find((n) => n.id === d.source);
        return n?.x ?? cx;
      })
      .attr("y1", (d) => {
        const n = allNodes.find((n) => n.id === d.source);
        return n?.y ?? cy;
      })
      .attr("x2", (d) => {
        const n = allNodes.find((n) => n.id === d.target);
        return n?.x ?? cx;
      })
      .attr("y2", (d) => {
        const n = allNodes.find((n) => n.id === d.target);
        return n?.y ?? cy;
      })
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 0.5)
      .attr("opacity", 0);

    // Pre-build a quick‑lookup from node id → SimNode for edge coords
    const nodeById = new Map<string, SimNode>();
    allNodes.forEach((n) => nodeById.set(n.id, n));

    // Optimised edge positioning using map instead of find
    edgeSel
      .attr("x1", (d) => nodeById.get(d.source)?.x ?? cx)
      .attr("y1", (d) => nodeById.get(d.source)?.y ?? cy)
      .attr("x2", (d) => nodeById.get(d.target)?.x ?? cx)
      .attr("y2", (d) => nodeById.get(d.target)?.y ?? cy);

    // --- Tooltip -----------------------------------------------------------
    let tooltip = d3.select<HTMLDivElement, unknown>("#bipartite-tooltip");
    if (tooltip.empty()) {
      tooltip = d3
        .select("body")
        .append("div")
        .attr("id", "bipartite-tooltip")
        .style("position", "fixed")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("background", "white")
        .style("border", "1px solid #e2e8f0")
        .style("border-radius", "8px")
        .style("padding", "10px 12px")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.1)")
        .style("font-size", "12px")
        .style("max-width", "260px")
        .style("z-index", "9999")
        .style("line-height", "1.4");
    }

    // Shared hover handlers
    function showTooltip(event: MouseEvent, d: SimNode) {
      const imgUrl = `https://unavatar.io/twitter/${d.id}`;
      const hubLine =
        d.ring === "rec" ? `<div style="color:#047857">Hubs: ${d.hub_count}</div>` : "";
      tooltip
        .html(
          `<div style="display:flex;gap:8px;align-items:start">
            <img src="${imgUrl}" width="36" height="36" style="border-radius:50%;flex-shrink:0" />
            <div>
              <div style="font-weight:600">${d.name}</div>
              <div style="color:#64748b">@${d.id}</div>
              <div style="color:#64748b">${formatFollowers(d.followers_count)} followers</div>
              ${hubLine}
              ${d.description ? `<div style="margin-top:4px;color:#475569">${d.description}</div>` : ""}
            </div>
          </div>`,
        )
        .style("left", `${event.clientX + 14}px`)
        .style("top", `${event.clientY - 10}px`)
        .style("opacity", 1);

      // Show connected edges
      const connectedIndices = adjMap.get(d.id);
      if (connectedIndices) {
        edgeSel.attr("opacity", (_, i) => (connectedIndices.has(i) ? 0.4 : 0));
      }
    }

    function hideTooltip() {
      tooltip.style("opacity", 0);
      edgeSel.attr("opacity", 0);
    }

    // --- Drag behaviour ----------------------------------------------------
    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
        d.x = event.x;
        d.y = event.y;
        // Update this node group position
        d3.select(event.sourceEvent.target.closest("g.node")).attr(
          "transform",
          `translate(${event.x},${event.y})`,
        );
        // Update connected edges
        edgeSel
          .filter((e) => e.source === d.id || e.target === d.id)
          .attr("x1", (e) => nodeById.get(e.source)?.x ?? cx)
          .attr("y1", (e) => nodeById.get(e.source)?.y ?? cy)
          .attr("x2", (e) => nodeById.get(e.target)?.x ?? cx)
          .attr("y2", (e) => nodeById.get(e.target)?.y ?? cy);
      })
      .on("end", (event, d) => {
        d.fx = null;
        d.fy = null;
      });

    // --- Hub nodes ---------------------------------------------------------
    const hubGroup = g.append("g").attr("class", "hub-nodes");
    const hubG = hubGroup
      .selectAll<SVGGElement, SimNode>("g.node")
      .data(hubNodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .call(drag);

    // Blue circle background
    hubG
      .append("circle")
      .attr("r", 10)
      .attr("fill", "#3b82f6")
      .attr("stroke", (d) =>
        d.id === selectedIdRef.current ? "#f59e0b" : "white",
      )
      .attr("stroke-width", (d) =>
        d.id === selectedIdRef.current ? 3 : 1.5,
      );

    // Profile pic
    hubG
      .append("image")
      .attr("href", (d) => `https://unavatar.io/twitter/${d.id}`)
      .attr("x", -10)
      .attr("y", -10)
      .attr("width", 20)
      .attr("height", 20)
      .attr("clip-path", (d) => `url(#clip-hub-${CSS.escape(d.id)})`);

    // Label
    hubG
      .append("text")
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("font-size", 8)
      .attr("fill", "#475569")
      .text((d) => d.name);

    // Hub interactions
    hubG
      .on("mouseover", (event, d) => showTooltip(event, d))
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.clientX + 14}px`)
          .style("top", `${event.clientY - 10}px`);
      })
      .on("mouseleave", hideTooltip)
      .on("click", (event, d) => {
        event.stopPropagation();
        onSelectNodeRef.current(
          d.id === selectedIdRef.current ? null : d.id,
        );
      });

    // --- Rec nodes ---------------------------------------------------------
    const recGroup = g.append("g").attr("class", "rec-nodes");
    const recG = recGroup
      .selectAll<SVGGElement, SimNode>("g.node")
      .data(recNodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .call(drag);

    // Coloured circle
    recG
      .append("circle")
      .attr("r", (d) => recRadius(d.hub_count))
      .attr("fill", (d) => recColor(d.hub_count))
      .attr("stroke", (d) =>
        d.id === selectedIdRef.current ? "#f59e0b" : "white",
      )
      .attr("stroke-width", (d) =>
        d.id === selectedIdRef.current ? 3 : 1,
      );

    // Profile pics on large recs
    recG
      .filter((d) => d.hub_count >= 35)
      .append("image")
      .attr("href", (d) => `https://unavatar.io/twitter/${d.id}`)
      .attr("x", (d) => -recRadius(d.hub_count))
      .attr("y", (d) => -recRadius(d.hub_count))
      .attr("width", (d) => recRadius(d.hub_count) * 2)
      .attr("height", (d) => recRadius(d.hub_count) * 2)
      .attr("clip-path", (d) => `url(#clip-rec-${CSS.escape(d.id)})`);

    // Rec interactions
    recG
      .on("mouseover", (event, d) => showTooltip(event, d))
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.clientX + 14}px`)
          .style("top", `${event.clientY - 10}px`);
      })
      .on("mouseleave", hideTooltip)
      .on("click", (event, d) => {
        event.stopPropagation();
        onSelectNodeRef.current(
          d.id === selectedIdRef.current ? null : d.id,
        );
      });

    // Click on empty space deselects
    root.on("click", () => {
      onSelectNodeRef.current(null);
    });

    // --- Auto-fit ----------------------------------------------------------
    const timer = setTimeout(() => {
      root
        .transition()
        .duration(600)
        .call(
          zoom.transform,
          d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(0.7)
            .translate(-cx, -cy),
        );
    }, 1000);

    // --- Cleanup -----------------------------------------------------------
    return () => {
      clearTimeout(timer);
      simulation.stop();
      tooltip.remove();
      root.on(".zoom", null);
    };
  }, [data, dims, filterMainstream]);

  // -----------------------------------------------------------------------
  // Selection highlight (lightweight update — no full redraw)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const root = d3.select(svg);

    root.selectAll<SVGGElement, SimNode>("g.node").each(function (d) {
      const isSelected = d.id === selectedId;
      d3.select(this)
        .select("circle")
        .attr("stroke", isSelected ? "#f59e0b" : "white")
        .attr("stroke-width", () => {
          if (isSelected) return 3;
          return d.ring === "hub" ? 1.5 : 1;
        });
    });
  }, [selectedId]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg bg-gray-50/50 overflow-hidden"
    >
      <svg ref={svgRef} width={dims.width} height={dims.height} />
    </div>
  );
}
