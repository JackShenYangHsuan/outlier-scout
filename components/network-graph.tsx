"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";
import type { GraphNode, GraphEdge, GraphData } from "@/lib/graph-types";

function nodeRadius(node: GraphNode): number {
  if (node.type === "center") return 24;
  if (node.type === "hub") return 8;
  return Math.min(14, 5 + node.hub_count * 0.2);
}

interface Props {
  data: GraphData;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
  filterMainstream: boolean;
}

export function NetworkGraph({ data, selectedId, onSelectNode, filterMainstream }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
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
    (_: MouseEvent, d: GraphNode) => {
      onSelectNode(d.id === selectedId ? null : d.id);
    },
    [selectedId, onSelectNode]
  );

  // Render graph when dimensions are available
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;
    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.selectAll("*").remove();

    // Filter mainstream accounts
    let filteredNodeIds = new Set(data.nodes.map((n) => n.id));
    if (filterMainstream) {
      filteredNodeIds = new Set(
        data.nodes
          .filter((n) => n.type !== "recommendation" || n.followers_count < 1_000_000)
          .map((n) => n.id)
      );
    }

    const nodes: GraphNode[] = data.nodes
      .filter((n) => filteredNodeIds.has(n.id))
      .map((n) => ({ ...n }));

    const edges: GraphEdge[] = data.edges
      .filter((e) => {
        const s = typeof e.source === "string" ? e.source : e.source.id;
        const t = typeof e.target === "string" ? e.target : e.target.id;
        return filteredNodeIds.has(s) && filteredNodeIds.has(t);
      })
      .map((e) => ({ ...e }));

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
      .attr("stroke", (d) => ((d as GraphEdge).type === "ethan_follows" ? "#f59e0b" : "#d1d5db"))
      .attr("stroke-opacity", (d) => ((d as GraphEdge).type === "ethan_follows" ? 0.6 : 0.15))
      .attr("stroke-width", (d) => ((d as GraphEdge).type === "ethan_follows" ? 1.5 : 0.5));

    // Clip paths for circular images
    const defs = svg.append("defs");
    nodes.forEach((n) => {
      defs
        .append("clipPath")
        .attr("id", `clip-${CSS.escape(n.id)}`)
        .append("circle")
        .attr("r", nodeRadius(n))
        .attr("cx", 0)
        .attr("cy", 0);
    });

    // Nodes
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
          })
      );

    // Draw each node
    node.each(function (d) {
      const g = d3.select(this);
      const r = nodeRadius(d);

      if (d.type === "center" || d.type === "hub") {
        g.append("circle")
          .attr("r", r)
          .attr("fill", d.type === "center" ? "#f59e0b" : "#3b82f6")
          .attr("stroke", "white")
          .attr("stroke-width", d.type === "center" ? 3 : 1.5);

        g.append("image")
          .attr("href", `https://unavatar.io/twitter/${d.id}`)
          .attr("x", -r)
          .attr("y", -r)
          .attr("width", r * 2)
          .attr("height", r * 2)
          .attr("clip-path", `url(#clip-${CSS.escape(d.id)})`)
          .attr("preserveAspectRatio", "xMidYMid slice")
          .on("error", function () {
            d3.select(this).remove();
          });
      } else {
        const intensity = Math.min(1, d.hub_count / 50);
        g.append("circle")
          .attr("r", r)
          .attr("fill", d3.interpolateRgb("#86efac", "#047857")(intensity))
          .attr("stroke", "white")
          .attr("stroke-width", 1);
      }
    });

    // Labels for center + hub nodes
    node
      .filter((d) => d.type === "center" || d.type === "hub")
      .append("text")
      .attr("dy", (d) => nodeRadius(d) + 12)
      .attr("text-anchor", "middle")
      .attr("fill", "#374151")
      .attr("font-size", (d) => (d.type === "center" ? "12px" : "8px"))
      .attr("font-weight", (d) => (d.type === "center" ? "bold" : "normal"))
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
        const followers =
          d.followers_count >= 1_000_000
            ? `${(d.followers_count / 1_000_000).toFixed(1)}M`
            : d.followers_count >= 1000
              ? `${(d.followers_count / 1000).toFixed(0)}K`
              : `${d.followers_count}`;

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
                ${d.type === "recommendation" ? `<div style="color:#059669;font-weight:500">${d.hub_count} hubs follow</div>` : ""}
                ${d.description ? `<div style="color:#9ca3af;margin-top:2px;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.description}</div>` : ""}
              </div>
            </div>`
          );

        // Highlight connected edges
        link.attr("stroke-opacity", (l) => {
          const ls = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
          const lt = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
          return ls === d.id || lt === d.id ? 0.8 : 0.05;
        });
      })
      .on("mousemove", (event) => {
        tooltip.style("left", `${event.clientX + 12}px`).style("top", `${event.clientY - 10}px`);
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", "0");
        link.attr("stroke-opacity", (d) => ((d as GraphEdge).type === "ethan_follows" ? 0.6 : 0.15));
      })
      .on("click", (event: MouseEvent, d: GraphNode) => handleClick(event, d));

    // Simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphEdge>(edges)
          .id((d) => d.id)
          .distance((d) => ((d as GraphEdge).type === "ethan_follows" ? 120 : 60))
          .strength((d) => ((d as GraphEdge).type === "ethan_follows" ? 0.3 : 0.1))
      )
      .force("charge", d3.forceManyBody().strength(-80).distanceMax(400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<GraphNode>().radius((d) => nodeRadius(d) + 2))
      .force(
        "radial",
        d3
          .forceRadial<GraphNode>(
            (d) => (d.type === "center" ? 0 : d.type === "hub" ? 180 : 350),
            width / 2,
            height / 2
          )
          .strength(0.3)
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

    // Fit to view after settling
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
      .selectAll<SVGGElement, GraphNode>("g.nodes g, g > g > g")
      .each(function (d) {
        if (!d || !d.id) return;
        const isSelected = d.id === selectedId;
        d3.select(this)
          .select("circle")
          .attr("stroke", isSelected ? "#f59e0b" : "white")
          .attr("stroke-width", isSelected ? 3 : d.type === "center" ? 3 : 1.5);
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
