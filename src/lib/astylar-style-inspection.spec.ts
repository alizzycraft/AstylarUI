import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Astylar } from './astylar';
import type { SiteData } from '../app/types/site-data';

describe('on-demand core style inspection', () => {
  it('resolves hidden and anonymous descendants without creating meshes or mutating authored input', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    document.body.appendChild(canvas);
    const data: SiteData = { root: { children: [
      { id: 'action', type: 'button', textContent: 'Inspect' },
      { id: 'hidden', type: 'div', children: [{ type: 'span', textContent: 'Hidden descendant' }] },
    ] }, styles: [
      { selector: '#action', width: '100px', height: '40px', background: '#112233' },
      { selector: '#action:focus', background: '#abcdef' },
      { selector: '#hidden', display: 'none', cursor: 'pointer' },
      { selector: '#hidden > span', color: '#123456', width: '75%' },
    ] };
    const before = JSON.stringify(data);
    const surface = TestBed.inject(Astylar).mount(canvas, data, { diagnostics: { logLevel: 'silent' } });
    try {
      expect(() => surface.inspectResolvedStyles()).toThrowError(/whenSettled/);
      await surface.whenSettled();
      const resources = surface.diagnostics.resources;
      const initial = surface.inspectResolvedStyles();
      expect(initial.elements.map((entry) => entry.path)).toEqual(['root/0', 'root/1', 'root/1/0']);
      expect(initial.elements[1].normal.display).toBe('none');
      expect(initial.elements[2].normal.color).toBe('#123456');
      expect(initial.elements[2].normal.width).toBe('75%');
      expect(initial.elements[2].normal.cursor).toBe('pointer');
      expect(surface.scene.meshes.some((mesh) => mesh.metadata?.elementId === 'hidden')).toBeFalse();
      expect(surface.diagnostics.resources).toEqual(resources);
      (initial.elements[2].normal as { color: string }).color = 'red';
      expect(surface.inspectResolvedStyles().elements[2].normal.color).toBe('#123456');
      expect(surface.focus('action', { scrollIntoView: false })).toBeTrue();
      const focused = surface.inspectResolvedStyles().elements[0];
      expect(focused.normal.background).toBe('#112233');
      expect(focused.effective.background).toBe('#abcdef');
      expect(surface.scene.meshes.find((mesh) => mesh.name === 'action')?.metadata?.astylarResolvedInteractionStyle.background)
        .toBe(focused.effective.background);
      surface.blur();
      expect(surface.inspectResolvedStyles().elements[0].effective.background).toBe('#112233');
      expect(JSON.stringify(data)).toBe(before);
      const update = surface.update({ ...data, root: { children: [{ id: 'replacement', type: 'div' }] } });
      expect(() => surface.inspectResolvedStyles()).toThrowError(/whenSettled/);
      await update;
      const replacement = surface.inspectResolvedStyles();
      expect(replacement.revision).toBeGreaterThan(initial.revision);
      expect(replacement.elements.map((entry) => entry.id)).toEqual(['replacement']);
    } finally {
      surface.dispose();
      canvas.remove();
    }
    expect(() => surface.inspectResolvedStyles()).toThrowError(/disposed/);
  }, 30000);
});
