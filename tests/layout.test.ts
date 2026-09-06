import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseMap } from "../src/model/parse";
import { enrichMap } from "../src/model/semantics";
import { arrange, scoreLayout } from "../src/graph/layout";
const map = enrichMap(parseMap(readFileSync("tests/fixtures/mvp.dot", "utf8")));
it("scores crossings and overlaps worse than an uncrossed arrangement", () => {
  const nodes = [
    { id: "a", x: 0, y: 0 },
    { id: "b", x: 300, y: 300 },
    { id: "c", x: 0, y: 300 },
    { id: "d", x: 300, y: 0 },
  ].map((n) => ({ ...n, width: 80, height: 40, lines: [n.id] }));
  expect(
    scoreLayout(nodes, [
      { source: "a", target: "b" },
      { source: "c", target: "d" },
    ]),
  ).toBeGreaterThan(
    scoreLayout(nodes, [
      { source: "a", target: "c" },
      { source: "b", target: "d" },
    ]),
  );
});
it("fresh candidate layouts preserve data and uncross all twelve simple loops", () => {
  for (const loop of map.loops) {
    const nodes = loop.nodeIds.map((id) => ({
      id,
      x: 0,
      y: 0,
      width: 155,
      height: 65,
      lines: [id],
    }));
    const edges = loop.edgeIds.map((id) => map.edges.find((e) => e.id === id)!);
    const original = JSON.stringify(nodes);
    const positions = arrange(nodes, edges, "loops");
    expect(positions).toHaveLength(nodes.length);
    expect(JSON.stringify(nodes)).toBe(original);
    expect(
      positions.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)),
    ).toBe(true);
    // A score below the crossing/overlap penalty establishes these fixtures have neither.
    expect(scoreLayout(positions, edges)).toBeLessThan(1000);
  }
});
it("can arrange a pathway for a portrait viewport instead of a long horizontal chain", () => {
  const pathway = map.pathways.find((p) => p.id === "maintenance")!;
  const nodes = pathway.nodeIds.map((id) => ({
    id,
    x: 0,
    y: 0,
    width: 145,
    height: 64,
    lines: [id],
  }));
  const edges = pathway.edgeIds.map((id) =>
    map.edges.find((e) => e.id === id)!,
  );
  const result = arrange(nodes, edges, "pathways", 0.8);
  const width =
    Math.max(...result.map((n) => n.x + n.width / 2)) -
    Math.min(...result.map((n) => n.x - n.width / 2));
  const height =
    Math.max(...result.map((n) => n.y + n.height / 2)) -
    Math.min(...result.map((n) => n.y - n.height / 2));
  expect(width / height).toBeLessThan(1.4);
});

it("fresh seeds change the contradiction arrangement without crossing its branches", () => {
  const expanded = enrichMap(parseMap(readFileSync("inputs/MAP.dot", "utf8")));
  const c = expanded.contradictions.find((c) => c.id === "adaptation-control")!;
  const nodes = c.nodeIds.map((id) => ({
    id,
    x: 0,
    y: 0,
    width: 180,
    height: 75,
    lines: [id],
  }));
  const edges = c.edgeIds.map((id) => expanded.edges.find((e) => e.id === id)!);
  const first = arrange(nodes, edges, "contradictions", 1.5, 42);
  const second = arrange(nodes, edges, "contradictions", 1.5, 1337);
  expect(second).not.toEqual(first);
  for (const result of [first, second]) {
    expect(result.map((n) => n.id)).toEqual(nodes.map((n) => n.id));
    expect(scoreLayout(result, edges)).toBeLessThan(1000);
  }
});
