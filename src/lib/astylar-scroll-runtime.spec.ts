import { Mesh, MeshBuilder, NullEngine, Scene } from '@babylonjs/core';
import type { DOMElement } from '../app/types/dom-element';
import type { SiteData } from '../app/types/site-data';
import type { StyleRule } from '../app/types/style-rule';
import type {
  CssLayoutNode,
  CssPoint,
  CssSize,
} from '../app/services/coordinate-space.types';
import { createCssLayoutBox } from '../app/services/css-layout-geometry';
import { BabylonScrollPaintAdapter } from '../app/services/babylon-scroll-paint-adapter';
import { AstylarScrollRuntime } from './astylar-scroll-runtime';

function createPaintAdapter(scale = 1): BabylonScrollPaintAdapter {
  return new BabylonScrollPaintAdapter({
    projectCssSize: ({ width, height }: CssSize) => ({
      width: width * scale,
      height: height * scale,
    }),
    projectCssLocalPoint: ({ x, y }: CssPoint, z = 0) => ({
      x: x * scale,
      y: -y * scale,
      z,
    }),
  } as never);
}

function layoutNode(
  parentId: string | null,
  x: number,
  y: number,
  width: number,
  height: number,
): CssLayoutNode {
  return { parentId, box: createCssLayoutBox({ x, y, width, height }) };
}

describe('AstylarScrollRuntime', () => {
  let engine: NullEngine;
  let scene: Scene;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('measures, clamps, and applies vertical scroll offsets', () => {
    const { runtime, siteData, meshes } = createVerticalRuntime(scene);
    runtime.reconcile(siteData);

    expect(runtime.snapshot.containers['box']).toEqual({
      scrollLeft: 0,
      scrollTop: 0,
      scrollWidth: 240,
      scrollHeight: 240,
      clientWidth: 240,
      clientHeight: 160,
    });

    expect(runtime.scrollFrom('one', 0, 70)).toBeTrue();
    expect(runtime.snapshot.containers['box'].scrollTop).toBe(70);
    expect(meshes.get('one')?.position.y).toBe(110);

    expect(runtime.scrollFrom('two', 0, 500)).toBeTrue();
    expect(runtime.snapshot.containers['box'].scrollTop).toBe(80);
    expect(meshes.get('one')?.position.y).toBe(120);

    expect(runtime.scrollFrom('three', 0, -30)).toBeTrue();
    expect(runtime.snapshot.containers['box'].scrollTop).toBe(50);
    expect(meshes.get('one')?.position.y).toBe(90);
  });

  it('omitted and visible overflow do not create or consume a scroll container', () => {
    for (const mode of ['omitted', 'visible', 'auto', 'scroll'] as const) {
      const { runtime, siteData } = createVerticalRuntime(scene);
      const element = siteData.root.children[0];
      // Inline inputs override the helper's normal auto style. For omission,
      // use an independent runtime with an actually absent overflow property.
      if (mode !== 'omitted') element.style = { overflow: mode };
      const active = mode === 'omitted' ? new AstylarScrollRuntime({
        getMesh: id => scene.getMeshByName(id) as Mesh | undefined,
        getDimensions: () => ({ width: 240, height: 160 }),
        getLayoutBoxes: () => new Map(),
        getStyle: () => ({ selector: '*', display: 'block' }),
        paint: createPaintAdapter(),
      }) : runtime;
      active.reconcile(siteData);
      const scrollable = mode === 'auto' || mode === 'scroll';
      expect(Object.keys(active.snapshot.containers).length).toBe(scrollable ? 1 : 0);
      expect(active.scrollFrom('one', 0, 30)).toBe(scrollable);
      expect(scene.getMeshByName('astylar-scrollbar-track-box') !== null).toBe(mode === 'scroll');
      active.dispose();
      if (active !== runtime) runtime.dispose();
      // Each case owns its independent mesh set; no previous scrollbar can
      // satisfy the next case's assertions.
      [...scene.meshes].forEach(mesh => mesh.dispose());
    }
  });

  it('paints and moves a vertical scrollbar for overflowing scroll containers', () => {
    const { runtime, siteData } = createVerticalRuntime(scene, 160, 'scroll');

    runtime.reconcile(siteData);

    const track = scene.getMeshByName('astylar-scrollbar-track-box');
    const thumb = scene.getMeshByName('astylar-scrollbar-thumb-box');
    expect(track).not.toBeNull();
    expect(thumb).not.toBeNull();
    expect(track!.position.z).toBeGreaterThan(0);
    expect(thumb!.position.z).toBeGreaterThan(track!.position.z);
    const initialThumbY = thumb!.position.y;
    const trackMaterialName = track!.material!.name;
    const thumbMaterialName = thumb!.material!.name;

    expect(runtime.scrollFrom('one', 0, 70)).toBeTrue();
    expect(thumb!.position.y).toBeLessThan(initialThumbY);

    runtime.dispose();
    expect(track!.isDisposed()).toBeTrue();
    expect(thumb!.isDisposed()).toBeTrue();
    expect(scene.getMaterialByName(trackMaterialName)).toBeNull();
    expect(scene.getMaterialByName(thumbMaterialName)).toBeNull();
  });

  it('scrolls destinations to the start and uses nearest focus visibility', () => {
    const { runtime, siteData, meshes } = createVerticalRuntime(scene);
    runtime.reconcile(siteData);

    expect(runtime.scrollIntoView('three')).toBeTrue();
    expect(runtime.snapshot.containers['box'].scrollTop).toBe(80);
    expect(meshes.get('one')?.position.y).toBe(120);

    expect(runtime.scrollIntoView('three', 'nearest')).toBeFalse();
    expect(runtime.snapshot.containers['box'].scrollTop).toBe(80);

    expect(runtime.scrollIntoView('one', 'nearest')).toBeTrue();
    expect(runtime.snapshot.containers['box'].scrollTop).toBe(0);
    expect(meshes.get('one')?.position.y).toBe(40);
  });

  it('resolves scrolled viewport rectangles from retained CSS boxes', () => {
    const { runtime, siteData } = createVerticalRuntime(scene);
    runtime.reconcile(siteData);

    expect(runtime.getViewportRect('three')).toEqual({ x: 0, y: 160, width: 240, height: 80 });
    expect(runtime.scrollFrom('three', 0, 55.5)).toBeTrue();
    expect(runtime.getViewportRect('three')).toEqual({ x: 0, y: 104.5, width: 240, height: 80 });
  });

  it('retains fractional CSS scroll offsets until the paint projection boundary', () => {
    const { runtime, siteData, meshes } = createVerticalRuntime(scene, 160, 'auto', 0.25);

    runtime.reconcile(siteData);
    expect(meshes.get('one')?.position.y).toBe(10);

    expect(runtime.scrollFrom('one', 0, 55.5)).toBeTrue();
    expect(runtime.snapshot.containers['box'].scrollTop).toBe(55.5);
    expect(meshes.get('one')?.position.y).toBe(23.875);
  });

  it('measures CSS overflow without reading Babylon bounding boxes', () => {
    const { runtime, siteData, meshes } = createVerticalRuntime(scene);
    for (const mesh of meshes.values()) {
      spyOn(mesh, 'getBoundingInfo').and.throwError(
        'scroll geometry must not be reconstructed from Babylon bounds',
      );
    }

    expect(() => runtime.reconcile(siteData)).not.toThrow();
    expect(runtime.snapshot.containers['box'].scrollHeight).toBe(240);
  });

  it('measures rightward screen overflow and applies horizontal scroll offsets', () => {
    const boxElement: DOMElement = {
      type: 'div', id: 'box', children: [{ type: 'div', id: 'strip' }],
    };
    const siteData: SiteData = { styles: [], root: { children: [boxElement] } };
    const box = MeshBuilder.CreatePlane('box', { width: 240, height: 120 }, scene);
    box.metadata = { element: boxElement, elementId: 'box' };
    const strip = MeshBuilder.CreatePlane('strip', { width: 360, height: 120 }, scene);
    strip.parent = box;
    // A wider child with a CSS left edge of zero is centered to the right of
    // its narrower parent before scrolling.
    strip.position.x = 60;
    strip.metadata = { element: boxElement.children![0], elementId: 'strip' };
    const layoutBoxes = new Map<string, CssLayoutNode>([
      ['box', layoutNode(null, 0, 0, 240, 120)],
      ['strip', layoutNode('box', 0, 0, 360, 120)],
    ]);
    const runtime = new AstylarScrollRuntime({
      getMesh: (id) => id === 'box' ? box : id === 'strip' ? strip : undefined,
      getDimensions: (id) => id === 'box' ? {
        width: 240,
        height: 120,
        padding: { top: 0, right: 12, bottom: 0, left: 0 },
      } : undefined,
      getLayoutBoxes: () => layoutBoxes,
      getStyle: (id) => id === 'box' ? { selector: '#box', overflow: 'scroll' } : undefined,
      paint: createPaintAdapter(),
    });

    runtime.reconcile(siteData);
    const thumb = scene.getMeshByName('astylar-scrollbar-thumb-box-horizontal');
    expect(thumb).not.toBeNull();
    expect(thumb!.position.x).toBeLessThan(0);
    const initialThumbX = thumb!.position.x;
    expect(runtime.snapshot.containers['box']).toEqual({
      scrollLeft: 0,
      scrollTop: 0,
      scrollWidth: 372,
      scrollHeight: 120,
      clientWidth: 240,
      clientHeight: 120,
    });

    expect(runtime.scrollFrom('strip', 65, 0)).toBeTrue();
    expect(runtime.snapshot.containers['box'].scrollLeft).toBe(65);
    expect(strip.position.x).toBe(-5);
    expect(thumb!.position.x).toBeGreaterThan(initialThumbX);

    expect(runtime.scrollFrom('strip', 500, 0)).toBeTrue();
    expect(runtime.snapshot.containers['box'].scrollLeft).toBe(132);
    expect(strip.position.x).toBe(-72);
  });

  it('excludes a rendered border from client and scroll dimensions', () => {
    const content: DOMElement = { type: 'div', id: 'bordered-content' };
    const boxElement: DOMElement = {
      type: 'div', id: 'bordered-box', children: [content],
    };
    const siteData: SiteData = { styles: [], root: { children: [boxElement] } };
    const box = MeshBuilder.CreatePlane('bordered-box', { width: 240, height: 110 }, scene);
    box.metadata = { element: boxElement, elementId: 'bordered-box' };
    const contentMesh = MeshBuilder.CreatePlane(
      'bordered-content', { width: 240, height: 222 }, scene,
    );
    contentMesh.parent = box;
    contentMesh.position.y = -56;
    contentMesh.metadata = { element: content, elementId: 'bordered-content' };
    const layoutBoxes = new Map<string, CssLayoutNode>([
      ['bordered-box', layoutNode(null, 0, 0, 240, 110)],
      ['bordered-content', layoutNode('bordered-box', 0, 0, 240, 222)],
    ]);
    const runtime = new AstylarScrollRuntime({
      getMesh: (id) => id === 'bordered-box' ? box :
        id === 'bordered-content' ? contentMesh : undefined,
      getDimensions: (id) => id === 'bordered-box'
        ? { width: 240, height: 110 }
        : undefined,
      getLayoutBoxes: () => layoutBoxes,
      getStyle: (id) => id === 'bordered-box' ? {
        selector: '#bordered-box', overflow: 'auto', borderWidth: '1px', borderStyle: 'solid',
      } : undefined,
      paint: createPaintAdapter(),
    });

    runtime.reconcile(siteData);
    expect(runtime.snapshot.containers['bordered-box']).toEqual({
      scrollLeft: 0,
      scrollTop: 0,
      scrollWidth: 238,
      scrollHeight: 220,
      clientWidth: 238,
      clientHeight: 108,
    });
  });

  it('preserves and clamps compatible state across a rebuilt scene graph', () => {
    const initial = createVerticalRuntime(scene);
    initial.runtime.reconcile(initial.siteData);
    initial.runtime.scrollFrom('one', 0, 70);
    const preserved = initial.runtime.snapshot.containers;

    initial.runtime.dispose();
    for (const mesh of scene.meshes.slice()) mesh.dispose();

    const rebuilt = createVerticalRuntime(scene, 200);
    rebuilt.runtime.reconcile(rebuilt.siteData, preserved);

    expect(rebuilt.runtime.snapshot.containers['box'].scrollTop).toBe(40);
    expect(rebuilt.meshes.get('one')?.position.y).toBe(100);
  });

  it('propagates a wheel delta to an ancestor only after the inner boundary', () => {
    const innerContent: DOMElement = { type: 'div', id: 'inner-content' };
    const inner: DOMElement = { type: 'div', id: 'inner', children: [innerContent] };
    const outerContent: DOMElement = { type: 'div', id: 'outer-content', children: [inner] };
    const outer: DOMElement = { type: 'div', id: 'outer', children: [outerContent] };
    const siteData: SiteData = { styles: [], root: { children: [outer] } };
    const meshes = new Map<string, Mesh>();
    const makeMesh = (
      element: DOMElement,
      width: number,
      height: number,
      parent?: Mesh,
      y = 0,
    ): Mesh => {
      const mesh = MeshBuilder.CreatePlane(element.id!, { width, height }, scene);
      mesh.parent = parent ?? null;
      mesh.position.y = y;
      mesh.metadata = { element, elementId: element.id };
      meshes.set(element.id!, mesh);
      return mesh;
    };
    const outerMesh = makeMesh(outer, 300, 300);
    const outerContentMesh = makeMesh(outerContent, 300, 420, outerMesh, -60);
    const innerMesh = makeMesh(inner, 220, 120, outerContentMesh);
    makeMesh(innerContent, 220, 220, innerMesh, -50);
    const dimensions = new Map<string, { width: number; height: number }>([
      ['outer', { width: 300, height: 300 }],
      ['inner', { width: 220, height: 120 }],
    ]);
    const styles = new Map<string, StyleRule>([
      ['outer', { selector: '#outer', overflow: 'auto' }],
      ['inner', { selector: '#inner', overflow: 'auto' }],
    ]);
    const layoutBoxes = new Map<string, CssLayoutNode>([
      ['outer', layoutNode(null, 0, 0, 300, 300)],
      ['outer-content', layoutNode('outer', 0, 0, 300, 420)],
      ['inner', layoutNode('outer-content', 0, 0, 220, 120)],
      ['inner-content', layoutNode('inner', 0, 0, 220, 220)],
    ]);
    const runtime = new AstylarScrollRuntime({
      getMesh: (id) => meshes.get(id),
      getDimensions: (id) => dimensions.get(id),
      getLayoutBoxes: () => layoutBoxes,
      getStyle: (id) => styles.get(id),
      paint: createPaintAdapter(),
    });

    runtime.reconcile(siteData);
    expect(runtime.scrollFrom('inner-content', 0, 500)).toBeTrue();
    expect(runtime.snapshot.containers['inner'].scrollTop).toBe(100);
    expect(runtime.snapshot.containers['outer'].scrollTop).toBe(0);

    expect(runtime.scrollFrom('inner-content', 0, 50)).toBeTrue();
    expect(runtime.snapshot.containers['inner'].scrollTop).toBe(100);
    expect(runtime.snapshot.containers['outer'].scrollTop).toBe(50);

    expect(runtime.scrollFrom('inner-content', 0, -40)).toBeTrue();
    expect(runtime.snapshot.containers['inner'].scrollTop).toBe(60);
    expect(runtime.snapshot.containers['outer'].scrollTop).toBe(50);
  });

  it('does not restore duplicate scroll-container IDs and cleans its registry', () => {
    const { runtime, siteData } = createVerticalRuntime(scene);
    const duplicate = siteData.root.children[0];
    runtime.reconcile({
      ...siteData,
      root: { children: [duplicate, { ...duplicate }] },
    });

    expect(runtime.snapshot.containers).toEqual({});
    runtime.dispose();
    expect(runtime.snapshot).toEqual({ containers: {}, disposed: true });
  });

  it('uses the current authored cascade when an update disables scrolling', () => {
    const { runtime, siteData } = createVerticalRuntime(scene);
    const disabledSiteData: SiteData = {
      ...siteData,
      styles: [
        { selector: '#box', overflow: 'auto' },
        { selector: '#box.disabled', overflow: 'hidden' },
      ],
      root: {
        children: [{ ...siteData.root.children[0], class: 'disabled' }],
      },
    };
    const disabledRuntime = new AstylarScrollRuntime({
      getMesh: (id) => id === 'box' ? scene.getMeshByName('box') as Mesh : undefined,
      getDimensions: (id) => id === 'box' ? { width: 240, height: 160 } : undefined,
      getLayoutBoxes: () => new Map([
        ['box', layoutNode(null, 0, 0, 240, 160)],
      ]),
      getStyle: () => ({ selector: '#box', overflow: 'auto' }),
      resolveStyle: (element) => ({
        selector: '#box.disabled',
        overflow: element.class === 'disabled' ? 'hidden' : 'auto',
      }),
      paint: createPaintAdapter(),
    });

    runtime.dispose();
    disabledRuntime.reconcile(disabledSiteData);
    expect(disabledRuntime.snapshot.containers).toEqual({});
  });
});

function createVerticalRuntime(
  scene: Scene,
  clientHeight = 160,
  overflow: 'auto' | 'scroll' = 'auto',
  projectionScale = 1,
): {
  runtime: AstylarScrollRuntime;
  siteData: SiteData;
  meshes: Map<string, Mesh>;
} {
  const boxElement: DOMElement = {
    type: 'div', id: 'box', children: [
      { type: 'div', id: 'one' },
      { type: 'div', id: 'two' },
      { type: 'div', id: 'three' },
    ],
  };
  const siteData: SiteData = { styles: [], root: { children: [boxElement] } };
  const meshes = new Map<string, Mesh>();
  const box = MeshBuilder.CreatePlane('box', { width: 240, height: clientHeight }, scene);
  box.metadata = { element: boxElement, elementId: 'box' };
  meshes.set('box', box);
  const positions = [0, 1, 2].map((index) => clientHeight / 2 - 40 - index * 80);
  boxElement.children?.forEach((element, index) => {
    const mesh = MeshBuilder.CreatePlane(element.id!, { width: 240, height: 80 }, scene);
    mesh.parent = box;
    mesh.position.y = positions[index];
    mesh.metadata = { element, elementId: element.id };
    meshes.set(element.id!, mesh);
  });
  const dimensions = new Map<string, { width: number; height: number }>([
    ['box', { width: 240, height: clientHeight }],
  ]);
  const styles = new Map<string, StyleRule>([
    ['box', { selector: '#box', overflow }],
  ]);
  const layoutBoxes = new Map<string, CssLayoutNode>([
    ['box', layoutNode(null, 0, 0, 240, clientHeight)],
    ['one', layoutNode('box', 0, 0, 240, 80)],
    ['two', layoutNode('box', 0, 80, 240, 80)],
    ['three', layoutNode('box', 0, 160, 240, 80)],
  ]);
  const runtime = new AstylarScrollRuntime({
    getMesh: (id) => meshes.get(id),
    getDimensions: (id) => dimensions.get(id),
    getLayoutBoxes: () => layoutBoxes,
    getStyle: (id) => styles.get(id),
    paint: createPaintAdapter(projectionScale),
  });
  return { runtime, siteData, meshes };
}
