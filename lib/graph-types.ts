export type NodeType = "center" | "hub" | "recommendation";
export type EdgeType = "ethan_follows" | "hub_follows";

export interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  followers_count: number;
  hub_count: number;
  description?: string;
  // D3 simulation fields
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type: EdgeType;
}

export interface Recommendation {
  id: string;
  username: string;
  name: string;
  description: string;
  followers_count: number;
  following_count: number;
  hub_count: number;
  hub_pct: number;
  followed_by: string[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  recommendations: Recommendation[];
  stats: {
    ethan_following: number;
    hubs_fetched: number;
    total_edges: number;
    total_recommendations: number;
    min_hub_threshold: number;
  };
}
