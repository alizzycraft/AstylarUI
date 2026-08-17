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
  getParityViewport,
  PARITY_VIEWPORTS,
  ParityElementMeasurement,
  ParityRect,
  ParityRuntimeReport,
  ParityViewport
} from './parity.types';

@Component({
  selector: 'app-parity-astylar',
  template: `
    <canvas
      #canvas
      id="parity-astylar-canvas"
      [attr.width]="parityViewport.width"
      [attr.height]="parityViewport.height"
      [style.width.px]="parityViewport.width"
      [style.height.px]="parityViewport.height"
      aria-label="Astylar parity render"
    ></canvas>
  `,
  host: {
    '[style.width.px]': 'parityViewport.width',
    '[style.height.px]': 'parityViewport.height',
  },
  styles: `
    :host {
      display: block;
      overflow: hidden;
      background: #000;
    }

    canvas {
      display: block;
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
  protected parityViewport = getParityViewport(
    this.route.snapshot.queryParamMap.get('viewport')
  );

  private scene?: Scene;
  private resizeGeneration = 0;

  constructor() {
    afterNextRender(() => this.initialize());
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', this.onWindowResize);
      delete window.__ASTYLAR_PARITY_SET_VIEWPORT__;
      delete window.__ASTYLAR_PARITY_APPLY_STEP__;
      delete window.__ASTYLAR_PARITY_DISPOSE__;
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
        viewport: this.parityViewport,
        elements: {},
        errors: [`Unknown parity fixture: ${fixtureId}`]
      });
      return;
    }

    this.zone.runOutsideAngular(() => {
      const canvas = this.canvas().nativeElement;
      const freshStep = Number.parseInt(
        this.route.snapshot.queryParamMap.get('dynamic-state') ?? '',
        10,
      );
      const renderData = Number.isInteger(freshStep)
        ? fixture.dynamicSteps?.[freshStep]?.siteData ?? fixture.siteData
        : fixture.siteData;
      const dynamicSequence = this.route.snapshot.queryParamMap.get('dynamic') === 'true' &&
        !!fixture.dynamicSteps?.length;
      const scene = this.astylar.render(canvas, renderData, {
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
      if (dynamicSequence) {
        window.__ASTYLAR_PARITY_APPLY_STEP__ = async (index, viewportId) => {
          const step = fixture.dynamicSteps?.[index];
          if (!step) throw new Error(`Unknown dynamic step: ${index}`);
          if (viewportId) {
            this.setViewportBox(PARITY_VIEWPORTS[viewportId]);
            await this.nextFrame();
            await this.nextFrame();
            await this.astylar.invalidate('resize', scene);
          }
          canvas.dataset['parityReady'] = 'false';
          await this.astylar.update(step.siteData, scene);
          this.captureWhenReady(scene, canvas, fixture);
        };
        window.__ASTYLAR_PARITY_DISPOSE__ = () => {
          const session = this.astylar.getSession(scene);
          const before = {
            resources: this.astylar.getResourceSnapshot(scene),
            elements: this.elementManager.elementsMap.size,
            inputs: this.elementManager.inputElementsMap.size,
            cleanupRegistrations: session?.snapshot.cleanupRegistrations ?? 0,
          };
          const engine = scene.getEngine();
          engine.dispose();
          return {
            before,
            after: {
              resources: this.astylar.getResourceSnapshot(scene),
              elements: this.elementManager.elementsMap.size,
              inputs: this.elementManager.inputElementsMap.size,
              cleanupRegistrations: session?.snapshot.cleanupRegistrations ?? 0,
              sessionStatus: session?.snapshot.status,
              engineDisposed: engine.isDisposed,
              sceneDisposed: scene.isDisposed,
            },
          };
        };
        return;
      }
      if (
        fixture.responsiveSequence &&
        this.route.snapshot.queryParamMap.get('dynamic') === 'true'
      ) {
        window.addEventListener('resize', this.onWindowResize);
        window.__ASTYLAR_PARITY_SET_VIEWPORT__ = (id) =>
          this.applyResponsiveViewport(PARITY_VIEWPORTS[id]);
      }

      const shouldApplyDynamicSteps = !Number.isInteger(freshStep);
      void (shouldApplyDynamicSteps
        ? this.applyDynamicSteps(scene, fixture)
        : this.astylar.whenSettled(scene)).then(() => {
        this.captureWhenReady(scene, canvas, fixture);
      }).catch((error) => {
        this.publishReport({
          ready: true,
          fixtureId,
          mode: 'astylar',
          viewport: this.parityViewport,
          elements: {},
          errors: [error instanceof Error ? error.message : String(error)]
        });
      });
    });
  }

  private readonly onWindowResize = (): void => {
    const viewport = Object.values(PARITY_VIEWPORTS).find(
      (candidate) => candidate.width === window.innerWidth
    );
    const scene = this.scene;
    if (!viewport || !scene) return;
    this.applyResponsiveViewport(viewport);
  };

  private applyResponsiveViewport(viewport: ParityViewport): void {
    const scene = this.scene;
    if (!scene) return;
    this.setViewportBox(viewport);
    const canvas = this.canvas().nativeElement;
    canvas.dataset['parityReady'] = 'false';
    const fixture = getParityFixture(this.route.snapshot.paramMap.get('fixtureId') ?? '');
    if (!fixture) return;
    const generation = ++this.resizeGeneration;
    void this.captureAfterResponsiveReflow(generation, scene, canvas, fixture);
  }

  private setViewportBox(viewport: ParityViewport): void {
    this.parityViewport = viewport;
    const canvas = this.canvas().nativeElement;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    if (canvas.parentElement) {
      canvas.parentElement.style.width = `${viewport.width}px`;
      canvas.parentElement.style.height = `${viewport.height}px`;
    }
  }

  private async captureAfterResponsiveReflow(
    generation: number,
    scene: Scene,
    canvas: HTMLCanvasElement,
    fixture: NonNullable<ReturnType<typeof getParityFixture>>
  ): Promise<void> {
    await this.nextFrame();
    await this.nextFrame();
    // The production ResizeObserver requests this same reason. The explicit
    // request gives the action harness a deterministic await point and
    // coalesces with the observer when both occur in the same frame.
    await this.astylar.invalidate('resize', scene);
    if (generation !== this.resizeGeneration) return;
    this.captureWhenReady(scene, canvas, fixture);
  }

  private nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  private async applyDynamicSteps(
    scene: Scene,
    fixture: NonNullable<ReturnType<typeof getParityFixture>>
  ): Promise<void> {
    await this.astylar.whenSettled(scene);
    for (const step of fixture.dynamicSteps ?? []) {
      await this.astylar.update(step.siteData, scene);
    }
  }

  private captureWhenReady(
    scene: Scene,
    canvas: HTMLCanvasElement,
    fixture: NonNullable<ReturnType<typeof getParityFixture>>
  ): void {
    const fixtureId = fixture.id;

    let renderedFrames = 0;
    const observer = scene.onAfterRenderObservable.add(() => {
      renderedFrames += 1;
      const hasAllElements = fixture.measurementIds.every((id) =>
        this.elementManager.elementsMap.has(id)
      );
      const assetsReady = scene.textures.every((texture) => texture.isReady());
      const sessionSettled = this.astylar.getSession(scene)?.snapshot.status === 'idle';

      if (hasAllElements && assetsReady && sessionSettled && renderedFrames >= 2) {
        scene.onAfterRenderObservable.remove(observer);
        canvas.dataset['parityReady'] = 'true';
        this.publishReport(
          this.createReport(
            scene,
            fixtureId,
            fixture.measurementIds,
            fixture.expectedAbsentIds ?? [],
            fixture.expectedMissingIds ?? []
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
            fixture.expectedMissingIds ?? [],
            ['Timed out waiting for all Astylar elements to render']
          )
        );
      }
    });
  }

  private createReport(
    scene: Scene,
    fixtureId: string,
    measurementIds: string[],
    expectedAbsentIds: string[],
    expectedMissingIds: string[],
    initialErrors: string[] = []
  ): ParityRuntimeReport {
    const elements: Record<string, ParityElementMeasurement> = {};
    const errors = [...initialErrors];

    for (const id of [...expectedAbsentIds, ...expectedMissingIds]) {
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
      const elementType = this.elementManager.elementTypesMap.get(id);
      const inputElement = this.elementManager.inputElementsMap.get(id);
      const metrics = this.elementManager.textMetricsMap.get(id)?.css
        ?? (elementType === 'textarea' ? inputElement?.textLayoutMetrics : undefined);
      const textContent = elementType === 'textarea' ? `${inputElement?.value ?? ''}` : metrics?.text;
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
          zIndex: style?.zIndex,
          internalZ: mesh.getAbsolutePosition().z,
          internalWidth: dimensions?.width,
          internalHeight: dimensions?.height
        },
        text: metrics
          ? {
              content: textContent,
              lineCount: metrics.lines.length,
              lines: metrics.lines.map((line: { text: string }) => line.text)
            }
          : undefined
      };
    }

    return {
      ready: true,
      revision: this.astylar.getSession(scene)?.snapshot.revision,
      fixtureId,
      mode: 'astylar',
      viewport: this.parityViewport,
      elements,
      errors,
      resources: this.astylar.getResourceSnapshot(scene),
      registries: {
        elements: this.elementManager.elementsMap.size,
        inputs: this.elementManager.inputElementsMap.size,
      },
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

    const renderToCssX = engine.getRenderWidth() / this.parityViewport.width;
    const renderToCssY = engine.getRenderHeight() / this.parityViewport.height;
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
