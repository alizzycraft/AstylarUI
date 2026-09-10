import { BabylonDOMRendererService } from './renderer.service';
import { DOMAncestryService } from './dom-ancestry.service';
import { DOMElement } from '../../types/dom-element';

describe('BabylonDOMRendererService', () => {
  it('inherits caret and pointer hit-testing styles into rendered descendants', () => {
    const renderer = Object.create(
      BabylonDOMRendererService.prototype,
    ) as BabylonDOMRendererService;

    expect(renderer['pickInheritedTextProperties']({
      selector: '#parent', caretColor: 'transparent', pointerEvents: 'none',
    })).toEqual({ caretColor: 'transparent', pointerEvents: 'none' });
  });

  it('accepts text content without an authored element ID', () => {
    const renderer = Object.create(
      BabylonDOMRendererService.prototype,
    ) as BabylonDOMRendererService;

    const validation = renderer['validateTextElement']({
      type: 'span',
      textContent: 'Generated mesh text',
    });

    expect(validation.isValid).toBeTrue();
    expect(validation.errors).toEqual([]);
  });

  it('retains the resolved CSS style on text meshes for renderer diagnostics', () => {
    const renderer = Object.create(
      BabylonDOMRendererService.prototype,
    ) as BabylonDOMRendererService;
    (renderer as unknown as { babylonMeshService: unknown }).babylonMeshService = {
      createTextMesh: () => ({ metadata: {}, isPickable: false }),
    };
    const resolvedStyle = { selector: '#label', fontSize: '12px', lineHeight: '16px' };

    const mesh = renderer['createTextMesh'](
      'label', {} as never, { width: 40, height: 16 }, resolvedStyle, { scene: {} } as never,
    );

    expect(mesh.metadata['astylarResolvedStyle']).toEqual(resolvedStyle);
  });

  it('does not displace a line box after the text canvas has positioned its baseline', () => {
    const renderer = Object.create(
      BabylonDOMRendererService.prototype,
    ) as BabylonDOMRendererService;
    const textMesh = {
      parent: undefined,
      position: { x: 0, y: 0, z: 0 },
    };
    const parentMesh = {
      name: 'tooltip',
      getBoundingInfo: () => { throw new Error('text layout must not read mesh bounds'); },
    };
    const render = {
      actions: {
        camera: {
          projectCssLocalPoint: (point: { x: number; y: number }, z: number) => ({
            x: point.x,
            y: -point.y,
            z,
          }),
        },
      },
    };

    renderer['positionTextMesh'](
      textMesh as never,
      parentMesh as never,
      { width: 80, height: 16 },
      { selector: '.tooltip', fontSize: '12px', lineHeight: '16px' },
      { top: 4, right: 8, bottom: 4, left: 8 },
      { width: 107, height: 24, padding: { top: 4, right: 8, bottom: 4, left: 8 } },
      render as never,
    );

    expect(textMesh.position.y).toBe(0);
  });

  it('centers direct text as an anonymous item in a centered flex container', () => {
    const renderer = Object.create(
      BabylonDOMRendererService.prototype,
    ) as BabylonDOMRendererService;
    const textMesh = {
      parent: undefined,
      position: { x: 0, y: 0, z: 0 },
    };
    const parentMesh = { name: 'option' };
    const render = {
      actions: {
        camera: {
          projectCssLocalPoint: (point: { x: number; y: number }, z: number) => ({
            x: point.x,
            y: -point.y,
            z,
          }),
        },
      },
    };

    renderer['positionTextMesh'](
      textMesh as never,
      parentMesh as never,
      { width: 80, height: 20 },
      {
        selector: '.option',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      { top: 0, right: 0, bottom: 0, left: 0 },
      { width: 200, height: 48, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
      render as never,
    );

    expect(textMesh.position.x).toBe(0);
    expect(textMesh.position.y).toBe(0);
  });

  it('registers complete DOM ancestry before intrinsic pre-layout', () => {
    const renderer = Object.create(
      BabylonDOMRendererService.prototype,
    ) as BabylonDOMRendererService;
    const ancestry = new DOMAncestryService();
    (renderer as unknown as { ancestry: DOMAncestryService }).ancestry = ancestry;
    const textarea: DOMElement = { type: 'textarea', id: 'bio' };
    const row: DOMElement = { type: 'div', id: 'row', children: [textarea] };
    const panel: DOMElement = { type: 'section', id: 'panel', children: [row] };
    const root: DOMElement = { type: 'div', id: 'root-body' };

    renderer['registerAncestry']([panel], root);

    expect(ancestry.getParent(panel)).toBe(root);
    expect(ancestry.getParent(row)).toBe(panel);
    expect(ancestry.getParent(textarea)).toBe(row);
  });
});
