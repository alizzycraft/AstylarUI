# AstylarUI

AstylarUI is an Angular 20 library for rendering HTML-like structures in BabylonJS-based 3D scenes. It uses signals-first patterns, zoneless change detection, and a pure-renderer approach.

## Key Features
- **Angular 20 Core**: Leverages modern Angular signals and zoneless change detection.
- **3D UI Rendering**: Render complex UI layouts described by JSON-like `SiteData` into BabylonJS.
- **Angular-Native Extensions**: Surface-scoped Angular plugins can add validated elements, style properties, lifecycle services, and Babylon renderers.
- **SSR Ready**: Built-in support for Server-Side Rendering via Express.

## Installation

```bash
npm install astylarui
```

> [!NOTE]
> `@angular/core` and `@babylonjs/core` are peer dependencies and must be installed in your project.

## Usage

For Angular applications, the recommended entry point is the standalone
`AstylarSurfaceComponent`. It creates Babylon only in the browser, waits until its
canvas exists, updates when its `siteData` input changes, observes element size,
and disposes its owned renderer resources with the component.

### 1. Angular surface component

```typescript
import { Component, signal } from '@angular/core';
import { AstylarSurfaceComponent, type SiteData } from 'astylarui';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [AstylarSurfaceComponent],
  template: `<astylar-surface [siteData]="siteData()" />`,
  styles: [`astylar-surface { display: block; width: 100%; height: 600px; }`],
})
export class WorkspaceComponent {
  readonly siteData = signal<SiteData>({
    root: {
      children: [
        { type: 'h1', id: 'title', textContent: 'Hello 3D world' },
        { type: 'button', id: 'save', value: 'Save' },
      ],
    },
    styles: [
      { selector: '#title', color: '#ffffff', fontSize: '32px' },
      { selector: '#save', padding: '10px 16px', background: '#2563eb' },
    ],
  });
}
```

The `mounted` output provides the owned `AstylarSurface` handle when explicit
control is useful. It exposes `update()`, `resize()`, `whenSettled()`,
`diagnostics`, and idempotent `dispose()`.

### 2. Direct lifecycle API

Hosts that own their own canvas can inject `Astylar` and mount explicitly after
the canvas exists:

```typescript
const surface = astylar.mount(canvas, siteData, options);
await surface.whenSettled();
await surface.update(nextSiteData);
await surface.resize();
console.log(surface.diagnostics);
surface.dispose();
```

`render()` and the scene-parameter forms of `update()` and `whenSettled()` remain
available for compatibility, but new integrations should keep the surface handle
so lifecycle ownership is unambiguous.

A complete standalone Angular consumer is committed at
[`examples/angular-consumer`](examples/angular-consumer). It demonstrates two
independent surfaces, responsive layouts, controls, a scrolling table, an image,
updates, modal focus, explicit resize, disposal, remounting, and SSR/prerender.
It imports only the package root and is verified from a packed tarball rather
than repository source.

The component-driven [`examples/ai-tts-demo`](examples/ai-tts-demo) is a more
realistic single-surface application. It demonstrates responsive settings,
speech editing, deterministic mock generation, secure server-side OpenAI speech,
owned browser audio, session history, accessibility semantics, and private
application-level component builders without crossing the package boundary.

### 3. Angular-native plugins

Angular 20 is an intentional foundation of Astylar's plugin ecosystem. Register
immutable plugin definitions through the application provider API; injectable
plugin services, lifecycle hooks, and Babylon renderers are then created in each
surface's child `EnvironmentInjector`:

```typescript
import {
  ASTYLAR_PLUGIN_API_VERSION,
  defineAstylarPlugin,
  provideAstylar,
} from 'astylarui';
import { BadgeRenderer } from './badge.renderer';

const badges = defineAstylarPlugin({
  id: 'example.badges',
  version: '1.0.0',
  pluginApiVersion: ASTYLAR_PLUGIN_API_VERSION,
  dependencies: ['astylar.core'],
  contributes: ['elements', 'renderers'],
  contributions: {
    elements: [{
      id: 'example.badges:badge',
      alias: 'badge',
      children: 'none',
    }],
    renderers: [{
      id: 'example.badges:renderer',
      elements: ['example.badges:badge'],
      renderer: BadgeRenderer,
    }],
  },
});

export const appConfig = {
  providers: [provideAstylar({ plugins: [badges] })],
};
```

Mutable plugin services must be surface providers, not root singletons. They may
use normal Angular DI, signals, injection tokens, and `DestroyRef`. Plugin-owned
element values use `DOMElement.data`; plugin style declarations use the
unknown-safe `StyleRule.extensions` bag and participate in validation, defaults,
inheritance, and the normal style cascade.

The full v1 contract, renderer context, namespacing/conflict rules, resource
ownership, SSR requirements, diagnostics, and trust boundary are documented in
[docs/plugins.md](docs/plugins.md). The packed external proof is
[`examples/angular-consumer/src/app/consumer-badge.plugin.ts`](examples/angular-consumer/src/app/consumer-badge.plugin.ts).

## HTML/CSS knowledge transfer

Astylar intentionally uses familiar DOM structure, selectors, cascade, box,
Flexbox, Grid, typography, form, interaction, responsive, and accessibility
concepts, then renders them as owned Babylon scene resources. It is a measured
web-compatible subset rather than a complete browser implementation.

Use the human [HTML/CSS translation contract](docs/compatibility/html-css.md),
the checked [machine-readable capability catalog](docs/compatibility/capabilities.json),
and the ten [paired web/Astylar examples](docs/compatibility/examples/README.md)
before assuming an untested browser feature transfers. Run
`npm run capabilities:check` and `npm run examples:check` when changing the
public authoring surface.

Agents building consuming applications can use the repository-owned
[`astylarui-developer` skill](.agents/skills/astylarui-developer/SKILL.md). It
packages the checked compatibility evidence and public Angular/Babylon
workflows for application creation, conversion, plugins, diagnosis, and
verification. Renderer and parity-harness maintenance is intentionally outside
that skill's scope.

Agents diagnosing or evolving AstylarUI itself can use the repository-owned
[`astylarui-maintainer` skill](.agents/skills/astylarui-maintainer/SKILL.md). It
provides evidence-first routing across validation, style/layout/paint,
interaction/semantics, reconciliation, Angular surface and Babylon resource
ownership, plugins, package compatibility, parity, releases, and synchronized
improvements to the application-development skill. Ordinary consuming-app work
continues to belong to `astylarui-developer`.

Validation and lifecycle failures use stable diagnostic codes and severities.
Fatal input or lifecycle misuse throws `AstylarDiagnosticError`; all diagnostics
are also retained in `surface.diagnostics.messages`. A host can observe them or
control console output at mount time:

```typescript
const surface = astylar.mount(canvas, siteData, {
  diagnostics: {
    logLevel: 'error', // 'silent', 'info', 'warning', or 'error'
    onDiagnostic: (diagnostic) => reportToTelemetry(diagnostic),
  },
});
```

Without an explicit level, Astylar logs warnings and errors in development and
errors only in production. Validation covers malformed roots, invalid element
types, duplicate IDs, and unknown style properties; runtime diagnostics cover
asset failures and invalid surface/canvas lifecycle operations.

### 4. Typed application events

Keep executable handlers outside serializable `SiteData` and address elements by their authored IDs:

```typescript
this.scene = this.astylar.render(canvas, siteData, {
  events: {
    handlers: {
      'save-button': {
        click: (event) => {
          console.log(event.targetId, event.currentTargetId);
          if (!canSave()) event.preventDefault();
        },
      },
    },
    onEvent: (event) => console.log(event.type, event.targetId),
  },
});
```

Supported events use a deliberately small DOM-like contract with authored target/current-target IDs, common control values, pointer/keyboard fields, propagation stopping, and default cancellation. `DOMElement.onclick` strings are deprecated and are never evaluated by this API.

Accepted anchor defaults expose deterministic navigation outcomes without forcing
the host page to navigate. Same-document fragments scroll Astylar containers;
external URLs remain host-owned routing intents:

```typescript
this.scene = this.astylar.render(canvas, siteData, {
  navigation: {
    onNavigate: (outcome) => {
      if (outcome.kind === 'external') routeFromHost(outcome.url, outcome.target);
    },
  },
});
```

Calling `preventDefault()` from the anchor's typed `click` handler suppresses the
fragment scroll or external outcome.

Author an open modal dialog with the same declarative shape as its HTML
counterpart:

```typescript
{
  type: 'dialog',
  id: 'confirm-dialog',
  open: true,
  modal: true,
  children: [
    { type: 'button', id: 'cancel', autofocus: true, textContent: 'Cancel' },
    { type: 'button', id: 'confirm', textContent: 'Confirm' },
  ],
}
```

The last open modal owns the interaction top layer, initial focus, and wrapped
Tab order. Background semantic content becomes inert and background canvas
input is suppressed. Dialog and backdrop paint remain explicitly authored;
Astylar does not generate a visual backdrop.

Escape dispatches the dialog's typed, cancelable `cancel` event. When accepted,
the dialog closes, restores the control that was focused when it opened, and
then emits `close`; `event.preventDefault()` keeps it open. Removing an active
dialog through `Astylar.update()` follows the browser's removal boundary: it
cleans modal/focus ownership without synthesizing `close` or restoring focus.

Status and validation semantics use the same authored fields as equivalent
HTML. For example, a live status can use `role: 'status'`,
`ariaLive: 'polite'`, and `ariaAtomic: true`; update its `textContent` through
`Astylar.update()`. Compatible updates preserve the semantic node and do not
mutate unchanged live-region text, so unrelated application updates do not
produce duplicate browser-observable announcements. Required controls may add
or remove `ariaDescribedby` as their visible validation message changes.

`Astylar.update()` uses unique authored IDs as reconciliation keys. Compatible
elements retain their primary Babylon mesh across text, style/layout,
child-list/reorder, image-source, and control updates; transient control,
selection, scroll, focus, modal, semantic, and event state is restored around
the reflow. Use `getVisualReconciliationSnapshot(scene)` for latest-pass and
cumulative lifecycle diagnostics. The identity, fallback, and replacement
rules are documented in [docs/reconciliation.md](docs/reconciliation.md).

## Developing AstylarUI

The current implementation status, document map, and recommended next work are
tracked in [docs/project-status.md](docs/project-status.md).

### Setup
```bash
npm install
npm start
```

### Build the library
```bash
npm run build:lib
```

### Build the demo app
```bash
npm run build
```

### Verify a clean external consumer

```bash
npm run consumer:check
```

This builds and packs AstylarUI, copies the committed Angular example outside
the repository, installs its declared dependencies and the tarball, builds its
browser and SSR outputs, runs its real-Chrome acceptance tests, and removes the
temporary installation.

### Run or verify the AI text-to-speech example

```bash
npm run tts-demo:prepare
npm run tts-demo:check
```

The prepare command installs a fresh packed library into the local example and
clears Angular's optimized dependency cache. Stop a running demo before preparing
it, then restart `npm start`; the example disables dependency prebundling so a
newly packed AstylarUI build cannot be hidden behind a same-version Vite cache.
The check command uses a separate temporary installation, mock speech only,
browser and SSR builds, responsive visual captures, and real Chrome interaction checks.
Live OpenAI setup is documented in
[`examples/ai-tts-demo/README.md`](examples/ai-tts-demo/README.md).

---

## License
License: AGPL-3.0
Copyright (c) 2026 alizzycraft
