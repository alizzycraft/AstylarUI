import * as BABYLON from '@babylonjs/core';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { TextRenderingService } from '../../text/text-rendering.service';
import { Button } from '../../../types/input-types';
import { ButtonManager } from './button.manager';

describe('ButtonManager', () => {
  it('keeps button labels at their CSS size on high-density displays', () => {
    spyOnProperty(window, 'devicePixelRatio', 'get').and.returnValue(2);
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const textRendering = {
      renderTextToTexture: () => ({ getSize: () => ({ width: 80, height: 24 }) }),
    } as unknown as TextRenderingService;
    const meshService = {
      createTextMesh: (name: string, _texture: unknown, width: number, height: number) =>
        BABYLON.MeshBuilder.CreatePlane(name, { width, height }, scene),
    } as unknown as BabylonMeshService;
    const manager = new ButtonManager(
      textRendering,
      { parseBorderRadius: () => 0 } as never,
      meshService,
    );
    const mesh = BABYLON.MeshBuilder.CreatePlane('button', { width: 2, height: 0.5 }, scene);
    const button = {
      label: 'Generate speech',
      element: { type: 'button', id: 'generate', value: 'Generate speech' },
      mesh,
    } as Button;

    const label = manager['createLabelMesh'](
      button,
      { scene, actions: { camera: { getPixelToWorldScale: () => 0.01 } } } as never,
      { selector: '#generate', fontSize: '14px' },
    );
    const size = label.getBoundingInfo().boundingBox.extendSize;

    expect(size.x * 2).toBeCloseTo(0.4, 5);
    expect(size.y * 2).toBeCloseTo(0.12, 5);
    expect(label.position.y).toBeCloseTo(0.0075, 5);
    engine.dispose();
  });
});
