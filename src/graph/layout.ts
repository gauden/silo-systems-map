import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type Force,
} from "d3-force";
import type { Body } from "./protocol";
import { edgeGeometry } from "./geometry";
export type LayoutMode =
  "model" | "loops" | "pathways" | "focus" | "domains" | "contradictions";
type Link = { source: string; target: string };
function rectangleCollide(): Force<Body, SimulationLinkDatum<Body>> {
  let nodes: Body[] = [];
  const f = (() => {
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i],
          b = nodes[j];
        const dx = b.x + (b.vx ?? 0) - (a.x + (a.vx ?? 0)) || 0.01,
          dy = b.y + (b.vy ?? 0) - (a.y + (a.vy ?? 0)) || 0.01;
        const ox = (a.width + b.width) / 2 + 30 - Math.abs(dx),
          oy = (a.height + b.height) / 2 + 30 - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (ox < oy) {
            const d = Math.sign(dx) * ox * 0.5;
            a.vx = (a.vx ?? 0) - d;
            b.vx = (b.vx ?? 0) + d;
          } else {
            const d = Math.sign(dy) * oy * 0.5;
            a.vy = (a.vy ?? 0) - d;
            b.vy = (b.vy ?? 0) + d;
          }
        }
      }
  }) as Force<Body, SimulationLinkDatum<Body>>;
  f.initialize = (value) => {
    nodes = value;
  };
  return f;
}

export function createSimulation(nodes: Body[], edges: Link[]) {
  return forceSimulation<Body>(nodes)
    .stop()
    .force(
      "link",
      forceLink<Body, SimulationLinkDatum<Body>>(edges.map((e) => ({ ...e })))
        .id((n) => n.id)
        .distance(nodes.length <= 24 ? 310 : 190)
        .strength(0.3),
    )
    .force("charge", forceManyBody().strength(-500))
    .force("center", forceCenter(0, 0))
    .force("x", forceX(0).strength(nodes.length <= 14 ? 0.02 : 0.008))
    .force("y", forceY(0).strength(nodes.length <= 14 ? 0.02 : 0.25))
    .force("collision", rectangleCollide())
    .velocityDecay(0.45);
}
const cross = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function intersects(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
) {
  return (
    cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0
  );
}
export function scoreLayout(nodes: Body[], edges: Link[], aspect = 1.5) {
  let score = 0;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i],
        b = nodes[j];
      if (
        Math.abs(a.x - b.x) < (a.width + b.width) / 2 + 8 &&
        Math.abs(a.y - b.y) < (a.height + b.height) / 2 + 8
      )
        score += 10000;
    }
  const curves = edges.map((e) => {
    const a = byId.get(e.source)!,
      b = byId.get(e.target)!;
    const geometry = edgeGeometry(
      a,
      b,
      edges.some(
        (other) => other.source === e.target && other.target === e.source,
      ),
    );
    return {
      edge: e,
      points: Array.from({ length: 13 }, (_, i) => geometry.at(i / 12)),
    };
  });
  for (let i = 0; i < curves.length; i++) {
    const a = curves[i];
    for (const node of nodes) {
      if (node.id === a.edge.source || node.id === a.edge.target) continue;
      if (
        a.points.some(
          (p) =>
            Math.abs(p.x - node.x) < node.width / 2 + 5 &&
            Math.abs(p.y - node.y) < node.height / 2 + 5,
        )
      )
        score += 2000;
    }
    for (let j = i + 1; j < curves.length; j++) {
      const b = curves[j];
      if (
        [a.edge.source, a.edge.target].some(
          (id) => id === b.edge.source || id === b.edge.target,
        )
      )
        continue;
      let crossing = false;
      for (let p = 1; p < a.points.length && !crossing; p++)
        for (let q = 1; q < b.points.length; q++)
          if (
            intersects(
              a.points[p - 1],
              a.points[p],
              b.points[q - 1],
              b.points[q],
            )
          ) {
            crossing = true;
            break;
          }
      if (crossing) score += 1000;
    }
  }
  if (nodes.length) {
    const width =
      Math.max(...nodes.map((n) => n.x + n.width / 2)) -
      Math.min(...nodes.map((n) => n.x - n.width / 2));
    const height =
      Math.max(...nodes.map((n) => n.y + n.height / 2)) -
      Math.min(...nodes.map((n) => n.y - n.height / 2));
    score +=
      Math.max(width / Math.sqrt(aspect), height * Math.sqrt(aspect)) * 0.1;
  }
  return score;
}
export function arrange(
  input: Body[],
  edges: Link[],
  mode: LayoutMode,
  aspect = 1.5,
  randomSeed = 1,
): Body[] {
  if (!input.length) return [];
  const order = [...new Set(edges.flatMap((e) => [e.source, e.target]))];
  for (const n of input) if (!order.includes(n.id)) order.push(n.id);
  let best: Body[] = [],
    bestScore = Infinity;
  // Seeded per request for reproducible tests, fresh entropy supplied by the UI.
  let randomState = randomSeed >>> 0;
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const attempts = mode === "model" ? 7 : 32;
  for (let seed = 0; seed < attempts; seed++) {
    const nodes = input.map((n) => {
      const index = order.indexOf(n.id),
        angle = (index / input.length) * Math.PI * 2 - Math.PI / 2;
      const radius = Math.max(
        170,
        235 / (2 * Math.sin(Math.PI / Math.max(input.length, 3))),
      );
      if (seed === 0 && mode === "loops")
        return {
          ...n,
          x: Math.cos(angle) * radius + (random() - 0.5) * 30,
          y: Math.sin(angle) * radius + (random() - 0.5) * 30,
        };
      if (seed === 0 && mode === "pathways")
        return {
          ...n,
          x: (index - (input.length - 1) / 2) * 220 + (random() - 0.5) * 30,
          y: Math.sin(index * 0.9) * 70 + (random() - 0.5) * 30,
        };
      return {
        ...n,
        x: (random() - 0.5) * Math.sqrt(input.length) * 350,
        y: (random() - 0.5) * Math.sqrt(input.length) * 350,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      };
    });
    const simulation = createSimulation(nodes, edges);
    // A constrained serpentine start gives narrow pathway views a compact alternative.
    if (mode === "pathways" && seed === 6) {
      const columns = aspect < 1.2 ? 2 : 3,
        rows = Math.ceil(nodes.length / columns);
      const jitter = new Map(
        nodes.map((n) => [
          n.id,
          { x: (random() - 0.5) * 20, y: (random() - 0.5) * 20 },
        ]),
      );
      const target = (n: Body) => {
        const index = order.indexOf(n.id),
          row = Math.floor(index / columns);
        return {
          x:
            ((row % 2 ? columns - 1 - (index % columns) : index % columns) -
              (columns - 1) / 2) *
              220 +
            jitter.get(n.id)!.x,
          y: (row - (rows - 1) / 2) * 140 + jitter.get(n.id)!.y,
        };
      };
      for (const node of nodes)
        Object.assign(node, target(node), { vx: 0, vy: 0 });
      simulation
        .force("x", forceX<Body>((n) => target(n).x).strength(0.9))
        .force("y", forceY<Body>((n) => target(n).y).strength(0.9))
        .force(
          "link",
          forceLink<Body, SimulationLinkDatum<Body>>(
            edges.map((e) => ({ ...e })),
          )
            .id((n) => n.id)
            .distance(170)
            .strength(0.03),
        );
    }
    simulation.tick(320);
    simulation.stop();
    // Compare orientations with actual label bounds; never rotate the text itself.
    for (const rotate of [false, true]) {
      const candidate = nodes.map((n) => ({
        ...n,
        x: rotate ? -n.y : n.x,
        y: rotate ? n.x : n.y,
        vx: 0,
        vy: 0,
      }));
      const score = scoreLayout(candidate, edges, aspect);
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
  }
  // Forces avoid box collisions but cannot see curved-edge crossings. Try
  // exchanging occupied positions to escape those remaining local minima.
  if (best.length <= 24) {
    for (let pass = 0; pass < 4; pass++) {
      let improved = false;
      for (let i = 0; i < best.length; i++) {
        for (let j = i + 1; j < best.length; j++) {
          const candidate = best.map((n) => ({ ...n }));
          [candidate[i].x, candidate[j].x] = [candidate[j].x, candidate[i].x];
          [candidate[i].y, candidate[j].y] = [candidate[j].y, candidate[i].y];
          const score = scoreLayout(candidate, edges, aspect);
          if (score < bestScore) {
            best = candidate;
            bestScore = score;
            improved = true;
          }
        }
      }
      for (let i = 0; i < best.length; i++) {
        for (const distance of [70, 160, 300]) {
          for (let direction = 0; direction < 8; direction++) {
            const candidate = best.map((n) => ({ ...n }));
            const angle = (direction * Math.PI) / 4;
            candidate[i].x += Math.cos(angle) * distance;
            candidate[i].y += Math.sin(angle) * distance;
            const score = scoreLayout(candidate, edges, aspect);
            if (score < bestScore) {
              best = candidate;
              bestScore = score;
              improved = true;
            }
          }
        }
      }
      if (!improved) break;
    }
  }
  return best;
}
