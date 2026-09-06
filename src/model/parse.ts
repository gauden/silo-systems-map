import { parse } from "@ts-graphviz/ast";
import type { SystemsMap, MapNode, MapEdge, Cluster } from "./types";
interface AST {
  type: string;
  kind?: string;
  value?: string | AST;
  key?: AST;
  id?: AST;
  directed?: boolean;
  strict?: boolean;
  children: AST[];
  targets?: AST[];
}
const attrs = (list: AST[]) =>
  Object.fromEntries(
    list
      .filter((x) => x.type === "Attribute")
      .map((x) => [
        String(x.key!.value),
        typeof x.value === "object" ? String(x.value.value) : "",
      ]),
  );
// Only the parser's literal/attribute shape is consumed here; no DOT attributes become DOM attributes.
export function parseMap(source: string): SystemsMap {
  if (new TextEncoder().encode(source).length > 262144)
    throw new Error("DOT input exceeds the 256 KiB size limit.");
  // Count structural braces before recursive parsing, skipping literals and comments.
  let depth = 0;
  const tokens =
    source.match(
      /"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*|\#[^\n]*|[{}]/g,
    ) ?? [];
  for (const token of tokens) {
    if (token === "{") {
      if (++depth > 25)
        throw new Error("DOT subgraph nesting exceeds 24 levels.");
    } else if (token === "}") depth--;
  }
  let tree: AST;
  try {
    tree = parse(source, {
      maxInputSize: 262144,
      maxHtmlNestingDepth: 16,
      maxEdgeChainDepth: 128,
    }) as unknown as AST;
  } catch (error) {
    const e = error as Error & {
      location?: { start: { line: number; column: number } };
    };
    throw new Error(
      `DOT syntax error${e.location ? ` at line ${e.location.start.line}, column ${e.location.start.column}` : ""}: ${e.message}`,
    );
  }
  const graphs = tree.children.filter((x) => x.type === "Graph");
  if (graphs.length !== 1 || !graphs[0].directed)
    throw new Error("This viewer requires one directed DOT graph.");
  const graph = graphs[0];
  const nodes = new Map<string, MapNode>();
  const edges: MapEdge[] = [];
  const clusters: Cluster[] = [];
  const ensure = (
    id: string,
    defaults: Record<string, string>,
    cluster?: string,
  ) => {
    let node = nodes.get(id);
    if (!node) {
      node = {
        id,
        label: defaults.label ?? id,
        cluster,
        attributes: { ...defaults },
      };
      nodes.set(id, node);
    } else if (cluster) node.cluster = cluster;
    return node;
  };
  let title = (graph.id?.value as string) ?? "Systems map";
  function walk(
    children: AST[],
    nd: Record<string, string> = {},
    ed: Record<string, string> = {},
    cluster?: Cluster,
    depth = 0,
  ) {
    if (depth > 24) throw new Error("DOT subgraph nesting exceeds 24 levels.");
    nd = { ...nd };
    ed = { ...ed };
    for (const item of children) {
      if (item.type === "AttributeList") {
        const values = attrs(item.children);
        if (item.kind === "Node") Object.assign(nd, values);
        if (item.kind === "Edge") Object.assign(ed, values);
        if (item.kind === "Graph" && values.label) {
          if (cluster) cluster.label = values.label;
          else title = values.label;
        }
      } else if (item.type === "Attribute") {
        const values = attrs([item]);
        if (values.label) {
          if (cluster) cluster.label = values.label;
          else if (depth === 0) title = values.label;
        }
      } else if (item.type === "Subgraph") {
        const id = item.id?.value as string | undefined;
        let c = cluster;
        if (id?.startsWith("cluster")) {
          c = { id, label: id };
          clusters.push(c);
        }
        walk(item.children, nd, ed, c, depth + 1);
      } else if (item.type === "Node") {
        const n = ensure(item.id!.value as string, nd, cluster?.id);
        Object.assign(n.attributes, attrs(item.children));
        n.label = n.attributes.label ?? n.id;
      } else if (item.type === "Edge") {
        const targets = item.targets ?? [];
        if (targets.some((t) => t.type !== "NodeRef"))
          throw new Error(
            "DOT subgraph edge endpoints are not supported by this Silo viewer.",
          );
        for (let i = 0; i < targets.length - 1; i++) {
          const source = targets[i].id!.value as string,
            target = targets[i + 1].id!.value as string;
          ensure(source, nd, cluster?.id);
          ensure(target, nd, cluster?.id);
          const attributes = { ...ed, ...attrs(item.children) };
          const existing =
            graph.strict &&
            edges.find((e) => e.source === source && e.target === target);
          if (existing) {
            Object.assign(existing.attributes, attributes);
            existing.label = existing.attributes.label ?? "";
            continue;
          }
          edges.push({
            id: attributes.id ?? `edge-${edges.length + 1}`,
            source,
            target,
            label: attributes.label ?? "",
            attributes,
          });
        }
      }
    }
  }
  walk(graph.children);
  if (nodes.size > 256 || edges.length > 1024)
    throw new Error("DOT model exceeds the 256 node / 1,024 edge limit.");
  if (new Set(edges.map((e) => e.id)).size !== edges.length)
    throw new Error(
      "DOT edges have duplicate IDs. Give each edge a unique id.",
    );
  const result: SystemsMap = {
    title,
    nodes: [...nodes.values()],
    edges,
    clusters,
    diagnostics: [],
    loops: [],
    pathways: [],
    contradictions: [],
  };
  const blocks: string[] = [];
  function comments(n: AST) {
    if (
      n.type === "Comment" &&
      n.kind === "Block" &&
      typeof n.value === "string" &&
      n.value.trimStart().startsWith("@systems-map")
    )
      blocks.push(n.value.trimStart().slice(12).trim());
    for (const child of n.children ?? []) comments(child);
  }
  comments(tree);
  if (blocks.length > 1)
    result.diagnostics.push({
      level: "warning",
      message:
        "Multiple systems metadata blocks. Pathways, aliases and contradictions are disabled.",
    });
  else if (blocks.length === 1) {
    try {
      result.metadata = JSON.parse(blocks[0]);
    } catch {
      result.diagnostics.push({
        level: "warning",
        message:
          "Systems metadata is invalid JSON. The graph remains available; pathways, aliases and contradictions are disabled.",
      });
    }
  }
  return result;
}
