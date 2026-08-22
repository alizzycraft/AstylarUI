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
});
