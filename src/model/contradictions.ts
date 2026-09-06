import type { SystemsMap, Contradiction, ContradictionBranch } from "./types";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;
export function normaliseContradictions(
  value: unknown,
  map: SystemsMap,
): Contradiction[] {
  if (value === undefined) return [];
  const warn = (message: string) =>
    map.diagnostics.push({ level: "warning", message });
  if (!Array.isArray(value)) {
    warn("Contradictions must be an array.");
    return [];
  }
  const result: Contradiction[] = [];
  const used = new Set<string>();
  const index = new Map(map.edges.map((e) => [e.id, e]));
  for (const entry of value) {
    const id = record(entry) && text(entry.id) ? entry.id : "Contradiction";
    if (
      !record(entry) ||
      !text(entry.id) ||
      !text(entry.title) ||
      !text(entry.question) ||
      !text(entry.description) ||
      !text(entry.caveat) ||
      !Array.isArray(entry.branches) ||
      entry.branches.length < 2
    ) {
      warn(
        `${id}: a contradiction needs a title, question, explanation, caveat and at least two branches.`,
      );
      continue;
    }
    if (used.has(entry.id)) {
      warn(`${id}: duplicate contradiction ID.`);
      continue;
    }
    used.add(entry.id);
    const branches: ContradictionBranch[] = [];
    let valid = true;
    for (const branch of entry.branches) {
      if (
        !record(branch) ||
        !text(branch.title) ||
        !text(branch.explanation) ||
        !Array.isArray(branch.edges) ||
        !branch.edges.length ||
        !branch.edges.every(text)
      ) {
        warn(`${id}: invalid branch definition.`);
        valid = false;
        continue;
      }
      const ids = branch.edges as string[],
        missing = ids.filter((id) => !index.has(id));
      if (missing.length) {
        warn(`${id}: unknown branch edges ${missing.join(", ")}.`);
        valid = false;
        continue;
      }
      const edges = ids.map((id) => index.get(id)!);
      if (edges.some((e, i) => i > 0 && edges[i - 1].target !== e.source)) {
        warn(`${id}: branch “${branch.title}” is not traversable.`);
        valid = false;
        continue;
      }
      branches.push({
        title: branch.title,
        explanation: branch.explanation,
        edgeIds: ids,
        nodeIds: [edges[0].source, ...edges.map((e) => e.target)],
      });
    }
    if (!valid) continue;
    const sources: string[] = [];
    if (entry.sources !== undefined) {
      if (!Array.isArray(entry.sources)) {
        warn(`${id}: sources must be a list of HTTPS links.`);
      } else
        for (const source of entry.sources) {
          try {
            const url = new URL(String(source));
            if (url.protocol !== "https:" || url.username || url.password)
              throw new Error();
            sources.push(url.href);
          } catch {
            warn(`${id}: unsupported source URL was omitted.`);
          }
        }
    }
    result.push({
      id: entry.id,
      title: entry.title,
      question: entry.question,
      description: entry.description,
      caveat: entry.caveat,
      branches,
      sources,
      edgeIds: [...new Set(branches.flatMap((b) => b.edgeIds))],
      nodeIds: [...new Set(branches.flatMap((b) => b.nodeIds))],
      uncertain: branches.some((b) =>
        b.edgeIds.some((id) => index.get(id)?.uncertain),
      ),
    });
  }
  return result;
}
