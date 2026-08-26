import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Astylar, type AstylarSurface, type SiteData } from 'astylarui';
import { materialCheckMarkPath, provideMaterialShowcasePlugin } from './material-showcase.plugin';

describe('Material showcase application plugin', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideMaterialShowcasePlugin({ benchmarkMode: true }),
      ],
    });
  });

  it('authors an upright Material check mark path', () => {
    const [start, bend, end] = materialCheckMarkPath(1);

    expect(start.asArray()).toEqual([5.5, .4, 0]);
    expect(bend.asArray()).toEqual([1.8, -3.2, 0]);
    expect(end.asArray()).toEqual([-5.5, 4.2, 0]);
    expect(bend.y).toBeLessThan(start.y);
    expect(bend.y).toBeLessThan(end.y);
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

function resourceCounts(surface: AstylarSurface): object {
  return {
    scene: surface.diagnostics.resources,
    plugin: surface.diagnostics.pluginResources,
  };
}
