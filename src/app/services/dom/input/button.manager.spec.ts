import * as BABYLON from '@babylonjs/core';
import { BabylonMeshService } from '../../babylon-mesh.service';
import { TextRenderingService } from '../../text/text-rendering.service';
import { Button } from '../../../types/input-types';
import { ButtonManager } from './button.manager';
import { OverflowClipService } from '../elements/overflow-clip.service';
import { StyleDefaultsService } from '../style-defaults.service';
import { createCssLayoutBox } from '../../css-layout-geometry';
import type { StyleRule } from '../../../types/style-rule';

describe('ButtonManager', () => {
  it('does not introduce an own clipping boundary for omitted or visible overflow', () => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    try {
      for (const overflow of [undefined, 'visible', 'hidden'] as const) {
        const renderTextToTexture = jasmine.createSpy('renderTextToTexture').and.returnValue({});
        const manager = new ButtonManager(
          { renderTextToTexture, getLogicalTextureSize: () => ({ width: 120, height: 80 }) } as unknown as TextRenderingService,
          { parseBorderRadius: () => 0 } as never,
          { createTextMesh: (name: string, _texture: unknown, width: number, height: number) => {
            const mesh = BABYLON.MeshBuilder.CreatePlane(name, { width, height }, scene);
            mesh.material = new BABYLON.StandardMaterial(`${name}-material`, scene);
            return mesh;
          } } as unknown as BabylonMeshService,
        );
        const style: StyleRule = { ...new StyleDefaultsService().getElementTypeDefaults('button'),
          selector: '#overflow-button', ...(overflow ? { overflow } : {}) };
        const button = manager.createButton(
          { type: 'button', id: `overflow-${overflow}`, value: 'Oversized label' },
          { scene, actions: {
            camera: { projectCssSize: (size: { width: number; height: number }) => size },
            style: { parseOpacity: () => 1 },
            mesh: { createPolygon: (name: string, _shape: string, width: number, height: number) =>
              BABYLON.MeshBuilder.CreatePlane(name, { width, height }, scene) },
          } } as never,
          style, { width: 60, height: 40 },
        );
        const label = button.labelMesh!;
        const material = label.material!;
        expect(label.parent).toBe(button.mesh);
        expect(label.getBoundingInfo().boundingBox.extendSize.x * 2).toBe(120);
        expect(renderTextToTexture.calls.mostRecent().args.length).toBe(3);
        expect(material.clipPlane).toBeUndefined();
        const project = jasmine.createSpy('project').and.callFake(({ x, y }: { x: number; y: number }) => ({ x, y, z: 0 }));
        new OverflowClipService().apply(button.mesh, style, new Map([[button.mesh.name, {
          parentId: null, box: createCssLayoutBox({ x: 0, y: 0, width: 60, height: 40 }),
        }]]), project);
        if (overflow === 'hidden') {
          expect(project).toHaveBeenCalledTimes(2);
          expect(material.clipPlane).toBeTruthy();
          expect(material.clipPlane4).toBeTruthy();
        } else {
          expect(project).not.toHaveBeenCalled();
          expect(material.clipPlane).toBeUndefined();
          expect(material.clipPlane4).toBeUndefined();
        }
        manager.disposeButton(button);
      }
    } finally {
      engine.dispose();
    }
  });

  it('supports aria-labelled icon buttons without inventing a visual label', () => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const renderTextToTexture = jasmine.createSpy('renderTextToTexture');
    const manager = new ButtonManager(
      { renderTextToTexture } as unknown as TextRenderingService,
      { parseBorderRadius: () => 0 } as never,
      {} as BabylonMeshService,
    );
    const button = manager.createButton(
      { type: 'button', id: 'calendar', value: '', ariaLabel: 'Open calendar' },
      {
        scene,
        actions: {
          camera: {
            projectCssSize: ({ width, height }: { width: number; height: number }) => ({
              width: width * .01,
              height: height * .01,
            }),
          },
          mesh: { createPolygon: (name: string) => BABYLON.MeshBuilder.CreatePlane(name, {}, scene) },
        },
      } as never,
      { selector: '#calendar' },
      { width: 40, height: 40 },
    );

    expect(button.label).toBe('');
    expect(button.labelMesh).toBeUndefined();
    expect(renderTextToTexture).not.toHaveBeenCalled();
    engine.dispose();
  });

  it('keeps the browser-aligned line box centered without an optical offset', () => {
    spyOnProperty(window, 'devicePixelRatio', 'get').and.returnValue(2);
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const textRendering = {
      renderTextToTexture: () => ({ getSize: () => ({ width: 80, height: 24 }) }),
      getLogicalTextureSize: () => ({ width: 40, height: 12 }),
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
      cssSize: { width: 200, height: 50 },
    } as Button;

    const label = manager['createLabelMesh'](
      button,
      {
        scene,
        actions: {
          camera: {
            projectCssSize: ({ width, height }: { width: number; height: number }) => ({
              width: width * .01,
              height: height * .01,
            }),
            projectCssLocalPoint: ({ x, y }: { x: number; y: number }) => ({
              x: x * .01,
              y: -y * .01,
              z: 0,
            }),
          },
        },
      } as never,
      { selector: '#generate', fontSize: '14px' },
    );
    const size = label.getBoundingInfo().boundingBox.extendSize;

    expect(size.x * 2).toBeCloseTo(0.4, 5);
    expect(size.y * 2).toBeCloseTo(0.12, 5);
    expect(label.position.y).toBe(0);
    engine.dispose();
  });
});
