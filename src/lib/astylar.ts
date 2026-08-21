/**
 * Astylar - 3D UI Rendering Library
 *
 * Main entry point for rendering HTML-like structures in BabylonJS 3D scenes.
 */

import {
  createEnvironmentInjector,
  EnvironmentInjector,
  Injectable,
  inject,
} from "@angular/core";
import {
  Engine,
  Scene,
  HemisphericLight,
  Vector3,
  Color4,
  Color3,
  Mesh,
  StandardMaterial,
} from "@babylonjs/core";
import { BabylonDOMRendererService } from "../app/services/dom/renderer.service";
import { BabylonCameraService } from "../app/services/babylon-camera.service";
import { BabylonMeshService } from "../app/services/babylon-mesh.service";
import { TextureService } from "../app/services/texture.service";
import { StyleService } from "../app/services/dom/style.service";
import { StyleDefaultsService } from "../app/services/dom/style-defaults.service";
import { SiteData } from "../app/types/site-data";
import { BabylonRender } from "../app/services/dom/interfaces/render.types";
import { AstylarRenderSession } from "./astylar-render-session";
import type {
  AstylarInvalidationReason,
  AstylarSessionSnapshot,
} from "./astylar-render-session";
import { AstylarSceneResources } from './astylar-scene-resources';
import type { AstylarSceneResourceSnapshot } from './astylar-scene-resources';
import { ImageResourceService } from '../app/services/dom/elements/image-resource.service';
import { DOMElement } from '../app/types/dom-element';
import { BabylonElementManagerService } from '../app/services/dom/element-manager.service';
import { AstylarInteractionRuntime } from './astylar-interaction-runtime';
import type {
  AstylarInteractionSnapshot,
  AstylarNavigationOptions,
} from './astylar-interaction-runtime';
import type { AstylarEventOptions, AstylarEventState } from './astylar-event';
import { InputElementService } from '../app/services/dom/input/input-element.service';
import type { Button } from '../app/types/input-types';
import { TextRenderingService } from '../app/services/text/text-rendering.service';
import { AstylarScrollRuntime } from './astylar-scroll-runtime';
import type { AstylarScrollSnapshot } from './astylar-scroll-runtime';
import { OverflowClipService } from '../app/services/dom/elements/overflow-clip.service';
import {
  AstylarSemanticBridge,
  AstylarSemanticBridgeOptions,
  AstylarSemanticControlState,
  AstylarSemanticSnapshot,
} from './astylar-semantic-bridge';
import { AstylarVisualReconciler } from './astylar-visual-reconciler';
import type { AstylarVisualReconciliationSnapshot } from './astylar-visual-reconciler';
import { AstylarVisualResourceReconciler } from './astylar-visual-resource-reconciler';
import {
  AstylarSurfaceHandle,
  type AstylarSurface,
} from './astylar-surface';
import { ASTYLAR_SURFACE_SERVICE_PROVIDERS } from './astylar-surface-providers';
import {
  AstylarDiagnosticError,
  AstylarDiagnostics,
  type AstylarDiagnostic,
  type AstylarDiagnosticsOptions,
} from './astylar-diagnostics';
import {
  ASTYLAR_PLUGIN_DEFINITIONS,
  ASTYLAR_PLUGIN_SURFACE_CONTEXT,
  AstylarCapabilityRegistry,
  type AstylarCapabilityRegistrySnapshot,
  type AstylarPluginDefinition,
  type AstylarPluginResourceSnapshot,
  type AstylarPluginResourceSource,
  type AstylarPluginInvalidationRequest,
  type AstylarPluginSurfaceContext,
} from './astylar-plugin';
import { AstylarPluginRuntime } from './astylar-plugin-runtime';
import { ASTYLAR_CORE_PLUGIN } from './astylar-core-plugin';
import {
  prepareAstylarDocument,
  type AstylarDocumentPreparationResult,
} from './astylar-document-preparation';
import {
  AstylarDocumentRecovery,
  type AstylarPluginRecoveryPolicy,
} from './astylar-document-recovery';
import { AstylarPluginHost } from './astylar-plugin-host';

/**
 * Configuration options for rendering
 */
export interface AstylarRenderOptions {
  /** Clear color for the scene background */
  clearColor?: Color4;
  /** Whether to enable antialiasing (default: false for performance) */
  antialias?: boolean;
  /** Custom lighting setup - if not provided, default hemisphere light is created */
  setupLighting?: (scene: Scene) => void;
  /** Typed handlers and an observer kept outside serializable SiteData. */
  events?: AstylarEventOptions;
  /** Browser accessibility semantics. Enabled by default; pass false to opt out. */
  accessibility?: boolean | AstylarSemanticBridgeOptions;
  /** Accepted anchor outcomes; external URLs remain host-routable intents. */
  navigation?: AstylarNavigationOptions;
  /** Validation reporting and controlled console output. */
  diagnostics?: AstylarDiagnosticsOptions;
  /** Strict by default; placeholder mode visibly recovers unavailable plugin data. */
  pluginRecovery?: AstylarPluginRecoveryPolicy;
}

/** @internal Test-harness access to the registries owned by one isolated surface. */
export const ASTYLAR_INTERNAL_INSPECTION = Symbol('AstylarInternalInspection');

export interface AstylarInternalInspection {
  readonly elementManager: BabylonElementManagerService;
  readonly inputElementService: InputElementService;
}

/**
 * AstylarService - Provides an API for rendering 3D UI scenes
 */
@Injectable()
class AstylarRenderer {
  private babylonDOMRenderer = inject(BabylonDOMRendererService);
  private babylonCameraService = inject(BabylonCameraService);
  private babylonMeshService = inject(BabylonMeshService);
  private textureService = inject(TextureService);
  private styleService = inject(StyleService);
  private styleDefaultsService = inject(StyleDefaultsService);
  private imageResources = inject(ImageResourceService);
  private elementManager = inject(BabylonElementManagerService);
  private inputElementService = inject(InputElementService);
  private textRenderingService = inject(TextRenderingService);
  private overflowClipService = inject(OverflowClipService);
  private pluginRuntime = inject(AstylarPluginRuntime);
  private capabilityRegistry = inject(AstylarCapabilityRegistry);
  private readonly sessions = new WeakMap<Scene, AstylarRenderSession>();
  private readonly sceneResources = new WeakMap<Scene, AstylarSceneResources>();
  private readonly interactions = new WeakMap<Scene, AstylarInteractionRuntime>();
  private readonly scrolling = new WeakMap<Scene, AstylarScrollRuntime>();
  private readonly semantics = new WeakMap<Scene, AstylarSemanticBridge>();
  private readonly visualReconciliation = new WeakMap<Scene, AstylarVisualReconciler>();
  private readonly surfaceHandles = new WeakMap<Scene, AstylarSurface>();
  private readonly diagnostics: AstylarDiagnostics = inject(AstylarDiagnostics);
  private readonly documentRecovery = inject(AstylarDocumentRecovery);
  private readonly pluginHost = inject(AstylarPluginHost);
  private activeSession?: AstylarRenderSession;

  /** @internal */
  get inspection(): AstylarInternalInspection {
    return {
      elementManager: this.elementManager,
      inputElementService: this.inputElementService,
    };
  }

  /**
   * Mounts an explicitly owned rendering surface on the provided canvas.
   *
   * @param canvas - The HTML canvas element to render to
   * @param siteData - The site data describing the UI structure and styles
   * @param options - Optional configuration options
   * @returns A lifecycle handle for updates, resize, diagnostics, and disposal
   */
  mount(
    canvas: HTMLCanvasElement,
    siteData: SiteData,
    options?: AstylarRenderOptions,
  ): AstylarSurface {
    this.diagnostics.configure(options?.diagnostics);
    this.documentRecovery.configure(options?.pluginRecovery);
    this.diagnostics.validateDocumentShape(siteData);
    const renderDocument = this.documentRecovery.prepare(siteData);
    this.validateDocument(siteData);
    const scene = this.createScene(canvas, renderDocument, options);
    const surface = new AstylarSurfaceHandle(scene, this);
    this.surfaceHandles.set(scene, surface);
    scene.onDisposeObservable.addOnce(() => {
      this.surfaceHandles.delete(scene);
    });
    return surface;
  }

  /**
   * Compatibility API returning the Babylon scene directly.
   * Prefer `mount()` for new consumers so ownership remains explicit.
   */
  render(
    canvas: HTMLCanvasElement,
    siteData: SiteData,
    options?: AstylarRenderOptions,
  ): Scene {
    return this.mount(canvas, siteData, options).scene;
  }

  getSurface(scene: Scene): AstylarSurface | undefined {
    return this.surfaceHandles.get(scene);
  }

  private createScene(
    canvas: HTMLCanvasElement,
    siteData: SiteData,
    options?: AstylarRenderOptions,
  ): Scene {
    // Create Babylon.js engine
    const engine = new Engine(
      canvas,
      true,
      {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: options?.antialias ?? false,
      },
      true,
    );

    // Create scene
    const scene = new Scene(engine);
    scene.clearColor = options?.clearColor ?? new Color4(0.05, 0.05, 0.1, 1.0);

    // Setup camera
    const camera = this.babylonCameraService.initialize(scene, canvas);

    // Setup lighting
    if (options?.setupLighting) {
      options.setupLighting(scene);
    } else {
      // Default lighting
      const hemisphericLight = new HemisphericLight(
        "hemispheric",
        new Vector3(0, 1, 0),
        scene,
      );
      hemisphericLight.intensity = 1.0;
      hemisphericLight.diffuse = new Color3(1.0, 1.0, 1.0);
    }

    // Initialize mesh service
    this.babylonMeshService.initialize(scene, this.babylonCameraService);

    // Create render context
    const viewportWidth = canvas.clientWidth || 1920;
    const viewportHeight = canvas.clientHeight || 1080;

    const renderContext: BabylonRender = {
      actions: {
        mesh: {
          createPolygon: this.babylonMeshService.createPolygon.bind(
            this.babylonMeshService,
          ),
          createPlane: this.babylonMeshService.createPlane.bind(
            this.babylonMeshService,
          ),
          createMaterial: this.babylonMeshService.createMaterial.bind(
            this.babylonMeshService,
          ),
          createGradientMaterial:
            this.babylonMeshService.createGradientMaterial.bind(
              this.babylonMeshService,
            ),
          createShadow: this.babylonMeshService.createShadow.bind(
            this.babylonMeshService,
          ),
          createPolygonBorder: this.babylonMeshService.createPolygonBorder.bind(
            this.babylonMeshService,
          ),
          positionTextMesh: this.babylonMeshService.positionTextMesh.bind(
            this.babylonMeshService,
          ),
          parentTextMesh: this.babylonMeshService.parentTextMesh.bind(
            this.babylonMeshService,
          ),
          positionBorderFrames:
            this.babylonMeshService.positionBorderFrames.bind(
              this.babylonMeshService,
            ),
          updateMeshWithBorderRadius:
            this.babylonMeshService.updateMeshWithBorderRadius.bind(
              this.babylonMeshService,
            ),
          updateMeshBorderRadius:
            this.babylonMeshService.updateMeshBorderRadius.bind(
              this.babylonMeshService,
            ),
          createMeshWithBorderRadius:
            this.babylonMeshService.createMeshWithBorderRadius.bind(
              this.babylonMeshService,
            ),
          createBorderMesh: this.babylonMeshService.createBorderMesh.bind(
            this.babylonMeshService,
          ),
          createTextMesh: this.babylonMeshService.createTextMesh.bind(
            this.babylonMeshService,
          ),
          createTextMaterial: this.babylonMeshService.createTextMaterial.bind(
            this.babylonMeshService,
          ),
          updateTextMesh: this.babylonMeshService.updateTextMesh.bind(
            this.babylonMeshService,
          ),
          updateTextMeshMaterial:
            this.babylonMeshService.updateTextMeshMaterial.bind(
              this.babylonMeshService,
            ),
          createPolygonVertexData:
            this.babylonMeshService.createPolygonVertexData.bind(
              this.babylonMeshService,
            ),
          generatePolygonVertexData:
            this.babylonMeshService.createPolygonVertexData.bind(
              this.babylonMeshService,
            ),
        },
        style: {
          findStyleBySelector: this.styleService.findStyleBySelector.bind(
            this.styleService,
          ),
          findStyleForElement: this.styleService.findStyleForElement.bind(
            this.styleService,
          ),
          parseBackgroundColor: this.styleService.parseBackgroundColor.bind(
            this.styleService,
          ),
          parseOpacity: this.styleService.parseOpacity.bind(this.styleService),
          getElementTypeDefaults:
            this.styleDefaultsService.getElementTypeDefaults.bind(
              this.styleDefaultsService,
            ),
          parseAlignContent: this.styleService.parseAlignContent.bind(
            this.styleService,
          ),
          parseFlexGrow: this.styleService.parseFlexGrow.bind(
            this.styleService,
          ),
          parseFlexShrink: this.styleService.parseFlexShrink.bind(
            this.styleService,
          ),
          parseFlexBasis: this.styleService.parseFlexBasis.bind(
            this.styleService,
          ),
          parseFlexShorthand: this.styleService.parseFlexShorthand.bind(
            this.styleService,
          ),
          parseAlignSelf: this.styleService.parseAlignSelf.bind(
            this.styleService,
          ),
          parseOrder: this.styleService.parseOrder.bind(this.styleService),
        },
        camera: {
          calculateViewportDimensions:
            this.babylonCameraService.calculateViewportDimensions.bind(
              this.babylonCameraService,
            ),
          getPixelToWorldScale:
            this.babylonCameraService.getPixelToWorldScale.bind(
              this.babylonCameraService,
            ),
        },
        texture: {
          getTexture: this.textureService.getTexture.bind(this.textureService),
        },
      },
      scene,
    };

    // Initialize DOM service
    this.babylonDOMRenderer.initialize(renderContext, viewportWidth, viewportHeight);
    const sceneResources = new AstylarSceneResources(scene);
    this.sceneResources.set(scene, sceneResources);
    this.pluginHost.bindResourceAdoption((resource) => sceneResources.adopt(resource));
    const visualReconciler = new AstylarVisualReconciler();
    this.visualReconciliation.set(scene, visualReconciler);
    const visualResources = new AstylarVisualResourceReconciler();
    let previousVisualIdentityData: SiteData | undefined;

    const scrollRuntime = new AstylarScrollRuntime({
      getMesh: (elementId) => this.elementManager.elementsMap.get(elementId),
      getDimensions: (elementId) => this.elementManager.elementDimensionsMap.get(elementId),
      getStyle: (elementId) => this.elementManager.elementStylesMap.get(elementId)?.normal,
      resolveStyle: (element, currentSiteData) =>
        this.styleService.findStyleForElement(element, currentSiteData.styles),
      getPixelToWorldScale: () => this.babylonCameraService.getPixelToWorldScale(),
      refreshClipping: (entries) => this.overflowClipService.refresh(entries),
    });
    this.scrolling.set(scene, scrollRuntime);
    const semanticBridge = options?.accessibility === false
      ? undefined
      : new AstylarSemanticBridge(
          canvas,
          typeof options?.accessibility === 'object' ? options.accessibility : undefined,
        );
    if (semanticBridge) this.semantics.set(scene, semanticBridge);

    let hasCompletedRender = false;
    const session = new AstylarRenderSession(
      scene,
      siteData,
      async (currentSiteData, reasons) => {
        const planningReasons = hasCompletedRender && !this.pluginHost.hasActiveGeneration
          ? [...reasons, 'plugin-generation-replaced']
          : reasons;
        const visualPlan = visualReconciler.plan(currentSiteData, planningReasons);
        if (!visualPlan.rebuild) {
          semanticBridge?.reconcile(currentSiteData);
          interaction?.reconcileModalState();
          semanticBridge?.syncControlStates((elementId) =>
            this.getLiveSemanticControlState(elementId));
          semanticBridge?.queueFocusSync(
            () => interaction?.snapshot.focusedElementId ??
              this.inputElementService.getFocusedElementId(),
            (elementId) => this.hasLiveTextSelection(elementId),
          );
          visualPlan.commit();
          previousVisualIdentityData = this.snapshotVisualIdentityData(currentSiteData);
          hasCompletedRender = true;
          return;
        }
        const generation = this.pluginHost.beginGeneration(planningReasons);
        try {
          const textState = hasCompletedRender
            ? this.inputElementService.captureTextControlStates()
            : [];
          const nonTextState = hasCompletedRender
            ? this.inputElementService.captureNonTextControlStates()
            : [];
          const scrollState = hasCompletedRender
            ? scrollRuntime.snapshot.containers
            : {};
          // Reassigning the canvas backing-store dimensions clears its current
          // frame. Only resize for an actual viewport invalidation (or the
          // initial render), and let Babylon skip a no-op size assignment.
          if (!hasCompletedRender || reasons.includes('resize')) {
            engine.resize();
          }
          this.imageResources.retain(
            scene,
            this.collectImageSources(currentSiteData),
          );
          this.babylonDOMRenderer.initialize(
            renderContext,
            canvas.clientWidth || viewportWidth,
            canvas.clientHeight || viewportHeight,
          );
          const visualResourceTransaction = visualResources.stage(
            previousVisualIdentityData,
            currentSiteData,
            this.elementManager,
            sceneResources,
            this.inputElementService,
          );
          let reusedVisualMeshes = 0;
          sceneResources.replace(
            () => {
              this.babylonDOMRenderer.createSiteFromData(currentSiteData);
              reusedVisualMeshes = visualResourceTransaction.reconcile().reusedMeshes;
              scrollRuntime.reconcile(currentSiteData, scrollState);
              semanticBridge?.reconcile(currentSiteData);
              const textFocusId = this.inputElementService.restoreTextControlStates(textState);
              const nonTextFocusId = this.inputElementService.restoreNonTextControlStates(nonTextState);
              const focusedElementId = textFocusId ?? nonTextFocusId;
              if (focusedElementId) {
                const input = this.inputElementService.getInputElement(focusedElementId);
                if (input && !input.disabled) {
                  this.inputElementService.setDefaultFocusIndicatorEnabled(
                    focusedElementId,
                    this.shouldShowDefaultFocusIndicator(focusedElementId),
                  );
                  this.inputElementService.focusInputElement(input);
                  this.setElementFocusState(focusedElementId, true);
                }
              }
              interaction?.reconcileModalState();
              semanticBridge?.syncControlStates((elementId) =>
                this.getLiveSemanticControlState(elementId));
              semanticBridge?.queueFocusSync(
                () => interaction?.snapshot.focusedElementId ??
                  this.inputElementService.getFocusedElementId(),
                (elementId) => this.hasLiveTextSelection(elementId),
              );
            },
            this.imageResources.getSceneTextures(scene),
          );
          // A backing-store resize clears the presented canvas immediately.
          // Paint the rebuilt tree in the same task so the browser never gets
          // an opportunity to composite the clear frame while settlement waits
          // for optional asynchronous generation work.
          if (!scene.isDisposed) scene.render();
          await generation.whenSettled();
          visualResourceTransaction.commitOwnership();
          visualPlan.commit({ reused: reusedVisualMeshes });
          previousVisualIdentityData = this.snapshotVisualIdentityData(currentSiteData);
          hasCompletedRender = true;
        } catch (error) {
          this.pluginHost.invalidateCurrentGeneration();
          throw error;
        }
      },
    );
    this.sessions.set(scene, session);
    this.activeSession = session;
    this.pluginHost.bindInvalidation((reason) => session.isDisposed
      ? Promise.resolve(session.snapshot)
      : session.invalidate(reason));
    let interaction: AstylarInteractionRuntime | undefined;
    let pointerFocusTransaction = false;
    const interactionEvents = semanticBridge
      ? {
          ...options?.events,
          onEvent: (event: Parameters<NonNullable<AstylarEventOptions['onEvent']>>[0]) => {
            if (event.type === 'pointerdown') pointerFocusTransaction = true;
            options?.events?.onEvent?.(event);
            semanticBridge.queueControlStateSync((elementId) =>
              this.getLiveSemanticControlState(elementId));
            const focusedElementId = this.inputElementService.getFocusedElementId();
            const pointerTransition = event.type.startsWith('pointer');
            const selectedTextClick = event.type === 'click' && !!focusedElementId &&
              this.hasLiveTextSelection(focusedElementId);
            if (event.type === 'click') pointerFocusTransaction = false;
            if (event.type === 'pointerup') {
              queueMicrotask(() => { pointerFocusTransaction = false; });
            }
            if (event.type !== 'focus' && !pointerTransition &&
                !pointerFocusTransaction && !selectedTextClick) {
              semanticBridge.queueFocusSync(
                () => interaction?.snapshot.focusedElementId ??
                  this.inputElementService.getFocusedElementId(),
                (elementId) => this.hasLiveTextSelection(elementId),
              );
            }
          },
        }
      : options?.events;
    interaction = new AstylarInteractionRuntime(
      scene,
      siteData,
      interactionEvents,
      (elementId) => this.getLiveEventState(elementId),
      {
        getFocusedElementId: () => this.inputElementService.getFocusedElementId(),
        focus: (elementId) => {
          const input = this.inputElementService.getInputElement(elementId);
          if (!input || input.disabled) return false;
          this.inputElementService.setDefaultFocusIndicatorEnabled(
            elementId,
            this.shouldShowDefaultFocusIndicator(elementId),
          );
          this.inputElementService.focusInputElement(input);
          return true;
        },
        blur: (elementId, preserveSelectionOnReset) => {
          const input = this.inputElementService.getInputElement(elementId);
          if (!input) return false;
          this.inputElementService.blurInputElement(input, preserveSelectionOnReset);
          return true;
        },
        handleKeyDown: (elementId, event) => {
          this.inputElementService.handleFocusedKeyDown(elementId, event);
        },
        scrollTextControl: (elementId, deltaX, deltaY) =>
          this.inputElementService.scrollTextControl(elementId, deltaX, deltaY),
        commitsValueOnBlur: (elementId) =>
          this.inputElementService.commitsValueOnBlur(elementId),
        emitsImmediateChangeOnKeyboardMutation: (elementId) =>
          this.inputElementService.emitsImmediateChangeOnKeyboardMutation(elementId),
        handleExpandedSelectKeyDown: (elementId, event) =>
          this.inputElementService.handleExpandedSelectKeyDown(elementId, event),
        hasExpandedSelectPopup: () =>
          this.inputElementService.hasExpandedSelectPopup(),
        commitExpandedSelectOption: (elementId, optionIndex) =>
          this.inputElementService.commitExpandedSelectOption(elementId, optionIndex),
        cancelExpandedSelect: (elementId) =>
          this.inputElementService.cancelExpandedSelect(elementId),
        activate: (elementId) =>
          this.inputElementService.activateInputElement(elementId),
        canActivateWithSpace: (elementId) =>
          this.inputElementService.canActivateWithSpace(elementId),
        canActivateWithEnter: (elementId) =>
          this.inputElementService.canActivateWithEnter(elementId),
        getRadioNavigationTarget: (elementId, direction) =>
          this.inputElementService.getRadioNavigationTarget(elementId, direction),
        resetFormControls: (elementIds) =>
          this.inputElementService.resetFormControls(elementIds),
        validateFormControls: (elementIds) =>
          this.inputElementService.validateFormControls(elementIds),
        setActiveState: (elementId, active) =>
          this.setElementActiveState(elementId, active),
        setFocusState: (elementId, focused) =>
          this.setElementFocusState(elementId, focused),
      },
      undefined,
      scrollRuntime,
      options?.navigation,
      {
        setTopLayer: (elementIds, active) => {
          const groupId = active ? 2 : 0;
          const meshes = new Set<Mesh>();
          for (const elementId of elementIds) {
            const root = this.elementManager.elementsMap.get(elementId);
            if (!root) continue;
            meshes.add(root);
            for (const descendant of root.getChildMeshes(false)) {
              if (descendant instanceof Mesh) meshes.add(descendant);
            }
          }
          for (const mesh of meshes) mesh.renderingGroupId = groupId;
        },
        setOpen: (dialogId, elementIds, open) => {
          const meshes = new Set<Mesh>();
          for (const elementId of elementIds) {
            const root = this.elementManager.elementsMap.get(elementId);
            if (!root) continue;
            meshes.add(root);
            for (const descendant of root.getChildMeshes(false)) {
              if (descendant instanceof Mesh) meshes.add(descendant);
            }
          }
          for (const mesh of meshes) mesh.setEnabled(open);
          semanticBridge?.setModalPresentation(dialogId, open);
        },
        restoreFocus: (elementId) => {
          semanticBridge?.queueFocusSync(() => elementId);
        },
      },
    );
    this.interactions.set(scene, interaction);
    semanticBridge?.connectInteractions({
      getFocusedElementId: () => interaction?.snapshot.focusedElementId,
      focus: (elementId, preservePreviousSelectionOnReset) =>
        interaction?.focusSemanticElement(elementId, preservePreviousSelectionOnReset) ?? false,
      blur: (elementId) => interaction?.blurSemanticElement(elementId) ?? false,
      activate: (elementId) => interaction?.activateSemanticElement(elementId) ?? false,
      keyDown: (event) => interaction?.handleSemanticKeyDown(event),
      keyUp: (event) => interaction?.handleSemanticKeyUp(event),
    });
    session.addCleanup(() => interaction.dispose());
    session.addCleanup(() => scrollRuntime.dispose());
    if (semanticBridge) session.addCleanup(() => semanticBridge.dispose());
    session.addCleanup(() => sceneResources.dispose());
    session.addCleanup(() => this.pluginHost.invalidateCurrentGeneration());
    session.addCleanup(this.imageResources.subscribe((event) => {
      if (event.scene !== scene || session.isDisposed) return;
      if (!this.collectImageSources(session.siteData).has(event.source)) return;
      if (event.status === 'error') {
        this.diagnostics.report({
          code: 'asset-load-failed',
          severity: 'error',
          message: `Failed to load image asset ${JSON.stringify(event.source)}.`,
          value: event.source,
        });
      }
      void session.invalidate('asset').catch((error) => {
        if (!session.isDisposed) {
          this.reportRenderFailure('Image asset reflow failed.', error);
        }
      });
    }));
    session.addCleanup(() => this.imageResources.disposeScene(scene));

    // Start render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // A canvas can resize without a window event (for example, a flex/grid
    // container changing size), so observe its actual CSS box.
    let observedWidth = canvas.clientWidth;
    let observedHeight = canvas.clientHeight;
    const resizeHandler = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === observedWidth && height === observedHeight) return;
      observedWidth = width;
      observedHeight = height;
      void session.invalidate('resize').catch((error) => {
        if (!session.isDisposed) {
          this.reportRenderFailure('Resize reflow failed.', error);
        }
      });
    };
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(resizeHandler);
    if (resizeObserver) {
      resizeObserver.observe(canvas as unknown as Element);
      session.addCleanup(() => resizeObserver.disconnect());
    } else {
      window.addEventListener('resize', resizeHandler);
      session.addCleanup(() => window.removeEventListener('resize', resizeHandler));
    }

    // Queue the initial layout through the same lifecycle used by later reflows.
    void session.invalidate('initial').catch((error) => {
      this.reportRenderFailure('Initial render failed.', error);
    });

    // Set up cleanup on scene disposal
    scene.onDisposeObservable.add(() => {
      session.dispose();
      if (this.activeSession === session) {
        this.activeSession = undefined;
      }
      this.babylonDOMRenderer.cleanup();
      this.babylonCameraService.cleanup();
      this.babylonMeshService.cleanup();

      // Scene disposal is still inside Babylon's cleanup stack here. Deferring
      // legacy scene-only engine ownership avoids re-entering Engine.dispose().
      queueMicrotask(() => {
        if (!engine.isDisposed) engine.dispose();
      });
    });

    // Return the scene directly
    return scene;
  }

  getSession(scene?: Scene): AstylarRenderSession | undefined {
    return scene ? this.sessions.get(scene) : this.activeSession;
  }

  getResourceSnapshot(scene: Scene): AstylarSceneResourceSnapshot | undefined {
    return this.sceneResources.get(scene)?.snapshot;
  }

  getInteractionSnapshot(scene: Scene): AstylarInteractionSnapshot | undefined {
    return this.interactions.get(scene)?.snapshot;
  }

  getScrollSnapshot(scene: Scene): AstylarScrollSnapshot | undefined {
    return this.scrolling.get(scene)?.snapshot;
  }

  getSemanticSnapshot(scene: Scene): AstylarSemanticSnapshot | undefined {
    return this.semantics.get(scene)?.snapshot;
  }

  getVisualReconciliationSnapshot(
    scene: Scene,
  ): AstylarVisualReconciliationSnapshot | undefined {
    return this.visualReconciliation.get(scene)?.snapshot;
  }

  getDiagnosticSnapshot(): readonly AstylarDiagnostic[] {
    return this.diagnostics.snapshot;
  }

  getPluginSnapshot(): AstylarCapabilityRegistrySnapshot {
    return this.pluginRuntime.snapshot;
  }

  getPluginResourceSnapshot(): AstylarPluginResourceSnapshot {
    return this.pluginHost.snapshot;
  }

  reportDiagnostic(diagnostic: AstylarDiagnostic): void {
    this.diagnostics.report(diagnostic);
  }

  update(siteData: SiteData, scene?: Scene): Promise<AstylarSessionSnapshot> {
    this.diagnostics.validateDocumentShape(siteData);
    const renderDocument = this.documentRecovery.prepare(siteData);
    this.validateDocument(siteData);
    const session = this.requireSession(scene);
    this.pluginHost.cancelPendingGeneration();
    this.interactions.get(session.scene)?.setSiteData(renderDocument);
    return session.update(renderDocument);
  }

  private validateDocument(siteData: SiteData): void {
    this.diagnostics.validate(siteData, this.capabilityRegistry, {
      isUnavailableElement: (identity) =>
        this.documentRecovery.isUnavailableElement(identity),
      isUnavailableProperty: (identity) =>
        this.documentRecovery.isUnavailableProperty(identity),
    });
  }

  invalidate(
    reason: AstylarInvalidationReason = 'manual',
    scene?: Scene,
  ): Promise<AstylarSessionSnapshot> {
    return this.requireSession(scene).invalidate(reason);
  }

  whenSettled(scene?: Scene): Promise<AstylarSessionSnapshot> {
    return this.requireSession(scene).whenSettled();
  }

  private requireSession(scene?: Scene): AstylarRenderSession {
    const session = this.getSession(scene);
    if (!session) {
      throw new Error('No active Astylar render session was found.');
    }
    return session;
  }

  private reportRenderFailure(message: string, error: unknown): void {
    // Typed contribution failures are reported at their source with plugin and
    // contribution identity; do not obscure them with a generic trailing entry.
    if (error instanceof AstylarDiagnosticError) return;
    this.diagnostics.report({
      code: 'render-failed',
      severity: 'error',
      message,
      value: error instanceof Error ? error.message : error,
    });
  }

  private collectImageSources(siteData: SiteData): Set<string> {
    const sources = new Set<string>();
    const visit = (element: DOMElement): void => {
      if (element.type === 'img') {
        const resolvedStyle = this.styleService.findStyleForElement(
          element,
          siteData.styles,
        );
        const source = element.src || element.style?.src || resolvedStyle?.src;
        if (source) sources.add(source);
      }
      element.children?.forEach(visit);
    };
    siteData.root.children.forEach(visit);
    return sources;
  }

  private snapshotVisualIdentityData(siteData: SiteData): SiteData {
    const snapshotElement = (element: DOMElement): DOMElement => ({
      type: element.type,
      id: element.id,
      inputType: element.inputType,
      hidden: element.hidden,
      children: element.children?.map(snapshotElement),
    });
    return {
      styles: [],
      root: { children: siteData.root.children.map(snapshotElement) },
    };
  }

  private getLiveEventState(elementId: string): AstylarEventState {
    const input = this.elementManager.inputElementsMap.get(elementId);
    if (!input) return {};
    const state: AstylarEventState = {
      value: String(input.value ?? ''),
    };
    if (typeof input.checked === 'boolean') state.checked = input.checked;
    if (typeof input.selectedIndex === 'number') {
      state.selectedValue = String(input.options?.[input.selectedIndex]?.value ?? input.value ?? '');
    }
    return state;
  }

  private getLiveSemanticControlState(
    elementId: string,
  ): AstylarSemanticControlState | undefined {
    const input = this.inputElementService.getInputElement(elementId);
    if (!input) return undefined;
    const state: AstylarSemanticControlState = {
      value: String(input.value ?? ''),
      disabled: input.disabled,
      required: input.required,
      readonly: !!input.element.readonly,
    };
    const live = input as unknown as {
      checked?: boolean;
      selectedIndex?: number;
      dropdownOpen?: boolean;
      selectionStart?: number;
      selectionEnd?: number;
    };
    if (typeof live.checked === 'boolean') {
      state.checked = live.checked;
    }
    if (typeof live.selectedIndex === 'number') {
      state.selectedIndex = live.selectedIndex;
    }
    if (typeof live.dropdownOpen === 'boolean') {
      state.expanded = live.dropdownOpen;
    }
    if (typeof live.selectionStart === 'number' && typeof live.selectionEnd === 'number') {
      state.selectionStart = live.selectionStart;
      state.selectionEnd = live.selectionEnd;
    }
    return state;
  }

  private hasLiveTextSelection(elementId: string): boolean {
    const input = this.inputElementService.getInputElement(elementId) as unknown as {
      selectionStart?: number;
      selectionEnd?: number;
    } | undefined;
    return typeof input?.selectionStart === 'number' &&
      typeof input.selectionEnd === 'number' &&
      input.selectionStart !== input.selectionEnd;
  }

  private setElementActiveState(elementId: string, active: boolean): void {
    this.setElementPseudoState(elementId, 'active', active);
  }

  private setElementFocusState(elementId: string, focused: boolean): void {
    this.setElementPseudoState(elementId, 'focus', focused);
  }

  /** Resolves the pseudo rules registered for an authored ID, type, or simple class. */
  private getElementInteractionStyles(elementId: string): {
    normal: import('../app/types/style-rule').StyleRule;
    hover?: import('../app/types/style-rule').StyleRule;
    active?: import('../app/types/style-rule').StyleRule;
    focus?: import('../app/types/style-rule').StyleRule;
  } | undefined {
    const registered = this.elementManager.elementStylesMap.get(elementId);
    const input = this.inputElementService.getInputElement(elementId);
    if (!input) return registered;

    const candidates = [
      registered,
      this.elementManager.elementStylesMap.get(input.element.type),
      ...(input.element.class ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .flatMap((className) => [
          this.elementManager.elementStylesMap.get(`.${className}`),
          this.elementManager.elementStylesMap.get(className),
        ]),
    ].filter((candidate): candidate is NonNullable<typeof candidate> => !!candidate);
    if (candidates.length === 0) return undefined;

    const findPseudo = (state: 'hover' | 'active' | 'focus') =>
      candidates.find((candidate) => candidate[state])?.[state];
    return {
      normal: input.style ?? registered?.normal ?? {},
      hover: findPseudo('hover'),
      active: findPseudo('active'),
      focus: findPseudo('focus'),
    };
  }

  private hasAuthoredFocusPaint(elementId: string): boolean {
    const styles = this.getElementInteractionStyles(elementId);
    if (!styles?.focus) return false;
    const focusBackground = styles.focus.background
      ? this.styleService.parseBackgroundColor(styles.focus.background)
      : undefined;
    const focusBorder = styles.focus.borderColor
      ? this.styleService.parseBackgroundColor(styles.focus.borderColor)
      : undefined;
    // An explicitly authored focus color remains the control's indicator even
    // when another live class (for example `.playing`) currently resolves to
    // the same color.
    const hasFocusTextColor = !!styles.focus.color;
    return focusBackground?.type === 'color' ||
      focusBorder?.type === 'color' ||
      hasFocusTextColor;
  }

  private shouldShowDefaultFocusIndicator(elementId: string): boolean {
    const normal = this.getElementInteractionStyles(elementId)?.normal;
    return this.styleService.parseOpacity(normal?.opacity) > 0 &&
      !this.hasAuthoredFocusPaint(elementId);
  }

  private setElementPseudoState(
    elementId: string,
    state: 'active' | 'focus',
    enabled: boolean,
  ): void {
    const mesh = this.elementManager.elementsMap.get(elementId);
    const styles = this.getElementInteractionStyles(elementId);
    if (!mesh || !styles?.[state]) return;
    mesh.metadata = mesh.metadata ?? {};
    const stateKey = state === 'active' ? 'astylarActiveState' : 'astylarFocusState';
    mesh.metadata[stateKey] = enabled;
    if (!Object.prototype.hasOwnProperty.call(mesh.metadata, 'astylarInteractionBaseMaterial')) {
      mesh.metadata.astylarInteractionBaseMaterial = mesh.material;
    }

    const active = !!mesh.metadata.astylarActiveState && !!styles.active;
    const focused = !!mesh.metadata.astylarFocusState && !!styles.focus;
    const borderMeshes = mesh.getChildMeshes(false)
      .filter((child) => child.name.startsWith(`${elementId}-border`));
    if (!active && !focused) {
      mesh.material = mesh.metadata.astylarInteractionBaseMaterial;
      for (const borderMesh of borderMeshes) {
        if (borderMesh.metadata?.astylarInteractionBaseMaterial) {
          borderMesh.material = borderMesh.metadata.astylarInteractionBaseMaterial;
        }
      }
      this.setButtonLabelPseudoMaterial(elementId);
      return;
    }

    const materialKey = active && focused
      ? 'astylarActiveFocusMaterial'
      : active ? 'astylarActiveMaterial' : 'astylarFocusMaterial';
    const materialSuffix = active && focused ? 'active-focus' : active ? 'active' : 'focus';
    const style = {
      ...styles.normal,
      ...(focused ? styles.focus : {}),
      ...(active ? styles.active : {}),
    };
    if (!mesh.metadata[materialKey]) {
      const background = style.background
        ? this.styleService.parseBackgroundColor(style.background)
        : undefined;
      if (background?.type === 'color') {
        mesh.metadata[materialKey] = this.babylonMeshService.createMaterial(
          `${elementId}-${materialSuffix}-material`,
          background.color,
          background.alpha ?? this.styleService.parseOpacity(style.opacity),
        );
      }
    }
    if (mesh.metadata[materialKey]) {
      mesh.material = mesh.metadata[materialKey];
    }

    if (borderMeshes.length > 0 && style.borderColor) {
      const borderMaterialKey = `${materialKey}Border`;
      if (!mesh.metadata[borderMaterialKey]) {
        const border = this.styleService.parseBackgroundColor(style.borderColor);
        if (border?.type === 'color') {
          mesh.metadata[borderMaterialKey] = this.babylonMeshService.createMaterial(
            `${elementId}-${materialSuffix}-border-material`,
            border.color,
            border.alpha ?? this.styleService.parseOpacity(style.opacity),
          );
        }
      }
      if (mesh.metadata[borderMaterialKey]) {
        for (const borderMesh of borderMeshes) {
          borderMesh.metadata = borderMesh.metadata ?? {};
          if (!Object.prototype.hasOwnProperty.call(
            borderMesh.metadata,
            'astylarInteractionBaseMaterial',
          )) {
            borderMesh.metadata.astylarInteractionBaseMaterial = borderMesh.material;
          }
          borderMesh.material = mesh.metadata[borderMaterialKey];
        }
      }
    }
    this.setButtonLabelPseudoMaterial(elementId, style, materialKey, materialSuffix);
  }

  /** Applies paint-only pseudo-state typography without rebuilding the control. */
  private setButtonLabelPseudoMaterial(
    elementId: string,
    style?: import('../app/types/style-rule').StyleRule,
    materialKey?: string,
    materialSuffix?: string,
  ): void {
    const input = this.inputElementService.getInputElement(elementId) as Button | undefined;
    const labelMesh = input?.labelMesh;
    if (!input || !labelMesh) return;
    labelMesh.metadata = labelMesh.metadata ?? {};
    if (!Object.prototype.hasOwnProperty.call(
      labelMesh.metadata,
      'astylarInteractionBaseMaterial',
    )) {
      labelMesh.metadata.astylarInteractionBaseMaterial = labelMesh.material;
    }
    if (!style || !materialKey || !materialSuffix) {
      labelMesh.material = labelMesh.metadata.astylarInteractionBaseMaterial;
      return;
    }

    const normalColor = this.getElementInteractionStyles(elementId)?.normal.color;
    if (!style.color || style.color === normalColor) {
      labelMesh.material = labelMesh.metadata.astylarInteractionBaseMaterial;
      return;
    }
    const labelMaterialKey = `${materialKey}Label`;
    if (!labelMesh.metadata[labelMaterialKey]) {
      const texture = this.textRenderingService.renderTextToTexture(
        input.element,
        input.label,
        style,
      );
      const material = this.babylonMeshService.createTextMaterial(
        `${elementId}-${materialSuffix}-label-material`,
        texture,
      );
      material.alpha = this.styleService.parseOpacity(style.opacity);
      labelMesh.metadata[labelMaterialKey] = material;
      const resources = this.sceneResources.get(labelMesh.getScene());
      resources?.adopt(texture);
      resources?.adopt(material);
    }
    labelMesh.material = labelMesh.metadata[labelMaterialKey];
  }
}

interface AstylarSurfaceRecord {
  readonly injector: EnvironmentInjector;
  readonly renderer: AstylarRenderer;
  readonly surface: AstylarSurface;
}

/** Public factory and compatibility facade for independently scoped surfaces. */
@Injectable({ providedIn: 'root' })
export class Astylar {
  private readonly parentInjector = inject(EnvironmentInjector);
  private readonly pluginDefinitions = inject(ASTYLAR_PLUGIN_DEFINITIONS, {
    optional: true,
  }) ?? [];
  private readonly resolvedPluginDefinitions = Object.freeze([
    ASTYLAR_CORE_PLUGIN,
    ...this.pluginDefinitions,
  ]);
  private readonly surfaces = new WeakMap<Scene, AstylarSurfaceRecord>();
  private readonly canvases = new WeakMap<HTMLCanvasElement, AstylarSurface>();
  private activeScene?: Scene;

  /** @internal Used by the repository parity harness; not exported by the package entry point. */
  [ASTYLAR_INTERNAL_INSPECTION](scene: Scene): AstylarInternalInspection | undefined {
    return this.surfaces.get(scene)?.renderer.inspection;
  }

  /**
   * Inspects compatibility and applies pure plugin-owned schema migrations to
   * a detached copy. Rendering never mutates or silently upgrades authored data.
   */
  prepareDocument(siteData: SiteData): AstylarDocumentPreparationResult {
    const registry = new AstylarCapabilityRegistry(this.resolvedPluginDefinitions);
    return prepareAstylarDocument(siteData, registry);
  }

  mount(
    canvas: HTMLCanvasElement,
    siteData: SiteData,
    options?: AstylarRenderOptions,
  ): AstylarSurface {
    const pluginProviders = this.getPluginProviders(this.resolvedPluginDefinitions);
    const injector = createEnvironmentInjector(
      [
        AstylarRenderer,
        ...ASTYLAR_SURFACE_SERVICE_PROVIDERS,
        ...pluginProviders,
        {
          provide: AstylarCapabilityRegistry,
          useFactory: () => new AstylarCapabilityRegistry(
            this.resolvedPluginDefinitions,
            (diagnostic) => inject(AstylarDiagnostics).report(diagnostic),
          ),
        },
        {
          provide: ASTYLAR_PLUGIN_SURFACE_CONTEXT,
          useFactory: (): AstylarPluginSurfaceContext => {
            const registry = inject(AstylarCapabilityRegistry);
            const diagnostics = inject(AstylarDiagnostics);
            const host = inject(AstylarPluginHost);
            return Object.freeze({
              surfaceId: Symbol('AstylarPluginSurface'),
              capabilities: registry.snapshot,
              resources: host.resources,
              createResourceOwner: (source: AstylarPluginResourceSource) =>
                host.createSurfaceOwner(source),
              requestInvalidation: (request: AstylarPluginInvalidationRequest) =>
                host.requestInvalidation(request),
              report: (diagnostic: AstylarDiagnostic) => diagnostics.report(diagnostic),
            });
          },
        },
        AstylarPluginRuntime,
      ],
      this.parentInjector,
      'AstylarSurface',
    );
    const diagnostics = injector.get(AstylarDiagnostics);
    diagnostics.configure(options?.diagnostics);
    let injectorDestroyed = false;
    const destroyInjector = (): void => {
      if (injectorDestroyed) return;
      injectorDestroyed = true;
      injector.destroy();
    };
    try {
      const existing = this.canvases.get(canvas);
      if (existing && !existing.disposed) {
        const diagnostic = diagnostics.report({
          code: 'canvas-in-use',
          severity: 'error',
          message: 'This canvas already hosts a live Astylar surface.',
        });
        throw new AstylarDiagnosticError(diagnostic);
      }
      injector.get(AstylarCapabilityRegistry);
      injector.get(AstylarPluginRuntime).activate();
      const renderer = injector.get(AstylarRenderer);
      const surface = renderer.mount(canvas, siteData, options);
      const record: AstylarSurfaceRecord = { injector, renderer, surface };
      this.surfaces.set(surface.scene, record);
      this.canvases.set(canvas, surface);
      this.activeScene = surface.scene;
      surface.scene.onDisposeObservable.addOnce(() => {
        this.surfaces.delete(surface.scene);
        if (this.canvases.get(canvas) === surface) this.canvases.delete(canvas);
        if (this.activeScene === surface.scene) this.activeScene = undefined;
        destroyInjector();
      });
      return surface;
    } catch (error) {
      destroyInjector();
      throw error;
    }
  }

  private getPluginProviders(
    definitions: readonly AstylarPluginDefinition[],
  ) {
    return definitions.flatMap((plugin) => [
      ...(plugin.contributions.renderers ?? []).map(({ renderer }) => renderer),
      ...(plugin.contributions.lifecycle ?? []).map(({ lifecycle }) => lifecycle),
      ...(plugin.providers ?? []),
    ]);
  }

  /** Compatibility API. Prefer retaining the handle returned by `mount()`. */
  render(
    canvas: HTMLCanvasElement,
    siteData: SiteData,
    options?: AstylarRenderOptions,
  ): Scene {
    return this.mount(canvas, siteData, options).scene;
  }

  getSurface(scene: Scene): AstylarSurface | undefined {
    return this.surfaces.get(scene)?.surface;
  }

  getSession(scene?: Scene): AstylarRenderSession | undefined {
    const record = this.getRecord(scene, false);
    return record?.renderer.getSession(scene ?? this.activeScene);
  }

  getResourceSnapshot(scene: Scene): AstylarSceneResourceSnapshot | undefined {
    return this.surfaces.get(scene)?.renderer.getResourceSnapshot(scene);
  }

  getInteractionSnapshot(scene: Scene): AstylarInteractionSnapshot | undefined {
    return this.surfaces.get(scene)?.renderer.getInteractionSnapshot(scene);
  }

  getScrollSnapshot(scene: Scene): AstylarScrollSnapshot | undefined {
    return this.surfaces.get(scene)?.renderer.getScrollSnapshot(scene);
  }

  getSemanticSnapshot(scene: Scene): AstylarSemanticSnapshot | undefined {
    return this.surfaces.get(scene)?.renderer.getSemanticSnapshot(scene);
  }

  getVisualReconciliationSnapshot(
    scene: Scene,
  ): AstylarVisualReconciliationSnapshot | undefined {
    return this.surfaces.get(scene)?.renderer.getVisualReconciliationSnapshot(scene);
  }

  update(siteData: SiteData, scene?: Scene): Promise<AstylarSessionSnapshot> {
    const record = this.getRecord(scene);
    return record.renderer.update(siteData, scene ?? this.activeScene);
  }

  invalidate(
    reason: AstylarInvalidationReason = 'manual',
    scene?: Scene,
  ): Promise<AstylarSessionSnapshot> {
    const record = this.getRecord(scene);
    return record.renderer.invalidate(reason, scene ?? this.activeScene);
  }

  whenSettled(scene?: Scene): Promise<AstylarSessionSnapshot> {
    const record = this.getRecord(scene);
    return record.renderer.whenSettled(scene ?? this.activeScene);
  }

  private getRecord(
    scene?: Scene,
  ): AstylarSurfaceRecord;
  private getRecord(
    scene: Scene | undefined,
    required: false,
  ): AstylarSurfaceRecord | undefined;
  private getRecord(
    scene?: Scene,
    required = true,
  ): AstylarSurfaceRecord | undefined {
    const resolvedScene = scene ?? this.activeScene;
    const record = resolvedScene ? this.surfaces.get(resolvedScene) : undefined;
    if (!record && required) {
      throw new AstylarDiagnosticError({
        code: 'surface-not-found',
        severity: 'error',
        message: 'No active Astylar rendering surface was found.',
      });
    }
    return record;
  }
}
