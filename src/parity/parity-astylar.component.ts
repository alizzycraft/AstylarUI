import {
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  afterNextRender,
  inject,
  viewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  Color3,
  HemisphericLight,
  Matrix,
  Mesh,
  Scene,
  StandardMaterial,
  Vector3
} from '@babylonjs/core';
import { Astylar } from '../lib';
import { BabylonElementManagerService } from '../app/services/dom/element-manager.service';
import { getParityFixture } from './fixtures';
import {
  PARITY_VIEWPORT,
  ParityElementMeasurement,
  ParityRect,
  ParityRuntimeReport
} from './parity.types';

@Component({
  selector: 'app-parity-astylar',
  template: `
    <canvas
      #canvas
      id="parity-astylar-canvas"
      width="800"
      height="600"
      aria-label="Astylar parity render"
    ></canvas>
  `,
  styles: `
    :host {
      display: block;
      width: 800px;
      height: 600px;
      overflow: hidden;
      background: #000;
    }

    canvas {
      display: block;
      width: 800px;
      height: 600px;
      outline: none;
      touch-action: none;
    }
  `
})
export class ParityAstylarComponent {
  private readonly astylar = inject(Astylar);
  private readonly elementManager = inject(BabylonElementManagerService);
  private readonly route = inject(ActivatedRoute);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private scene?: Scene;

  constructor() {
    afterNextRender(() => this.initialize());
    this.destroyRef.onDestroy(() => {
      const engine = this.scene?.getEngine();
      if (engine && !engine.isDisposed) {
        engine.dispose();
      }
      this.scene = undefined;
    });
  }

  private initialize(): void {
    const fixtureId = this.route.snapshot.paramMap.get('fixtureId') ?? '';
    const fixture = getParityFixture(fixtureId);

    if (!fixture) {
      this.publishReport({
        ready: true,
        fixtureId,
        mode: 'astylar',
        viewport: PARITY_VIEWPORT,
        elements: {},
        errors: [`Unknown parity fixture: ${fixtureId}`]
      });
      return;
    }

    this.zone.runOutsideAngular(() => {
      const canvas = this.canvas().nativeElement;
      const scene = this.astylar.render(canvas, fixture.siteData, {
        antialias: false,
        setupLighting: (lightingScene) => {
          const light = new HemisphericLight(
            'parity-light',
            new Vector3(0, 0, 1),
            lightingScene
          );
          light.intensity = 1;
          light.diffuse = Color3.White();
          light.specular = Color3.Black();
        }
      });
      scene.activeCamera?.detachControl();
      this.scene = scene;

      let renderedFrames = 0;
      const observer = scene.onAfterRenderObservable.add(() => {
        renderedFrames += 1;
        const hasAllElements = fixture.measurementIds.every((id) =>
          this.elementManager.elementsMap.has(id)
        );
        const assetsReady = scene.textures.every((texture) => texture.isReady());

        if (hasAllElements && assetsReady && renderedFrames >= 2) {
          scene.onAfterRenderObservable.remove(observer);
          canvas.dataset['parityReady'] = 'true';
          this.publishReport(
            this.createReport(
              scene,
              fixtureId,
              fixture.measurementIds,
              fixture.expectedAbsentIds ?? []
            )
          );
          return;
        }

        if (renderedFrames > 300) {
          scene.onAfterRenderObservable.remove(observer);
          this.publishReport(
            this.createReport(
              scene,
              fixtureId,
              fixture.measurementIds,
              fixture.expectedAbsentIds ?? [],
              ['Timed out waiting for all Astylar elements to render']
            )
          );
        }
      });
    });
  }

  private createReport(
    scene: Scene,
    fixtureId: string,
    measurementIds: string[],
    expectedAbsentIds: string[],
    initialErrors: string[] = []
  ): ParityRuntimeReport {
    const elements: Record<string, ParityElementMeasurement> = {};
    const errors = [...initialErrors];

    for (const id of expectedAbsentIds) {
      if (this.elementManager.elementsMap.has(id)) {
        errors.push(`Unexpected Astylar mesh for display:none element: ${id}`);
      }
    }

    for (const id of measurementIds) {
      const mesh = this.elementManager.elementsMap.get(id);
      if (!mesh) {
        errors.push(`Missing Astylar mesh: ${id}`);
        continue;
      }

      const borderBox = this.projectMeshRect(mesh, scene);
      const dimensions = this.elementManager.elementDimensionsMap.get(id);
      const style = this.elementManager.elementStylesMap.get(id)?.normal;
      const metrics = this.elementManager.textMetricsMap.get(id)?.css;
      const material = mesh.material instanceof StandardMaterial ? mesh.material : undefined;

      if (!this.isFiniteRect(borderBox)) {
        errors.push(`Non-finite projected geometry for: ${id}`);
      }
      if (dimensions && (!Number.isFinite(dimensions.width) || !Number.isFinite(dimensions.height))) {
        errors.push(`Non-finite CSS dimensions for: ${id}`);
      }

      const contentBox = dimensions
        ? this.contentRectFromDimensions(borderBox, dimensions.padding)
        : undefined;

      elements[id] = {
        id,
        borderBox,
        contentBox,
        styles: {
          display: style?.display,
          position: style?.position,
          backgroundColor: material?.diffuseColor.toHexString(),
          opacity: material?.alpha,
          borderTopWidth: style?.borderWidth,
          borderTopColor: style?.borderColor,
          borderRadius: style?.borderRadius,
          color: style?.color,
          fontFamily: style?.fontFamily,
          fontSize: style?.fontSize,
          fontWeight: style?.fontWeight,
          fontStyle: style?.fontStyle,
          lineHeight: style?.lineHeight,
          textAlign: style?.textAlign,
          whiteSpace: style?.whiteSpace,
          internalWidth: dimensions?.width,
          internalHeight: dimensions?.height
        },
        text: metrics
          ? {
              content: metrics.text,
              lineCount: metrics.lines.length,
              lines: metrics.lines.map((line) => line.text)
            }
          : undefined
      };
    }

    return {
      ready: true,
      fixtureId,
      mode: 'astylar',
      viewport: PARITY_VIEWPORT,
      elements,
      errors
    };
  }

  private projectMeshRect(mesh: Mesh, scene: Scene): ParityRect {
    mesh.refreshBoundingInfo();
    mesh.computeWorldMatrix(true);

    const engine = scene.getEngine();
    const camera = scene.activeCamera;
    if (!camera) {
      return this.emptyRect();
    }

    const viewport = camera.viewport.toGlobal(
      engine.getRenderWidth(),
      engine.getRenderHeight()
    );
    const projected = mesh
      .getBoundingInfo()
      .boundingBox.vectorsWorld.map((point) =>
        Vector3.Project(point, Matrix.IdentityReadOnly, scene.getTransformMatrix(), viewport)
      );

    const renderToCssX = engine.getRenderWidth() / PARITY_VIEWPORT.width;
    const renderToCssY = engine.getRenderHeight() / PARITY_VIEWPORT.height;
    const left = Math.min(...projected.map((point) => point.x)) / renderToCssX;
    const right = Math.max(...projected.map((point) => point.x)) / renderToCssX;
    const top = Math.min(...projected.map((point) => point.y)) / renderToCssY;
    const bottom = Math.max(...projected.map((point) => point.y)) / renderToCssY;

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top
    };
  }

  private contentRectFromDimensions(
    borderBox: ParityRect,
    padding: { top: number; right: number; bottom: number; left: number }
  ): ParityRect {
    const left = borderBox.left + padding.left;
    const top = borderBox.top + padding.top;
    const right = borderBox.right - padding.right;
    const bottom = borderBox.bottom - padding.bottom;
    return {
      left,
      top,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    };
  }

  private isFiniteRect(rect: ParityRect): boolean {
    return Object.values(rect).every((value) => Number.isFinite(value));
  }

  private emptyRect(): ParityRect {
    return { left: NaN, top: NaN, right: NaN, bottom: NaN, width: NaN, height: NaN };
  }

  private publishReport(report: ParityRuntimeReport): void {
    window.__ASTYLAR_PARITY_REPORT__ = report;
  }
}
