import { Color3, MeshBuilder, NullEngine, Scene } from '@babylonjs/core';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { InputType } from '../../../types/input-types';
import { FocusManager } from './focus.manager';

describe('FocusManager', () => {
  it('draws an authored spread ring as one rounded border frame', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const mesh = MeshBuilder.CreatePlane('title', { width: 7.6, height: 0.44 }, scene);
    const meshService = new BabylonMeshService();
    meshService.initialize(scene);
    const manager = new FocusManager(
      { startBlinking: () => undefined, stopBlinking: () => undefined } as never,
      {} as never,
      {
        projectCssSize: ({ width, height }: { width: number; height: number }) => ({
          width: width * .01,
          height: height * .01,
        }),
        projectCssLocalPoint: ({ x, y }: { x: number; y: number }) => ({
          x: x * .01,
          y: -y * .01,
          z: 0,
        }),
      } as never,
      meshService,
    );
    manager.setFocusIndicatorAppearance('title', {
      color: Color3.FromHexString('#1f6feb'),
      alpha: 0.3,
      widthPx: 3,
      offsetPx: 0,
      borderRadiusPx: 6,
    });
    manager.focusElement({
      element: { type: 'input', id: 'title' },
      type: InputType.Button,
      mesh,
      focused: false,
      disabled: false,
      validationState: { valid: true, errors: [], touched: false, dirty: false },
      cssSize: { width: 760, height: 44 },
    } as never);

    const indicators = scene.meshes.filter((candidate) =>
      candidate.name.startsWith('focusIndicator_title_authored'));
    expect(indicators.length).toBe(1);
    expect(indicators[0].isVisible).toBeTrue();
    expect(indicators[0].metadata.focusBorderRadiusPx).toBe(6);
    expect(indicators[0].metadata.focusOuterBorderRadiusPx).toBe(9);
    expect(indicators[0].metadata.focusIndicatorKind).toBe('authored-box-shadow');
    expect(indicators[0].getTotalVertices()).toBeGreaterThan(8);

    manager.cleanup();
    mesh.dispose(false, true);
    scene.dispose();
    engine.dispose();
  });
});
