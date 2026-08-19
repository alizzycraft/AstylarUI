# AstylarUI

AstylarUI is an Angular 20 library for rendering HTML-like structures in BabylonJS-based 3D scenes. It uses signals-first patterns, zoneless change detection, and a pure-renderer approach.

## Key Features
- **Angular 20 Core**: Leverages modern Angular signals and zoneless change detection.
- **3D UI Rendering**: Render complex UI layouts described by JSON-like `SiteData` into BabylonJS.
- **Highly Extensible**: Framework-agnostic rendering services wrapped in a clean Angular service.
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

### 3. Typed application events

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

---

## License
License: AGPL-3.0
Copyright (c) 2026 alizzycraft
