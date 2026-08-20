# Angular and Babylon Application Integration

## Contents

- [Version and ownership model](#version-and-ownership-model)
- [Preferred surface component](#preferred-surface-component)
- [Direct mounting](#direct-mounting)
- [State and update lifecycle](#state-and-update-lifecycle)
- [SSR and hydration](#ssr-and-hydration)
- [Babylon host customization](#babylon-host-customization)
- [Assets and readiness](#assets-and-readiness)
- [Cleanup checklist](#cleanup-checklist)

## Version and ownership model

The bundled examples target Angular 20 and Babylon.js 8 through AstylarUI 0.1.0.
Inspect the consuming project before applying them. AstylarUI owns the engine,
scene, camera, renderer graph, semantic bridge, interactions, resources, and
surface child injector created for a mount.

Angular owns application state and component/service lifetimes. A directly
mounted host owns the returned `AstylarSurface`. A plugin must register its
Babylon/asynchronous work with Astylar's public resource owners; `DestroyRef`
alone cannot prevent a late generation from leaking into newer output.

## Preferred surface component

`AstylarSurfaceComponent` waits for a browser render, mounts after its canvas
exists, observes its canvas size, updates when the `siteData` input identity
changes, emits `mounted` after settlement, emits `failed` on errors, and disposes
on Angular destruction.

```ts
import { Component, computed, signal } from '@angular/core';
import {
  AstylarSurfaceComponent,
  type AstylarRenderOptions,
  type AstylarSurface,
  type SiteData,
} from 'astylarui';

@Component({
  selector: 'app-workspace',
  imports: [AstylarSurfaceComponent],
  template: `
    <astylar-surface
      class="surface"
      [siteData]="siteData()"
      [options]="options"
      (mounted)="onMounted($event)"
      (failed)="onFailed($event)"
    />
  `,
  styles: `.surface { display: block; width: 100%; height: 640px; }`,
})
export class Workspace {
  private readonly revision = signal(1);
  readonly siteData = computed<SiteData>(() => ({
    root: { children: [{ type: 'p', id: 'status', textContent: `Revision ${this.revision()}` }] },
    styles: [{ selector: '#status', padding: '16px', color: '#ffffff' }],
  }));
  readonly options: AstylarRenderOptions = {};

  onMounted(surface: AstylarSurface): void {
    // Retain only when the host needs diagnostics or explicit resize/readiness.
    void surface;
  }

  onFailed(error: unknown): void {
    console.error(error);
  }
}
```

Give the host a definite CSS width and height. A zero-height host creates a
zero-height canvas regardless of the `SiteData` layout.

## Direct mounting

Use direct mounting only when its additional ownership is required:

```ts
import { afterNextRender, Component, DestroyRef, ElementRef, NgZone, inject, viewChild } from '@angular/core';
import { Astylar, type AstylarSurface, type SiteData } from 'astylarui';

@Component({
  selector: 'app-direct-surface',
  template: `<canvas #canvas></canvas>`,
})
export class DirectSurface {
  private readonly astylar = inject(Astylar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private surface?: AstylarSurface;

  constructor() {
    afterNextRender(() => {
      this.surface = this.zone.runOutsideAngular(() =>
        this.astylar.mount(this.canvas().nativeElement, this.initialData()),
      );
      void this.surface.whenSettled();
    });
    this.destroyRef.onDestroy(() => this.surface?.dispose());
  }

  async replaceData(next: SiteData): Promise<void> {
    await this.surface?.update(next);
    await this.surface?.whenSettled();
  }

  private initialData(): SiteData {
    return { root: { children: [] }, styles: [] };
  }
}
```

`afterNextRender` is the SSR-safe browser boundary. Keep the surface optional
because server rendering does not mount it. Do not create an additional Babylon
engine or dispose `surface.scene` separately; dispose the surface unit.

## State and update lifecycle

- Use signals/computed values or the consuming app's established reactive state.
- Create a new `SiteData` object for a meaningful revision. The component skips
  updates when the input reference is unchanged.
- Keep authored IDs and compatible element kinds stable to retain focus, control
  values, scroll offsets, and visual owners.
- Treat a type change or input-manager kind change as a replacement boundary.
- Keep the options object and its callbacks stable; options are mount-only.
- Await `update()` for the render session and `whenSettled()` when late assets or
  plugin work matter to the next action or assertion.
- Use `NgZone.run()` only when an Astylar/Babylon callback outside Angular must
  update Angular-visible state.

## SSR and hydration

- Keep `SiteData`, plugin definitions, provider declarations, and module
  evaluation browser-independent.
- Do not touch `window`, `document`, canvas, WebGL, Babylon scenes, inspectors,
  or browser storage while the server evaluates modules.
- Prefer `AstylarSurfaceComponent`, which does not mount during SSR.
- For direct mounting, use `afterNextRender` or the consuming project's existing
  browser-only lifecycle.
- Use deterministic local/data assets in offline, SSR, and acceptance tests.
- Build both browser and server targets when changing registration, providers,
  imports, or asset behavior.

## Babylon host customization

`AstylarRenderOptions` permits public host configuration such as `clearColor`
and `setupLighting(scene)`. The host may inspect `surface.scene`, but Astylar
owns the surface and its core renderer objects.

Do not:

- replace Astylar's camera, engine, materials, textures, or element meshes;
- retain internal meshes across `surface.update()`;
- attach untracked observers/listeners to Astylar-owned objects;
- assume CSS pixels equal Babylon world units;
- add arbitrary 3D behavior through undocumented `SiteData` fields.

Use a public plugin for a genuine in-scene custom element or owned 3D behavior.
Use ordinary Angular composition outside the canvas when the content belongs to
the browser page rather than the Astylar scene.

## Assets and readiness

Use public/static application URLs rather than component-source-relative paths.
Images become owned Babylon textures/materials and can settle after initial
layout. `surface.whenSettled()` is the deterministic readiness boundary.

An update cancels obsolete generation work. A plugin's late completion must use
the provided ownership API so stale resources are disposed rather than adopted
by the newer generation.

## Cleanup checklist

- Angular surface component destroyed, or direct surface disposed exactly once.
- Direct-host resize observers/listeners removed.
- Plugin observers, callbacks, delayed tasks, materials, textures, and meshes
  registered with generation/surface ownership.
- No application singleton retains a surface-scoped service or scene resource.
- Repeated updates reach a stable resource plateau.
- Final diagnostics report zero owned resources after disposal where the test
  exposes those counters.

