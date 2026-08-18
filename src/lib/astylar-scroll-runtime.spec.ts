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
