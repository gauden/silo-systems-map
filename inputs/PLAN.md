# Silo Systems Map — MVP Plan

**Status: approved by the user on 6 September 2026. Implementation authorised.**

This plan supersedes the earlier generic DOT authoring-tool proposal. The user approved all six proposed pathways and requested draggable nodes with responsive physics. Implementation, local preview and testing are authorised; public deployment remains excluded.

## 1. Objective and approved scope

Build a static, interactive web page devoted to the Silo systems map in `inputs/MAP.dot`. Load the bundled map automatically on opening the page. No backend is required.

“Static” means a static web application: the graph still supports selection, exploration, pan, zoom and filters. The current dataset is the acceptance target. Generic authoring is deferred.

Confirmed by the user:

- Automatically load the supplied Silo map; no input/upload/editor workflow.
- TypeScript, Vite, Vitest and Playwright are approved exceptions to the preferred Python stack.
- Focus on this dataset rather than arbitrary DOT compatibility or large-graph scalability.
- Keep valid graph content usable when systems annotations are invalid; display errors in the right panel.
- Exclude cases from the MVP.
- Filters completely hide excluded elements and fit visible elements to the graph viewport.
- Match the reference link treatment: curved links, prominent strokes, blue positive links and red negative links, with signed labels and matching arrowheads.
- DOT is the input language only. Remove Graphviz/Viz.js rendering and use a force-directed graph renderer.

## 2. Source-data inventory

The supplied `inputs/MAP.dot` currently contains:

- 36 nodes, 47 directed edges and five clusters.
- Graph title: “SILO: Survival, Stasis and Systemic Contradiction”.
- Clusters: Governance and control; Knowledge and adaptation; Engineering and material system; Spatial and social structure; System outcomes.
- Edge labels: 30 `+`, 14 Unicode `−`, one `+ | delay`, and two `+?`.
- Comments naming R1 “Control lock-in” and R2 “Manufactured ignorance”.
- Additional thematic sections and cycles, without structured pathway or loop declarations.
- No `sm_*` attributes or `@systems-map` block.
- One isolated node, “Surveillance”. Preserve it; do not invent connections.

Treat supplied nodes, edges, labels and topology as authoritative input. Do not invent evidence, confidence, sources, descriptions, causal links or a narrative canon boundary. Any proposed content enrichment must be distinguishable from supplied content and approved before incorporation.

The inventory above is a planning inspection, not an implemented DOT parser.

## 3. Confirmed decisions and remaining review

### D1. Discover all cycles — confirmed

Automatically enumerate all elementary directed cycles: no repeated node except the closing return to the start. Repeated laps are not separate loops. Deduplicate rotations of the same directed edge sequence; do not merge genuinely different cycles. Include uncertain edges in discovery and mark affected results. Use deterministic ordering/IDs; preserve R1/R2 as display aliases matched to their exact edge sequences. Other cycles receive neutral generated labels and a readable sequence, without invented substantive names.

A read-only planning analysis of the current dataset found **12 elementary directed cycles: six reinforcing and six balancing using the supplied signs; four include uncertain `+?` links** (two of each type). This is the expected dataset acceptance count, to be verified by implementation tests rather than treated as proof of algorithm correctness. Classifications involving uncertain links must say they are conditional on the supplied signs.

The implementation must enumerate all 12 without a silent length cap or arbitrary truncation. Run discovery off the main thread with cancellation/time limits and report an incomplete enumeration explicitly if a future changed input exceeds limits. Test small known graphs independently of this dataset, including cycles sharing edges and rotational duplicates.

R1 sequence: Enforcement intensity → Compliance → Political stability → Enforcement intensity. All three links are positive.

R2 sequence: Knowledge suppression → Historical knowledge → Official narrative → Compliance → Pact rigidity → Knowledge suppression. Two of its five links are negative.

Both named loops compute as reinforcing. Their labels supplement discovery; declarations do not restrict the discovered set.

### D2. Include pathways — all six routes approved

Include a Pathways view with curated sequences proposed below. Every consecutive pair has a directed edge in the supplied map. These are proposed navigation routes, not new causal claims or new edges. The user approved these titles, questions and sequences.

1. **Adaptation and survival** — How does practical skill connect to survival? Practical technical skill → Curiosity → Experimentation → Innovation → Adaptive capacity → System resilience → Population survival.
2. **Political cost of innovation** — How does innovation trigger constraints on adaptation? Innovation → Perceived political threat → Enforcement intensity → Restricted technology → Adaptive capacity → System resilience → Population survival.
3. **Material fragility** — How does scarcity connect to survival through repair and failures? Component scarcity → Repair capability → Infrastructure reliability → Infrastructure failures → Systemic fragility → Population survival.
4. **Spatial control and dissent** — How do transport restrictions connect to coordination and dissent? Pact rigidity → Restrictions on vertical transport → Travel friction → Information delay → Collective coordination → Dissent → Perceived political threat.
5. **Information resistance** — How could enforcement connect to dissent through preservation? Enforcement intensity → Clandestine preservation → Historical knowledge → Dissent → Perceived political threat. Explicitly flag both uncertain links.
6. **Maintenance response** — How do ageing and failure stimulate repair? Infrastructure age → Infrastructure failures → Maintenance burden → Improvisation → Repair capability → Infrastructure reliability. Explicitly flag the unspecified delay on the first link.

Selecting a pathway shows only its sequence nodes and member edges, followed by compact layout and fit. Show ordered signed steps and any uncertainty/delay in the panel. Overlap with discovered loops may be shown as shared-edge membership, without asserting an additional causal relationship.

The original Paper, Water, Staircase, Magnification, Generator, Medicine, Electronics, Oral memory and Succession pathways are not supported as specified by this dataset and are excluded.

### D3. Annotate MAP.dot — confirmed, after plan approval

Add explicit metadata while preserving every original node, edge and label:

- `−`: negative causal polarity (`sm_polarity="-"`).
- `+?`: positive causal polarity with uncertainty (`sm_polarity="+"`, `sm_uncertain="true"`). This does not assert an evidence category or confidence level.
- `+ | delay`: positive causal polarity and an unspecified delay (`sm_polarity="+"`, `sm_delay="unspecified"`).
- Plain `+`: positive causal polarity. Absence of `?` does not imply high confidence or observed evidence.

Use stable explicit edge IDs and one versioned `@systems-map` JSON comment for approved pathway sequences and optional R1/R2 aliases. It does not need to list all cycles, which are computed. Resolve structures by explicit edge IDs and validate continuity. Unknown metadata remains preserved. No sidecar is needed. Do not edit MAP.dot during planning.

### D4. Compact force-directed filtering and reactive dragging — approved

After a loop, pathway or cluster filter changes visible membership, remove excluded entities from the rendering input, run a force-directed layout on the visible subgraph, and fit the result with padding. Preserve edge direction and original labels; node spacing and readable text take precedence over preserving full-model coordinates.

Use `d3-force` to compute node positions and an application-owned SVG renderer for nodes, directed edges and labels. Apply force-directed layout to both the full Model and filtered views. No Graphviz engine, Viz.js or Graphviz WASM is needed. DOT layout attributes such as `rankdir`, `splines` and `overlap` remain in the source but do not control this renderer.

After loop, pathway or domain-filter selection, try seven fresh force-directed candidates, including a causal-order starting arrangement, and select for fewer node overlaps, curved-edge crossings and paths through unrelated nodes. This user-requested refinement applies before automatic fit and accounts for viewport shape, with a compact serpentine candidate for pathways.

Use repulsion, links, centring and collision handling based on measured label/node bounds, with enough spacing for long names. Keep both directions of reciprocal edges separately visible with distinct curved paths and arrowheads clipped to node boundaries. Position edge labels so polarity remains readable. Isolated Surveillance must remain visible in Model. Deterministic initial positions, fixed simulation settings and stable ordering should give repeatable settled layouts for a given view.

**Approved interaction:** users can drag nodes while surrounding nodes react through the force simulation. Pin the dragged node only during the gesture, reheat nearby physics and release it on drop. Use pointer capture, distinguish dragging from clicking/panning, and handle cancellation. Fit after a filter layout settles, never continuously during dragging or manual pan/zoom. Respect reduced motion by keeping initial layout settling offscreen while preserving direct dragging feedback.

Use cluster membership for colour, textual labels, filters and panel content without cluster bounding boxes constraining the layout. Node and edge labels are preserved as text; exact Graphviz styling is not an acceptance requirement. Stale layout requests must never replace newer selections; show a loading state and preserve the last successful view on failure. Do not run physics on hidden nodes.

## 4. Explicit exclusions

- General-purpose DOT authoring, paste input, file opening, drag/drop and formatting.
- Cases and a Cases tab.
- Multiple datasets, example selector and genericity acceptance tests.
- Arbitrary remote DOT loading, uploads, backend, database, accounts and analytics.
- Evidence/confidence filters unsupported by the supplied dataset.
- DOT/SVG downloads, standalone HTML compiler, web component, CLI and other exports.
- Browser persistence and share-state/deep-link routing for this first iteration.
- Deployment to a public host; hosting destination and publication require a separate instruction.
- Full compatibility promises for arbitrary DOT and speculative large-graph optimisation.

Keep parsing, graph interaction and UI separate so future expansion remains possible, without building that future product now.

## 5. Page and interactions

Automatically show the full Silo model on first load. Use a title/header, compact controls, a graph viewport, a right-hand detail panel and a data-derived legend. The earlier reference page is an interaction reference, not a confirmed pixel-perfect design target. Its appearance has not yet been visually verified.

Desktop: graph roughly 70%, panel roughly 30%. Narrow screens: controls, graph, details stacked without page-level horizontal overflow.

Required controls:

- Model, Loops and Pathways views.
- Cluster/domain selection derived from the five supplied clusters.
- Search by node name, with selectable matches.
- Pan, zoom, Fit and Reset.

Approved interaction rules:

- Model initially shows all 36 nodes and 47 edges, including isolated Surveillance.
- Selecting a node focuses the selected node and all first-degree incoming/outgoing peers from the full source graph, shows its incident edges, re-layouts and fits. This clears other graph filters. Selecting an edge only updates the panel. Dragging does not select/focus. Reset returns to the whole map.
- Selecting a loop shows only that loop’s nodes and member edges, then performs compact force-directed layout and fits them.
- Selecting clusters shows their nodes and edges whose two endpoints are visible; multi-selected clusters combine by union.
- Selecting a loop or pathway clears cluster restrictions; selecting a cluster returns to Model. This prevents an unrelated filter from silently breaking a loop sequence.
- Search highlights matches within the current visible scope and provides a selectable result list. Search does not restore hidden elements or trigger layout on each keystroke.
- Empty results show a clear empty-state message and Reset control; fitting an empty set must be safe.
- Reset returns to the complete model in its agreed default layout, clears search/filters/selection and fits it.
- Hidden nodes and edges are also removed from keyboard navigation and assistive-technology exposure. Hide empty cluster decorations and avoid full-graph backgrounds or hidden groups distorting the fit calculation.
- Fit includes visible edge curves, arrowheads and labels, with viewport padding. Respect reduced-motion preferences.

## 6. Right-hand panel and legend

Nothing selected: graph title, node/edge counts, cluster summaries, a concise explanation of the controls and any diagnostics.

Node selected: original label, cluster, incoming and outgoing relationships, and membership of supported curated structures. Preserve isolated nodes with an explicit “no connections” description rather than an error.

Edge selected: source, target, original label and confirmed interpretation of polarity, uncertainty and delay. Clearly distinguish missing metadata from an asserted value.

Loop selected: title, ordered causal sequence, polarity of each step, negative-link count, computed type and annotation warnings. Compute reinforcing/balancing using negative-link parity only for a valid directed closed sequence with known signs. Missing signs yield unknown; uncertain signs must remain visible as a caveat rather than an unqualified causal conclusion.

Diagnostics remain accessible in the right panel regardless of selection. Show useful DOT line/column information when available. Invalid curated structures are disabled individually while valid graph content remains interactive. Never silently drop invalid annotations.

Legend describes only approved semantics present in this dataset. Preserve original DOT labels; do not rely on colour alone to communicate polarity or uncertainty.

## 7. Architecture and data fidelity

Approved stack: TypeScript + Vite + vanilla DOM APIs; Vitest for unit/model tests and Playwright for browser tests. No runtime Python dependency or backend. Use a single documented Node package manager and lockfile; exact dependency versions are selected and verified after approval.

Use `@ts-graphviz/ast` solely as a DOT parser, `d3-force` for layout and `d3-zoom` for viewport interaction. Import only required modules. Render SVG using safe DOM APIs. Verify parser APIs and applicable limits after approval. The parser package name does not imply a Graphviz rendering dependency.

Pipeline:

1. Bundle MAP.dot as a local build input and load automatically, with no runtime external data request.
2. Parse DOT and extract approved annotations.
3. Normalise nodes, edges, cluster membership, labels and approved metadata; retain other source attributes without applying arbitrary styling.
4. Validate graph-to-annotation references, discover all elementary directed cycles and derive diagnostics.
5. Derive the visible nodes and edges and compute force-directed positions in a worker, using measured node bounds supplied from the UI.
6. Construct SVG elements with safe DOM APIs, controlled IDs, arrowheads, edge paths and text labels linked directly to model entities.
7. Apply selection; derive filtered rendering input and recompute force-directed layout when membership changes, then fit according to D4.

Keep the normalised source model separate from mutable simulation nodes/links: force simulations must not change source identities or topology. Map SVG elements directly to model IDs. Generated identities need be deterministic for this unchanged dataset; persistence across arbitrary future edits is not an MVP guarantee.

Retain source attributes in the internal model, but only interpret the explicit supported data contract (graph title, node/edge labels, cluster membership, stable IDs and approved systems metadata). Ignore Graphviz geometry and arbitrary style/resource attributes. Do not interpret DOT HTML labels as executable markup. Use safe internal DOM identifiers rather than raw labels as selectors. The panel and visible graph must agree with the supplied relationships.

Parsing and rendering failures on initial load show a useful right-panel error and retry/reset affordance. Do not display stale or misleading graph content. Where a later render fails, preserve the last successful graph and label the failed request clearly.

## 8. Security, privacy, accessibility and performance

Build these into the first working phase:

- Bundle runtime assets locally; no CDN scripts, fonts, telemetry or graph-data transmission.
- Use `textContent` for panel and SVG labels; construct SVG with `createElementNS` and controlled attributes. Never insert DOT-derived HTML/SVG strings or apply arbitrary URL/style/event attributes. External resources and hyperlinks are unsupported.
- Constrain input/model size with limits comfortably above this dataset and document the measured values. Verify parser-limit support rather than assuming option names.
- Keep cycle discovery and force-layout computation off the UI thread, with a timeout/cancellation path and protection against outdated render results replacing the current view.
- Provide keyboard-accessible controls, graph selection and a textual relationship list in the panel, visible focus and colour-independent meaning.
- Hidden graph elements cannot retain focus. Move focus predictably when a filter hides the selected item.
- Pan/zoom and fitting work on touch screens. Tests cover desktop and mobile layouts.
- Do not recompute layout for ordinary selection, panel changes or search. Filters that change visible membership re-run force-directed layout; identical cached selections may reuse a settled result.

A bundled static app needs no external services during use. Installation/build tooling may fetch dependencies after implementation approval. Installing an offline-first service worker or guaranteeing a fresh offline launch is not included.

## 9. Test-first implementation phases — approved

Maintain root `TODO.md`. For each phase: write meaningful failing tests, implement, run the relevant checks, review the result, then tick the phase before starting the next. Do not defer tests, security or accessibility until a final pass. Do not commit or publish automatically as a side effect of a phase.

### Phase 0 — settle plan and data contract

Complete: all pathways, force-directed rendering, reactive dragging and the final implementation plan are approved.

### Phase 1 — automatic loading and faithful rendering

After approval, scaffold the approved browser stack, add loading/error UI and render the bundled map. Establish safe SVG construction, worker lifecycle and entity mapping immediately.

Tests first: source inventory (36 nodes, 47 edges, five clusters), source attribute retention, Unicode labels, isolated Surveillance, controlled IDs and failures. Browser acceptance: page automatically loads the map without any author input; SVG and model selections correspond.

### Phase 2 — systems annotations and validation

Apply approved metadata decisions without changing original topology/labels. Discover all elementary directed cycles and add approved pathways and R1/R2 aliases.

Tests first: reference resolution, exhaustive elementary-cycle discovery on small known graphs, rotational deduplication, 12 cycles in MAP.dot, R1/R2 aliases and reinforcing parity, invalid/missing sign, uncertainty and unspecified delay, pathway validation, invalid structure diagnostics and recovery. If annotation syntax fails, valid DOT still renders; disable dependent pathways/aliases while topology-based cycle discovery remains available with unknown signs where metadata is unavailable.

### Phase 3 — exploration and filters

Implement the detail panel, discovered-loop selection, approved pathways, cluster filters, search, hiding, force-directed re-layout, fit, pan/zoom and reset.

Tests first: exact visible node/edge membership, exclusion of nonmember chords in loop views, fit to visible content, empty state, filter precedence, search scope, keyboard focus and reset restoration. Verify fitting in the real browser.

### Phase 4 — acceptance and documentation

Complete responsive and accessibility verification, performance/cancellation checks and concise README documentation. Provide a `sandbox/` folder with a README reserving it for future Marimo experiments; no Python toolchain or Marimo dependency is needed for this MVP.

Browser checks: automatic startup, node/edge details, each of the 12 discovered loops, each approved pathway, each cluster, uncertainty/delay display, invalid-annotation right-panel errors, touch/pan/zoom, keyboard selection and hidden-element focus behaviour. Verify desktop (1440×900), mobile portrait (390×844) and mobile landscape (844×390), adding other sizes only where problems warrant them.

Document local install/build/preview, data location, approved semantics, limitations and how to update the bundled map. Run the production build and relevant tests. Review the finished viewer with the user; public deployment remains separate.

## 10. Definition of done

- Opening the app automatically displays the supplied Silo map.
- Source topology and labels remain intact; all 36 nodes and 47 edges appear in Model.
- Model, all 12 discovered loops and approved pathways work; Cases and authoring controls are absent.
- Filters hide excluded elements and fit the visible content using the agreed geometry policy.
- Selection, search, pan, zoom, fit and reset work on desktop and mobile.
- Right-panel details and diagnostics are accurate and accessible.
- Polarity, uncertainty, delay and loop classification follow the approved data contract.
- No graph data leaves the browser; required runtime assets are bundled.
- Meaningful unit/browser checks and the production build pass.
- README and TODO.md accurately reflect delivery and verification.

## 11. References retained for implementation verification

- Interaction reference: https://slides.gaudengalea.com/reclaiming/cdoh.html
- DOT language: https://graphviz.org/doc/info/lang.html
- D3 force simulation: https://d3js.org/d3-force
- D3 collision handling: https://d3js.org/d3-force/collide
- ts-graphviz: https://github.com/ts-graphviz/ts-graphviz

References do not override the narrowed scope or the explicit implementation approval gate.


## 12. Approved extension — connections and contradictions

The subsequent user request authorises expanding MAP.dot first and adding Contradictions alongside Model, Loops and Pathways. Original nodes, edges and labels remain a preserved subset; the current model has 47 nodes and 81 edges. The earlier 36/47/12 acceptance counts describe the original MVP fixture. Exhaustive discovery now returns 356 elementary cycles.

Connect Surveillance and Informal knowledge transmission to enforcement, coordination and technical capability. Represent eight tensions as multi-branch DOT metadata: adaptation/control, knowledge/relics, paper/publication, surveillance/knowledge, distance/coordination, reuse/relics, truth/punishment and surveillance maintenance. New links are explicitly modelling inferences, with conditional signs where needed.

The maintenance example includes equipment ageing, replacement electronics and covert maintenance capacity. Do not equate generic manufacturing with chip fabrication or missing on-screen infrastructure with proven absence. Likewise, publication barriers do not imply no rebellion exists. Show competing branches and caveats in the detail panel. Contradiction selection hides unrelated elements, runs fresh force-directed candidates and fits the graph; focus and drag retain existing behaviour.

Validate definitions and exact visible membership, preserve original-MVP regressions, exercise all eight contradictions in the browser, and review desktop/mobile layouts before completion.
