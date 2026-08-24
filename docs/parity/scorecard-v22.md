# Phase 22 loaded CSS and Tailwind scorecard

Last updated: 2026-08-24

## Starting baseline

- Branch: `codex/loaded-css-tailwind`, based on `origin/main` at `06535a4`.
- Package/runtime compatibility version: `0.2.0`.
- Existing release evidence: 339/339 unit tests; 165 fixtures / 541 general
  renders; general median SSIM `0.9899`, minimum SSIM `0.9509`; TTS 10/10
  static scenarios, 36/36 sharpness regions, and 70/70 interaction steps.
- Existing authoring model: typed `SiteData.styles` and `DOMElement.style` only;
  no document stylesheet discovery or Tailwind dependency.

## Architecture assessment

The checked contract is in [`../document-styles.md`](../document-styles.md).
The chosen design is a surface-scoped CSSOM/browser-resolution hybrid feeding
typed per-element records into the existing `StyleService` origin order. It
uses a surface-sized offscreen resolution document rather than the semantic
bridge, performs no remote fetch, and keeps applications unchanged unless they
opt in through `provideAstylar`.

The Tailwind reference target is version `4.3.3`, selected from the official
Angular/PostCSS workflow on 2026-08-24. The maintained app must pin the exact
version and describe only its tested utility subset.

## Increment ledger

| Increment | Invariant | Focused evidence | Commit |
| --- | --- | --- | --- |
| 1 | The public workflow and owning architecture are decided before behavior changes. | Documentation and diff checks | `76b52d6` |
| 2 | Opt-in configuration is additive, and inspectable CSS is discovered in order while inaccessible sheets remain bounded diagnostics. | 16/16 focused provider/discovery tests; library build | `8b4bc20` |
| 3 | Browser CSS resolution produces typed per-element normal/state records at the surface viewport without importing unrelated UA defaults. | 4/4 resolver tests: layers, variables, calc, modern colors, responsive, escaped classes, state variants, filtering, caching | `491f76d` |
| 4 | Loaded CSS participates in the existing cascade and box model, stylesheet changes reflow once, unrelated DOM changes do not invalidate, and disposal releases the resolver document. | 46/46 focused style, dimension, source, resolver, and mounted WebGL integration tests | `ab12f41` |
| 5 | A packed Angular consumer uses the official Tailwind 4.3.3 PostCSS setup, static ordinary class strings, responsive utilities, two isolated surfaces, repeated updates, and disposal without equivalent `StyleRule[]` for the Tailwind region. | 3/3 packed-consumer browser checks; consumer production build | `87c6068` |
| 6 | The paired native/Astylar benchmark consumes one generated Tailwind stylesheet at DPR 1 and 2; iframe controls retain their real state; `appearance-none` reaches owned controls; loaded and explicit styles agree within parity tolerance. | 17/17 resolver/control tests; 3/3 mounted integration tests; 8 benchmark renders, minimum SSIM `0.9625`, 100% edges within 2 px, maximum edge error `1.9833px`, exact text, clean runtime | This increment |

## Required final evidence

This scorecard will record focused unit/browser/consumer/parity commands as
each bounded increment lands, followed by the unfiltered skill, compatibility,
unit, build, packed-consumer, general-parity, and TTS release gates. A focused
or report-only run is not final acceptance.

## Current limitations

The loaded-style path currently translates the supported Astylar style surface.
Non-uniform border paint and separate `:focus-visible` modality remain bounded
limitations. The maintained Tailwind application and focused benchmark are now
present; the complete unfiltered release matrix remains to be recorded.
