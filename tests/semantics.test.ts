import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseMap } from "../src/model/parse";
import { enrichMap, discoverCycles } from "../src/model/semantics";
const source = readFileSync("tests/fixtures/mvp.dot", "utf8");
it("enumerates all supplied elementary cycles and approved pathways with annotations", () => {
  const m = enrichMap(parseMap(source));
  expect(m.loops).toHaveLength(12);
  expect(m.pathways).toHaveLength(6);
  expect(m.loops.filter((l) => l.type === "reinforcing")).toHaveLength(6);
  expect(m.loops.filter((l) => l.type === "balancing")).toHaveLength(6);
  expect(m.loops.filter((l) => l.uncertain)).toHaveLength(4);
  expect(m.loops.find((l) => l.id === "R1")?.title).toBe("Control lock-in");
  expect(m.loops.find((l) => l.id === "R2")?.type).toBe("reinforcing");
  expect(m.diagnostics).toEqual([]);
  expect(m.edges.filter((e) => e.delay === "unspecified")).toHaveLength(1);
  for (const p of m.pathways)
    expect(p.edgeIds.length).toBe(p.nodeIds.length - 1);
});
it("deduplicates rotations, keeps shared cycles, and includes self loops", () => {
  const m = parseMap("digraph {A->B;B->C;C->A;A->C;A->A;}");
  const cycles = discoverCycles(m);
  expect(cycles).toHaveLength(3);
  expect(cycles.map((c) => c.edgeIds.length).sort()).toEqual([1, 2, 3]);
  expect(cycles.every((c) => c.type === "unknown")).toBe(true);
});
it("preserves parallel-edge cycle alternatives", () => {
  const m = parseMap("digraph {A->B [id=x];A->B [id=y];B->A [id=z];}");
  expect(discoverCycles(m)).toHaveLength(2);
});
it("handles malformed metadata, unknown signs, and broken pathways without losing DOT", () => {
  const m = enrichMap(
    parseMap(
      '/* @systems-map {broken} */ digraph {A->B [sm_polarity="maybe"];B->A;}',
    ),
  );
  expect(m.nodes).toHaveLength(2);
  expect(m.loops[0].type).toBe("unknown");
  expect(m.diagnostics.length).toBeGreaterThan(0);
  const invalid = enrichMap(
    parseMap(
      '/* @systems-map {"version":1,"pathways":[{"id":"p","title":"Broken","edges":["missing"]}]} */ digraph {A->B;}',
    ),
  );
  expect(invalid.pathways).toEqual([]);
  expect(invalid.diagnostics[0].message).toContain("missing");
});
it("only reads real metadata comments, not a marker inside a node label", () => {
  const m = enrichMap(
    parseMap('digraph {A [label="@systems-map {invalid}"];}'),
  );
  expect(m.diagnostics).toEqual([]);
});
it("reports incomplete cycle enumeration instead of silently truncating", () => {
  const m = parseMap("digraph {A->B;B->A;}");
  expect(() => discoverCycles(m, () => true)).toThrow(/incomplete/i);
});
it("preserves every original node, edge and label when annotating", () => {
  const original = parseMap(
    readFileSync("tests/fixtures/original.dot", "utf8"),
  );
  const current = parseMap(source);
  expect(current.nodes).toEqual(original.nodes);
  expect(
    current.edges.map(({ source, target, label }) => ({
      source,
      target,
      label,
    })),
  ).toEqual(
    original.edges.map(({ source, target, label }) => ({
      source,
      target,
      label,
    })),
  );
});
