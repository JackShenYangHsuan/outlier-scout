"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import * as d3 from "d3";
import type { GraphNode, GraphData } from "@/lib/graph-types";

interface GraphViewProps {
  data: GraphData;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
  filterMainstream: boolean;
}

interface HubEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return `${count}`;
}

export function HubClustersGraph({
  data,
  selectedId,
  onSelectNode,
  filterMainstream,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, HubEdge> | null>(null);
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

  // Compute recCount per hub (how many recommendations follow each hub)
  const recCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const rec of data.recommendations) {
      for (const hubId of rec.followed_by) {
        counts.set(hubId, (counts.get(hubId) || 0) + 1);
      }
    }
    return counts;
  }, [data.recommendations]);

  // Compute co-follow edges between hubs
  const hubEdges = useMemo(() => {
    const hubPairWeights = new Map<string, number>();
    for (const rec of data.recommendations) {
      const hubs = rec.followed_by;
      for (let i = 0; i < hubs.length; i++) {
        for (let j = i + 1; j < hubs.length; j++) {
          const key = [hubs[i], hubs[j]].sort().join("|");
          hubPairWeights.set(key, (hubPairWeights.get(key) || 0) + 1);
        }
      }
    }

    const edges: HubEdge[] = [];
    for (const [key, weight] of hubPairWeights) {
      if (weight >= 10) {
        const [source, target] = key.split("|");
        edges.push({ source, target, weight });
      }
    }
    return edges;
  }, [data.recommendations]);

  function hubRadius(nodeId: string): number {
    const rc = recCountMap.get(nodeId) || 0;
    // Scale 10-14 based on recCount
    return 10 + Math.min(4, rc * 0.05);
  }

  const handleClick = useCallback(
    (_: MouseEvent, d: GraphNode) => {
      onSelectNode(d.id === selectedId ? null : d.id);
    },
    [selectedId, onSelectNode],
  );

  // Render graph when dimensions are available
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;
    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.selectAll("*").remove();

    // Get hub nodes only
    let hubNodes = data.nodes.filter((n) => n.type === "hub");

    // filterMainstream: exclude hubs with followers >= 1M
    if (filterMainstream) {
      hubNodes = hubNodes.filter((n) => n.followers_count < 1_000_000);
    }

    const hubIdSet = new Set(hubNodes.map((n) => n.id));
    const nodes: GraphNode[] = hubNodes.map((n) => ({ ...n }));

    // Filter edges to only include hubs that are present
    const edges: HubEdge[] = hubEdges
      .filter((e) => {
        const s = typeof e.source === "string" ? e.source : e.source.id;
        const t = typeof e.target === "string" ? e.target : e.target.id;
        return hubIdSet.has(s) && hubIdSet.has(t);
      })
      .map((e) => ({ ...e }));

    // Max weight for edge distance scaling
    const maxWeight = Math.max(1, ...edges.map((e) => e.weight));

    // Zoom container
    const container = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => container.attr("transform", event.transform));
    svg.call(zoom);

    // Edges
    const link = container
      .append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", (d) => 0.1 + 0.4 * (d.weight / maxWeight))
      .attr("stroke-width", (d) => 0.5 + 1.5 * (d.weight / maxWeight));

    // Clip paths for circular images
    const defs = svg.append("defs");
    nodes.forEach((n) => {
      const r = hubRadius(n.id);
      defs
        .append("clipPath")
        .attr("id", `hub-clip-${CSS.escape(n.id)}`)
        .append("circle")
        .attr("r", r)
        .attr("cx", 0)
        .attr("cy", 0);
    });

    // Node groups
    const node = container
      .append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Draw each hub node
    node.each(function (d) {
      const g = d3.select(this);
      const r = hubRadius(d.id);

      // Blue circle with white stroke
      g.append("circle")
        .attr("r", r)
        .attr("fill", "#3b82f6")
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);

      // Profile pic
      g.append("image")
        .attr("href", `https://unavatar.io/twitter/${d.id}`)
        .attr("x", -r)
        .attr("y", -r)
        .attr("width", r * 2)
        .attr("height", r * 2)
        .attr("clip-path", `url(#hub-clip-${CSS.escape(d.id)})`)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .on("error", function () {
          d3.select(this).remove();
        });
    });

    // Labels below each node
    node
      .append("text")
      .attr("dy", (d) => hubRadius(d.id) + 12)
      .attr("text-anchor", "middle")
      .attr("fill", "#374151")
      .attr("font-size", "8px")
      .attr("pointer-events", "none")
      .text((d) => d.name || d.id);

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

    node
      .on("mouseenter", (event, d) => {
        const followers = formatFollowers(d.followers_count);
        const rc = recCountMap.get(d.id) || 0;
        const bio = d.description
          ? `<div style="color:#9ca3af;margin-top:2px;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.description}</div>`
          : "";

        tooltip
          .style("opacity", "1")
          .style("left", `${event.clientX + 12}px`)
          .style("top", `${event.clientY - 10}px`)
          .html(
            `<div style="display:flex;align-items:center;gap:8px">
              <img src="https://unavatar.io/twitter/${d.id}" width="32" height="32"
                   style="border-radius:50%;flex-shrink:0"
                   onerror="this.style.display='none'" />
              <div>
                <div style="font-weight:600">${d.name || d.id}</div>
                <div style="color:#6b7280">@${d.id} &middot; ${followers} followers</div>
                <div style="color:#3b82f6;font-weight:500">Follows ${rc} recs</div>
                ${bio}
              </div>
            </div>`,
          );

        // Highlight connected edges, dim others
        link.attr("stroke-opacity", (l) => {
          const ls =
            typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
          const lt =
            typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
          return ls === d.id || lt === d.id ? 0.8 : 0.05;
        });
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.clientX + 12}px`)
          .style("top", `${event.clientY - 10}px`);
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", "0");
        // Restore edge opacity
        link.attr("stroke-opacity", (d) => 0.1 + 0.4 * (d.weight / maxWeight));
      })
      .on("click", (event: MouseEvent, d: GraphNode) => handleClick(event, d));

    // Force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, HubEdge>(edges)
          .id((d) => d.id)
          .distance((d) => {
            // Distance inversely proportional to weight
            return 200 - 150 * (d.weight / maxWeight);
          })
          .strength((d) => 0.1 + 0.4 * (d.weight / maxWeight)),
      )
      .force("charge", d3.forceManyBody().strength(-50).distanceMax(500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3
          .forceCollide<GraphNode>()
          .radius((d) => hubRadius(d.id) + 3),
      );

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => ((d as any).source as GraphNode).x!)
        .attr("y1", (d) => ((d as any).source as GraphNode).y!)
        .attr("x2", (d) => ((d as any).target as GraphNode).x!)
        .attr("y2", (d) => ((d as any).target as GraphNode).y!);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    simulationRef.current = simulation;

    // Auto-fit after settling
    setTimeout(() => {
      svg
        .transition()
        .duration(500)
        .call(
          zoom.transform,
          d3.zoomIdentity
            .translate(width * 0.05, height * 0.05)
            .scale(0.9),
        );
    }, 1000);

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, filterMainstream, handleClick, dimensions, hubEdges, recCountMap]);

  // Highlight selected node
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll<SVGGElement, GraphNode>("g > g > g")
      .each(function (d) {
        if (!d || !d.id) return;
        const isSelected = d.id === selectedId;
        d3.select(this)
          .select("circle")
          .attr("stroke", isSelected ? "#f59e0b" : "white")
          .attr("stroke-width", isSelected ? 3 : 1.5);
      });
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg bg-gray-50/50 overflow-hidden"
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
    </div>
  );
}
