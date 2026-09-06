import type { Simulation, SimulationLinkDatum } from "d3-force";
import { arrange, createSimulation } from "./layout";
import { enrichMap } from "../model/semantics";
import { parseMap } from "../model/parse";
import type { Body, Request, Response } from "./protocol";
let simulation: Simulation<Body, SimulationLinkDatum<Body>> | undefined;
let revision = 0;
const send = (value: Response) => postMessage(value);
self.onmessage = (event: MessageEvent<Request>) => {
  const request = event.data;
  try {
    if (request.type === "load") {
      send({ type: "map", map: enrichMap(parseMap(request.source)) });
      return;
    }
    if (request.type === "layout") {
      simulation?.stop();
      revision = request.revision;
      const nodes = arrange(
        request.nodes,
        request.edges,
        request.mode,
        request.aspect,
        request.seed,
      );
      simulation = createSimulation(nodes, request.edges).alpha(0.001);
      simulation
        .on("tick", () =>
          send({
            type: "positions",
            revision,
            nodes: nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
            settled: false,
          }),
        )
        .on("end", () =>
          send({
            type: "positions",
            revision,
            nodes: nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
            settled: true,
          }),
        );
      send({
        type: "positions",
        revision,
        nodes: nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
        settled: true,
      });
    } else if (
      request.type === "drag" &&
      request.revision === revision &&
      simulation
    ) {
      const node = simulation.nodes().find((n) => n.id === request.id);
      if (!node) return;
      if (request.release) {
        node.fx = null;
        node.fy = null;
        simulation.alphaTarget(0).restart();
      } else {
        node.fx = request.x;
        node.fy = request.y;
        simulation.alpha(0.35).alphaTarget(0.09).restart();
      }
    }
  } catch (error) {
    send({
      type: "error",
      message: (error as Error).message,
      revision: request.type === "load" ? undefined : request.revision,
    });
  }
};
