import type { SystemsMap } from "./types";
export interface ViewState {
  mode: "model" | "loops" | "pathways" | "contradictions";
  id?: string;
  clusters: string[];
  focus?: string;
}
export function visibleGraph(map: SystemsMap, state: ViewState) {
  if (state.focus) {
    const edges = map.edges.filter(
      (e) => e.source === state.focus || e.target === state.focus,
    );
    const ids = new Set([
      state.focus,
      ...edges.flatMap((e) => [e.source, e.target]),
    ]);
    return { nodes: map.nodes.filter((n) => ids.has(n.id)), edges };
  }
  if (state.mode !== "model") {
    const structure = map[state.mode].find((s) => s.id === state.id);
    if (!structure) return { nodes: [], edges: [] };
    const nodeIds = new Set(structure.nodeIds),
      index = new Map(map.edges.map((e) => [e.id, e]));
    return {
      nodes: map.nodes.filter((n) => nodeIds.has(n.id)),
      edges: structure.edgeIds.map((id) => index.get(id)!).filter(Boolean),
    };
  }
  const nodes = state.clusters.length
    ? map.nodes.filter((n) => n.cluster && state.clusters.includes(n.cluster))
    : map.nodes;
  const ids = new Set(nodes.map((n) => n.id));
  return {
    nodes,
    edges: map.edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
  };
}
