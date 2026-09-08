import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Material, Texture } from '@babylonjs/core';
import { Astylar, type AstylarSurface, type SiteData } from 'astylarui';
import {
  materialCheckMarkPath,
  materialSortArrowTriangles,
  provideMaterialShowcasePlugin,
} from './material-showcase.plugin';

describe('Material showcase application plugin', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideMaterialShowcasePlugin({ benchmarkMode: true }),
      ],
    });
  });

  it('authors an upright Material check mark in logical screen coordinates', () => {
    const [start, bend, end] = materialCheckMarkPath();

    expect(start).toEqual({ x: -5.5, y: .4 });
    expect(bend).toEqual({ x: -1.8, y: 3.2 });
    expect(end).toEqual({ x: 5.5, y: -4.2 });
    expect(start.x).toBeLessThan(bend.x);
    expect(bend.x).toBeLessThan(end.x);
    expect(bend.y).toBeGreaterThan(start.y);
    expect(bend.y).toBeGreaterThan(end.y);
  });

  it('preserves the Material sort-arrow path and reverses it for descending order', () => {
    const ascending = materialSortArrowTriangles('asc');
    const descending = materialSortArrowTriangles('desc');

    expect(ascending.length).toBe(15);
    expect(Math.min(...ascending.map(({ x }) => x))).toBe(-6);
    expect(Math.max(...ascending.map(({ x }) => x))).toBe(6);
    expect(Math.min(...ascending.map(({ y }) => y))).toBe(-7);
    expect(Math.max(...ascending.map(({ y }) => y))).toBe(6);
    expect(descending).toEqual(
      ascending.map((point) => ({ x: -point.x, y: -point.y })),
    );
  });

  it('keeps range thumbs and state layers ordered in logical screen coordinates', async () => {
    const astylar = TestBed.inject(Astylar);
    const surface = astylar.mount(document.createElement('canvas'), rangeSite(.3, .65, 'start'));

    try {
      await surface.whenSettled();
      const range = surface.scene.meshes.find((mesh) =>
        mesh.metadata?.showcaseMaterialVisual === 'range');
      const active = range?.getChildMeshes().find((mesh) => mesh.name.endsWith('-active'));
      const startThumb = range?.getChildMeshes().find((mesh) => mesh.name.endsWith('-start-thumb'));
      const endThumb = range?.getChildMeshes().find((mesh) => mesh.name.endsWith('-end-thumb'));
      const startStateLayer = range?.getChildMeshes().find((mesh) => mesh.name.endsWith('-start-state-layer'));
      const updateRange = range?.metadata?.updateRange as ((start: number, end: number) => void) | undefined;

      expect(updateRange).toEqual(jasmine.any(Function));
      // Renderer-local X follows logical CSS/screen X at the projection boundary.
      expect(startThumb!.position.x).toBeLessThan(endThumb!.position.x);
      expect(startStateLayer!.position.x).toBeCloseTo(startThumb!.position.x, 6);
      expect(startStateLayer!.material!.alpha).toBeCloseTo(.08, 2);
      expect(startStateLayer!.material!.transparencyMode).toBe(Material.MATERIAL_ALPHABLEND);
      updateRange?.(.4, .75);
      expect(active?.scaling.x).toBeCloseTo(.35, 6);
      expect(startThumb!.position.x).toBeLessThan(endThumb!.position.x);
      expect(startStateLayer!.position.x).toBeCloseTo(startThumb!.position.x, 6);
      expect(range?.metadata?.start).toBe(.3);
    } finally {
      surface.dispose();
    }
  });

  it('uses the same unmirrored texture orientation as core text paint', async () => {
    const astylar = TestBed.inject(Astylar);
    const surface = astylar.mount(document.createElement('canvas'), tabSite());

    try {
      await surface.whenSettled();
      const panel = surface.scene.meshes.find((mesh) =>
        mesh.metadata?.showcaseMaterialVisual === 'tab-panel');
      const content = panel?.getChildMeshes().find((mesh) => mesh.name.endsWith('-content-plane'));
      const texture = content?.material?.getActiveTextures()[0] as Texture | undefined;

      expect(texture).toBeDefined();
      expect(texture!.uScale).toBe(1);
      expect(texture!.uOffset).toBe(0);
      expect(texture!.vScale).toBe(1);
      expect(texture!.vOffset).toBe(0);
    } finally {
      surface.dispose();
    }
  });

  it('isolates two surfaces, reaches an update plateau, remounts, and releases all resources', async () => {
    const astylar = TestBed.inject(Astylar);
    const first = astylar.mount(document.createElement('canvas'), progressSite(.25));
    const second = astylar.mount(document.createElement('canvas'), progressSite(.75));

    try {
      await Promise.all([first.whenSettled(), second.whenSettled()]);
      expect(first.diagnostics.plugins.pluginIds).toContain('showcase.material');
      expect(first.diagnostics.plugins.elementIds)
        .toContain('showcase.material:linear-progress');
      expect(first.diagnostics.pluginResources.resources).toBeGreaterThan(0);
      const secondPlateau = resourceCounts(second);

      for (const progress of [.4, .6, .4, .6]) {
        await first.update(progressSite(progress));
        expect(resourceCounts(second)).toEqual(secondPlateau);
      }
      const firstPlateau = resourceCounts(first);
      await first.update(progressSite(.6));
      expect(resourceCounts(first)).toEqual(firstPlateau);

      first.dispose();
      expect(first.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
      expect(first.diagnostics.pluginResources)
        .toEqual({ owners: 0, resources: 0, cleanups: 0, pending: 0 });
      expect(second.disposed).toBeFalse();

      const remounted = astylar.mount(document.createElement('canvas'), progressSite(.5));
      await remounted.whenSettled();
      expect(remounted.diagnostics.pluginResources.resources).toBeGreaterThan(0);
      remounted.dispose();
      expect(remounted.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
      expect(remounted.diagnostics.pluginResources)
        .toEqual({ owners: 0, resources: 0, cleanups: 0, pending: 0 });
    } finally {
      first.dispose();
      second.dispose();
    }

    expect(second.diagnostics.resources).toEqual({ meshes: 0, materials: 0, textures: 0 });
    expect(second.diagnostics.pluginResources)
      .toEqual({ owners: 0, resources: 0, cleanups: 0, pending: 0 });
  });
});

function progressSite(progress: number): SiteData {
  return {
    plugins: [{ id: 'showcase.material', versionRange: '^1.0.0', schemaVersion: 1 }],
    root: { children: [{
      type: 'showcase.material:linear-progress',
      id: 'progress',
      data: { mode: 'determinate', progress },
    }] },
    styles: [{ selector: '#progress', width: '240px', height: '4px' }],
  };
}

function rangeSite(start: number, end: number, stateHandle = ''): SiteData {
  return {
    plugins: [{ id: 'showcase.material', versionRange: '^1.0.0', schemaVersion: 1 }],
    root: { children: [{
      type: 'showcase.material:range-visual',
      id: 'range',
      data: { start, end, 'state-handle': stateHandle, 'state-color': '#6750a414' },
    }] },
    styles: [{ selector: '#range', width: '240px', height: '48px' }],
  };
}

function tabSite(): SiteData {
  return {
    plugins: [{ id: 'showcase.material', versionRange: '^1.0.0', schemaVersion: 1 }],
    root: { children: [{
      type: 'showcase.material:tab-panel',
      id: 'tab-panel',
      data: { selected: true, phase: 1 },
    }] },
    styles: [{ selector: '#tab-panel', width: '240px', height: '48px' }],
  };
}

function resourceCounts(surface: AstylarSurface): object {
  return {
    scene: surface.diagnostics.resources,
    plugin: surface.diagnostics.pluginResources,
  };
}
