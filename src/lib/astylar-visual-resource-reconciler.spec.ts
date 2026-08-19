import { MeshBuilder, NullEngine, Scene, StandardMaterial } from '@babylonjs/core';
import type { Mesh } from '@babylonjs/core';
import type { BabylonElementManagerService } from '../app/services/dom/element-manager.service';
import type { InputElementService } from '../app/services/dom/input/input-element.service';
import type { SiteData } from '../app/types/site-data';
import { AstylarSceneResources } from './astylar-scene-resources';
import { AstylarVisualResourceReconciler } from './astylar-visual-resource-reconciler';

describe('AstylarVisualResourceReconciler', () => {
  let engine: NullEngine;
  let scene: Scene;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
  });

  afterEach(() => engine.dispose());

  it('retains compatible keyed mesh owners while adopting fresh visual payloads', () => {
    const resources = new AstylarSceneResources(scene);
    const elements = new Map<string, Mesh>();
    let oldPanel!: Mesh;
    let oldText!: Mesh;
    resources.replace(() => {
      oldPanel = MeshBuilder.CreatePlane('panel', { width: 1 }, scene);
      oldText = MeshBuilder.CreatePlane('text', { width: 1 }, scene);
      oldText.parent = oldPanel;
      oldPanel.material = new StandardMaterial('old-panel-material', scene);
      oldText.material = new StandardMaterial('old-text-material', scene);
      elements.set('panel', oldPanel);
      elements.set('text', oldText);
    });
    const manager = {
      elementsMap: elements,
      inputElementsMap: new Map(),
    } as unknown as BabylonElementManagerService;
    const reconciler = new AstylarVisualResourceReconciler();
    const transaction = reconciler.stage(site('Before'), site('After'), manager, resources);
    let newPanel!: Mesh;
    let newText!: Mesh;
    let decoration!: Mesh;
    let replacementVertexCount = 0;

    resources.replace(() => {
      newPanel = MeshBuilder.CreatePlane('panel', { width: 2 }, scene);
      newText = MeshBuilder.CreatePlane('text', { width: 2 }, scene);
      decoration = MeshBuilder.CreatePlane('text-decoration', { width: 0.5 }, scene);
      newText.parent = newPanel;
      decoration.parent = newText;
      newPanel.material = new StandardMaterial('new-panel-material', scene);
      newText.material = new StandardMaterial('new-text-material', scene);
      elements.set('panel', newPanel);
      elements.set('text', newText);
      replacementVertexCount = newPanel.getTotalVertices();
      const result = transaction.reconcile();
      expect(result.reusedMeshes).toBe(2);
    });
    transaction.commitOwnership();

    expect(elements.get('panel')).toBe(oldPanel);
    expect(elements.get('text')).toBe(oldText);
    expect(oldPanel.isDisposed()).toBeFalse();
    expect(oldText.isDisposed()).toBeFalse();
    expect(newPanel.isDisposed()).toBeTrue();
    expect(newText.isDisposed()).toBeTrue();
    expect(oldText.parent).toBe(oldPanel);
    expect(decoration.parent).toBe(oldText);
    expect(oldPanel.getTotalVertices()).toBe(replacementVertexCount);

    resources.dispose();
    expect(oldPanel.isDisposed()).toBeTrue();
    expect(oldText.isDisposed()).toBeTrue();
  });

  it('does not retain controls or incompatible keyed nodes', () => {
    const resources = new AstylarSceneResources(scene);
    const elements = new Map<string, Mesh>();
    resources.replace(() => {
      elements.set('field', MeshBuilder.CreatePlane('field', {}, scene));
      elements.set('content', MeshBuilder.CreatePlane('content', {}, scene));
    });
    const manager = {
      elementsMap: elements,
      inputElementsMap: new Map(),
    } as unknown as BabylonElementManagerService;
    const previous: SiteData = {
      styles: [],
      root: { children: [
        { type: 'input', id: 'field', inputType: 'text' },
        { type: 'div', id: 'content' },
      ] },
    };
    const next: SiteData = {
      styles: [],
      root: { children: [
        { type: 'input', id: 'field', inputType: 'email' },
        { type: 'section', id: 'content' },
      ] },
    };

    reconcilerStage(previous, next, manager, resources);
    expect(elements.has('field')).toBeTrue();
    expect(elements.has('content')).toBeTrue();
  });

  it('retains compatible control meshes after their old manager resources are released', () => {
    const resources = new AstylarSceneResources(scene);
    const elements = new Map<string, Mesh>();
    const inputs = new Map<string, { mesh: Mesh }>();
    let oldMesh!: Mesh;
    resources.replace(() => {
      oldMesh = MeshBuilder.CreatePlane('field', {}, scene);
      elements.set('field', oldMesh);
      inputs.set('field', { mesh: oldMesh });
    });
    const manager = {
      elementsMap: elements,
      inputElementsMap: inputs,
    } as unknown as BabylonElementManagerService;
    const inputService = {
      releaseInputMesh: jasmine.createSpy('releaseInputMesh').and.returnValue(oldMesh),
    } as unknown as InputElementService;
    const previous: SiteData = {
      styles: [], root: { children: [{ type: 'input', id: 'field', inputType: 'text' }] },
    };
    const next: SiteData = {
      styles: [], root: { children: [{ type: 'input', id: 'field', inputType: 'email' }] },
    };
    const transaction = new AstylarVisualResourceReconciler().stage(
      previous, next, manager, resources, inputService,
    );
    let replacement!: Mesh;
    const nextInput = { mesh: undefined as unknown as Mesh };

    resources.replace(() => {
      replacement = MeshBuilder.CreatePlane('field', { width: 2 }, scene);
      elements.set('field', replacement);
      nextInput.mesh = replacement;
      inputs.set('field', nextInput);
      transaction.reconcile();
    });
    transaction.commitOwnership();

    expect(inputService.releaseInputMesh).toHaveBeenCalledOnceWith('field');
    expect(elements.get('field')).toBe(oldMesh);
    expect(nextInput.mesh).toBe(oldMesh);
    expect(replacement.isDisposed()).toBeTrue();
  });
});

function reconcilerStage(
  previous: SiteData,
  next: SiteData,
  manager: BabylonElementManagerService,
  resources: AstylarSceneResources,
): void {
  new AstylarVisualResourceReconciler().stage(previous, next, manager, resources);
}

function site(text: string): SiteData {
  return {
    styles: [],
    root: { children: [{
      type: 'section', id: 'panel',
      children: [{ type: 'span', id: 'text', textContent: text }],
    }] },
  };
}
