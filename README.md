# SILO — interactive systems map

A local, static viewer for the supplied Silo causal model: 47 variables, 81 directed relationships, five domains, 356 feedback loops, six approved pathways and eight contradictions. DOT describes the input; D3 computes the layout.

Explore the published map at **https://gauden.github.io/silo-systems-map/**.

## Run locally

Use Node.js 22.12+ (or a newer supported version) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173). The map loads automatically.

```sh
npm test                 # parser, semantics, data preservation and view tests
npx playwright install chromium
npm run test:browser     # desktop/mobile, keyboard, touch and safety checks
npm run build            # TypeScript check and static production bundle
npm run preview          # preview dist/ locally
```

The production output is `dist/`. Serve it through a static HTTP server; opening `index.html` directly with `file://` is unsupported because the app uses a module worker. Pushes to `main` publish the tested build through GitHub Pages.

## Explore

- **Model:** the complete system. Domain buttons combine by union; only links between visible variables remain.
- Loop, pathway, contradiction and domain-filter selections run 32 fresh force-directed candidates from independently randomised positions and score node overlap, curved-edge crossings and paths through unrelated nodes. The lowest-scoring arrangement is refined by trying position swaps and nudges for subsets up to 24 nodes, accounting for the viewport shape. Narrow pathways include a compact two-column candidate. This reduces clutter; it is not a promise that every future graph can be drawn without crossings.
- **Loops:** all elementary directed cycles, with rotational duplicates removed. Select a loop to show only its member edges and variables.
- **Pathways:** the six approved ordered sequences. Their definitions are in the DOT metadata.
- **Contradictions:** eight system tensions, each with competing causal branches, explanations and caveats. Select one to show its branch relationships and run a fresh layout.
- **Select a variable:** focus it and its first-degree incoming/outgoing neighbours from the full map. Other filters clear. Only relationships incident to the selected variable are shown.
- **Drag a variable:** the surrounding nodes react. Release it to let the system settle. Dragging does not trigger selection or change the source model.
- **Select a relationship:** read its meaning and metadata without changing the current view.
- **Search:** highlights and lists matching variables in the current view. Selecting a result focuses its neighbourhood.
- **Fit / zoom / pan:** use the viewport controls, mouse wheel, background drag or touch gestures. Filtering fits automatically; dragging does not move the camera.
- **New layout (⟳, bottom left):** reshuffle and refit the current view while retaining its nodes, links and filters. Also works on the full model.
- **Reset map:** restore the full model, or restart the worker after an error.

Keyboard: Tab through controls and graph entities; Enter/Space select; Left/Right arrows move between the Model/Loops/Pathways/Contradictions tabs. All variables are also available in the textual index in the overview. On narrow screens, the detail panel sits below the graph. Reduced-motion preferences suppress automatic motion; direct dragging retains feedback.

## Source and semantics

`inputs/MAP.dot` is the bundled source. The expanded model preserves every original variable, relationship and label while adding explicitly inferred links and variables. `tests/fixtures/original.dot` preserves the initial map; `tests/fixtures/mvp.dot` preserves the approved 36-variable MVP. Change the source and rebuild to update the viewer; there is no in-app editor or file upload.

Supported metadata:

- Unique edge `id` values reference relationships from structured annotations.
- `sm_polarity="+"` or `"-"` specifies causal direction. The original Unicode `−` labels remain unchanged.
- `sm_uncertain="true"` marks uncertain positive or negative relationships. It does not assert an evidence category or confidence level.
- `sm_delay="unspecified"` marks a delayed relationship; no duration is invented.
- One `@systems-map` block comment holds version-1 JSON with `pathways`, `loopAliases` and `contradictions`. Each entry has an `id`, `title` and ordered `edges` list; pathways may include a `question`. R1/R2 aliases name discovered cycles and do not restrict discovery.

Contradictions contain `id`, `title`, `question`, `description`, `caveat`, and two or more `branches` with a title, explanation and ordered edge IDs. Optional `sources` accept HTTPS URLs only. Added relationships carry `sm_evidence="inferred"` and `sm_description`; explanations appear in the details panel. See `docs/model-expansion.md` for interpretation.

Loops have no repeated nodes except their closing return. An even number of negative edges is reinforcing; an odd number is balancing. Missing polarity yields unknown. 198 current cycles contain uncertain links, so their classification is conditional on the supplied signs. Repeated laps are not separate loops.

Invalid metadata generates right-panel diagnostics while valid DOT remains available. Invalid pathways, aliases and contradictions are disabled individually. DOT syntax errors include line/column where available. Surveillance and informal knowledge transmission now connect to governance, enforcement and technical capability.

This MVP supports the supplied directed DOT dataset, not arbitrary Graphviz rendering semantics. Layout/style attributes are retained as source data but do not control SVG. HTML-like labels are never interpreted as page HTML. Parallel edge identities are preserved in the model, but complex parallel-edge/port/subgraph-endpoint rendering is outside this dataset's acceptance scope.

## Architecture

- `src/model/parse.ts`: bounded DOT parsing, node/edge/domain normalisation, metadata extraction from actual comments.
- `src/model/semantics.ts`: annotation validation and exhaustive elementary-cycle discovery.
- `src/model/contradictions.ts`: validation of multi-branch tensions and HTTPS context references.
- `src/model/view.ts`: pure visible-subgraph selection.
- `src/graph/worker.ts`: parsing, cycle discovery, force layout and reactive dragging off the UI thread.
- `src/graph/layout.ts`: multiple force-directed starts and scoring of their geometry.
- `src/graph/geometry.ts`: shared curved-edge geometry used for drawing and scoring.
- `src/graph/canvas.ts`: SVG construction, curved polarity links, viewport and pointer handling.
- `src/ui/panel.ts`: textual details and signed causal sequences.
- `src/main.ts`: view state and controls.

The force simulation receives copies of nodes/links so D3 mutation cannot alter the source model. Each request receives a fresh random seed; a fixed seed reproduces the same layout for regression checks. Actual text widths inform rectangular collision handling. Reciprocal links use separate curves; blue/red links retain explicit signs and matching arrowheads.

## Privacy and failure limits

Runtime scripts and source data are bundled locally. There are no CDN fonts/scripts, analytics, uploads, accounts or external data requests. Package installation needs network access. Fresh offline launches/service-worker caching are not included.

Input limits: 256 KiB, 256 nodes, 1,024 edges, 24 nested subgraphs, 16 HTML-label nesting levels and 128 chained edge depth. Cycle discovery has a two-second computation limit; the UI restarts processing on Reset after an eight-second timeout. If discovery exceeds its budget, diagnostics explicitly report incomplete discovery rather than presenting a silently truncated list. Layout results carry revisions so old requests cannot replace newer views. A failed replacement layout retains the last successful drawing.

SVG is constructed with safe DOM APIs and text content; arbitrary source URLs, event handlers and CSS are never installed. No raw source-derived HTML is inserted.

## Verification

See `TODO.md` for phase completion and `inputs/PLAN.md` for the approved scope. 24 unit tests and 15 browser tests cover the expanded dataset, all eight contradictions, all original MVP loops/pathways, neighbourhood focus, desktop/mobile fit, keyboard focus, mouse/touch dragging, malformed input, inert labels and same-origin requests. Visual checks are captured locally under ignored `output/playwright/`.
