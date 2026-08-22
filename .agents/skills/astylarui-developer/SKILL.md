---
name: astylarui-developer
description: Build, convert, integrate, diagnose, review, and test Angular applications that use AstylarUI's public API. Use for translating HTML/CSS or web designs into SiteData and Astylar styles; responsive layouts; Angular state, events, controls, accessibility, and SSR; Babylon-backed surface configuration; and using or authoring application-level AstylarUI plugins. Do not use for changing AstylarUI renderer internals, core registries, layout or paint engines, or the parity harness.
---

# AstylarUI Developer

Build AstylarUI applications by transferring ordinary web-development intent
through the checked public compatibility contract. Treat Angular as the platform
foundation and Babylon.js as the owned rendering substrate.

## Start from evidence

1. Inspect the consuming project's `package.json`, Angular version, AstylarUI
   version, Babylon.js version, build/SSR configuration, and existing patterns.
2. Import AstylarUI only from the package root, normally `astylarui`. Never use
   source-tree or package deep imports.
3. Compare the installed AstylarUI version with the version recorded by this
   skill's compatibility references. If they differ, qualify compatibility
   claims and inspect the installed package's public types or matching docs.
4. Classify each material web feature as `direct`, `compatible`, `different`,
   `unsupported`, or `plugin`. Do not infer support from browser familiarity.
5. Preserve the user's design intent and disclose every meaningful adaptation,
   unsupported behavior, and verification gap.
6. When converting an existing application, repository, or supplied design,
   treat its inspected source as authoritative. Preserve structure, density,
   sizing, overflow, breakpoints, fonts, hover/active/focus paint, caret and
   selection behavior, dropdown states, cursors, and dismissal behavior; do not
   independently redesign it or introduce scrolling without authorization.

## Route the task

- For a support question, locate the exact catalog entry and give its
  classification, supported subset, value constraints, evidence, and practical
  alternative where applicable.
- For a new application, translate the brief into semantic `SiteData`, ordered
  style rules, Angular state and typed events, a surface host, and proportional
  tests.
- For HTML/CSS conversion, inventory structure, selectors, declarations,
  responsive behavior, interactions, assets, and semantics before writing the
  Astylar equivalent.
- For integration, prefer `AstylarSurfaceComponent`; use injected
  `Astylar.mount()` when the application must own a canvas directly. Keep SSR,
  settlement, updates, resizing, and disposal explicit.
- For an application plugin, use the public Angular-native plugin API,
  namespaced contributions, schema/version metadata, isolated state, and owned
  Babylon/asynchronous resources.
- For diagnosis or review, test authored data and public lifecycle assumptions
  before concluding that the renderer is defective.

## Load only the references needed

- Read [application-workflows.md](references/application-workflows.md) for
  application creation, compatibility answers, and HTML/CSS conversion.
- Read [angular-babylon.md](references/angular-babylon.md) for component versus
  direct mounting, Angular state/SSR, Babylon ownership, assets, and cleanup.
- Read [diagnosis-verification.md](references/diagnosis-verification.md) when
  debugging, reviewing, comparing output, or selecting tests.
- Read [plugin-workflow.md](references/plugin-workflow.md) before deciding on or
  implementing an application-level plugin.
- Read [html-css.md](references/html-css.md) for the complete human translation
  model and important browser/Astylar differences.
- Query [capabilities.json](references/capabilities.json) for exact element,
  `DOMElement`, `StyleRule`, selector, unsupported-feature, and plugin-extension
  claims. Prefer targeted search or JSON extraction over loading it all.
- Read [translation-examples.json](references/translation-examples.json) when a
  task benefits from a verified HTML/CSS and `SiteData` pair.
- Read [plugins.md](references/plugins.md) only when using, authoring, migrating,
  recovering, or diagnosing an application-level plugin.
- Read [reconciliation.md](references/reconciliation.md) when stable identity,
  retained control/scroll state, replacement, or update behavior matters.
- Use the bundled `consumer-app.*` and `consumer-badge.plugin.ts` sources as the
  maintained package-boundary Angular/plugin example; consult the browser spec
  when lifecycle, resource plateau, isolation, or recovery proof is needed.
- Read [source-manifest.json](references/source-manifest.json) to compare the
  bundled contract version and hashes with a consuming project's installed
  AstylarUI package.
- Query [public-api.json](references/public-api.json) before naming a package
  export, and confirm it against the installed package when versions differ.

## Keep the public boundary

- Build replaceable, serializable `SiteData` from Angular state. Publish a
  replacement object through the component's `[siteData]` input, and call
  `surface.update(nextSiteData)` instead of mutating internal meshes or renderer
  state when mounting directly.
- A direct `AstylarSurface.update(siteData)` call explicitly rereads the current
  document even when the caller reused the same object reference. That does not
  make an in-place mutation observable to `<astylar-surface [siteData]>`, whose
  Angular input delivery relies on replacement object identity.
- Await `surface.whenSettled()` when asynchronous assets or plugin work affect
  readiness. Call `surface.resize()` after direct-host viewport changes.
- Dispose a directly mounted surface as one ownership unit. The Angular surface
  component owns its own mount and teardown.
- Keep executable handlers in `AstylarRenderOptions.events`; never evaluate
  authored `onclick` strings.
- Use unique stable authored IDs for focus, form state, scrolling, events,
  semantics, and reconciliation across updates.
- Treat plugin code as trusted in-process Angular code. DI scopes lifetime and
  state; it does not create a permissions or security sandbox.
- Own plugin-created Babylon resources, observers, callbacks, delayed work, and
  late completions through the public generation or surface ownership APIs.

## Stop at the maintainer boundary

Do not modify AstylarUI's renderer services, core capability registries, layout
or paint algorithms, reconciliation implementation, default-style engine, or
parity harness while applying this skill.

If public evidence indicates a probable core defect:

1. Reduce it to the smallest public `SiteData` and host setup that reproduces it.
2. Add the equivalent HTML/CSS reference and record expected versus actual
   behavior, versions, viewport, diagnostics, and verification steps.
3. Check that the feature is actually claimed by the compatibility catalog.
4. Hand the reproduction to the repository
   [`astylarui-maintainer`](../astylarui-maintainer/SKILL.md) skill. Do not reach
   into private services to repair it from an application task.

## Verify proportionally

Always compile generated TypeScript. A green build, functional test, semantic
snapshot, screenshot file, or unrelated parity fixture does not establish
visual parity. Add focused unit, Angular integration, browser interaction,
semantic/accessibility, responsive, ownership/disposal, or packed-consumer
checks according to the behavior changed. Reference-driven work requires paired
browser/Astylar evidence at matching states, viewports, DPR, fonts, and
settlement boundaries, including visibility and scroll reachability wherever
content can overflow. For interactive references, capture every meaningful
pointer/keyboard boundary (including held press), compare focused local crops
and exact relevant style/state values, and repeat popup/dismissal sequences to
check cleanup. Static screenshots do not establish interaction parity.

Never weaken an expected result, omit an unsupported declaration silently, or
change reference output to conceal a mismatch.
