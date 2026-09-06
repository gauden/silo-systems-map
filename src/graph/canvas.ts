import { edgeGeometry } from "./geometry";
import type { LayoutMode } from "./layout";
import { select } from "d3-selection";
import { zoom, zoomIdentity, zoomTransform, type ZoomBehavior } from "d3-zoom";
import type { MapNode, MapEdge, SystemsMap } from "../model/types";
import type { Body, Request, Response } from "./protocol";
import { svgEl, colors } from "../ui/dom";
export class GraphCanvas {
  svg = svgEl("svg", {
    "aria-label": "Interactive Silo systems map",
    role: "group",
    tabindex: "0",
  });
  layer = svgEl("g");
  private behavior: ZoomBehavior<SVGSVGElement, unknown>;
  private bodies = new Map<string, Body>();
  private nodeElements = new Map<string, SVGGElement>();
  private edgeElements = new Map<
    string,
    {
      group: SVGGElement;
      path: SVGPathElement;
      hit: SVGPathElement;
      label: SVGTextElement;
    }
  >();
  private edges: MapEdge[] = [];
  private revision = 0;
  private fitPending = false;
  private suppressClick = false;
  private timer?: ReturnType<typeof setTimeout>;
  private observer: ResizeObserver;
  private currentView?: {
    map: SystemsMap;
    nodes: MapNode[];
    edges: MapEdge[];
    mode: LayoutMode;
  };
  private sizeKey = "";
  private lastScene?: {
    layer: SVGGElement;
    bodies: Map<string, Body>;
    nodes: Map<string, SVGGElement>;
    edges: MapEdge[];
    elements: GraphCanvas["edgeElements"];
  };
  constructor(
    private host: HTMLElement,
    private worker: Worker,
    private onSelect: (kind: "node" | "edge", id: string) => void,
    private status: (s: string) => void,
    private error: (s: string) => void,
  ) {
    const defs = svgEl("defs");
    for (const [name, color] of [
      ["positive", "#6dabe6"],
      ["negative", "#e5868c"],
      ["unknown", "#93a7a7"],
    ]) {
      const marker = svgEl("marker", {
        id: `arrow-${name}`,
        viewBox: "0 -5 10 10",
        refX: 9,
        refY: 0,
        markerWidth: 10,
        markerHeight: 10,
        orient: "auto",
        markerUnits: "userSpaceOnUse",
      });
      marker.append(svgEl("path", { d: "M0,-4L9,0L0,4Z", fill: color }));
      defs.append(marker);
    }
    this.svg.append(defs, this.layer);
    host.append(this.svg);
    this.behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3])
      .filter(
        (e) =>
          !e.target.closest(".graph-node") && (!e.button || e.type === "wheel"),
      )
      .on("zoom", (e) =>
        this.layer.setAttribute("transform", e.transform.toString()),
      );
    select(this.svg).call(this.behavior).on("dblclick.zoom", null);
    this.observer = new ResizeObserver(() => {
      const key = `${Math.round(this.host.clientWidth)}:${Math.round(this.host.clientHeight)}`;
      if (key === this.sizeKey) return;
      this.sizeKey = key;
      if (this.currentView) {
        const v = this.currentView;
        this.show(v.map, v.nodes, v.edges, v.mode);
      }
    });
    this.observer.observe(host);
  }
  show(
    map: SystemsMap,
    nodes: MapNode[] = map.nodes,
    edges: MapEdge[] = map.edges,
    mode: LayoutMode = "model",
  ) {
    this.currentView = { map, nodes, edges, mode };
    this.sizeKey = `${Math.round(this.host.clientWidth)}:${Math.round(this.host.clientHeight)}`;
    this.revision++;
    this.fitPending = true;
    if (this.svg.dataset.ready === "true")
      this.lastScene = {
        layer: this.layer,
        bodies: this.bodies,
        nodes: this.nodeElements,
        edges: this.edges,
        elements: this.edgeElements,
      };
    this.layer = svgEl("g");
    this.layer.setAttribute("transform", zoomTransform(this.svg).toString());
    this.bodies = new Map();
    this.nodeElements = new Map();
    this.edgeElements = new Map();
    this.edges = edges;
    this.svg.setAttribute("aria-busy", "true");
    for (const edge of edges) {
      const group = svgEl("g", {
        class: "graph-edge",
        tabindex: 0,
        role: "button",
        "aria-label": `${edge.source} to ${edge.target}: ${edge.label}`,
        "data-edge-id": edge.id,
      });
      group.classList.add(
        edge.polarity === "+"
          ? "positive"
          : edge.polarity === "-"
            ? "negative"
            : "unknown",
      );
      if (edge.uncertain) group.classList.add("uncertain");
      const path = svgEl("path", {
          class: "edge-line",
          "marker-end": `url(#arrow-${edge.polarity === "+" ? "positive" : edge.polarity === "-" ? "negative" : "unknown"})`,
        }),
        hit = svgEl("path", { class: "edge-hit" }),
        label = svgEl(
          "text",
          { class: "edge-label", "text-anchor": "middle", dy: "0.35em" },
          edge.label,
        );
      group.append(path, hit, label);
      group.addEventListener("click", () => this.onSelect("edge", edge.id));
      group.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.onSelect("edge", edge.id);
        }
      });
      this.layer.append(group);
      this.edgeElements.set(edge.id, { group, path, hit, label });
    }
    for (const node of nodes) {
      const words = node.label.split(/\s+/),
        lines: string[] = [];
      let line = "";
      for (const word of words) {
        if (
          (line + " " + word).length >
            (this.host.clientWidth < 500 ? 16 : 20) &&
          line
        ) {
          lines.push(line);
          line = word;
        } else line = line ? line + " " + word : word;
      }
      if (line) lines.push(line);
      const measure = document.createElement("canvas").getContext("2d")!;
      measure.font = "500 14px " + getComputedStyle(this.host).fontFamily;
      const width = Math.max(
          100,
          ...lines.map((l) => measure.measureText(l).width + 32),
        ),
        height = lines.length * 19 + 26;
      const body: Body = { id: node.id, width, height, lines, x: 0, y: 0 };
      this.bodies.set(node.id, body);
      const domain = map.clusters.findIndex((c) => c.id === node.cluster),
        color = colors[domain] ?? "#9caead";
      const group = svgEl("g", {
        class: "graph-node",
        tabindex: 0,
        role: "button",
        "aria-label": node.label,
        "data-node-id": node.id,
      });
      group.style.setProperty("--node-color", color);
      group.append(
        svgEl("rect", {
          x: -width / 2,
          y: -height / 2,
          width,
          height,
          rx: 7,
          class: "node-box",
        }),
      );
      lines.forEach((line, i) =>
        group.append(
          svgEl(
            "text",
            {
              class: "node-label",
              "text-anchor": "middle",
              x: 0,
              y: (i - (lines.length - 1) / 2) * 19 + 5,
            },
            line,
          ),
        ),
      );
      group.addEventListener("click", () => {
        if (!this.suppressClick) this.onSelect("node", node.id);
      });
      this.attachDrag(group, body);
      group.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.onSelect("node", node.id);
        }
      });
      this.layer.append(group);
      this.nodeElements.set(node.id, group);
    }
    this.status("Arranging map…");
    this.svg.dataset.ready = "false";
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => this.failed("Layout timed out. Reset the map to retry."),
      8000,
    );
    const request: Request = {
      type: "layout",
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
      mode,
      aspect: Math.max(
        0.3,
        (this.host.clientWidth - 72) /
          Math.max(150, this.host.clientHeight - 150),
      ),
      revision: this.revision,
      nodes: [...this.bodies.values()],
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
    };
    this.worker.postMessage(request);
  }
  newLayout() {
    if (!this.currentView) return;
    const { map, nodes, edges, mode } = this.currentView;
    this.show(map, nodes, edges, mode);
  }
  receive(message: Response) {
    if (message.type === "error" && message.revision === this.revision) {
      this.failed(message.message);
      return;
    }
    if (message.type !== "positions" || message.revision !== this.revision)
      return;
    clearTimeout(this.timer);
    for (const position of message.nodes) {
      const b = this.bodies.get(position.id);
      if (b) Object.assign(b, position);
    }
    if (!this.layer.isConnected) {
      for (const old of [...this.svg.children])
        if (old.tagName.toLowerCase() === "g") old.remove();
      this.svg.append(this.layer);
    }
    this.draw();
    if (message.settled) {
      if (this.fitPending) {
        this.fit();
        this.fitPending = false;
      }
      this.status(
        `${this.bodies.size} variables · ${this.edges.length} relationships`,
      );
      this.svg.dataset.ready = "true";
      this.svg.setAttribute("aria-busy", "false");
    }
  }
  private failed(message: string) {
    clearTimeout(this.timer);
    this.fitPending = false;
    this.revision++;
    if (this.lastScene) {
      this.layer = this.lastScene.layer;
      this.bodies = this.lastScene.bodies;
      this.nodeElements = this.lastScene.nodes;
      this.edges = this.lastScene.edges;
      this.edgeElements = this.lastScene.elements;
      for (const child of [...this.svg.children])
        if (child.tagName.toLowerCase() === "g") child.remove();
      this.svg.append(this.layer);
    }
    this.svg.setAttribute("aria-busy", "false");
    this.error(message);
  }
  private attachDrag(group: SVGGElement, body: Body) {
    let active: number | undefined;
    let start: [number, number] = [0, 0];
    let moved = false;
    const position = (e: PointerEvent) => {
      const r = this.svg.getBoundingClientRect();
      return zoomTransform(this.svg).invert([
        e.clientX - r.left,
        e.clientY - r.top,
      ]);
    };
    group.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      active = e.pointerId;
      start = [e.clientX, e.clientY];
      moved = false;
      this.suppressClick = false;
      group.setPointerCapture(e.pointerId);
      group.classList.add("dragging");
    });
    group.addEventListener("pointermove", (e) => {
      if (active !== e.pointerId) return;
      if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 4 && !moved)
        return;
      moved = true;
      this.suppressClick = true;
      const [x, y] = position(e);
      body.x = x;
      body.y = y;
      this.draw();
      this.worker.postMessage({
        type: "drag",
        revision: this.revision,
        id: body.id,
        x,
        y,
      } satisfies Request);
    });
    const release = (e: PointerEvent) => {
      if (active !== e.pointerId) return;
      active = undefined;
      group.classList.remove("dragging");
      if (moved)
        this.worker.postMessage({
          type: "drag",
          revision: this.revision,
          id: body.id,
          x: body.x,
          y: body.y,
          release: true,
        } satisfies Request);
      if (group.hasPointerCapture(e.pointerId))
        group.releasePointerCapture(e.pointerId);
      setTimeout(() => {
        this.suppressClick = false;
      }, 0);
    };
    group.addEventListener("pointerup", release);
    group.addEventListener("pointercancel", release);
    group.addEventListener("lostpointercapture", release);
  }
  search(ids: Set<string>) {
    for (const [id, node] of this.nodeElements)
      node.classList.toggle("search-match", ids.has(id));
  }
  private draw() {
    for (const [id, b] of this.bodies)
      this.nodeElements
        .get(id)!
        .setAttribute("transform", `translate(${b.x},${b.y})`);
    for (const e of this.edges) {
      const a = this.bodies.get(e.source)!,
        b = this.bodies.get(e.target)!;
      const geometry = edgeGeometry(
        a,
        b,
        this.edges.some(
          (other) => other.source === e.target && other.target === e.source,
        ),
      );
      const d = geometry.d,
        midpoint = geometry.at(0.5);
      const parts = this.edgeElements.get(e.id)!;
      parts.path.setAttribute("d", d);
      parts.hit.setAttribute("d", d);
      parts.label.setAttribute("x", String(midpoint.x));
      parts.label.setAttribute("y", String(midpoint.y));
    }
  }
  fit() {
    if (!this.bodies.size) return;
    const bounds = this.layer.getBBox();
    const width = this.host.clientWidth,
      height = this.host.clientHeight;
    if (!width || !height || !bounds.width || !bounds.height) return;
    const k = Math.min(
      2.5,
      (width - 72) / bounds.width,
      (height - 150) / bounds.height,
    );
    select(this.svg).call(
      this.behavior.transform,
      zoomIdentity
        .translate(
          width / 2 - k * (bounds.x + bounds.width / 2),
          height / 2 - 5 - k * (bounds.y + bounds.height / 2),
        )
        .scale(Math.max(0.15, k)),
    );
  }
  zoomBy(factor: number) {
    select(this.svg).call(this.behavior.scaleBy, factor);
  }
  select(kind: "node" | "edge", id: string) {
    for (const [key, node] of this.nodeElements)
      node.classList.toggle("selected", kind === "node" && key === id);
    for (const [key, e] of this.edgeElements)
      e.group.classList.toggle("selected", kind === "edge" && key === id);
  }
  destroy() {
    clearTimeout(this.timer);
    this.observer.disconnect();
    select(this.svg).on(".zoom", null);
  }
}
