import type { Mesh } from '@babylonjs/core';
import type { StoredTextLayoutMetrics } from '../../types/text-rendering';
import { BabylonElementManagerService } from './element-manager.service';
import { TextHighlightMeshFactory } from './interaction/text-highlight-mesh.factory';
import { TextInteractionRegistryService } from './interaction/text-interaction-registry.service';

describe('BabylonElementManagerService text interaction lifecycle', () => {
  it('registers and unregisters ordinary text meshes for pointer selection', () => {
    const registry = new TextInteractionRegistryService();
    const highlightFactory = jasmine.createSpyObj<TextHighlightMeshFactory>(
      'TextHighlightMeshFactory',
      ['clearAllHighlights'],
    );
    const manager = new BabylonElementManagerService(registry, highlightFactory);
    const mesh = {
      uniqueId: 42,
      metadata: {},
      isDisposed: false,
      dispose: jasmine.createSpy('dispose'),
    } as unknown as Mesh;
    const metrics = { css: { totalWidth: 80, totalHeight: 20 } } as StoredTextLayoutMetrics;
    const style = { selector: '#copy', cursor: 'text' };
    const texture = { isDisposed: false, dispose: jasmine.createSpy('dispose') };

    manager.registerTextElement('copy', mesh, texture, 'Selectable copy', metrics, style);

    expect(registry.getByElementId('copy')).toEqual(jasmine.objectContaining({
      elementId: 'copy',
      mesh,
      metrics,
      text: 'Selectable copy',
      style,
    }));
    expect(registry.getByMesh(mesh)?.elementId).toBe('copy');
    expect(mesh.metadata.isTextMesh).toBeTrue();

    manager.unregisterTextElement('copy');

    expect(registry.getByElementId('copy')).toBeUndefined();
    expect(registry.getByMesh(mesh)).toBeUndefined();
  });

  it('can release a rebuilt element tree without disposing cache-owned text textures', () => {
    const registry = new TextInteractionRegistryService();
    const highlightFactory = jasmine.createSpyObj<TextHighlightMeshFactory>(
      'TextHighlightMeshFactory',
      ['clearAllHighlights'],
    );
    const manager = new BabylonElementManagerService(registry, highlightFactory);
    const mesh = {
      uniqueId: 43,
      metadata: {},
      isDisposed: false,
      dispose: jasmine.createSpy('dispose'),
    } as unknown as Mesh;
    const texture = { isDisposed: false, dispose: jasmine.createSpy('dispose') };

    manager.registerTextElement(
      'cached-copy',
      mesh,
      texture,
      'Cached copy',
      { css: { totalWidth: 80, totalHeight: 20 } } as StoredTextLayoutMetrics,
    );
    manager.clearAll({ disposeTextTextures: false });

    expect(mesh.dispose).toHaveBeenCalled();
    expect(texture.dispose).not.toHaveBeenCalled();
    expect(manager.textTexturesMap.size).toBe(0);
  });
});
