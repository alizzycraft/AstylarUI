# Renderer Layout Semantics Roadmap

> **Status (2026-08-15):** Future parity roadmap. The two focused HTML references
> and matching Astylar scenes exist, but screenshot/metric baselines and the
> remaining unchecked tasks have not been completed. This document is a suitable
> starting point for the next parity initiative, not unfinished Phase 1 work.

This document tracks the work required to align the Astylar renderer with browser CSS semantics for the html-kitchen-sink scene and beyond.

---

## Phase 1 – Discovery & Instrumentation

- [ ] **Trace style lifecycle**
  - Instrument `StyleDefaultsService`, `StyleResolver`, and `ElementCreationService` to log the canonical `display`, padding, and min/max properties applied to each node.
  - Confirm the order of precedence between tag defaults, class rules, inline styles, and computed values.
- [ ] **Inspect dimension calculations**
  - Add diagnostic output in `ElementDimensionService` to capture intrinsic text size, padding, border, and min/max contributions before values are returned.
  - Capture raw measurements for `.test-element` and `.section-header` nodes in the html-kitchen-sink dataset.
- [ ] **Flex layout instrumentation**
  - Extend `FlexLayoutService` logging to report the flex-basis, assumed item size, and applied `align-items` / `justify-content` per line.
  - Verify whether gap, wrap, and cross-axis alignment are consuming the same metrics as browsers.
- [ ] **Create focused fixtures**
  - Build minimal site-data entries that isolate `inline-flex` elements with padding/min sizes and another set for headers with fixed heights.
  - Capture baseline renders (screenshots + metrics) for each fixture.

## Phase 2 – Design Updated Layout Pipeline

- [ ] **Display-mode mapping spec**
  - Document desired handling for `inline`, `inline-block`, `inline-flex`, `flex`, and `block` inside the renderer, including which formatting context each maps to and how atomic inline boxes are represented.
  - Decide where display coercion should occur (e.g., within `StyleResolver` vs. `ElementCreationService`).
- [ ] **Formatting-context separation**
  - Define data structures or flags needed to distinguish inline flow, block flow, and flex contexts during layout.
  - Identify any existing shortcuts that collapse these contexts and plan how to remove or gate them.
- [ ] **Intrinsic sizing contract**
  - Specify the calculation order for text metrics → padding/border → min/max → flex-basis so child dimensions stabilize before flex distribution.
  - Decide how percentage-based paddings/margins should be handled relative to parent dimensions.

## Phase 3 – Implementation

- [ ] **Update display normalization**
  - Implement explicit handling for `inline-flex` (and other inline-level containers) so they create atomic flex boxes while remaining inline-level within parents.
  - Ensure `ElementCreationService` assigns the correct layout classification to these nodes.
- [ ] **Enhance intrinsic size calculations**
  - Modify `ElementDimensionService` to add padding, border, and min-size contributions before dimensions are returned to layout consumers.
  - Confirm that width/height defaults (auto, content-based) still behave correctly for purely inline elements.
- [ ] **Flex layout adjustments**
  - Update `FlexLayoutService` to consume the enriched child metrics, resolve `flex-basis` defaults accurately, and honor `align-items` / `justify-content` once child boxes are stable.
  - Review gap handling after size updates to prevent double application or missed spacing.
- [ ] **Alignment enforcement**
  - Validate vertical centering for `.section-header` and `.test-element` children, adjusting cross-axis alignment logic as required.
  - Add safeguards so future display variants still respect alignment properties.

## Phase 4 – Validation & Regression

- [ ] **Re-run html-kitchen-sink comparison**
  - Produce before/after screenshots and size logs, verifying parity with the standalone HTML reference.
  - Document any residual differences and open follow-up issues if needed.
- [ ] **Fixture regression sweep**
  - Execute the dedicated fixtures plus representative app scenes (forms, tables, typography examples) to ensure no regressions.
  - Record metrics in a shared location for future baselines.
- [ ] **Automated checks**
  - Add unit or snapshot tests that assert expected dimensions/alignment for key scenarios (inline-flex button, header height, flex wrap with min-width).
  - Integrate the html-kitchen-sink reference render into CI visual diffing if feasible.

## Phase 5 – Documentation & Rollout

- [ ] **Update developer documentation**
  - Describe the new layout processing order, display mapping, and any new tooling (logs, fixtures).
  - Provide guidance for authoring site-data entries under the revised semantics.
- [ ] **Rollout plan**
  - Determine feature-flag or staged release strategy, including QA checkpoints and communication to consumers.
  - Plan a rollback path in case downstream scenes rely on old behavior.
- [ ] **Future enhancements backlog**
  - Capture stretch goals such as support for additional display modes (`inline-grid`), richer debugging overlays, or automatic HTML-to-site-data diff tooling.
