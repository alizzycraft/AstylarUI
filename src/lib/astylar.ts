/**
 * Astylar - 3D UI Rendering Library
 *
 * Main entry point for rendering HTML-like structures in BabylonJS 3D scenes.
 */

import { Injectable, inject } from "@angular/core";
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
import type { AstylarInteractionSnapshot } from './astylar-interaction-runtime';
import type { AstylarEventOptions, AstylarEventState } from './astylar-event';
import { InputElementService } from '../app/services/dom/input/input-element.service';

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
}

/**
 * AstylarService - Provides an API for rendering 3D UI scenes
 */
@Injectable({ providedIn: "root" })
export class Astylar {
  private babylonDOMRenderer = inject(BabylonDOMRendererService);
  private babylonCameraService = inject(BabylonCameraService);
  private babylonMeshService = inject(BabylonMeshService);
  private textureService = inject(TextureService);
  private styleService = inject(StyleService);
  private styleDefaultsService = inject(StyleDefaultsService);
  private imageResources = inject(ImageResourceService);
  private elementManager = inject(BabylonElementManagerService);
  private inputElementService = inject(InputElementService);
  private readonly sessions = new WeakMap<Scene, AstylarRenderSession>();
  private readonly sceneResources = new WeakMap<Scene, AstylarSceneResources>();
  private readonly interactions = new WeakMap<Scene, AstylarInteractionRuntime>();
  private activeSession?: AstylarRenderSession;

  /**
   * Renders a site data structure to a BabylonJS 3D scene on the provided canvas.
   *
   * @param canvas - The HTML canvas element to render to
   * @param siteData - The site data describing the UI structure and styles
   * @param options - Optional configuration options
   * @returns The initialized BabylonJS Scene
   */
  render(
    canvas: HTMLCanvasElement,
    siteData: SiteData,
    options?: AstylarRenderOptions,
  ): Scene {
    // Create Babylon.js engine
    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: options?.antialias ?? false,
    });

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

    const session = new AstylarRenderSession(
      scene,
      siteData,
      (currentSiteData) => {
        engine.resize(true);
        this.imageResources.retain(
          scene,
          this.collectImageSources(currentSiteData),
        );
        this.babylonDOMRenderer.initialize(
          renderContext,
          canvas.clientWidth || viewportWidth,
          canvas.clientHeight || viewportHeight,
        );
        sceneResources.replace(
          () => this.babylonDOMRenderer.createSiteFromData(currentSiteData),
          this.imageResources.getSceneTextures(scene),
        );
      },
    );
    this.sessions.set(scene, session);
    this.activeSession = session;
    const interaction = new AstylarInteractionRuntime(
      scene,
      siteData,
      options?.events,
      (elementId) => this.getLiveEventState(elementId),
      {
        getFocusedElementId: () => this.inputElementService.getFocusedElementId(),
        focus: (elementId) => {
          const input = this.inputElementService.getInputElement(elementId);
          if (!input || input.disabled) return false;
          this.inputElementService.focusInputElement(input);
          return true;
        },
        blur: (elementId) => {
          const input = this.inputElementService.getInputElement(elementId);
          if (!input) return false;
          this.inputElementService.blurInputElement(input);
          return true;
        },
        handleKeyDown: (elementId, event) => {
          this.inputElementService.handleFocusedKeyDown(elementId, event);
        },
        commitsValueOnBlur: (elementId) =>
          this.inputElementService.commitsValueOnBlur(elementId),
        emitsImmediateChangeOnKeyboardMutation: (elementId) =>
          this.inputElementService.emitsImmediateChangeOnKeyboardMutation(elementId),
        activate: (elementId) =>
          this.inputElementService.activateInputElement(elementId),
        canActivateWithSpace: (elementId) =>
          this.inputElementService.canActivateWithSpace(elementId),
        canActivateWithEnter: (elementId) =>
          this.inputElementService.canActivateWithEnter(elementId),
        getRadioNavigationTarget: (elementId, direction) =>
          this.inputElementService.getRadioNavigationTarget(elementId, direction),
      },
    );
    this.interactions.set(scene, interaction);
    session.addCleanup(() => interaction.dispose());
    session.addCleanup(() => sceneResources.dispose());
    session.addCleanup(this.imageResources.subscribe((event) => {
      if (event.scene !== scene || session.isDisposed) return;
      if (!this.collectImageSources(session.siteData).has(event.source)) return;
      void session.invalidate('asset').catch((error) => {
        if (!session.isDisposed) {
          console.error('[Astylar] Image asset reflow failed:', error);
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
          console.error('[Astylar] Resize reflow failed:', error);
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
      console.error('[Astylar] Initial render failed:', error);
    });

    // Set up cleanup on scene disposal
    scene.onDisposeObservable.add(() => {
      console.log("[Astylar] Scene disposing, cleaning up services...");
      session.dispose();
      if (this.activeSession === session) {
        this.activeSession = undefined;
      }
      this.babylonDOMRenderer.cleanup();
      this.babylonCameraService.cleanup();
      this.babylonMeshService.cleanup();

      // Dispose engine only if it's not already in the process of disposing
      if (engine && !engine.isDisposed) {
        console.log("[Astylar] Disposing engine");
        engine.dispose();
      }
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

  update(siteData: SiteData, scene?: Scene): Promise<AstylarSessionSnapshot> {
    const session = this.requireSession(scene);
    this.interactions.get(session.scene)?.setSiteData(siteData);
    return session.update(siteData);
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
}
