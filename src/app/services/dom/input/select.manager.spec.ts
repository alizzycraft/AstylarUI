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

  it('opens compact popup rows with native selected and disabled treatment', () => {
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
      {
        selector: '#choice', background: '#ffffff', color: '#000000',
        fontSize: '16px', padding: '12px 14px', borderWidth: '2px',
      },
      { width: 2.2, height: 0.56 },
    );

    manager.openDropdown(select, scene, select.style);

    const dropdownHeight = select.dropdownMesh!.getBoundingInfo().boundingBox.extendSize.y * 2;
    const selectedMaterial = select.optionMeshes[0].material as BABYLON.StandardMaterial;
    expect(dropdownHeight).toBeCloseTo(0.78, 5);
    expect(select.optionMeshes[1].isPickable).toBeFalse();
    expect(selectedMaterial.diffuseColor.r).toBeCloseTo(25 / 255, 5);
    expect(selectedMaterial.diffuseColor.g).toBeCloseTo(103 / 255, 5);
    expect(selectedMaterial.diffuseColor.b).toBeCloseTo(210 / 255, 5);
  });

  it('keeps expanded keyboard navigation tentative until the active option is committed', () => {
    const renderedText: string[] = [];
    const textRendering = {
      renderTextToTexture: (_element: unknown, text: string) => {
        renderedText.push(text);
        return { getSize: () => ({ width: 80, height: 24 }) };
      },
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

    manager.openDropdown(select, scene, select.style);
    manager.navigateOptions(select, 'down');

    expect(select.activeOptionIndex).toBe(2);
    expect(select.selectedIndex).toBe(0);
    expect(select.value).toBe('alpha');
    expect(select.validationState.dirty).toBeFalse();
    expect(renderedText.at(-4)).toBe('Beta');

    manager.selectOption(select, select.activeOptionIndex);

    expect(select.selectedIndex).toBe(2);
    expect(select.value).toBe('beta');
    expect(select.dropdownOpen).toBeFalse();
    expect(select.validationState.dirty).toBeTrue();
  });

  it('places a popup above only when below space is insufficient and above is larger', () => {
    const manager = new SelectManager({} as TextRenderingService, {} as BabylonMeshService);

    expect(manager['choosePopupDirection'](490, 54, 105)).toBe('above');
    expect(manager['choosePopupDirection'](180, 220, 105)).toBe('below');
    expect(manager['choosePopupDirection'](40, 54, 105)).toBe('below');
  });

  it('treats a popup hit behind an authored mesh as inside the expanded select', () => {
    const manager = new SelectManager({} as TextRenderingService, {} as BabylonMeshService);
    const selectMesh = BABYLON.MeshBuilder.CreatePlane('choice', {}, scene);
    const dropdownMesh = BABYLON.MeshBuilder.CreatePlane('dropdown', {}, scene);
    const optionMesh = BABYLON.MeshBuilder.CreatePlane('option', {}, scene);
    const blocker = BABYLON.MeshBuilder.CreatePlane('page-layer', {}, scene);
    dropdownMesh.parent = selectMesh;
    optionMesh.parent = dropdownMesh;
    spyOn(scene, 'multiPick').and.returnValue([
      { pickedMesh: blocker },
      { pickedMesh: optionMesh },
    ] as any);

    expect(manager['isPopupPointerTarget'](
      { mesh: selectMesh, dropdownMesh } as any,
      scene,
      {
        event: new PointerEvent('pointerdown'),
        pickInfo: { pickedMesh: blocker },
      } as unknown as BABYLON.PointerInfo,
    )).toBeTrue();
  });

  it('disposes the replaced display material when selection redraws', () => {
    const textRendering = {
      renderTextToTexture: () => ({ getSize: () => ({ width: 80, height: 24 }) }),
    } as unknown as TextRenderingService;
    const meshService = {
      createTextMesh: (name: string, _texture: unknown, width: number, height: number) => {
        const mesh = BABYLON.MeshBuilder.CreatePlane(name, { width, height }, scene);
        mesh.material = new BABYLON.StandardMaterial(`${name}-material`, scene);
        return mesh;
      },
    } as unknown as BabylonMeshService;
    const manager = new SelectManager(textRendering, meshService);
    const select = manager.createSelectElement(
      {
        type: 'select', id: 'choice', value: 'alpha', options: [
          { value: 'alpha', label: 'Alpha' },
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
    const firstMaterial = select.displayMesh?.material as BABYLON.Material;
    const initialMaterialCount = scene.materials.length;

    manager.selectOption(select, 1);

    expect(scene.materials).not.toContain(firstMaterial);
    expect(scene.materials.length).toBe(initialMaterialCount);
  });
});
