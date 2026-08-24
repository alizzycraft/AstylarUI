# Loaded document styles

Phase 22 adds an opt-in browser integration that treats the CSS already loaded
by the host Angular application as an additional Astylar author-style source.
It is not a second renderer and it does not parse Tailwind class names.

## Public authoring contract

Applications enable the integration once through the existing Angular provider:

```ts
provideAstylar({
  css: {
    useDocumentStyles: true,
  },
});
```

Thereafter ordinary global CSS, including CSS produced by Tailwind's standard
Angular/PostCSS integration, can target the type, ID, and class values authored
in `SiteData`. Individual stylesheet registration, `SiteData.stylesheets`,
`sourceName`, and explicit compiler calls are not part of this contract.

Applications that do not opt in retain the 0.2.0 behavior.

## Architecture decision

The integration is a CSSOM/browser-resolution hybrid:

1. A surface-scoped service reads the already-loaded document stylesheets in
   document order. It accepts inspectable `<style>`, same-origin linked, and
   adopted stylesheets and never fetches a stylesheet itself.
2. CSSOM traversal records rule/declaration provenance, flattens supported
   grouping rules, identifies declarations that can affect the current Astylar
   document, and produces bounded diagnostics for inaccessible or unsupported
   applicable input.
3. Each opted-in surface owns an offscreen, non-interactive resolution document
   sized to that surface's CSS viewport. It mirrors the serializable element
   structure solely to let the browser resolve cascade layers, media queries,
   selector escapes, custom properties, bounded `calc()` values, and modern
   computed colors. This document is not the semantic bridge and is never the
   source of visual layout or interaction.
4. Only resolved properties supported by `StyleRule` cross back into Astylar.
   They are stored as typed per-element style records and consumed by the
   existing style, layout, paint, interaction, reconciliation, and resource
   pipeline.

This was selected over the alternatives:

- CSSOM traversal alone still requires Astylar to implement custom-property,
  modern-color, function, layer, and shorthand semantics.
- A normal-state `getComputedStyle()` snapshot loses pseudo-state behavior and
  cannot use the Astylar surface viewport when it differs from the page.
- Build-time preprocessing cannot discover ordinary runtime-loaded Angular
  styles and would make an explicit compiler the primary workflow.
- The hybrid uses browser standards machinery for values and cascade while
  keeping Astylar's typed representation and lifecycle as the owning boundary.

## Cascade and states

The origin order is fixed:

1. Astylar element/default styles;
2. resolved loaded-document styles;
3. explicit `SiteData.styles`;
4. `DOMElement.style`.

The resolver preserves document stylesheet order and the browser's supported
selector/cascade behavior before importing the winning values. Astylar's
existing interaction runtime remains responsible for `:hover`, `:active`, and
focus state transitions. The resolution document substitutes private state
attributes for those pseudo-classes so it can capture state-specific winning
values without reducing them to a normal snapshot. Control and structural
pseudo-classes are evaluated against the mirrored native elements.

## Responsive behavior

The resolution document's viewport is the canvas client width and height.
Consequently loaded `@media` rules and viewport units follow the Astylar
surface, including when it differs from the browser window. A surface resize
invalidates only that surface and enters the existing coalesced reflow path.

## Lifetime, invalidation, and diagnostics

Stylesheet snapshots are fingerprinted and cached per surface. Mutation and
captured load observation cover ordinary style/link insertion, removal,
replacement, text changes, disabled/media changes, late link completion, and
the Angular development pattern of replacing style nodes. A `SiteData` update
and resize also re-check the fingerprint. Direct mutation of a constructed
stylesheet through unobservable CSSOM APIs may require an explicit
`surface.invalidate()` call.

The resolver document, observers, listeners, caches, and delayed work are owned
by the render session and are removed on disposal. There is no document or
CSSOM access during SSR/module evaluation.

An inaccessible cross-origin stylesheet produces one deduplicated structured
diagnostic and is skipped. Unsupported applicable selectors, declarations,
values, and at-rules produce bounded diagnostics with stylesheet/rule context;
rules that cannot match any element in the current Astylar document are not
reported. Failed translation never aborts the surface or silently claims
support.

## Tailwind target and boundaries

The maintained reference uses Tailwind CSS 4.3.3 with the official Angular
PostCSS setup (`tailwindcss`, `@tailwindcss/postcss`, and `postcss`) and a normal
global `@import "tailwindcss"`. Astylar consumes generated CSS; it does not
interpret utility names. The supported utility subset is recorded by the
Phase 22 reference application and capability catalog.

Tailwind still needs complete static class strings discoverable by its normal
source scanning. Dynamically constructed partial class names are not generated,
which is the same limitation as an ordinary Tailwind application. Remote
fetching, Sass/Less, CSS Modules, Angular emulated component scoping, animations,
container queries, and a general CSS implementation remain outside this phase.

References:

- <https://tailwindcss.com/docs/installation/framework-guides/angular>
- <https://tailwindcss.com/docs/detecting-classes-in-source-files>
