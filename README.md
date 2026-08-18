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

The primary way to use the library is via the `Astylar` service.

### 1. Simple Rendering

In your Angular component:

```typescript
import { Component, ElementRef, viewChild, inject, afterNextRender, OnDestroy } from '@angular/core';
import { Scene } from '@babylonjs/core';
import { Astylar } from 'astylarui';

@Component({
  selector: 'app-3d-ui',
  standalone: true,
  template: `<canvas #myCanvas></canvas>`,
  styles: [`canvas { width: 100%; height: 100%; }`]
})
export class My3DUIComponent implements OnDestroy {
  private astylar = inject(Astylar);
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('myCanvas');
  private scene: Scene | null = null;

  constructor() {
    afterNextRender(() => {
      this.render();
    });
  }

  render() {
    const siteData = {
      root: {
        type: 'div' as const,
        id: 'main-root',
        styles: { backgroundColor: '#1e3c72', width: '100vw', height: '100vh' },
        children: [
          { 
            type: 'h1' as const, 
            id: 'main-title',
            textContent: 'Hello 3D World!', 
            styles: { color: 'white', marginTop: 20 } 
          }
        ]
      },
      styles: []
    };

    this.scene = this.astylar.render(this.canvas().nativeElement, siteData as any);
  }

  ngOnDestroy() {
    // Dispose the engine to clean up all resources
    if (this.scene) {
      this.scene.getEngine().dispose();
      this.scene = null;
    }
  }
}
```

### 2. Using the Component (Angular Only)

You can also use the `<astylar-render>` component directly in your templates:

```html
<!-- Via siteId -->
<astylar-render siteId="dashboard"></astylar-render>

<!-- Via direct siteData -->
<astylar-render [siteData]="myCustomData"></astylar-render>

<!-- Using an external canvas -->
<canvas #externalCanvas></canvas>
<astylar-render [canvas]="externalCanvas" [siteData]="myCustomData"></astylar-render>
```

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
