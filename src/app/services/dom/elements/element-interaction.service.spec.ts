import { Mesh, NullEngine, Scene } from '@babylonjs/core';

import { BabylonMeshService } from '../../babylon-mesh.service';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { ELEMENT_BORDER_Z_OFFSET } from '../render-depth.constants';
import { ElementInteractionService } from './element-interaction.service';

describe('ElementInteractionService shadows', () => {
  it('keeps a shadow at its owner origin so later layout movement stays synchronized', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const meshes = new BabylonMeshService();
    meshes.initialize(scene);
    const parent = new Mesh('parent', scene);
    const owner = meshes.createPolygon('owner', 'rectangle', 120, 60, 12);
    owner.parent = parent;
    owner.position.set(14, 22, 3);
    const elements = new Map<string, Mesh>([['owner', owner]]);
    const service = new ElementInteractionService({} as never, {} as never);
    const dom = {
      context: { elements, hoverStates: new Map<string, boolean>() },
    } as unknown as BabylonDOM;
    const render = {
      scene,
      actions: {
        camera: {
          projectCssLength: (value: number) => value,
          projectCssSize: (size: { width: number; height: number }) => size,
        },
        style: { parseOpacity: () => 1 },
        mesh: {
          createShadow: meshes.createShadow.bind(meshes),
          parentTextMesh: meshes.parentTextMesh.bind(meshes),
        },
      },
    } as unknown as BabylonRender;

    service.syncShadow(
      dom,
      render,
      'owner',
      { selector: '#owner', boxShadow: '0 2px 3px rgba(0,0,0,.2)', borderRadius: '12px' },
      owner,
      parent,
      { width: 120, height: 60 },
    );

    const shadow = elements.get('owner-shadow')!;
    expect(shadow.parent).toBe(owner);
    expect(shadow.position.x).toBe(0);
    expect(shadow.position.y).toBe(0);
    expect(shadow.position.z).toBe(ELEMENT_BORDER_Z_OFFSET / 2);

    owner.position.set(40, 55, 3);
    owner.computeWorldMatrix(true);
    shadow.computeWorldMatrix(true);
    expect(shadow.getAbsolutePosition().x).toBeCloseTo(owner.getAbsolutePosition().x, 8);
    expect(shadow.getAbsolutePosition().y).toBeCloseTo(owner.getAbsolutePosition().y, 8);

    engine.dispose();
  });
});
