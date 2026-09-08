# Application and HTML/CSS Workflows

## Contents

- [Choose the application boundary](#choose-the-application-boundary)
- [Answer a compatibility question](#answer-a-compatibility-question)
- [Build an application from a brief](#build-an-application-from-a-brief)
- [Convert HTML and CSS](#convert-html-and-css)
- [Author SiteData](#author-sitedata)
- [Translate styles](#translate-styles)
- [Use loaded global CSS and Tailwind](#use-loaded-global-css-and-tailwind)
- [Preserve responsive intent](#preserve-responsive-intent)
- [Handle state, events, and semantics](#handle-state-events-and-semantics)
- [Report the result](#report-the-result)

## Choose the application boundary

Inspect `package.json` and the installed `astylarui` declarations before coding.
Use only exports listed in `public-api.json`, imported from `astylarui`. Treat
this skill's examples as AstylarUI 0.2.0 examples; if the installed version is
different, confirm every used symbol and compatibility claim in that version.

Prefer the Angular `AstylarSurfaceComponent` for ordinary application surfaces.
Choose direct `Astylar.mount()` only when the host must own an existing canvas,
explicitly configure the Babylon scene, or coordinate the surface handle itself.

Keep ordinary application UI state in Angular. Derive immutable/replacement
`SiteData` values and let Astylar reconcile them. Do not treat the Babylon scene
as a mutable DOM substitute.

## Answer a compatibility question

1. Normalize the requested web feature to an element, DOM field, style
   property, selector, platform concept, or unsupported behavior.
2. Search `capabilities.json` by exact name and inspect its whole group entry,
   including classification, values, defaults, inheritance, behavior,
   alternatives, plugin availability, and evidence.
3. Cross-check surprising or lifecycle-sensitive claims in `html-css.md`.
4. State one of `direct`, `compatible`, `different`, `unsupported`, or `plugin`.
5. Describe the supported subset. Do not answer “supported” without its value or
   behavior boundary.
6. Give the Astylar authoring form and a supported alternative when needed.
7. State the evidence/version boundary when the answer could be mistaken for
   complete browser-standard support.

## Build an application from a brief

Translate a normal web brief in this order:

1. **Semantics**: identify landmarks, headings, lists, tables, forms, controls,
   links, dialogs, labels, names, descriptions, and live status.
2. **Structure**: create the smallest meaningful `DOMElement` tree. Keep visual
   wrappers only when they provide layout, paint, clipping, or stacking.
3. **Identity**: assign stable unique IDs to interactive, labelled, scrollable,
   stateful, measured, or update-retained nodes.
4. **Style inventory**: group base rules, component rules, state pseudo-classes,
   and responsive overrides in deliberate source order.
5. **Capability classification**: verify every material element, field, selector,
   value family, and property. Resolve unsupported requirements before coding.
6. **Angular state**: model application state with signals or the consuming
   project's established pattern. Derive new `SiteData` from state.
7. **Events**: use stable typed handlers keyed by authored ID in mount-only
   `AstylarRenderOptions`. Re-enter Angular only when a callback originates
   outside Angular and must update application state.
8. **Surface**: give the host an explicit CSS size. Use the surface component or
   mount directly with complete readiness and disposal handling.
9. **Accessibility**: preserve semantic structure, explicit labels, focus order,
   validation, modal behavior, and status announcements.
10. **Verification**: compile first, then exercise the relevant viewports,
    interactions, settlement, semantics, update retention, and disposal.

## Convert HTML and CSS

When the input is an existing application or repository, inspect its actual
markup, styles, assets, responsive rules, and representative state code before
authoring `SiteData`. The source is authoritative; a screenshot is supporting
evidence only. Preserve DOM composition, panel sizing, density, overflow
ownership, breakpoints, font stack, colors, and visible states unless a checked
unsupported feature requires a disclosed adaptation. Do not turn a fixed shell
into a scrollable page, substitute aesthetics, or simplify content merely
because a new composition is easier to author.

Do not convert markup and declarations one line at a time. First build an
inventory with these columns:

| Source feature | Intent | Astylar classification | Translation | Evidence/gap |
| --- | --- | --- | --- | --- |
| Element/attribute | semantic or behavioral purpose | taxonomy value | `DOMElement` field or structure | catalog entry |
| Selector | affected state/relationship | taxonomy value | supported JSON selector | selector evidence |
| Declaration/value | layout or paint effect | taxonomy value | loaded CSS final value or camelCase `StyleRule` field | value constraint |
| Media query | responsive intent | `different` | keep in loaded CSS, or use per-rule media bounds | viewport test |
| Event/script | application behavior | `different` | typed host handler + Angular state | interaction test |
| Unsupported feature | desired outcome | `unsupported`/`plugin` | redesign or plugin | disclosed limitation |

Then convert:

1. Preserve semantic nesting and authored order.
2. Convert supported attributes to typed camelCase fields. Do not copy arbitrary
   browser attributes into `data`; `data` belongs to plugin-owned schemas.
3. Keep inspectable global CSS in the loaded document-style path when enabled,
   or convert declarations to camelCase fields and supported value grammars.
4. Expand unsupported shorthands or functions into supported final values only
   when doing so preserves the design.
5. Keep `@media` blocks when loaded document styles are enabled; otherwise
   replace them with ordered rules carrying `mediaMinWidth`, `mediaMaxWidth`,
   `mediaMinHeight`, or `mediaMaxHeight`.
6. Move executable behavior out of the document and into typed host handlers.
7. Replace DOM mutation with Angular state and a new `SiteData` value.
8. Use an explicit node for a visual modal backdrop; Astylar does not synthesize
   `::backdrop` paint.
9. Do not copy transitions, animations, `@keyframes`, sticky positioning, or
   other catalogued gaps silently. Direct typed rules require resolved values;
   loaded CSS may browser-resolve variables and `calc()` only when the resulting
   property/value is supported.
10. Compare the web and Astylar result at the same viewport, device scale,
    loaded fonts, state, and settlement boundary. Exercise initial visibility,
    clipping owner, bottom/right reachability, and responsive overflow where
    content can exceed its box.

## Author SiteData

Use the public types and keep the value serializable:

```ts
import type { SiteData } from 'astylarui';

export const accountData: SiteData = {
  root: {
    children: [
      {
        type: 'main',
        id: 'account-main',
        children: [
          { type: 'h1', id: 'account-title', textContent: 'Account' },
          {
            type: 'form',
            id: 'profile-form',
            children: [
              { type: 'label', id: 'name-label', for: 'name', textContent: 'Name' },
              { type: 'input', id: 'name', name: 'name', inputType: 'text', required: true },
              { type: 'button', id: 'save', textContent: 'Save' },
            ],
          },
        ],
      },
    ],
  },
  styles: [
    { selector: '#account-main', width: '100%', maxWidth: '720px', margin: '0 auto', padding: '24px' },
    { selector: '#profile-form', display: 'flex', flexDirection: 'column', gap: '12px' },
    { selector: '#save', width: '120px', height: '40px', background: '#2563eb', color: '#ffffff' },
  ],
};
```

Verify every example property against `capabilities.json`. The catalog, not this
snippet, is the exhaustive value contract.

## Translate styles

- Preserve stylesheet order because equal-specificity rules resolve by source
  order.
- Keep element defaults, stylesheet rules, state rules, responsive rules, and
  inline declarations conceptually separate.
- Use the documented selector subset only. Absence from the selector catalog is
  unsupported, not an invitation to try browser selector syntax.
- Check inheritance per catalog group. Typography commonly inherits; layout,
  spacing, positioning, paint, Flexbox, and Grid generally do not.
- Author explicit values when matching a browser reference; Astylar defaults are
  useful approximations, not the complete Chromium user-agent stylesheet.
- Treat surface viewport units as relative to the Astylar canvas.

## Use loaded global CSS and Tailwind

Use this path when an application already owns ordinary inspectable global CSS
or a Tailwind build and most required final declarations are in Astylar's
supported subset:

1. Configure CSS normally in Angular. For the maintained Tailwind 4 workflow,
   pin the tested version, use `@tailwindcss/postcss`, and put
   `@import "tailwindcss"` in the global stylesheet.
2. Enable discovery once with
   `provideAstylar({ css: { useDocumentStyles: true } })`.
3. Keep complete static class strings in `DOMElement.class`; do not assemble
   class names from partial fragments that Tailwind cannot discover.
4. Keep ordinary rules, pseudo-state variants, and `@media` rules in global CSS.
   Each surface resolves them against its own viewport.
5. Use `SiteData.styles` for intentional typed overrides and
   `DOMElement.style` for the highest-priority inline values. Precedence is
   defaults, loaded document styles, typed rules, then inline style.
6. Inspect `surface.diagnostics` for inaccessible or malformed stylesheets and
   verify paired browser/Astylar output at matching viewport, DPR, state, fonts,
   settlement, visibility, and scroll reachability.

This bridge uses the browser to resolve CSSOM rules, custom properties,
`var()`, `calc()`, modern colors, and generated compositions before translation.
It does not make Astylar a general CSS engine: only supported selectors and
final typed properties/values render, inaccessible cross-origin sheets are
diagnosed, and unsupported transitions/animations remain unsupported. There is
no compile function, stylesheet field, or source-name registration in the
public workflow.

## Preserve responsive intent

Place bounds on each overriding rule:

```ts
const styles = [
  { selector: '#shell', display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px' },
  {
    selector: '#shell',
    mediaMaxWidth: '720px',
    gridTemplateColumns: '1fr',
    gap: '12px',
  },
];
```

Test immediately below, at, and above meaningful breakpoints. For a direct
canvas host, call `surface.resize()` after its CSS size changes. The Angular
surface component observes its canvas.

## Handle state, events, and semantics

Keep the options object stable because `AstylarSurfaceComponent.options` is a
mount-only input. Key handlers by stable authored IDs:

```ts
readonly options: AstylarRenderOptions = {
  events: {
    handlers: {
      save: {
        click: (event) => {
          event.preventDefault();
          this.saved.set(true);
        },
      },
      name: {
        input: (event) => this.name.set(event.value ?? ''),
      },
    },
  },
};
```

Use `for` plus the control ID for labels. Preserve landmarks and heading levels.
Use `ariaLabel`, `ariaLabelledby`, and `ariaDescribedby` only with supported
semantics and authored Astylar IDs. Verify application-critical assistive flows
in a browser; a Babylon visual alone does not prove accessibility.

## Report the result

Summarize:

- the source intent preserved;
- the classifications used;
- Astylar-specific syntax/lifecycle differences;
- unsupported or plugin-provided requirements;
- files changed and public APIs used;
- verification completed;
- remaining visual, behavioral, or version uncertainty.

For reference-driven work, include paired reference/Astylar screenshots and
measurements at representative viewports. Compilation, feature interaction,
semantic equivalence, or the existence of a screenshot cannot substitute for
geometry, visibility, scrolling, and defect-appropriate raster evidence.
