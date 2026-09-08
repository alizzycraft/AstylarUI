import { MeshBuilder, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import type { Mesh, PointerInfo } from '@babylonjs/core';
import type { BabylonRender } from '../interfaces/render.types';
import { PointerInteractionService } from './pointer-interaction.service';
import { TextInteractionRegistryService } from './text-interaction-registry.service';
import { TextSelectionControllerService } from './text-selection-controller.service';

describe('PointerInteractionService', () => {
  it('resolves an element-owned text mesh when the element box is the direct pick', () => {
    const registry = new TextInteractionRegistryService();
    const service = new PointerInteractionService(
      registry,
      new TextSelectionControllerService(),
    );
    const elementMesh = {
      uniqueId: 1,
      metadata: { elementId: 'copy' },
    } as unknown as Mesh;
    const textMesh = {
      uniqueId: 2,
      metadata: { isTextMesh: true, elementId: 'copy' },
    } as unknown as Mesh;
    registry.register('copy', textMesh, undefined, undefined, 'Selectable copy');

    const resolved = service.resolvePreferredMesh(
      { pickInfo: { pickedMesh: elementMesh } } as unknown as PointerInfo,
      { scene: undefined } as unknown as BabylonRender,
    );

    expect(resolved).toBe(textMesh);
  });

  it('preserves an authored pointer cursor on selectable text', () => {
    const registry = new TextInteractionRegistryService();
    const service = new PointerInteractionService(
      registry,
      new TextSelectionControllerService(),
    );
    const textMesh = {
      uniqueId: 3,
      metadata: {},
    } as unknown as Mesh;
    registry.register('link-copy', textMesh, { selector: '#link-copy', cursor: 'pointer' });
    const canvas = { style: { cursor: 'default' } };
    const render = {
      scene: { getEngine: () => ({ getRenderingCanvas: () => canvas }) },
    } as unknown as BabylonRender;

    service['updateCursor'](
      { pickInfo: { pickedMesh: textMesh } } as unknown as PointerInfo,
      render,
    );

    expect(canvas.style.cursor).toBe('pointer');
  });

  it('uses the nearest generic mesh when pointer-move pick data is omitted', () => {
    const service = new PointerInteractionService(
      new TextInteractionRegistryService(),
      new TextSelectionControllerService(),
    );
    const backdrop = { uniqueId: 4, metadata: { cursor: 'default' } } as unknown as Mesh;
    const button = { uniqueId: 5, metadata: { cursor: 'pointer' } } as unknown as Mesh;
    const scene = {
      pointerX: 12,
      pointerY: 18,
      multiPick: () => [
        { pickedMesh: backdrop, distance: 20 },
        { pickedMesh: button, distance: 2 },
      ],
    };

    const resolved = service.resolvePreferredMesh(
      {
        event: new MouseEvent('pointermove', { clientX: 12, clientY: 18 }),
        pickInfo: undefined,
      } as unknown as PointerInfo,
      { scene } as unknown as BabylonRender,
    );

    expect(resolved).toBe(button);
  });

  it('refreshes the cursor from the current scene pick after a render replaces hovered meshes', () => {
    const service = new PointerInteractionService(
      new TextInteractionRegistryService(),
      new TextSelectionControllerService(),
    );
    const button = { uniqueId: 6, metadata: { cursor: 'pointer' } } as unknown as Mesh;
    const canvas = { style: { cursor: 'default' } };
    const scene = {
      pointerX: 24,
      pointerY: 36,
      pick: jasmine.createSpy('pick').and.returnValue({ pickedMesh: button }),
      getEngine: () => ({ getRenderingCanvas: () => canvas }),
    };

    service.refreshCursor({ scene } as unknown as BabylonRender);

    expect(scene.pick).toHaveBeenCalledOnceWith(24, 36);
    expect(canvas.style.cursor).toBe('pointer');
  });

  it('unprojects a picked render point once into the retained CSS text viewport', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const textMesh = MeshBuilder.CreatePlane('copy', { width: 2, height: 1 }, scene);
    const registry = new TextInteractionRegistryService();
    const service = new PointerInteractionService(registry, new TextSelectionControllerService());
    const metrics = {
      css: {
        text: 'copy', transformedText: 'copy', totalWidth: 200, totalHeight: 100,
        lineHeight: 20, ascent: 15, descent: 5, lines: [], characters: [],
      },
    };
    const entry = registry.register(
      'copy', textMesh, undefined, metrics, 'copy', 10, 20, 5,
      { width: 200, height: 100 },
    );
    const render = {
      actions: {
        camera: {
          unprojectRenderLocalPoint: ({ x, y }: { x: number; y: number }) => ({
            x: x / 0.01,
            y: -y / 0.01,
          }),
        },
      },
    } as unknown as BabylonRender;

    const cssPoint = service['toCssPoint'](
      { pickInfo: { pickedPoint: new Vector3(-0.5, 0.2, 0) } } as unknown as PointerInfo,
      entry,
      render,
    );

    expect(cssPoint).toEqual({ x: 60, y: 45 });
    textMesh.dispose();
    scene.dispose();
    engine.dispose();
  });
});
