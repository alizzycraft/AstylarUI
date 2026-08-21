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
import type { AstylarEvent, AstylarEventSnapshot } from '../lib';
import { BabylonElementManagerService } from '../app/services/dom/element-manager.service';
import { InputElementService } from '../app/services/dom/input/input-element.service';
import { ASTYLAR_INTERNAL_INSPECTION } from '../lib/astylar';
import { getParityFixture } from './fixtures';
import {
  getParityViewport,
  PARITY_VIEWPORTS,
  ParityControlState,
  ParityElementMeasurement,
  ParityNormalizedEvent,
  ParityNavigationOutcome,
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
  private elementManager!: BabylonElementManagerService;
  private inputElementService!: InputElementService;
  private readonly route = inject(ActivatedRoute);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  protected parityViewport = getParityViewport(
    this.route.snapshot.queryParamMap.get('viewport')
  );

  private scene?: Scene;
  private resizeGeneration = 0;
  private reportRevision = 0;
  private readonly interactionEvents: ParityNormalizedEvent[] = [];
  private readonly navigationOutcomes: ParityNavigationOutcome[] = [];
  private readonly visualOwnerTokens = new WeakMap<Mesh, number>();
  private nextVisualOwnerToken = 1;

  constructor() {
    afterNextRender(() => this.initialize());
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', this.onWindowResize);
      delete window.__ASTYLAR_PARITY_SET_VIEWPORT__;
      delete window.__ASTYLAR_PARITY_APPLY_STEP__;
      delete window.__ASTYLAR_PARITY_DISPOSE__;
      delete window.__ASTYLAR_PARITY_INTERACTION_STEPS__;
      delete window.__ASTYLAR_PARITY_CAPTURE_INTERACTION__;
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
      const interactionSequence = this.route.snapshot.queryParamMap.get('interaction') === 'true' &&
        !!fixture.interactionSteps?.length;
      const scene = this.astylar.render(canvas, renderData, {
        antialias: false,
        events: interactionSequence
          ? {
              handlers: Object.fromEntries([
                ...new Set([
                  ...(fixture.cancelClickIds ?? []),
                  ...(fixture.cancelDialogIds ?? []),
                ]),
              ].map((id) => [id, {
                ...(fixture.cancelClickIds?.includes(id)
                  ? { click: (event: AstylarEvent) => event.preventDefault() }
                  : {}),
                ...(fixture.cancelDialogIds?.includes(id)
                  ? { cancel: (event: AstylarEvent) => event.preventDefault() }
                  : {}),
              }])),
              onEvent: (event) => {
                if (fixture.interactionEventTypes?.includes(event.type) &&
                    fixture.interactionIds?.includes(event.targetId)) {
                  this.interactionEvents.push(this.normalizeEvent(event));
                }
              },
            }
          : undefined,
        navigation: interactionSequence
          ? { onNavigate: (outcome) => this.navigationOutcomes.push({ ...outcome }) }
          : undefined,
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
      const surface = this.astylar.getSurface(scene);
      if (!surface) throw new Error('Astylar surface handle is unavailable.');
      const inspection = this.astylar[ASTYLAR_INTERNAL_INSPECTION](scene);
      if (!inspection) throw new Error('Astylar surface inspection is unavailable.');
      this.elementManager = inspection.elementManager;
      this.inputElementService = inspection.inputElementService;
      if (dynamicSequence || interactionSequence) {
        window.__ASTYLAR_PARITY_DISPOSE__ = () => {
          const diagnosticsBefore = surface.diagnostics;
          const before = {
            resources: diagnosticsBefore.resources,
            elements: this.elementManager.elementsMap.size,
            inputs: this.elementManager.inputElementsMap.size,
            cleanupRegistrations: diagnosticsBefore.session?.cleanupRegistrations ?? 0,
            semanticNodes: diagnosticsBefore.semantics?.nodes ?? 0,
            semanticEventRegistrations: diagnosticsBefore.semantics?.eventRegistrations ?? 0,
            semanticObserverRegistrations: diagnosticsBefore.semantics?.observerRegistrations ?? 0,
          };
          const engine = scene.getEngine();
          surface.dispose();
          const diagnosticsAfter = surface.diagnostics;
          return {
            before,
            after: {
              resources: diagnosticsAfter.resources,
              elements: this.elementManager.elementsMap.size,
              inputs: this.elementManager.inputElementsMap.size,
              cleanupRegistrations: diagnosticsAfter.session?.cleanupRegistrations ?? 0,
              semanticNodes: diagnosticsAfter.semantics?.nodes ?? 0,
              semanticEventRegistrations: diagnosticsAfter.semantics?.eventRegistrations ?? 0,
              semanticObserverRegistrations: diagnosticsAfter.semantics?.observerRegistrations ?? 0,
              sessionStatus: diagnosticsAfter.session?.status,
              engineDisposed: engine.isDisposed,
              sceneDisposed: scene.isDisposed,
            },
          };
        };
      }
      if (interactionSequence) {
        window.__ASTYLAR_PARITY_INTERACTION_STEPS__ = fixture.interactionSteps;
        window.__ASTYLAR_PARITY_CAPTURE_INTERACTION__ = async () => {
          await this.astylar.whenSettled(scene);
          await this.nextFrame();
          await this.nextFrame();
          this.captureWhenReady(scene, canvas, fixture);
        };
        if (fixture.dynamicSteps?.length) {
          window.__ASTYLAR_PARITY_APPLY_STEP__ = async (index, viewportId) => {
            const step = fixture.dynamicSteps?.[index];
            if (!step) throw new Error(`Unknown interaction update step: ${index}`);
            if (viewportId) {
              this.setViewportBox(PARITY_VIEWPORTS[viewportId]);
              await this.nextFrame();
              await this.nextFrame();
            }
            canvas.dataset['parityReady'] = 'false';
            await this.astylar.update(step.siteData, scene);
            await this.nextFrame();
            await this.nextFrame();
          };
        }
      }
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
        return;
      }
      if (
        fixture.responsiveSequence &&
        this.route.snapshot.queryParamMap.get('responsive') === 'true'
      ) {
        window.addEventListener('resize', this.onWindowResize);
        window.__ASTYLAR_PARITY_SET_VIEWPORT__ = (id) =>
          this.applyResponsiveViewport(PARITY_VIEWPORTS[id]);
      }

      const shouldApplyDynamicSteps = !interactionSequence && !Number.isInteger(freshStep);
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
      const hasAllElements = fixture.measurementIds
        .filter((id) => !fixture.optionalMeasurementIds?.includes(id))
        .every((id) =>
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
            fixture.optionalMeasurementIds ?? [],
            fixture.expectedAbsentIds ?? [],
            fixture.expectedMissingIds ?? [],
            fixture.interactionIds ?? [],
            fixture.scrollIds ?? [],
            !!fixture.interactionSteps?.length,
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
            fixture.optionalMeasurementIds ?? [],
            fixture.expectedAbsentIds ?? [],
            fixture.expectedMissingIds ?? [],
            fixture.interactionIds ?? [],
            fixture.scrollIds ?? [],
            !!fixture.interactionSteps?.length,
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
    optionalMeasurementIds: string[],
    expectedAbsentIds: string[],
    expectedMissingIds: string[],
    interactionIds: string[],
    scrollIds: string[],
    includeInteraction: boolean,
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
        if (!optionalMeasurementIds.includes(id)) {
          errors.push(`Missing Astylar mesh: ${id}`);
        }
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
        visibility: this.measureVisibility(id, borderBox, scene),
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
      revision: ++this.reportRevision,
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
      semantics: this.astylar.getSemanticSnapshot(scene),
      visualOwners: Object.fromEntries(
        measurementIds.flatMap((id) => {
          const mesh = this.elementManager.elementsMap.get(id);
          return mesh ? [[id, this.visualOwnerToken(mesh)]] : [];
        }),
      ),
      visualReconciliation: this.astylar.getVisualReconciliationSnapshot(scene),
      interaction: includeInteraction
        ? {
            events: [...this.interactionEvents],
            focusedElementId: this.astylar.getInteractionSnapshot(scene)?.focusedElementId,
            modalDialogId: this.astylar.getInteractionSnapshot(scene)?.modalDialogId,
            controls: this.measureControls(interactionIds),
            scrollContainers: Object.fromEntries(
              scrollIds.map((id) => {
                const state = this.astylar.getScrollSnapshot(scene)?.containers[id];
                return [id, state ? {
                  ...state,
                  initialScrollLeft: 0,
                  initialScrollTop: 0,
                  maxScrollLeft: Math.max(0, state.scrollWidth - state.clientWidth),
                  maxScrollTop: Math.max(0, state.scrollHeight - state.clientHeight),
                  canReachRight: state.scrollLeft >= state.scrollWidth - state.clientWidth - 1,
                  canReachBottom: state.scrollTop >= state.scrollHeight - state.clientHeight - 1,
                } : undefined];
              })
                .filter((entry) => entry[1] !== undefined),
            ),
            navigationOutcomes: [...this.navigationOutcomes],
            registrations: {
              pointerObservers: this.astylar.getInteractionSnapshot(scene)?.pointerObservers ?? 0,
              wheelHandlers: this.astylar.getInteractionSnapshot(scene)?.wheelHandlers ?? 0,
              keyboardListeners: this.astylar.getInteractionSnapshot(scene)?.keyboardListeners ?? 0,
              handlers: this.astylar.getInteractionSnapshot(scene)?.handlers ?? 0,
              ...this.inputElementService.getSelectPopupLifecycleSnapshot(),
            },
          }
        : undefined,
    };
  }

  private measureVisibility(
    elementId: string,
    borderBox: ParityRect,
    scene: Scene,
  ): import('./parity.types').ParityVisibilityMeasurement {
    const viewportBox: ParityRect = {
      left: 0,
      top: 0,
      right: this.parityViewport.width,
      bottom: this.parityViewport.height,
      width: this.parityViewport.width,
      height: this.parityViewport.height,
    };
    let visible = this.intersectRects(borderBox, viewportBox);
    const clippingAncestorIds: string[] = [];
    const fixture = getParityFixture(this.route.snapshot.paramMap.get('fixtureId') ?? '');
    const ancestors = fixture ? this.findAncestorIds(fixture.siteData.root.children, elementId) : [];
    for (const ancestorId of ancestors) {
      const overflow = this.elementManager.elementStylesMap.get(ancestorId)?.normal?.overflow;
      if (!['hidden', 'clip', 'auto', 'scroll'].includes(overflow ?? '')) continue;
      const ancestorMesh = this.elementManager.elementsMap.get(ancestorId);
      if (!ancestorMesh) continue;
      const ancestorRect = this.projectMeshRect(ancestorMesh, scene);
      const next = visible && this.intersectRects(visible, ancestorRect);
      if (!next || !visible || next.width < visible.width || next.height < visible.height) {
        clippingAncestorIds.push(ancestorId);
      }
      visible = next;
    }
    const fullyVisible = !!visible &&
      Math.abs(visible.left - borderBox.left) < 0.01 &&
      Math.abs(visible.top - borderBox.top) < 0.01 &&
      Math.abs(visible.right - borderBox.right) < 0.01 &&
      Math.abs(visible.bottom - borderBox.bottom) < 0.01;
    return {
      exists: true,
      intersectsViewport: !!visible,
      fullyVisible,
      clipped: !fullyVisible,
      clippingAncestorIds,
      viewportIntersection: visible,
    };
  }

  private findAncestorIds(
    roots: import('../app/types/dom-element').DOMElement[],
    targetId: string,
  ): string[] {
    const visit = (
      element: import('../app/types/dom-element').DOMElement,
      ancestors: string[],
    ): string[] | undefined => {
      if (element.id === targetId) return ancestors;
      const next = element.id ? [...ancestors, element.id] : ancestors;
      for (const child of element.children ?? []) {
        const found = visit(child, next);
        if (found) return found;
      }
      return undefined;
    };
    for (const root of roots) {
      const found = visit(root, []);
      if (found) return found;
    }
    return [];
  }

  private intersectRects(left: ParityRect, right: ParityRect): ParityRect | undefined {
    const intersection = {
      left: Math.max(left.left, right.left),
      top: Math.max(left.top, right.top),
      right: Math.min(left.right, right.right),
      bottom: Math.min(left.bottom, right.bottom),
      width: 0,
      height: 0,
    };
    intersection.width = Math.max(0, intersection.right - intersection.left);
    intersection.height = Math.max(0, intersection.bottom - intersection.top);
    return intersection.width > 0 && intersection.height > 0 ? intersection : undefined;
  }

  private getFocusedElementId(): string | undefined {
    for (const [id, input] of this.elementManager.inputElementsMap) {
      if (input?.focused) return id;
    }
    return undefined;
  }

  private measureControls(ids: string[]): Record<string, ParityControlState> {
    const controls: Record<string, ParityControlState> = {};
    for (const id of ids) {
      const input = this.elementManager.inputElementsMap.get(id);
      if (!input) continue;
      const options = Array.isArray(input.options) ? input.options : [];
      const semanticType = 'buttonType' in input ? input.buttonType : input.type;
      controls[id] = {
        type: String(semanticType),
        value: String(input.value ?? ''),
        checked: typeof input.checked === 'boolean' ? input.checked : undefined,
        selectedIndex: typeof input.selectedIndex === 'number' ? input.selectedIndex : undefined,
        selectedValue: typeof input.selectedIndex === 'number'
          ? String(options[input.selectedIndex]?.value ?? input.value ?? '')
          : undefined,
        expanded: typeof input.dropdownOpen === 'boolean' ? input.dropdownOpen : undefined,
        disabled: !!input.disabled,
        focused: !!input.focused,
        selectionStart: typeof input.selectionStart === 'number' ? input.selectionStart : undefined,
        selectionEnd: typeof input.selectionEnd === 'number' ? input.selectionEnd : undefined,
        cursorPosition: typeof input.cursorPosition === 'number' ? input.cursorPosition : undefined,
        scrollLeft: typeof input.selectionStart === 'number'
          ? Math.floor(input.scrollOffset ?? 0)
          : undefined,
        scrollTop: input.element.type === 'textarea'
          ? Math.round(input.scrollTop ?? 0)
          : undefined,
        touched: input.validationState?.touched,
        dirty: input.validationState?.dirty,
        valid: input.validationState?.valid,
      };
    }
    return controls;
  }

  private normalizeEvent(event: AstylarEventSnapshot): ParityNormalizedEvent {
    return {
      type: event.type,
      targetId: event.targetId,
      currentTargetId: event.currentTargetId,
      defaultPrevented: event.defaultPrevented,
      value: event.value,
      checked: event.checked,
      selectedValue: event.selectedValue,
      key: event.key,
      code: event.code,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      button: event.button,
      pointerType: event.pointerType,
    };
  }

  private visualOwnerToken(mesh: Mesh): number {
    let token = this.visualOwnerTokens.get(mesh);
    if (token === undefined) {
      token = this.nextVisualOwnerToken++;
      this.visualOwnerTokens.set(mesh, token);
    }
    return token;
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
