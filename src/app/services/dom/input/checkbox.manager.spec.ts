import { NullEngine, Scene } from '@babylonjs/core';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { CheckboxManager } from './checkbox.manager';

describe('CheckboxManager CSS geometry', () => {
  it('projects checkbox and radio indicators without reconstructing mesh bounds', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const meshes = new BabylonMeshService();
    meshes.initialize(scene);
    const camera = {
      projectCssSize: ({ width, height }: { width: number; height: number }) => ({
        width: width * .25,
        height: height * .25,
      }),
      projectCssLocalPoint: ({ x, y }: { x: number; y: number }) => ({
        x: x * .25,
        y: -y * .25,
        z: 0,
      }),
    };
    const render = {
      scene,
      actions: {
        camera,
        mesh: {
          createPolygon: meshes.createPolygon.bind(meshes),
        },
      },
    } as never;
    const manager = new CheckboxManager({} as never, meshes);

    const checkbox = manager.createCheckbox(
      { type: 'input', inputType: 'checkbox', id: 'choice', checked: true },
      render,
      { selector: '#choice', borderRadius: '2px' },
      { width: 20.5, height: 18.25 },
    );
    const radio = manager.createRadioButton(
      { type: 'input', inputType: 'radio', id: 'radio', checked: true },
      render,
      { selector: '#radio' },
      { width: 20.5, height: 20.5 },
    );
    spyOn(checkbox.mesh, 'getBoundingInfo').and.throwError(
      'choice geometry must not be reconstructed from Babylon bounds',
    );
    spyOn(radio.mesh, 'getBoundingInfo').and.throwError(
      'choice geometry must not be reconstructed from Babylon bounds',
    );

    expect(checkbox.checkIndicatorMesh!.getBoundingInfo().boundingBox.extendSize.x * 2)
      .toBeCloseTo(20.5 * .6 * .25, 6);
    expect(radio.selectionIndicatorMesh!.getBoundingInfo().boundingBox.extendSize.x * 2)
      .toBeCloseTo(20.5 * .6 * .25, 6);
    expect(radio.mesh.rotation.x).toBe(0);

    manager.disposeCheckbox(checkbox);
    manager.disposeRadioButton(radio);
    scene.dispose();
    engine.dispose();
  });
});
