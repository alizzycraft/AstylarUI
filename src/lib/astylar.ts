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
          positionMesh: this.babylonMeshService.positionMesh.bind(
            this.babylonMeshService,
          ),
          parentMesh: this.babylonMeshService.parentMesh.bind(
            this.babylonMeshService,
          ),
          positionBorderFrames:
            this.babylonMeshService.positionBorderFrames.bind(
              this.babylonMeshService,
            ),
          updatePolygon: this.babylonMeshService.updatePolygon.bind(
            this.babylonMeshService,
          ),
          generatePolygonVertexData:
            this.babylonMeshService.createPolygonVertexData.bind(
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
    this.babylonDOMRenderer.initialize(
      renderContext,
      viewportWidth,
      viewportHeight,
    );

    // Start render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle window resize
    const resizeHandler = () => {
      engine.resize();
    };
    window.addEventListener("resize", resizeHandler);

    // Wait for scene ready then create content
    scene.onReadyObservable.addOnce(() => {
      engine.resize(true);
      this.babylonDOMRenderer.createSiteFromData(siteData);
    });

    // Set up cleanup on scene disposal
    scene.onDisposeObservable.add(() => {
      console.log("[Astylar] Scene disposing, cleaning up services...");
      window.removeEventListener("resize", resizeHandler);
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
}
