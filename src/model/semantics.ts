import { normaliseContradictions } from "./contradictions";
import type { SystemsMap, Structure, MapEdge } from "./types";
function describe(edges: MapEdge[], id: string): Structure {
  const negativeCount = edges.filter((e) => e.polarity === "-").length;
  return {
    id,
    title: `Loop ${id}`,
    edgeIds: edges.map((e) => e.id),
    nodeIds: edges.map((e) => e.source),
    negativeCount,
    type: edges.some((e) => !e.polarity)
      ? "unknown"
      : negativeCount % 2
        ? "balancing"
        : "reinforcing",
    uncertain: edges.some((e) => e.uncertain),
  };
}
export function discoverCycles(
  map: SystemsMap,
  abort?: () => boolean,
): Structure[] {
  const deadline = performance.now() + 2000;
  const stop = abort ?? (() => performance.now() > deadline);
  const ordered = map.nodes.map((n) => n.id).sort();
  const rank = new Map(ordered.map((id, i) => [id, i]));
  const outgoing = new Map(
    ordered.map((id) => [id, map.edges.filter((e) => e.source === id)]),
  );
  const found: MapEdge[][] = [];
  for (const start of ordered) {
    const visited = new Set([start]);
    const path: MapEdge[] = [];
    function walk(current: string) {
      if (stop())
        throw new Error(
          "Cycle discovery incomplete: computation limit reached.",
        );
      for (const edge of outgoing.get(current) ?? []) {
        if (edge.target === start) found.push([...path, edge]);
        else if (
          rank.get(edge.target)! > rank.get(start)! &&
          !visited.has(edge.target)
        ) {
          visited.add(edge.target);
          path.push(edge);
          walk(edge.target);
          path.pop();
          visited.delete(edge.target);
        }
      }
    }
    walk(start);
  }
  found.sort(
    (a, b) =>
      a.length - b.length ||
      a
        .map((e) => e.id)
        .join("|")
        .localeCompare(b.map((e) => e.id).join("|")),
  );
  return found.map((edges, i) =>
    describe(edges, `L${String(i + 1).padStart(2, "0")}`),
  );
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export function enrichMap(map: SystemsMap): SystemsMap {
  const warn = (message: string) =>
    map.diagnostics.push({ level: "warning", message });
  for (const edge of map.edges) {
    const a = edge.attributes;
    if (a.sm_polarity === "+" || a.sm_polarity === "-")
      edge.polarity = a.sm_polarity;
    else if (a.sm_polarity !== undefined)
      warn(`Edge ${edge.id} has invalid polarity “${a.sm_polarity}”.`);
    if (a.sm_uncertain === "true") edge.uncertain = true;
    else if (a.sm_uncertain !== undefined && a.sm_uncertain !== "false")
      warn(`Edge ${edge.id} has invalid uncertainty “${a.sm_uncertain}”.`);
    if (a.sm_delay === "unspecified") edge.delay = "unspecified";
    else if (a.sm_delay !== undefined && a.sm_delay !== "none")
      warn(`Edge ${edge.id} has invalid delay “${a.sm_delay}”.`);
  }
  try {
    map.loops = discoverCycles(map);
  } catch (e) {
    warn((e as Error).message);
    map.loops = [];
  }
  const meta = map.metadata;
  if (meta === undefined) return map;
  if (!record(meta) || meta.version !== 1) {
    warn(
      "Systems metadata must be an object with version 1. Pathways and aliases are disabled.",
    );
    return map;
  }
  const edgeIndex = new Map(map.edges.map((e) => [e.id, e]));
  const used = new Set<string>();
  for (const key of ["pathways", "loopAliases"] as const) {
    const entries = meta[key];
    if (entries === undefined) continue;
    if (!Array.isArray(entries)) {
      warn(`${key} must be an array.`);
      continue;
    }
    for (const entry of entries) {
      const name =
        record(entry) && typeof entry.id === "string" ? entry.id : key;
      if (
        !record(entry) ||
        typeof entry.id !== "string" ||
        !entry.id ||
        typeof entry.title !== "string" ||
        !Array.isArray(entry.edges) ||
        entry.edges.length === 0 ||
        entry.edges.some((id: unknown) => typeof id !== "string")
      ) {
        warn(
          `${name}: invalid structure; an id, title and nonempty edge list are required.`,
        );
        continue;
      }
      if (used.has(entry.id)) {
        warn(`${name}: duplicate structure ID.`);
        continue;
      }
      used.add(entry.id);
      const ids = entry.edges as string[];
      const missing = ids.filter((id) => !edgeIndex.has(id));
      if (missing.length) {
        warn(
          `${name}: unknown edge ${missing.join(", ")}. Structure disabled.`,
        );
        continue;
      }
      const edges = ids.map((id) => edgeIndex.get(id)!);
      if (edges.some((e, i) => i > 0 && edges[i - 1].target !== e.source)) {
        warn(
          `${name}: edges do not form a traversable sequence. Structure disabled.`,
        );
        continue;
      }
      if (key === "pathways") {
        map.pathways.push({
          id: entry.id,
          title: entry.title,
          question:
            typeof entry.question === "string" ? entry.question : undefined,
          edgeIds: ids,
          nodeIds: [edges[0].source, ...edges.map((e) => e.target)],
          uncertain: edges.some((e) => e.uncertain),
        });
      } else {
        const loop = map.loops.find(
          (l) =>
            l.edgeIds.length === ids.length &&
            l.edgeIds.every((id) => ids.includes(id)),
        );
        if (!loop || edges.at(-1)!.target !== edges[0].source) {
          warn(`${name}: alias does not match a discovered elementary cycle.`);
          continue;
        }
        if (map.loops.some((l) => l !== loop && l.id === entry.id)) {
          warn(`${name}: alias conflicts with a loop ID.`);
          continue;
        }
        Object.assign(loop, {
          id: entry.id,
          title: entry.title,
          edgeIds: ids,
          nodeIds: edges.map((e) => e.source),
        });
        if (entry.type !== undefined && entry.type !== loop.type)
          warn(
            `${name}: declared type ${String(entry.type)} disagrees with computed type ${loop.type}.`,
          );
      }
    }
  }
  map.contradictions = normaliseContradictions(meta.contradictions, map);
  return map;
}
