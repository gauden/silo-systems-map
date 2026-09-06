export interface MapNode {
  id: string;
  label: string;
  cluster?: string;
  attributes: Record<string, string>;
}
export interface MapEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  attributes: Record<string, string>;
  polarity?: "+" | "-";
  uncertain?: boolean;
  delay?: "unspecified";
}
export interface Cluster {
  id: string;
  label: string;
}
export interface Structure {
  id: string;
  title: string;
  edgeIds: string[];
  nodeIds: string[];
  question?: string;
  type?: "reinforcing" | "balancing" | "unknown";
  uncertain?: boolean;
  negativeCount?: number;
}
export interface ContradictionBranch {
  title: string;
  explanation: string;
  edgeIds: string[];
  nodeIds: string[];
}
export interface Contradiction extends Structure {
  description: string;
  caveat: string;
  branches: ContradictionBranch[];
  sources: string[];
}
export type StructureMode = "loops" | "pathways" | "contradictions";
export interface Diagnostic {
  message: string;
  level: "error" | "warning";
}
export interface SystemsMap {
  title: string;
  nodes: MapNode[];
  edges: MapEdge[];
  clusters: Cluster[];
  diagnostics: Diagnostic[];
  metadata?: unknown;
  loops: Structure[];
  pathways: Structure[];
  contradictions: Contradiction[];
}
