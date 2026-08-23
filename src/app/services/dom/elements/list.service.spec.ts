import { Mesh } from '@babylonjs/core';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { ListService } from './list.service';

describe('ListService', () => {
  it('stacks intrinsic list items at the content edge without extra indentation', () => {
    const service = new ListService({} as never, {} as never);
    const positions = new Map<string, { x: number; y: number }>();
    const parent = { name: 'list' } as Mesh;
    const dimensions = new Map<string, {
      width: number;
      height: number;
      padding: { top: number; right: number; bottom: number; left: number };
    }>([
      ['list', { width: 360, height: 190, padding: { top: 23, right: 23, bottom: 23, left: 55 } }],
    ]);
    const dom = {
      actions: {
        createElement: (_dom: unknown, _render: unknown, child: { id: string }) => {
          dimensions.set(child.id, {
            width: 282,
            height: 24,
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
          });
          return { name: child.id, position: { z: 0 } } as Mesh;
        },
        processChildren: () => undefined,
      },
      context: {
        elementDimensions: dimensions,
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        camera: { getPixelToWorldScale: () => 1 },
        style: {
          findStyleForElement: () => ({ selector: 'li', display: 'list-item' }),
          parseBackgroundColor: () => null,
        },
        mesh: {
          createPolygon: (name: string) => ({ name, metadata: undefined }) as Mesh,
          createMaterial: () => ({}),
          positionTextMesh: (mesh: Mesh, x: number, y: number) => {
            positions.set(mesh.name, { x, y });
          },
          parentTextMesh: () => undefined,
        },
      },
    } as unknown as BabylonRender;

    service.processListChildren(
      dom,
      render,
      [
        { type: 'li', id: 'one', textContent: 'One' },
        { type: 'li', id: 'two', textContent: 'Two' },
      ],
      parent,
      [],
      'ul',
    );

    expect(positions.get('one')).toEqual({ x: 16, y: 60 });
    expect(positions.get('two')).toEqual({ x: 16, y: 36 });
    expect(positions.get('one-marker')).toEqual({ x: -136, y: 60 });
  });

  it('renders sequential decimal marker text for ordered lists', () => {
    const renderedMarkers: string[] = [];
    const textRendering = {
      calculateTextDimensions: () => ({ width: 12, height: 18 }),
      renderTextToTexture: (_element: unknown, text: string) => {
        renderedMarkers.push(text);
        return {};
      },
    };
    const service = new ListService(
      textRendering as never,
      { parseTextProperties: () => ({}) } as never,
    );
    const parent = { name: 'list' } as Mesh;
    const dimensions = new Map([
      ['list', { width: 200, height: 100, padding: { top: 10, right: 10, bottom: 10, left: 40 } }],
    ]);
    const dom = {
      actions: {
        createElement: (_dom: unknown, _render: unknown, child: { id: string }) => {
          dimensions.set(child.id, {
            width: 150,
            height: 20,
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
          });
          return { name: child.id, position: { z: 0 } } as Mesh;
        },
        processChildren: () => undefined,
      },
      context: {
        elementDimensions: dimensions,
        elementStyles: new Map(),
      },
    } as unknown as BabylonDOM;
    const render = {
      actions: {
        camera: { getPixelToWorldScale: () => 1 },
        style: { findStyleForElement: () => ({ selector: 'li' }) },
        mesh: {
          createTextMesh: (name: string) => ({ name, rotation: { z: 0 }, metadata: undefined }) as Mesh,
          positionTextMesh: () => undefined,
          parentTextMesh: () => undefined,
        },
      },
    } as unknown as BabylonRender;

    service.processListChildren(
      dom,
      render,
      [
        { type: 'li', id: 'one', textContent: 'One' },
        { type: 'li', id: 'two', textContent: 'Two' },
      ],
      parent,
      [],
      'ol',
    );

    expect(renderedMarkers).toEqual(['1.', '2.']);
  });
});
