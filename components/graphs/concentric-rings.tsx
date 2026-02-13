"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";
import type { GraphData, Recommendation } from "@/lib/graph-types";

interface GraphViewProps {
  data: GraphData;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
  filterMainstream: boolean;
}

// Ring configuration
const RINGS = [
  { radius: 150, label: "40+ hubs", minHub: 40, maxHub: Infinity, nodeRadius: [16, 22] },
  { radius: 280, label: "30-39 hubs", minHub: 30, maxHub: 40, nodeRadius: [10, 15] },
  { radius: 420, label: "20-29 hubs", minHub: 0, maxHub: 30, nodeRadius: [6, 10] },
] as const;

interface PositionedRec extends Recommendation {
  cx: number;
  cy: number;
  r: number;
  ringIndex: number;
}

function nodeColor(hubCount: number): string {
  const intensity = Math.min(1, hubCount / 50);
  return d3.interpolateRgb("#86efac", "#047857")(intensity);
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return `${count}`;
}

function computeNodeRadius(hubCount: number, ringIndex: number): number {
  const ring = RINGS[ringIndex];
  const [minR, maxR] = ring.nodeRadius;
  const hubRange = ring.minHub === 0 ? 10 : ring.maxHub - ring.minHub;
  const hubBase = ring.minHub === 0 ? 20 : ring.minHub;
  const t = Math.min(1, Math.max(0, (hubCount - hubBase) / hubRange));
  return minR + t * (maxR - minR);
}

function showProfilePic(hubCount: number, ringIndex: number): boolean {
  if (ringIndex <= 1) return true; // inner + middle always
  return hubCount >= 25; // outer only if >= 25
}

export function ConcentricRingsGraph({ data, selectedId, onSelectNode, filterMainstream }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleClick = useCallback(
    (rec: Recommendation) => {
      onSelectNode(rec.username === selectedId ? null : rec.username);
    },
    [selectedId, onSelectNode]
  );

  // Main render
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;
    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.selectAll("*").remove();

    // Filter recommendations
    let recs = data.recommendations;
    if (filterMainstream) {
      recs = recs.filter((r) => r.followers_count < 1_000_000);
    }

    const centerX = width / 2;
    const centerY = height / 2;

    // Bucket recs into tiers
    const tiers: Recommendation[][] = [[], [], []];
    for (const rec of recs) {
      if (rec.hub_count >= 40) tiers[0].push(rec);
      else if (rec.hub_count >= 30) tiers[1].push(rec);
      else tiers[2].push(rec);
    }

    // Sort each tier by hub_count descending
    for (const tier of tiers) {
      tier.sort((a, b) => b.hub_count - a.hub_count);
    }

    // Position nodes
    const positionedNodes: PositionedRec[] = [];
    tiers.forEach((tierNodes, ringIndex) => {
      const radius = RINGS[ringIndex].radius;
      tierNodes.forEach((rec, i) => {
        const angle = tierNodes.length === 1
          ? -Math.PI / 2
          : (2 * Math.PI * i) / tierNodes.length - Math.PI / 2;
        positionedNodes.push({
          ...rec,
          cx: centerX + radius * Math.cos(angle),
          cy: centerY + radius * Math.sin(angle),
          r: computeNodeRadius(rec.hub_count, ringIndex),
          ringIndex,
        });
      });
    });

    // Zoom container
    const container = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => container.attr("transform", event.transform));
    svg.call(zoom);

    // Defs for clip paths
    const defs = svg.append("defs");
    positionedNodes.forEach((n) => {
      defs
        .append("clipPath")
        .attr("id", `clip-ring-${CSS.escape(n.username)}`)
        .append("circle")
        .attr("r", n.r)
        .attr("cx", 0)
        .attr("cy", 0);
    });

    // Draw ring guides (dashed circles + labels)
    const ringsGroup = container.append("g").attr("class", "ring-guides");
    RINGS.forEach((ring) => {
      // Dashed circle
      ringsGroup
        .append("circle")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", ring.radius)
        .attr("fill", "none")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-dasharray", "4 4")
        .attr("stroke-width", 1);

      // Label at top
      ringsGroup
        .append("text")
        .attr("x", centerX)
        .attr("y", centerY - ring.radius - 15)
        .attr("text-anchor", "middle")
        .attr("fill", "#9ca3af")
        .attr("font-size", "11px")
        .text(ring.label);
    });

    // Draw nodes
    const nodeGroups = container
      .append("g")
      .selectAll<SVGGElement, PositionedRec>("g")
      .data(positionedNodes)
      .join("g")
      .attr("transform", (d) => `translate(${d.cx},${d.cy})`)
      .attr("cursor", "pointer");

    // Render each node
    nodeGroups.each(function (d) {
      const g = d3.select(this);

      // Background circle
      g.append("circle")
        .attr("r", d.r)
        .attr("fill", nodeColor(d.hub_count))
        .attr("stroke", "white")
        .attr("stroke-width", 1);

      // Profile pic
      if (showProfilePic(d.hub_count, d.ringIndex)) {
        g.append("image")
          .attr("href", `https://unavatar.io/twitter/${d.username}`)
          .attr("x", -d.r)
          .attr("y", -d.r)
          .attr("width", d.r * 2)
          .attr("height", d.r * 2)
          .attr("clip-path", `url(#clip-ring-${CSS.escape(d.username)})`)
          .attr("preserveAspectRatio", "xMidYMid slice")
          .on("error", function () {
            d3.select(this).remove();
          });
      }
    });

    // Tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "fixed")
      .style("pointer-events", "none")
      .style("background", "white")
      .style("border", "1px solid #e5e7eb")
      .style("border-radius", "8px")
      .style("padding", "8px 12px")
      .style("font-size", "12px")
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.1)")
      .style("z-index", "1000")
      .style("opacity", "0")
      .style("transition", "opacity 0.15s");

    nodeGroups
      .on("mouseenter", (event, d) => {
        const followers = formatFollowers(d.followers_count);
        tooltip
          .style("opacity", "1")
          .style("left", `${event.clientX + 12}px`)
          .style("top", `${event.clientY - 10}px`)
          .html(
            `<div style="display:flex;align-items:center;gap:8px">
              <img src="https://unavatar.io/twitter/${d.username}" width="32" height="32"
                   style="border-radius:50%;flex-shrink:0"
                   onerror="this.style.display='none'" />
              <div>
                <div style="font-weight:600">${d.name || d.username}</div>
                <div style="color:#6b7280">@${d.username} &middot; ${followers} followers</div>
                <div style="color:#059669;font-weight:500">${d.hub_count} hubs follow</div>
                ${d.description ? `<div style="color:#9ca3af;margin-top:2px;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.description}</div>` : ""}
              </div>
            </div>`
          );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.clientX + 12}px`)
          .style("top", `${event.clientY - 10}px`);
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", "0");
      })
      .on("click", (_event: MouseEvent, d: PositionedRec) => handleClick(d));

    // Auto-fit after short delay
    setTimeout(() => {
      svg
        .transition()
        .duration(500)
        .call(
          zoom.transform,
          d3.zoomIdentity
            .translate(width * 0.1, height * 0.1)
            .scale(0.8)
        );
    }, 500);

    return () => {
      tooltip.remove();
    };
  }, [data, filterMainstream, handleClick, dimensions]);

  // Selection highlight
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll<SVGGElement, PositionedRec>("g > g > g")
      .each(function (d) {
        if (!d || !d.username) return;
        const isSelected = d.username === selectedId;
        d3.select(this)
          .select("circle")
          .attr("stroke", isSelected ? "#f59e0b" : "white")
          .attr("stroke-width", isSelected ? 3 : 1);
      });
  }, [selectedId]);

  return (
    <div ref={containerRef} className="w-full h-full rounded-lg bg-gray-50/50 overflow-hidden">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
    </div>
  );
}
