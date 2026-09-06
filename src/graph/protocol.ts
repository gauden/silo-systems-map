import type { SimulationNodeDatum } from "d3-force";
import type { SystemsMap } from "../model/types";
export interface Body extends SimulationNodeDatum {
  id: string;
  width: number;
  height: number;
  lines: string[];
  x: number;
  y: number;
}
export type Request =
  | { type: "load"; source: string }
  | {
      type: "layout";
      revision: number;
      mode: import("./layout").LayoutMode;
      aspect: number;
      seed: number;
      nodes: Body[];
      edges: { source: string; target: string }[];
    }
  | {
      type: "drag";
      revision: number;
      id: string;
      x: number;
      y: number;
      release?: boolean;
    };
export type Response =
  | { type: "map"; map: SystemsMap }
  | {
      type: "positions";
      revision: number;
      nodes: { id: string; x: number; y: number }[];
      settled: boolean;
    }
  | { type: "error"; message: string; revision?: number };
