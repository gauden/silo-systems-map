import { el, colors } from "./dom";
import type {
  SystemsMap,
  Structure,
  MapEdge,
  Contradiction,
  StructureMode,
} from "../model/types";
export type Selection = { kind: "node" | "edge"; id: string } | undefined;
export function panelContent(
  host: HTMLElement,
  map: SystemsMap,
  selection: Selection,
  structure: Structure | Contradiction | undefined,
  onSelect: (kind: "node" | "edge", id: string) => void,
  onStructure: (mode: StructureMode, id: string) => void,
) {
  host.replaceChildren();
  const button = (
    text: string,
    action: () => void,
    className = "text-button",
  ) => {
    const b = el("button", className, text);
    b.onclick = action;
    return b;
  };
  const membership = (nodeId?: string, edgeId?: string) => {
    for (const mode of ["loops", "pathways", "contradictions"] as const) {
      const list = map[mode].filter((s) =>
        nodeId ? s.nodeIds.includes(nodeId) : s.edgeIds.includes(edgeId!),
      );
      if (list.length) {
        host.append(
          el(
            "h3",
            "",
            mode === "loops"
              ? "In these feedback loops"
              : mode === "pathways"
                ? "In these pathways"
                : "In these contradictions",
          ),
        );
        const links = el("div", "membership");
        list.forEach((s) =>
          links.append(button(s.title, () => onStructure(mode, s.id))),
        );
        if (list.length > 8) {
          const more = el("details", "membership-disclosure");
          more.append(
            el("summary", "", `Browse ${list.length} ${mode}`),
            links,
          );
          host.append(more);
        } else host.append(links);
      }
    }
  };
  const relationship = (edge: MapEdge) => {
    const b = button(
      `${edge.source} → ${edge.target}`,
      () => onSelect("edge", edge.id),
      "relationship-button",
    );
    const sign = el(
      "span",
      edge.polarity === "-" ? "sign negative" : "sign positive",
      edge.label || "?",
    );
    b.append(sign);
    return b;
  };
  if (selection?.kind === "node") {
    const node = map.nodes.find((n) => n.id === selection.id)!;
    host.append(
      el("span", "eyebrow", "VARIABLE / FIRST-DEGREE VIEW"),
      el("h2", "", node.label),
    );
    const domain = map.clusters.findIndex((c) => c.id === node.cluster);
    if (domain >= 0) {
      const label = el("p", "domain-label", map.clusters[domain].label);
      label.style.setProperty("--domain-color", colors[domain]);
      host.append(label);
    }
    if (node.attributes.sm_description)
      host.append(el("p", "", node.attributes.sm_description));
    const incoming = map.edges.filter((e) => e.target === node.id),
      outgoing = map.edges.filter((e) => e.source === node.id);
    host.append(
      el(
        "p",
        "",
        incoming.length + outgoing.length
          ? "Showing this variable and its directly connected neighbours. Select another variable to follow its connections."
          : "No connections in the supplied model.",
      ),
    );
    for (const [title, edges] of [
      ["Influenced by", incoming],
      ["Influences", outgoing],
    ] as const)
      if (edges.length) {
        host.append(el("h3", "", `${title} · ${edges.length}`));
        const list = el("div", "relationship-list");
        edges.forEach((e) => list.append(relationship(e)));
        host.append(list);
      }
    membership(node.id);
  } else if (selection?.kind === "edge") {
    const edge = map.edges.find((e) => e.id === selection.id)!;
    host.append(
      el("span", "eyebrow", "CAUSAL RELATIONSHIP"),
      el("h2", "", `${edge.source} → ${edge.target}`),
    );
    const badge = el(
      "span",
      `badge ${edge.polarity === "-" ? "negative" : "positive"}`,
      edge.polarity === "+"
        ? "＋ Positive link"
        : edge.polarity === "-"
          ? "− Negative link"
          : "Unknown polarity",
    );
    host.append(badge);
    host.append(
      el(
        "p",
        "",
        edge.polarity
          ? `More ${edge.source.toLowerCase()} is modelled as causing ${edge.polarity === "+" ? "more" : "less"} ${edge.target.toLowerCase()}, all else equal.`
          : "No causal polarity is specified for this link.",
      ),
    );
    if (edge.uncertain)
      host.append(
        el(
          "p",
          "caveat",
          "? Uncertain relationship. The supplied sign is a modelling assumption.",
        ),
      );
    if (edge.delay)
      host.append(
        el(
          "p",
          "caveat",
          "Delayed effect. The source specifies a delay without a duration.",
        ),
      );
    if (edge.attributes.sm_description)
      host.append(el("p", "", edge.attributes.sm_description));
    host.append(
      el(
        "p",
        "metadata",
        edge.attributes.sm_evidence === "inferred"
          ? "Model inference · this link is an analytical addition, not an independently established fact."
          : "Evidence and confidence are not specified in the source.",
      ),
    );
    host.append(
      button(`Explore ${edge.source}`, () => onSelect("node", edge.source)),
      button(`Explore ${edge.target}`, () => onSelect("node", edge.target)),
    );
    membership(undefined, edge.id);
  } else if (structure && "branches" in structure) {
    host.append(
      el("span", "eyebrow", "SYSTEM CONTRADICTION"),
      el("h2", "", structure.title),
      el("p", "intro", structure.question),
      el("p", "", structure.description),
    );
    const branchList = el("div", "contradiction-branches");
    structure.branches.forEach((branch, i) => {
      const card = el("section", "contradiction-branch");
      card.append(
        el("span", "eyebrow", `BRANCH ${i + 1}`),
        el("h3", "", branch.title),
        el("p", "", branch.explanation),
      );
      const sequence = el("ol", "sequence");
      branch.edgeIds.forEach((id, j) => {
        const e = map.edges.find((e) => e.id === id)!;
        const li = el("li");
        li.append(
          button(e.source, () => onSelect("node", e.source), "sequence-node"),
        );
        const step = button(
          `${e.label} ${e.uncertain ? "conditional" : e.delay ? "delayed effect" : e.polarity === "-" ? "decreases" : "increases"}`,
          () => onSelect("edge", e.id),
          "sequence-edge",
        );
        step.classList.add(e.polarity === "-" ? "negative" : "positive");
        li.append(step);
        sequence.append(li);
        if (j === branch.edgeIds.length - 1) {
          const end = el("li");
          end.append(
            button(e.target, () => onSelect("node", e.target), "sequence-node"),
          );
          sequence.append(end);
        }
      });
      const expand = el("details", "branch-sequence");
      expand.append(
        el("summary", "", `Trace ${branch.edgeIds.length} relationships`),
        sequence,
      );
      card.append(expand);
      branchList.append(card);
    });
    host.append(
      branchList,
      el("h3", "", "Interpretation"),
      el("p", "caveat", structure.caveat),
      el(
        "p",
        "metadata",
        "These branches are a causal interpretation. A tension can be sustained by selective privileges or compensating institutions; it is not automatically a plot error.",
      ),
    );
    if (structure.sources.length) {
      host.append(el("h3", "", "Context sources"));
      structure.sources.forEach((url) => {
        const link = el(
          "a",
          "source-link",
          new URL(url).hostname === "hughhowey.com"
            ? "Hugh Howey · Wool excerpt"
            : "Apple · Silo synopsis",
        );
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        host.append(link);
      });
    }
  } else if (structure) {
    const loop = structure.type !== undefined;
    host.append(
      el(
        "span",
        "eyebrow",
        loop ? `FEEDBACK LOOP / ${structure.id}` : "CAUSAL PATHWAY",
      ),
      el("h2", "", structure.title),
    );
    if (loop) {
      host.append(
        el(
          "span",
          `badge ${structure.type}`,
          `${structure.type === "reinforcing" ? "↗" : structure.type === "balancing" ? "↔" : "?"} ${structure.type}${structure.uncertain ? " · conditional" : ""}`,
        ),
        el(
          "p",
          "",
          `${structure.edgeIds.length} relationships · ${structure.negativeCount} negative ${structure.negativeCount === 1 ? "link" : "links"}. ${structure.type === "unknown" ? "Missing polarity prevents classification." : structure.type === "reinforcing" ? "An even number of negative links reinforces change." : "An odd number of negative links counteracts change."}`,
        ),
      );
    } else if (structure.question)
      host.append(el("p", "intro", structure.question));
    if (structure.uncertain)
      host.append(
        el(
          "p",
          "caveat",
          "? Includes uncertain links. Read this sequence conditional on their supplied signs.",
        ),
      );
    host.append(el("h3", "", loop ? "Around the loop" : "Follow the pathway"));
    const sequence = el("ol", "sequence");
    structure.edgeIds.forEach((id, i) => {
      const edge = map.edges.find((e) => e.id === id)!;
      const li = el("li");
      li.append(
        button(
          edge.source,
          () => onSelect("node", edge.source),
          "sequence-node",
        ),
      );
      const step = button(
        `${edge.label}  ${edge.uncertain ? "uncertain relationship" : edge.delay ? "delayed effect" : edge.polarity === "-" ? "decreases" : "increases"}`,
        () => onSelect("edge", id),
        "sequence-edge",
      );
      step.classList.add(edge.polarity === "-" ? "negative" : "positive");
      li.append(step);
      sequence.append(li);
      if (i === structure.edgeIds.length - 1) {
        const end = el("li");
        end.append(
          button(
            edge.target,
            () => onSelect("node", edge.target),
            "sequence-node",
          ),
        );
        if (loop) end.append(el("span", "metadata", "↩ returns to the start"));
        sequence.append(end);
      }
    });
    host.append(sequence);
  } else {
    host.append(
      el("span", "eyebrow", "MODEL OVERVIEW"),
      el("h2", "", "Inside the system"),
      el(
        "p",
        "intro",
        "Explore how control, knowledge and infrastructure shape survival in the Silo.",
      ),
    );
    const counts = el("div", "counts");
    for (const [n, label] of [
      [map.nodes.length, "variables"],
      [map.edges.length, "links"],
      [map.loops.length, "loops"],
    ] as const) {
      const item = el("div");
      item.append(el("strong", "", String(n)), el("span", "", label));
      counts.append(item);
    }
    host.append(counts, el("h3", "", "Five connected domains"));
    map.clusters.forEach((c, i) => {
      const item = el("div", "domain-label", c.label);
      item.style.setProperty("--domain-color", colors[i]);
      host.append(item);
    });
    host.append(
      el(
        "p",
        "",
        "Select a variable to explore its neighbours. Drag a variable to move it and feel the surrounding system respond.",
      ),
    );
    const list = el("details", "variable-index");
    list.append(el("summary", "", `Browse all ${map.nodes.length} variables`));
    map.nodes.forEach((n) =>
      list.append(button(n.label, () => onSelect("node", n.id))),
    );
    host.append(list);
  }
}
