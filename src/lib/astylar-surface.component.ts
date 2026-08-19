import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import type { SiteData } from '../app/types/site-data';
import { Astylar, type AstylarRenderOptions } from './astylar';
import type { AstylarSurface } from './astylar-surface';

/** SSR-safe Angular ownership boundary for one Astylar rendering surface. */
@Component({
  selector: 'astylar-surface',
  standalone: true,
  template: `
    <canvas #canvas class="astylar-surface-canvas">
      AstylarUI requires a browser with canvas support.
    </canvas>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      min-width: 0;
      min-height: 0;
    }

    .astylar-surface-canvas {
      display: block;
      width: 100%;
      height: 100%;
      outline: none;
      touch-action: none;
    }
  `],
})
export class AstylarSurfaceComponent {
  readonly siteData = input.required<SiteData>();
  /** Mount-only options. Update handlers through stable callbacks or remount. */
  readonly options = input<AstylarRenderOptions>();
  readonly mounted = output<AstylarSurface>();
  readonly failed = output<unknown>();
  readonly surface = signal<AstylarSurface | undefined>(undefined);

  private readonly astylar = inject(Astylar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private renderedData?: SiteData;
  private destroyed = false;

  constructor() {
    effect(() => {
      const siteData = this.siteData();
      const surface = this.surface();
      if (!surface || siteData === this.renderedData) return;
      this.renderedData = siteData;
      const update = this.zone.runOutsideAngular(() => surface.update(siteData));
      void update.catch((error) => {
        if (!this.destroyed) this.zone.run(() => this.failed.emit(error));
      });
    });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId) || this.surface()) return;
      try {
        const siteData = this.siteData();
        this.renderedData = siteData;
        const surface = this.zone.runOutsideAngular(() => this.astylar.mount(
          this.canvas().nativeElement,
          siteData,
          this.options(),
        ));
        this.surface.set(surface);
        void surface.whenSettled().then(
          () => {
            if (!this.destroyed) this.zone.run(() => this.mounted.emit(surface));
          },
          (error) => {
            if (!this.destroyed) this.zone.run(() => this.failed.emit(error));
          },
        );
      } catch (error) {
        this.failed.emit(error);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      const surface = this.surface();
      if (surface) this.zone.runOutsideAngular(() => surface.dispose());
    });
  }
}
