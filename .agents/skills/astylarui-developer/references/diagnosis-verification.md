# Application Diagnosis and Verification

## Contents

- [Triage order](#triage-order)
- [Common application causes](#common-application-causes)
- [Distinguish translation from renderer defects](#distinguish-translation-from-renderer-defects)
- [Create a public minimal reproduction](#create-a-public-minimal-reproduction)
- [Choose verification](#choose-verification)
- [Review checklist](#review-checklist)

## Triage order

Record AstylarUI, Angular, Babylon.js, browser, viewport, device scale, input
state, and SSR/client mode. Capture `surface.diagnostics.messages` and relevant
session/resource/interaction/scrolling/semantics/reconciliation/plugin snapshots.

Investigate in this order:

1. `SiteData` validity, unique IDs, nesting, plugin requirements, and authored
   state.
2. Exact catalog support for each material element, field, selector, property,
   and value.
3. Selector match, specificity, source order, inline declarations, inheritance,
   and defaults.
4. Surface CSS dimensions, breakpoint selection, viewport units, intrinsic
   sizing, box sizing, min/max constraints, and wrapping.
5. Typography availability, loaded fonts, line height, whitespace, overflow,
   and canvas measurement boundaries.
6. Paint, border/radius, opacity, transforms, clipping, z-index, stacking
   contexts, and modal/top-layer state.
7. Event handler IDs, propagation/default cancellation, focus, validation,
   modal containment, and semantic naming relationships.
8. Asset URLs, `whenSettled()`, obsolete generation cancellation, and error
   diagnostics.
9. Update identity compatibility, retained state, replacement, cross-surface
   isolation, resource plateaus, and disposal.
10. Package-root imports, installed peer versions, browser-only evaluation, and
    SSR build behavior.

## Common application causes

- Relying on Chromium defaults instead of authoring explicit matching styles.
- Using CSS syntax (`@media`, kebab-case properties, `var()`, `calc()`, a full
  shorthand, or an unsupported selector) where Astylar expects structured JSON.
- Mutating an existing `SiteData` object so Angular sees no new input identity.
- Recreating IDs or changing element/input kinds on every update.
- Giving the canvas host no height.
- Treating the page viewport as the Astylar surface viewport.
- Using deprecated `onclick` strings instead of typed host handlers.
- Updating Angular signals from an outside-zone callback without re-entering
  Angular in a zone-based application.
- Asserting before `update()` or `whenSettled()` completes.
- Loading source-relative or nondeterministic assets.
- Registering a plugin without matching persisted version/schema requirements.
- Holding a surface-scoped plugin service in a root singleton.
- Creating Babylon resources without generation/surface ownership.
- Importing private source paths that only resolve inside the AstylarUI repo.

## Distinguish translation from renderer defects

A mismatch is an application translation problem when the catalog does not
claim the source feature/value, the authored Astylar structure differs
materially, lifecycle calls are missing, or browser defaults were assumed.

A renderer defect is plausible only when:

- the installed-version catalog claims the exact behavior and value subset;
- the HTML/CSS and Astylar trees express equivalent intent;
- the same viewport, fonts, assets, state, and settlement boundary are used;
- diagnostics do not identify invalid authored data or unavailable plugins;
- the difference survives reduction to a small public-API reproduction.

For a reference application, first prove the translation did not independently
change structure, dimensions, density, overflow, responsive rules, fonts, or
state. Capture both sides under matching viewport, DPR, font readiness, and
settlement conditions. Test initial visibility and actual scroll reachability;
do not infer them from page height. Whole-page SSIM and geometry do not detect
blur reliably, so use identified text/border crops and a calibrated local edge
metric for sharpness claims.

Do not modify renderer internals in this skill. Preserve the reproduction for
the Phase 16 maintainer workflow.

## Create a public minimal reproduction

Include:

1. A minimal HTML fragment and CSS with the expected observable behavior.
2. Equivalent minimal `SiteData` and `AstylarRenderOptions`.
3. Root-package imports only.
4. The smallest Angular host or direct-mount setup.
5. Fixed viewport, fonts, assets, initial state, and interaction steps.
6. Expected versus actual geometry, text, styles, semantics, interaction, or
   resource behavior.
7. Installed versions and relevant catalog entry/evidence.
8. Diagnostics and a repeatable build/browser command.

Avoid copying the full application or proposing an internal fix. The purpose is
to prove the public contract boundary.

## Choose verification

| Change | Minimum useful verification |
| --- | --- |
| Static data/style translation | TypeScript build; target viewport screenshot/geometry/text check |
| Responsive rules | Below/at/above breakpoint checks; direct-host resize if applicable |
| Controls/events | Pointer and keyboard paths; state update; focus and default behavior |
| Semantics | Browser accessibility snapshot and focus navigation |
| Images/assets | Success/error paths; `whenSettled()`; deterministic asset URL |
| Repeated updates | Compatible identity retention and stable scene/resource counts |
| Multiple surfaces | Independent state, updates, disposal, and plugin instances |
| SSR-sensitive code | Browser build, server build, and prerender or SSR evaluation |
| Application plugin | Unit validation plus packed browser/SSR consumer when substantial |
| Visual parity claim | Paired source-faithful HTML/Astylar evidence at representative viewports/DPR; geometry, visibility, scrolling, and defect-appropriate local raster metrics |

Always run the consuming project's normal tests and production build. Generated
code is incomplete until it compiles.

## Review checklist

- All Astylar imports come from `astylarui`.
- Installed and skill contract versions agree or uncertainty is explicit.
- Every material authored name/value exists in the catalog.
- Stable unique IDs cover stateful and interactive nodes.
- `SiteData` is serializable and replaced rather than privately mutated.
- Styles use supported camelCase fields, values, selectors, and media bounds.
- Unsupported behavior is disclosed and redesigned or delegated to a plugin.
- Typed event handlers live outside serializable data.
- Labels, landmarks, names, focus, validation, and dialogs are verified.
- Component/direct-mount ownership, readiness, resizing, and disposal are clear.
- Browser-only work is absent from SSR module evaluation.
- Plugin version/schema, recovery, isolation, invalidation, and resource
  ownership match the public contract.
- Tests cover observable behavior and do not weaken reference expectations.
- A suspected core defect stops at a public minimal reproduction.
