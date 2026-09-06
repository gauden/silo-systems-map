import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseMap } from "../src/model/parse";
const source = readFileSync("tests/fixtures/mvp.dot", "utf8");
describe("DOT input contract", () => {
  it("preserves the complete supplied map, including an isolated node", () => {
    const m = parseMap(source);
    expect(m.nodes).toHaveLength(36);
    expect(m.edges).toHaveLength(47);
    expect(m.clusters).toHaveLength(5);
    expect(m.nodes.find((n) => n.id === "Surveillance")).toBeDefined();
    expect(m.title).toBe("SILO: Survival, Stasis and Systemic Contradiction");
    expect(m.edges.filter((e) => e.label === "+?")).toHaveLength(2);
    expect(new Set(m.edges.map((e) => e.id)).size).toBe(47);
  });
  it("retains defaults, implicit nodes, Unicode and stable parallel edge IDs", () => {
    const dot =
      'digraph { node [shape=box]; subgraph cluster_a {label="Domain"; A; } A -> B [label="−"]; A -> B [label="+"]; }';
    const m = parseMap(dot);
    expect(m.nodes).toHaveLength(2);
    expect(m.nodes[0].attributes.shape).toBe("box");
    expect(m.nodes[0].cluster).toBe("cluster_a");
    expect(m.edges[0].label).toBe("−");
    expect(m.edges.map((e) => e.id)).toEqual(
      parseMap(dot).edges.map((e) => e.id),
    );
    expect(m.edges[0].id).not.toBe(m.edges[1].id);
  });
  it("retains hostile labels as data and never promotes URL attributes", () => {
    const m = parseMap(
      'digraph { A [label="<script>alert(1)</script>", URL="javascript:alert(1)"]; }',
    );
    expect(m.nodes[0].label).toBe("<script>alert(1)</script>");
    expect(m.nodes[0]).not.toHaveProperty("href");
  });
  it("rejects malformed, oversized and excessively nested inputs", () => {
    expect(() => parseMap("digraph { A -> }")).toThrow(/DOT/);
    expect(() => parseMap(" ".repeat(300_000))).toThrow(/size/i);
    expect(() =>
      parseMap("digraph {" + "subgraph {".repeat(40) + "}".repeat(41)),
    ).toThrow();
  });
});
