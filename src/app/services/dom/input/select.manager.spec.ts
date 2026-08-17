import * as BABYLON from '@babylonjs/core';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { TextRenderingService } from '../../text/text-rendering.service';
import { SelectManager } from './select.manager';
import {
  CONTROL_CONTENT_Z_OFFSET,
  SELECT_BORDER_Z_OFFSET,
} from '../render-depth.constants';

describe('SelectManager', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('places selected text between the select background and border plane', () => {
    const textRendering = {
      renderTextToTexture: () => ({ getSize: () => ({ width: 80, height: 24 }) }),
    } as unknown as TextRenderingService;
    const meshService = {
      createTextMesh: (name: string, _texture: unknown, width: number, height: number) =>
        BABYLON.MeshBuilder.CreatePlane(name, { width, height }, scene),
    } as unknown as BabylonMeshService;
    const manager = new SelectManager(textRendering, meshService);
    const select = manager.createSelectElement(
      {
        type: 'select',
        id: 'theme',
        value: 'dark',
        options: [{ value: 'dark', label: 'Dark' }],
      },
      {
        scene,
        actions: { camera: { getPixelToWorldScale: () => 0.01 } },
      } as any,
      { selector: '#theme', background: '#ffffff', color: '#000000' },
      { width: 3, height: 0.5 },
    );

    expect(select.displayMesh?.position.z).toBe(CONTROL_CONTENT_Z_OFFSET);
    expect(select.displayMesh?.position.z).toBeLessThan(SELECT_BORDER_Z_OFFSET);
    expect(select.displayMesh?.position.z).toBeGreaterThan(0);
  });

  it('commits closed arrow navigation and skips disabled options', () => {
    const textRendering = {
      renderTextToTexture: () => ({ getSize: () => ({ width: 80, height: 24 }) }),
    } as unknown as TextRenderingService;
    const meshService = {
      createTextMesh: (name: string, _texture: unknown, width: number, height: number) =>
        BABYLON.MeshBuilder.CreatePlane(name, { width, height }, scene),
    } as unknown as BabylonMeshService;
    const manager = new SelectManager(textRendering, meshService);
    const select = manager.createSelectElement(
      {
        type: 'select', id: 'choice', value: 'alpha', options: [
          { value: 'alpha', label: 'Alpha' },
          { value: 'blocked', label: 'Blocked', disabled: true },
          { value: 'beta', label: 'Beta' },
        ],
      },
      {
        scene,
        actions: { camera: { getPixelToWorldScale: () => 0.01 } },
      } as any,
      { selector: '#choice', background: '#ffffff', color: '#000000' },
      { width: 3, height: 0.5 },
    );

    manager.navigateOptions(select, 'down');

    expect(select.selectedIndex).toBe(2);
    expect(select.value).toBe('beta');
    expect(select.validationState.dirty).toBeTrue();
  });
});
