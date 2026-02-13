"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";
import type { GraphData, Recommendation } from "@/lib/graph-types";

// Internal node type for the similarity simulation
interface SimNode extends d3.SimulationNodeDatum {
  username: string;
  name: string;
  description: string;
  followers_count: number;
  following_count: number;
  hub_count: number;
  hub_pct: number;
  followed_by: string[];
}

interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
  weight: number;
}

function recNodeRadius(hubCount: number): number {
  return Math.max(8, Math.min(20, 4 + hubCount * 0.35));
}

function recNodeColor(hubCount: number): string {
  const intensity = Math.min(1, hubCount / 50);
  return d3.interpolateRgb("#86efac", "#047857")(intensity);
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return `${count}`;
}

interface GraphViewProps {
  data: GraphData;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
  filterMainstream: boolean;
}

export function RecSimilarityGraph({ data, selectedId, onSelectNode, filterMainstream }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimEdge> | null>(null);
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
    (_: MouseEvent, d: SimNode) => {
      onSelectNode(d.username === selectedId ? null : d.username);
    },
    [selectedId, onSelectNode]
  );

  // Render graph when dimensions are available
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

    // Build sim nodes from recommendations (using username as ID)
    const nodes: SimNode[] = recs.map((r) => ({
      username: r.username,
      name: r.name,
      description: r.description,
      followers_count: r.followers_count,
      following_count: r.following_count,
      hub_count: r.hub_count,
      hub_pct: r.hub_pct,
      followed_by: r.followed_by,
    }));

    // Build a lookup of username -> followed_by Set for fast intersection
    const followedByMap = new Map<string, Set<string>>();
    for (const node of nodes) {
      followedByMap.set(node.username, new Set(node.followed_by));
    }

    // Compute similarity edges: connect recs sharing >= 5 hub followers
    const edges: SimEdge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const setA = followedByMap.get(nodes[i].username)!;
      for (let j = i + 1; j < nodes.length; j++) {
        const setB = followedByMap.get(nodes[j].username)!;
        // Count intersection
        let shared = 0;
        const smaller = setA.size <= setB.size ? setA : setB;
        const larger = setA.size <= setB.size ? setB : setA;
        const smallerArr = Array.from(smaller);
        for (let k = 0; k < smallerArr.length; k++) {
          if (larger.has(smallerArr[k])) shared++;
        }
        if (shared >= 5) {
          edges.push({
            source: nodes[i].username,
            target: nodes[j].username,
            weight: shared,
          });
        }
      }
    }

    // Zoom container
    const container = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => container.attr("transform", event.transform));
    svg.call(zoom);

    // Edges
    const maxWeight = d3.max(edges, (e) => e.weight) || 1;
    const link = container
      .append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", (d) => 0.1 + 0.4 * (d.weight / maxWeight))
      .attr("stroke-width", (d) => 0.5 + 1.5 * (d.weight / maxWeight));

    // Clip paths for profile images
    const defs = svg.append("defs");
    nodes.forEach((n) => {
      defs
        .append("clipPath")
        .attr("id", `clip-rec-${CSS.escape(n.username)}`)
        .append("circle")
        .attr("r", recNodeRadius(n.hub_count))
        .attr("cx", 0)
        .attr("cy", 0);
    });

    // Node groups
    const node = container
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
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
          })
      );

    // Draw each node
    node.each(function (d) {
      const g = d3.select(this);
      const r = recNodeRadius(d.hub_count);

      // Circle fill
      g.append("circle")
        .attr("r", r)
        .attr("fill", recNodeColor(d.hub_count))
        .attr("stroke", "white")
        .attr("stroke-width", 1);

      // Profile pic for high hub_count nodes
      if (d.hub_count >= 30) {
        g.append("image")
          .attr("href", `https://unavatar.io/twitter/${d.username}`)
          .attr("x", -r)
          .attr("y", -r)
          .attr("width", r * 2)
          .attr("height", r * 2)
          .attr("clip-path", `url(#clip-rec-${CSS.escape(d.username)})`)
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

    node
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

        // Highlight connected edges
        link.attr("stroke-opacity", (l) => {
          const ls = typeof l.source === "string" ? l.source : (l.source as SimNode).username;
          const lt = typeof l.target === "string" ? l.target : (l.target as SimNode).username;
          return ls === d.username || lt === d.username ? 0.8 : 0.05;
        });
      })
      .on("mousemove", (event) => {
        tooltip.style("left", `${event.clientX + 12}px`).style("top", `${event.clientY - 10}px`);
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", "0");
        // Restore edge opacities
        link.attr("stroke-opacity", (d) => 0.1 + 0.4 * (d.weight / maxWeight));
      })
      .on("click", (event: MouseEvent, d: SimNode) => handleClick(event, d));

    // Force simulation
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimEdge>(edges)
          .id((d) => d.username)
          .distance((d) => Math.max(40, 200 - (d as SimEdge).weight * 5))
          .strength((d) => Math.min(0.8, 0.05 + (d as SimEdge).weight * 0.02))
      )
      .force("charge", d3.forceManyBody().strength(-60).distanceMax(500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<SimNode>().radius((d) => recNodeRadius(d.hub_count) + 3)
      );

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => ((d as any).source as SimNode).x!)
        .attr("y1", (d) => ((d as any).source as SimNode).y!)
        .attr("x2", (d) => ((d as any).target as SimNode).x!)
        .attr("y2", (d) => ((d as any).target as SimNode).y!);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    simulationRef.current = simulation;

    // Auto-fit after settling
    setTimeout(() => {
      svg.transition().duration(500).call(
        zoom.transform,
        d3.zoomIdentity.translate(width * 0.05, height * 0.05).scale(0.9)
      );
    }, 1000);

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, filterMainstream, handleClick, dimensions]);

  // Highlight selected node
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll<SVGGElement, SimNode>("g > g > g")
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
