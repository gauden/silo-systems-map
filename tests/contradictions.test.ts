import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseMap } from "../src/model/parse";
const source = () => parseMap(readFileSync("inputs/MAP.dot", "utf8"));
it("connects governance and knowledge transmission without removing original relationships", () => {
  const m = source(),
    original = parseMap(readFileSync("tests/fixtures/mvp.dot", "utf8"));
  for (const n of original.nodes) expect(m.nodes).toContainEqual(n);
  for (const e of original.edges) expect(m.edges).toContainEqual(e);
  for (const id of ["Surveillance", "Informal knowledge transmission"]) {
    expect(
      m.edges.filter((e) => e.source === id || e.target === id).length,
    ).toBeGreaterThanOrEqual(4);
    expect(m.edges.some((e) => e.source === id)).toBe(true);
    expect(m.edges.some((e) => e.target === id)).toBe(true);
  }
  expect(
    m.nodes.every((n) =>
      m.edges.some((e) => e.source === n.id || e.target === n.id),
    ),
  ).toBe(true);
  const added = m.edges.filter(
    (e) => !original.edges.some((o) => o.id === e.id),
  );
  expect(
    added.every(
      (e) =>
        e.attributes.sm_evidence === "inferred" &&
        !!e.attributes.sm_description,
    ),
  ).toBe(true);
});
it("encodes eight contradictions in DOT as traversable branches with caveats", () => {
  const m = source();
  const entries = (
    m.metadata as {
      contradictions: {
        id: string;
        title: string;
        caveat: string;
        branches: { title: string; explanation: string; edges: string[] }[];
      };
    }
  ).contradictions;
  expect(entries).toHaveLength(8);
  const byId = new Map(m.edges.map((e) => [e.id, e]));
  for (const c of entries) {
    expect(c.caveat.length).toBeGreaterThan(30);
    expect(c.branches.length).toBeGreaterThanOrEqual(2);
    for (const branch of c.branches) {
      expect(branch.explanation.length).toBeGreaterThan(30);
      const edges = branch.edges.map((id) => byId.get(id));
      expect(edges.every(Boolean)).toBe(true);
      edges.forEach((e, i) => {
        if (i > 0) expect(edges[i - 1]!.target).toBe(e!.source);
      });
    }
  }
  expect(entries.map((c) => c.id)).toContain("paper-publication");
});
import { enrichMap } from "../src/model/semantics";
import { visibleGraph } from "../src/model/view";
it("normalises contradictions and displays the union of their exact branch edges", () => {
  const m = enrichMap(source());
  expect(m.contradictions).toHaveLength(8);
  expect(m.diagnostics).toEqual([]);
  for (const c of m.contradictions) {
    const v = visibleGraph(m, {
      mode: "contradictions",
      id: c.id,
      clusters: [],
    });
    expect(new Set(v.edges.map((e) => e.id))).toEqual(
      new Set(c.branches.flatMap((b) => b.edgeIds)),
    );
    expect(new Set(v.nodes.map((n) => n.id))).toEqual(
      new Set(v.edges.flatMap((e) => [e.source, e.target])),
    );
  }
});
it("disables malformed contradictions independently and validates branch continuity", () => {
  const metadata = {
    version: 1,
    contradictions: [
      {
        id: "bad",
        title: "Broken",
        question: "Why?",
        description: "Tension",
        caveat: "Interpretation",
        branches: [
          { title: "A", explanation: "Needs this", edges: ["x", "z"] },
          { title: "B", explanation: "Prevents this", edges: ["x"] },
        ],
      },
    ],
  };
  const m = enrichMap(
    parseMap(
      "/* @systems-map " +
        JSON.stringify(metadata) +
        " */ digraph {A->B[id=x];C->D[id=z];}",
    ),
  );
  expect(m.contradictions).toEqual([]);
  expect(m.nodes).toHaveLength(4);
  expect(m.diagnostics.some((d) => d.message.includes("traversable"))).toBe(
    true,
  );
});

it("discovers every expanded cycle with valid closed paths and no isolated nodes", () => {
  const m = enrichMap(source());
  expect(m.nodes).toHaveLength(47);
  expect(m.edges).toHaveLength(81);
  expect(m.loops).toHaveLength(356);
  expect(m.loops.filter((l) => l.type === "reinforcing")).toHaveLength(172);
  const edges = new Map(m.edges.map((e) => [e.id, e]));
  for (const loop of m.loops) {
    const sequence = loop.edgeIds.map((id) => edges.get(id)!);
    expect(new Set(sequence.map((e) => e.source)).size).toBe(sequence.length);
    sequence.forEach((e, i) =>
      expect(e.target).toBe(sequence[(i + 1) % sequence.length].source),
    );
  }
});
