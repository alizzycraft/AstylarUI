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
