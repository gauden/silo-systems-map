import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseMap } from "../src/model/parse";
import { enrichMap } from "../src/model/semantics";
import { visibleGraph } from "../src/model/view";
const map = enrichMap(parseMap(readFileSync("tests/fixtures/mvp.dot", "utf8")));
it("shows exact cycle membership, without induced chords", () => {
  const loop = map.loops.find((l) => l.id === "R1")!;
  const v = visibleGraph(map, { mode: "loops", id: loop.id, clusters: [] });
  expect(v.nodes).toHaveLength(3);
  expect(v.edges.map((e) => e.id)).toEqual(loop.edgeIds);
});
it("combines clusters by union and only includes edges between visible endpoints", () => {
  const v = visibleGraph(map, {
    mode: "model",
    clusters: ["cluster_control", "cluster_knowledge"],
  });
  expect(v.nodes).toHaveLength(16);
  const ids = new Set(v.nodes.map((n) => n.id));
  expect(v.edges.every((e) => ids.has(e.source) && ids.has(e.target))).toBe(
    true,
  );
  expect(v.nodes.some((n) => n.id === "Surveillance")).toBe(true);
});
it("supports all approved pathways and safe empty views", () => {
  for (const p of map.pathways) {
    const v = visibleGraph(map, { mode: "pathways", id: p.id, clusters: [] });
    expect(v.edges.map((e) => e.id)).toEqual(p.edgeIds);
    expect(v.nodes.map((n) => n.id).sort()).toEqual([...p.nodeIds].sort());
  }
  expect(
    visibleGraph(map, { mode: "loops", id: "missing", clusters: [] }).nodes,
  ).toEqual([]);
});
it("node focus includes only the selected node, first-degree peers and its incident edges", () => {
  const v = visibleGraph(map, {
    mode: "model",
    clusters: [],
    focus: "Innovation",
  });
  const incident = map.edges.filter(
    (e) => e.source === "Innovation" || e.target === "Innovation",
  );
  expect(new Set(v.nodes.map((n) => n.id))).toEqual(
    new Set(incident.flatMap((e) => [e.source, e.target])),
  );
  expect(v.edges).toEqual(incident);
  expect(
    visibleGraph(map, { mode: "model", clusters: [], focus: "Surveillance" })
      .nodes,
  ).toHaveLength(1);
});
