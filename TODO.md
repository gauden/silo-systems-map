# Silo MVP TODO

**Plan approved 6 September 2026. Implement locally with tests first in each phase. No public deployment.**

## Phase 0 — plan and data contract

- [x] Review original plan and user constitution.
- [x] Capture the user's scope decisions: Silo-only automatic loading; TypeScript stack; no cases or authoring; right-panel errors; hide and fit filters.
- [x] Inspect `inputs/MAP.dot` and record its actual content.
- [x] Rewrite the plan for the narrowed MVP.
- [x] Resolve D1: automatically discover all elementary directed cycles (12 in the supplied map).
- [x] Resolve D2 scope: include pathways proposed for user review.
- [x] Approve the six proposed pathway sequences/titles in PLAN.md.
- [x] Resolve D3: annotate MAP.dot after plan approval; preserve topology/labels and use approved sign, uncertainty and delay interpretations.
- [x] Resolve D4 scope: compact force-directed re-layout for filtered graphs.
- [x] Drop Graphviz rendering; retain DOT parsing and use force-directed SVG layout throughout.
- [x] Confirm settled layout versus draggable/reactive simulation expectations.
- [x] Resolve any remaining interaction/content questions and incorporate answers.
- [x] Obtain explicit user green light for the final revised plan.

## Phase 1 — automatic loading and faithful rendering

- [x] Write failing model/loading/security tests.
- [x] Implement approved scaffold, bundled loading, safe worker rendering and identity mapping.
- [x] Pass relevant tests and verify automatic rendering in the browser.
- [x] Mark phase complete before proceeding.

## Phase 2 — systems annotations and validation

- [x] Write failing tests for the approved annotation and validation contract.
- [x] Implement approved metadata, exhaustive elementary-cycle discovery and approved pathways.
- [x] Verify source topology/labels are preserved and diagnostics appear in the right panel.
- [x] Pass relevant tests and mark phase complete.

## Phase 3 — exploration and filters

- [x] Write failing tests for selection, hiding, fit, reset, search and focus behaviour.
- [x] Implement approved views, details, filters, reactive dragging, first-degree node focus, reference-style curved polarity links and multiple-candidate layout optimisation.
- [x] Pass relevant unit/browser tests and mark phase complete.

## Phase 4 — acceptance and documentation

- [x] Complete responsive/accessibility and performance verification.
- [x] Write README and sandbox/README.md.
- [x] Run final relevant tests and production build; review visual output.
- [x] Confirm definition of done and tick completed work.

Implementation, dependency installation, approved annotations and local verification are authorised. Public deployment is excluded.

## Final verification — 6 September 2026

- `npm test`: 18 tests passed, including source preservation, all 12 cycles, pathway validation, visible membership and layout scoring.
- `npm run test:browser`: 12 browser tests passed, including mouse/touch dragging, first-degree focus, all loops/pathways, desktop/mobile fit, keyboard selection, inert source labels and failure recovery.
- `npm run build`: TypeScript and production build passed.
- Production HTTP preview: all 36 nodes loaded; no browser errors or external requests observed.
- Desktop, portrait and landscape screenshots reviewed under `output/playwright/`; narrow pathways use a readable compact arrangement.
- Runtime stays local. No publication or git commit performed.

## Extension — connections and contradictions (authorised)

### A. Extend the DOT source first
- [x] Write failing source-contract tests for connected Surveillance/knowledge transmission, preserved original content and eight multi-branch contradictions.
- [x] Add inferred governance/knowledge links and annotated contradiction definitions to MAP.dot; retain original topology as a subset.
- [x] Validate all contradiction branches against source edges and check cycle-discovery size.

### B. Contradictions view
- [x] Write failing model/browser tests for validation, exact subgraph membership and the new tab.
- [x] Add generic contradiction normalisation, paired explanations, inferred-link details and safe source references.
- [x] Reuse hiding, force-directed untangling, fit, node focus and dragging.

### C. Verify and document
- [x] Update dataset-sensitive tests, preserve original-MVP fixtures, and run unit/browser/build checks.
- [x] Inspect the new tab at desktop and mobile widths; document new semantics and model caveats.

Extension verification: 23 unit tests and 13 browser tests passed. TypeScript and production build passed after formatting. Desktop and mobile contradiction screenshots reviewed. Current DOT contains 47 variables, 81 relationships, 356 discovered cycles and eight validated contradictions. All original nodes and relationships remain preserved.

## Extension — fresh layouts (authorised)
- [x] Write regression tests for seeded fresh starts and a New layout control preserving the selected subgraph.
- [x] Diversify starting positions and improve contradiction untangling; add bottom-left control.
- [x] Run unit/browser/build checks and inspect the reported contradiction.

Fresh-layout verification: 24 unit tests, 15 browser tests and production build passed. New layout preserves graph membership across domain, loop, pathway and contradiction selections. Desktop/mobile screenshots reviewed.

## Milestone publication — GitHub Pages (authorised)

- [x] Add a tested GitHub Pages build and deployment workflow.
- [x] Document the public repository and live map URL.
- [x] Run unit, browser and production-build checks for the publishable artifact.
- [x] Commit the complete milestone and push it to a new public GitHub repository.
- [x] Enable GitHub Pages, verify the deployment, and add the live URL to the repository description.

Publication verification: GitHub Actions passed its test, build and deploy jobs. The public HTTPS page returned 200 and loaded all 47 nodes and 81 relationships without browser errors. The repository description and homepage both reference the deployed map.

## Blog attribution (authorised)

- [x] Add the author's blog post prominently near the top of the README.
- [x] Replace the polarity footer sentence with a visible linked authorship credit and linked logo.
- [x] Verify the link, desktop/mobile presentation, tests and production build.
- [x] Keep the local planning document out of the repository and remove its public-tree reference.
- [x] Commit, publish through GitHub Pages and verify the live link.

Attribution verification: 24 unit tests and 16 browser tests passed, together with the production build. Desktop and mobile layouts were reviewed. GitHub Pages deployed commit `465ce11`; the live logo and “Read the blog post” link resolve to the author’s essay. `inputs/PLAN.md` remains local and ignored, and is absent from the current GitHub tree.

## Poster-inspired dark cinematic theme (authorised)

### A. Theme contract

- [x] Add failing checks for the approved semantic palette, domain colours and WCAG AA contrast.
- [x] Preserve positive `#6DABE6` and negative `#E5868C` causal colours exactly.

### B. Interface recolour

- [x] Apply semantic tokens across surfaces, controls, panels, nodes, cards and states.
- [x] Replace decorative blue, purple and pink with poster greens, olive and gold while retaining semantic error colours.
- [x] Preserve structure, typography, graph behaviour, accessibility states and attribution links.

### C. Verification and publication

- [x] Run unit/browser tests and production build.
- [x] Review full model, domain and contradiction at desktop, portrait and landscape sizes.
- [ ] Commit the theme milestone, push to `main`, and verify GitHub Pages.
