# Angular Material Showcase and Full-Parity Benchmark

## Summary

Create `examples/material-showcase`, a standalone Angular 20 SSR application that installs AstylarUI from a freshly packed tarball. It will contain:

- An actual Angular Material 20.0.5 reference implementation.
- An equivalent Astylar implementation driven by shared signals, state, fixtures, theme tokens, IDs, and scenarios.
- A comparison workspace with isolated reference/Astylar frames.
- An internal, app-bundled `showcase.material` Astylar plugin for genuinely Material-specific rendering and motion.
- An enforced benchmark covering all 36 installed Angular Material entry-point families.

Use a standards-first boundary: generic browser behavior belongs in Astylar core; Material-specific geometry and motion belong in the internal plugin.

## Public API and Core Changes

- Add standards-aligned `inputType: 'range'` support:
  - `min`, `max`, `step`, value clamping, single and paired range controls.
  - Pointer dragging/capture, Arrow/Page/Home/End keyboard behavior, focus, `input`/`change` ordering, disabled state, and semantic range values.
- Enrich pointer events with stable pointer identity, buttons, client coordinates, and element-local CSS-pixel coordinates. Internal pointer capture remains owned by the interaction runtime.
- Add `AstylarSurface.focus(elementId, options?)` and `blur()` so application-owned composite widgets can implement roving focus and restoration without private imports.
- Extend `DOMElement` and the semantic bridge with the general ARIA state needed by Material composites: expanded, controls, popup type, pressed, checked, selected, active descendant, autocomplete, orientation, sort, value bounds/text, level, position/set size, and multiselectable.
- Prove each general addition with minimal paired fixtures for range behavior, pointer coordinates, programmatic focus, and composite semantics. Update root exports, capability documentation, packed-consumer proof, and developer-skill references.
- Do not add Material-specific component identities, tokens, slider styling, or animation concepts to Astylar core.

## Showcase Application

- Scaffold an Angular 20 standalone application with SCSS, routing, SSR/hydration, Jasmine/Karma tests, and package-root-only Astylar imports.
- Keep the example as an independent Angular workspace with its own `package.json`, `angular.json`, TypeScript configuration, installed dependencies, build output, and README, mirroring the AI TTS example's packed-consumer workflow.
- Routes:
  - `/compare` â€” token editor and two same-origin isolated frames.
  - `/reference/:family` â€” actual Angular Material implementation.
  - `/astylar/:family` â€” Astylar implementation.
  - `/` redirects to `/compare`; wildcard redirects safely.
- Use a typed same-origin message protocol to synchronize family, theme, state, reset, and benchmark commands between comparison frames.
- Centralize state in a signal-based store. Derive immutable replacement `SiteData`; never mutate meshes or renderer internals from the app.
- Create one catalog manifest containing stable family IDs, measurement IDs, states, interactions, responsive applicability, and expected semantics. Validate it against the installed Angular Material exports so no entry point can be silently omitted.
- Cover all 36 families:
  - Foundations/layout: core, toolbar, sidenav, grid-list, divider.
  - Content/data: badge, card, chips, icon, list, table, sort, paginator, tree.
  - Inputs: form-field, input, autocomplete, checkbox, radio, select, slider, slide-toggle, datepicker, timepicker.
  - Actions/navigation: button, button-toggle, menu, tabs, stepper, expansion.
  - Overlays/feedback: bottom-sheet, dialog, snack-bar, tooltip, progress-bar, progress-spinner.
- Use actual Angular Material components and Material test harnesses in the reference implementation. Use local Roboto and SVG icon assets so builds and visual tests are offline-deterministic.
- Compose the Astylar equivalents from core `SiteData` wherever possible. Date/time pickers, menus, tabs, trees, steppers, autocomplete, and overlays remain application-owned composites using the new general focus and semantic APIs.

### Internal Material Plugin

- Organize the private plugin under the exampleâ€™s `src/app/material-plugin/` feature and expose `provideMaterialShowcasePlugin(config)`.
- Register plugin ID `showcase.material`, version `1.0.0`, schema version `1`, through `provideAstylarPlugin`.
- Contribute namespaced elements for:
  - Ripple/state-layer visuals.
  - Determinate, buffer, query, and indeterminate linear progress.
  - Determinate and indeterminate circular progress.
  - Non-pickable Material range-track/thumb visuals layered over core range inputs.
- Contribute validated indicator, track, state-layer, and stroke properties. Keep canonical namespaced IDs in `SiteData.plugins`, `data`, and `extensions`.
- Scope mutable services and Babylon resources per surface. Own materials, child meshes, observers, timers, late completions, and cleanup through plugin resource owners.
- Live mode animates Material motion; benchmark mode supplies deterministic motion phases. Capture start/held/settled boundaries and require resources to return to a stable plateau rather than pixel-gating every intermediate frame.
- Keep this plugin app-private: it ships in the example bundle but is not exported by the `astylarui` package.

### Runtime Theme Editor

- Define a shared `MaterialThemeConfig` with:
  - `mode: 'light' | 'dark'`
  - six-digit primary, tertiary, surface, and error colors
  - integer density from `-5` through `0`
  - corner scale clamped to `0.5â€“1.5`
  - typography scale clamped to `0.85â€“1.25`
- Resolve it once into immutable tokens. The reference writes corresponding Material system CSS variables and density classes; the Astylar builders consume the identical resolved colors, dimensions, radii, and typography.
- Derive contrasting `on-*` colors deterministically using WCAG contrast; leave unrelated Material system tokens on their light/dark base values.
- Gate four fixed profiles while leaving the editor freely adjustable:
  - Default light: violet Material defaults, density `0`, scales `1`.
  - Default dark: dark Material defaults, density `0`, scales `1`.
  - Compact high-contrast: density `-5`, corner `0.75`, typography `0.9`.
  - Custom profile: teal/coral colors, density `-2`, corner `1.5`, typography `1.15`.

## Verification and Acceptance

- Add packed-example commands for preparation and validation, mirroring the existing TTS workflow: build/package Astylar, copy the tarball into a temporary clean example, install, unit-test, build browser and SSR outputs, prerender safe routes, and reject source/deep imports.
- Add `material-parity:report` and enforced `material-parity:check`; include the enforced check in `parity:release:check`.
- Reuse the existing geometry, SSIM, edge, sharpness, interaction, scrolling, semantics, and resource metrics rather than creating weaker Material-only measures. Add component-local text-ink alignment checks so large blank page regions cannot hide vertically shifted labels.
- Static gate: every family Ã— four canonical profiles at desktop `1440Ã—1000 DPR1`, tablet `768Ã—1024 DPR1`, and mobile `390Ã—844 DPR2`.
- Interaction gate:
  - Representative native behavior for every family at desktop DPR1 and DPR2.
  - Hover, held press, keyboard focus, disabled/selected/error, open/closed, and primary interaction states under all four profiles.
  - Mobile dismissal/responsive flows for overlays, sidenav, menus, pickers, tabs, and autocomplete in light and dark modes.
  - Slider dragging and keyboard boundaries; chips add/remove/select; sorting/pagination; calendar/time navigation; roving focus for composites; dialog/bottom-sheet focus containment and restoration; tooltip timing; snackbar actions; repeated popup dismissal.
- Require exact visible text, values, selection, event ordering, focus identity, semantic roles/names/states, diagnostics, clipping ownership, and reachability.
- Retain the existing enforced visual thresholds: geometry tolerance/edge requirements, per-result SSIM of at least `0.95`, aggregate median of at least `0.98`, and button-label center-offset error no greater than `0.75px`. Do not lower thresholds or alter the Angular Material reference to conceal discrepancies.
- Repeat overlay and animated-plugin cycles to prove observer/resource plateaus, two-surface isolation, remount behavior, stale-work cancellation, and final zero owned resources.
- Run focused checks while implementing, then the full unit/build/capability/example/skill/consumer/parity release matrix and `git diff --check`.

## Assumptions

- â€œMaterial UIâ€ means Angular Material 20.0.5, pinned in the example for deterministic reference output.
- The final acceptance target includes all installed families and broad native keyboard/pointer behavior, but motion is judged at meaningful boundaries plus cleanup rather than every animation frame.
- General missing browser capabilities may modify Astylar core; the internal plugin is reserved for Material-specific behavior.
- This creates a showcase and private plugin, not a separately published Material component package.
- Existing uncommitted text-highlight changes are user-owned and remain untouched unless a demonstrably general interaction change overlaps them.
