import { Mesh, MeshBuilder, NullEngine, Scene } from '@babylonjs/core';
import type { DOMElement } from '../app/types/dom-element';
import type { SiteData } from '../app/types/site-data';
import type { StyleRule } from '../app/types/style-rule';
import { AstylarScrollRuntime } from './astylar-scroll-runtime';

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

  it('measures rightward screen overflow and applies horizontal scroll offsets', () => {
    const boxElement: DOMElement = {
      type: 'div', id: 'box', children: [{ type: 'div', id: 'strip' }],
    };
    const siteData: SiteData = { styles: [], root: { children: [boxElement] } };
    const box = MeshBuilder.CreatePlane('box', { width: 240, height: 120 }, scene);
    box.metadata = { element: boxElement, elementId: 'box' };
    const strip = MeshBuilder.CreatePlane('strip', { width: 360, height: 120 }, scene);
    strip.parent = box;
    // The rendered camera reverses screen X, so content flowing right extends
    // toward negative world X while retaining its authored leading edge.
    strip.position.x = -60;
    strip.metadata = { element: boxElement.children![0], elementId: 'strip' };
    const runtime = new AstylarScrollRuntime({
      getMesh: (id) => id === 'box' ? box : id === 'strip' ? strip : undefined,
      getDimensions: (id) => id === 'box' ? {
        width: 240,
        height: 120,
        padding: { top: 0, right: 12, bottom: 0, left: 0 },
      } : undefined,
      getStyle: (id) => id === 'box' ? { selector: '#box', overflow: 'auto' } : undefined,
      getPixelToWorldScale: () => 1,
    });

    runtime.reconcile(siteData);
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
    expect(strip.position.x).toBe(5);

    expect(runtime.scrollFrom('strip', 500, 0)).toBeTrue();
    expect(runtime.snapshot.containers['box'].scrollLeft).toBe(132);
    expect(strip.position.x).toBe(72);
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
    const runtime = new AstylarScrollRuntime({
      getMesh: (id) => meshes.get(id),
      getDimensions: (id) => dimensions.get(id),
      getStyle: (id) => styles.get(id),
      getPixelToWorldScale: () => 1,
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
      getStyle: () => ({ selector: '#box', overflow: 'auto' }),
      resolveStyle: (element) => ({
        selector: '#box.disabled',
        overflow: element.class === 'disabled' ? 'hidden' : 'auto',
      }),
      getPixelToWorldScale: () => 1,
    });

    runtime.dispose();
    disabledRuntime.reconcile(disabledSiteData);
    expect(disabledRuntime.snapshot.containers).toEqual({});
  });
});

function createVerticalRuntime(scene: Scene, clientHeight = 160): {
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
    ['box', { selector: '#box', overflow: 'auto' }],
  ]);
  const runtime = new AstylarScrollRuntime({
    getMesh: (id) => meshes.get(id),
    getDimensions: (id) => dimensions.get(id),
    getStyle: (id) => styles.get(id),
    getPixelToWorldScale: () => 1,
  });
  return { runtime, siteData, meshes };
}
