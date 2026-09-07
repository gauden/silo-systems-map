import source from "../inputs/MAP.dot?raw";
import "./style.css";
import { el, colors } from "./ui/dom";
import { panelContent, type Selection } from "./ui/panel";
import { GraphCanvas } from "./graph/canvas";
import { visibleGraph, type ViewState } from "./model/view";
import type { SystemsMap, StructureMode } from "./model/types";
import type { Response } from "./graph/protocol";
const app = document.querySelector<HTMLDivElement>("#app")!;
const header = el("header", "header"),
  brand = el("a", "brand");
brand.href = "https://www.gaudengalea.com/lab/silo-systems-map/";
brand.setAttribute(
  "aria-label",
  "Read Gauden Galea’s Silo systems map blog post",
);
brand.append(el("span", "brand-mark", "S"), el("div", "brand-name", "SILO"));
const subtitle = el("div", "heading");
subtitle.append(
  el("span", "eyebrow", "AN INTERCONNECTED SYSTEM"),
  el("h1", "", "Survival, stasis & systemic contradiction"),
);
header.append(brand, subtitle, el("span", "edition", "SYSTEMS ATLAS / 01"));
app.append(header);
const toolbar = el("div", "toolbar"),
  tabs = el("div", "tabs");
tabs.setAttribute("role", "tablist");
tabs.setAttribute("aria-label", "Explore the model");
toolbar.append(tabs);
const searchWrap = el("div", "search-wrap"),
  search = el("input", "search");
search.type = "search";
search.placeholder = "Find a variable…";
search.setAttribute("aria-label", "Search visible variables");
const results = el("div", "search-results");
results.hidden = true;
searchWrap.append(search, results);
toolbar.append(searchWrap);
const reset = el("button", "reset", "↺  Reset map");
reset.setAttribute("aria-label", "Reset map");
toolbar.append(reset);
app.append(toolbar);
const context = el("div", "context-bar");
app.append(context);
const workspace = el("main", "workspace"),
  canvasWrap = el("section", "canvas-wrap");
canvasWrap.setAttribute("aria-label", "Graph workspace");
const canvas = el("div", "canvas"),
  canvasTop = el("div", "canvas-top"),
  viewTitle = el("span", "eyebrow", "THE WHOLE SYSTEM");
const status = el("span", "graph-status", "Loading map…");
status.setAttribute("role", "status");
canvasTop.append(viewTitle, status);
canvasWrap.append(canvasTop, canvas);
const empty = el(
  "div",
  "empty-view",
  "No variables in this view. Reset to see the whole map.",
);
empty.hidden = true;
canvasWrap.append(empty);
const controls = el("div", "viewport-controls");
canvasWrap.append(controls);
canvasWrap.append(
  el("p", "canvas-hint", "Drag a variable to move it · Scroll to zoom"),
);
const panel = el("aside", "panel");
panel.setAttribute("aria-label", "Map details");
const details = el("div", "details"),
  diagnostics = el("div", "diagnostics"),
  legend = el("div", "legend");
panel.append(details, diagnostics, legend);
workspace.append(canvasWrap, panel);
app.append(workspace);
const footer = el("footer", "footer");
const blogCredit = el("span", "blog-credit");
blogCredit.append(
  document.createTextNode(
    "📝 Content by Gauden Galea · interface by ChatGPT 6 · ",
  ),
);
const blogLink = el("a", "", "Read the blog post →");
blogLink.href = "https://www.gaudengalea.com/lab/silo-systems-map/";
blogCredit.append(blogLink);
footer.append(blogCredit, el("span", "", "DOT SOURCE · LOCAL EXPLORATION"));
app.append(footer);
let map: SystemsMap | undefined;
let state: ViewState = { mode: "model", clusters: [] };
let selection: Selection;
let worker: Worker;
let graph: GraphCanvas;
let loadTimeout: ReturnType<typeof setTimeout>;
let loading = true;
const tabButtons = new Map<string, HTMLButtonElement>();
function failure(message: string) {
  clearTimeout(loadTimeout);
  loading = false;
  diagnostics.replaceChildren(el("h3", "", "Map error"), el("p", "", message));
  status.textContent = "Unable to finish loading. Reset to retry.";
  reset.disabled = false;
}
function start() {
  worker?.terminate();
  graph?.destroy();
  canvas.replaceChildren();
  loading = true;
  worker = new Worker(new URL("./graph/worker.ts", import.meta.url), {
    type: "module",
  });
  graph = new GraphCanvas(
    canvas,
    worker,
    selectEntity,
    (s) => (status.textContent = s),
    failure,
  );
  worker.onmessage = (event: MessageEvent<Response>) => {
    const m = event.data;
    if (m.type === "map") {
      clearTimeout(loadTimeout);
      map = m.map;
      loading = false;
      state = { mode: "model", clusters: [] };
      selection = undefined;
      diagnostics.replaceChildren();
      if (map.diagnostics.length) {
        diagnostics.append(el("h3", "", "Map diagnostics"));
        for (const d of map.diagnostics)
          diagnostics.append(el("p", "", d.message));
      }
      updateLegend();
      render();
    } else if (m.type === "error" && m.revision === undefined)
      failure(m.message);
    else graph.receive(m);
  };
  worker.onerror = () =>
    failure("The map worker could not start. Reset to retry.");
  loadTimeout = setTimeout(() => {
    worker.terminate();
    failure("Map processing exceeded eight seconds. Reset to retry.");
  }, 8000);
  worker.postMessage({ type: "load", source });
}
function selectEntity(kind: "node" | "edge", id: string) {
  if (!map) return;
  selection = { kind, id };
  if (kind === "node" && state.focus !== id) {
    state = { mode: "model", clusters: [], focus: id };
    search.value = "";
    render();
  } else {
    graph.select(kind, id);
    renderPanel();
  }
}
function selectStructure(mode: StructureMode, id: string) {
  state = { mode, id, clusters: [] };
  selection = undefined;
  search.value = "";
  render();
}
function renderPanel() {
  if (!map) return;
  const structure =
    state.mode !== "model"
      ? map[state.mode].find((s) => s.id === state.id)
      : undefined;
  panelContent(
    details,
    map,
    selection,
    structure,
    selectEntity,
    selectStructure,
  );
}
function updateLegend() {
  legend.replaceChildren(el("h3", "", "Reading the links"));
  if (!map) return;
  for (const [sign, text, cls] of [
    ["+", "Positive causal link", "positive"],
    ["−", "Negative causal link", "negative"],
    ["?", "Uncertain relationship", "uncertain"],
    ["◷", "Delay, duration unspecified", "delay"],
  ]) {
    if (
      (sign === "?" && !map.edges.some((e) => e.uncertain)) ||
      (sign === "◷" && !map.edges.some((e) => e.delay))
    )
      continue;
    const row = el("div", "legend-row");
    row.append(el("span", `legend-sign ${cls}`, sign), el("span", "", text));
    legend.append(row);
  }
}
function updateSearch() {
  if (!map) return;
  const query = search.value.trim().toLocaleLowerCase();
  const visible = visibleGraph(map, state);
  const matches = query
    ? visible.nodes.filter((n) => n.label.toLocaleLowerCase().includes(query))
    : [];
  graph.search(new Set(matches.map((n) => n.id)));
  results.replaceChildren();
  results.hidden = !query;
  if (query) {
    if (!matches.length)
      results.append(el("p", "", "No matching variables in this view."));
    for (const n of matches) {
      const b = el("button", "", n.label);
      b.setAttribute("aria-label", `Select ${n.label}`);
      b.onclick = () => {
        selectEntity("node", n.id);
        results.hidden = true;
      };
      results.append(b);
    }
  }
}
function render() {
  if (!map) return;
  const focused = graph.svg.contains(document.activeElement);
  for (const [mode, b] of tabButtons) {
    b.setAttribute("aria-selected", String(state.mode === mode));
    b.tabIndex = state.mode === mode ? 0 : -1;
    b.disabled = mode !== "model" && !map[mode as StructureMode].length;
  }
  context.replaceChildren();
  if (state.focus) {
    context.append(
      el("span", "context-label", "NEIGHBOURHOOD"),
      el("strong", "focus-name", state.focus),
    );
    const back = el("button", "text-button", "← Whole model");
    back.onclick = resetMap;
    context.append(back);
  } else if (state.mode === "model") {
    context.append(el("span", "context-label", "DOMAINS"));
    for (const [i, c] of map.clusters.entries()) {
      const b = el("button", "domain-chip", c.label);
      b.style.setProperty("--domain-color", colors[i]);
      b.setAttribute("aria-pressed", String(state.clusters.includes(c.id)));
      b.onclick = () => {
        state = {
          mode: "model",
          clusters: state.clusters.includes(c.id)
            ? state.clusters.filter((id) => id !== c.id)
            : [...state.clusters, c.id],
        };
        selection = undefined;
        render();
      };
      context.append(b);
    }
  } else {
    const mode = state.mode;
    context.append(
      el(
        "span",
        "context-label",
        mode === "loops"
          ? "FEEDBACK LOOP"
          : mode === "pathways"
            ? "PATHWAY"
            : "CONTRADICTION",
      ),
    );
    const chooser = el("select", "structure-select");
    chooser.setAttribute(
      "aria-label",
      mode === "loops"
        ? "Choose loop"
        : mode === "pathways"
          ? "Choose pathway"
          : "Choose contradiction",
    );
    for (const item of map[mode]) {
      const option = el(
        "option",
        "",
        mode === "loops"
          ? `${item.id} · ${item.title}${item.uncertain ? " · ?" : ""}`
          : item.title,
      );
      option.value = item.id;
      chooser.append(option);
    }
    chooser.value = state.id ?? "";
    chooser.onchange = () => selectStructure(mode, chooser.value);
    context.append(chooser);
    const current = map[mode].find((s) => s.id === state.id);
    if (current?.type)
      context.append(el("span", `badge ${current.type}`, current.type));
    context.append(
      el(
        "span",
        "context-note",
        `${map[mode].length} ${mode === "loops" ? "cycles discovered" : mode === "pathways" ? "curated pathways" : "system tensions"}`,
      ),
    );
  }
  const view = visibleGraph(map, state);
  viewTitle.textContent = state.focus
    ? "DIRECT CONNECTIONS"
    : state.mode === "model"
      ? state.clusters.length
        ? "SELECTED DOMAINS"
        : "THE WHOLE SYSTEM"
      : (map[state.mode].find((s) => s.id === state.id)?.title ??
        "No selection");
  empty.hidden = view.nodes.length > 0;
  graph.show(
    map,
    view.nodes,
    view.edges,
    state.focus
      ? "focus"
      : state.mode === "model" && state.clusters.length
        ? "domains"
        : state.mode,
  );
  if (selection) graph.select(selection.kind, selection.id);
  renderPanel();
  updateSearch();
  if (focused) graph.svg.focus();
}
function resetMap() {
  search.value = "";
  selection = undefined;
  state = { mode: "model", clusters: [] };
  if (
    loading ||
    !map ||
    diagnostics.querySelector("h3")?.textContent === "Map error"
  ) {
    start();
    return;
  }
  render();
}
reset.onclick = resetMap;
for (const [mode, label] of [
  ["model", "Model"],
  ["loops", "Loops"],
  ["pathways", "Pathways"],
  ["contradictions", "Contradictions"],
] as const) {
  const b = el("button", "tab", label);
  b.setAttribute("role", "tab");
  b.setAttribute("aria-selected", String(mode === "model"));
  b.tabIndex = mode === "model" ? 0 : -1;
  b.onclick = () => {
    if (!map) return;
    state = {
      mode,
      clusters: [],
      id:
        mode === "loops"
          ? (map.loops.find((l) => l.id === "R1") ?? map.loops[0])?.id
          : mode !== "model"
            ? map[mode][0]?.id
            : undefined,
    };
    selection = undefined;
    search.value = "";
    render();
  };
  tabButtons.set(mode, b);
  tabs.append(b);
}
tabs.addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
  e.preventDefault();
  const buttons = [...tabButtons.values()].filter((b) => !b.disabled),
    index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? buttons.length - 1
        : (index + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) %
          buttons.length;
  buttons[next].click();
  buttons[next].focus();
});
search.oninput = updateSearch;
search.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    search.value = "";
    updateSearch();
  }
  if (e.key === "ArrowDown") results.querySelector("button")?.focus();
});
for (const [label, text, action] of [
  ["Zoom in", "+", () => graph.zoomBy(1.25)],
  ["Zoom out", "−", () => graph.zoomBy(0.8)],
  ["Fit graph", "⤢", () => graph.fit()],
  [
    "New layout",
    "⟳",
    () => {
      graph.newLayout();
      if (selection) graph.select(selection.kind, selection.id);
    },
  ],
] as const) {
  const b = el("button", "", text);
  b.setAttribute("aria-label", label);
  b.title = label;
  b.onclick = action;
  controls.append(b);
}
start();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    clearTimeout(loadTimeout);
    worker.terminate();
    graph.destroy();
    app.replaceChildren();
  });
