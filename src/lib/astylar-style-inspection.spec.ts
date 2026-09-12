import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Astylar } from './astylar';
import type { SiteData } from '../app/types/site-data';

describe('on-demand core style inspection', () => {
  it('resolves replacement-document ancestry and live pseudo sources after visual reuse', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const canvas = document.createElement('canvas');
    canvas.width = 360; canvas.height = 180;
    document.body.append(canvas);
    const data: SiteData = { root: { children: [{ type: 'div', id: 'host', class: 'shell', tabindex: 0, children: [
      { type: 'label', id: 'caption', class: 'caption empty', textContent: 'Caption' },
      { type: 'span', id: 'sibling', textContent: 'Sibling' },
      { type: 'div', id: 'hidden', children: [{ type: 'span', textContent: 'Hidden' }] },
    ] }] }, styles: [
      { selector: '#host', width: '320px', height: '120px', cursor: 'pointer' },
      { selector: '.caption.empty', color: '#1d1b20' },
      { selector: '.shell .caption', color: '#e6e1e5' },
      { selector: '.shell > .caption + span', color: '#123456' },
      { selector: '#hidden', display: 'none' },
      { selector: '#hidden > span:first-child', color: '#abcdef' },
      { selector: '.shell:focus > .caption', color: '#654321' },
    ] };
    const surface = TestBed.inject(Astylar).mount(canvas, data, { diagnostics: { logLevel: 'silent' } });
    try {
      await surface.whenSettled();
      const mesh = surface.scene.getMeshByName('caption');
      for (const semanticChange of [false, true]) {
        const next = structuredClone(data);
        if (semanticChange) next.root.children[0].ariaLabel = 'Current semantic label';
        const before = JSON.stringify(next);
        await surface.update(next);
        await surface.whenSettled();
        expect(surface.diagnostics.reconciliation?.strategy).toBe('reuse');
        expect(surface.scene.getMeshByName('caption')).toBe(mesh);
        const resources = surface.diagnostics.resources;
        const inspect = () => surface.inspectResolvedStyles().elements;
        const entries = inspect();
        expect(entries.find(entry => entry.id === 'caption')?.normal.color).toBe('#e6e1e5');
        expect(entries.find(entry => entry.id === 'caption')?.normal.cursor).toBe('pointer');
        expect(entries.find(entry => entry.id === 'sibling')?.normal.color).toBe('#123456');
        expect(entries.find(entry => entry.path === 'root/0/2/0')?.normal.color).toBe('#abcdef');
        expect(entries.find(entry => entry.path === 'root/0/2/0')?.retainedText).toBeUndefined();
        expect(surface.focus('host', { scrollIntoView: false })).toBeTrue();
        expect(inspect().find(entry => entry.id === 'caption')?.effective.color).toBe('#654321');
        surface.blur();
        expect(inspect().find(entry => entry.id === 'caption')?.effective.color).toBe('#e6e1e5');
        expect(surface.diagnostics.resources).toEqual(resources);
        expect(JSON.stringify(next)).toBe(before);
      }
      expect(surface.diagnostics.messages.filter(message => message.severity === 'error')).toEqual([]);
    } finally {
      surface.dispose(); canvas.remove();
    }
  }, 30000);

  it('observes the current value-label texture across focus, update and replacement', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const canvas = document.createElement('canvas');
    canvas.width = 360; canvas.height = 180;
    document.body.appendChild(canvas);
    const data: SiteData = { root: { children: [
      { id: 'action', type: 'button', value: 'Action' },
    ] }, styles: [
      { selector: '#action', width: '160px', height: '48px', fontFamily: 'Arial', fontSize: '16px', lineHeight: '24px', letterSpacing: '.5px', color: '#123456' },
      { selector: '#action:focus', color: '#abcdef' },
    ] };
    const before = JSON.stringify(data);
    const surface = TestBed.inject(Astylar).mount(canvas, data, { diagnostics: { logLevel: 'silent' } });
    try {
      await surface.whenSettled();
      const inspect = () => surface.inspectResolvedStyles().elements[0];
      const resources = surface.diagnostics.resources;
      expect(inspect().retainedText).toBeUndefined();
      const painted = inspect().paintedControlText!;
      expect(painted.source).toBe('core-control-texture');
      expect(painted.text).toBe('Action');
      expect(painted.style.fontSize).toBe(16);
      expect(painted.style.lineHeight).toBe(1.5);
      expect(painted.style.letterSpacing).toBe(.5);
      expect(painted.style.color).toBe('#123456');
      (painted.style as { fontSize: number }).fontSize = 999;
      expect(inspect().paintedControlText?.style.fontSize).toBe(16);
      expect(surface.diagnostics.resources).toEqual(resources);
      expect(surface.focus('action', { scrollIntoView: false })).toBeTrue();
      expect(inspect().paintedControlText?.style.color).toBe('#abcdef');
      surface.blur();
      expect(inspect().paintedControlText?.style.color).toBe('#123456');
      await surface.update({ ...data, styles: data.styles.map((rule) => rule.selector === '#action' ? { ...rule, fontSize: '20px' } : rule) });
      expect(inspect().paintedControlText?.style.fontSize).toBe(20);
      expect(inspect().paintedControlText?.style.lineHeight).toBe(1.2);
      expect(JSON.stringify(data)).toBe(before);
      await surface.update({ ...data, styles: [...data.styles, { selector: '#action', display: 'none' }] });
      expect(inspect().paintedControlText).toBeUndefined();
      await surface.update({ ...data, root: { children: [{ type: 'div', id: 'replacement' }] } });
      expect(inspect().paintedControlText).toBeUndefined();
    } finally {
      surface.dispose();
      canvas.remove();
    }
    expect(() => surface.inspectResolvedStyles()).toThrowError(/disposed/);
  }, 30000);

  it('separates retained inherited text input from cascade declarations', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 180;
    document.body.appendChild(canvas);
    const data: SiteData = { root: { children: [
      { id: 'parent', type: 'div', children: [
        { id: 'child', type: 'div', textContent: 'Inherited type' },
        { id: 'hidden', type: 'div', textContent: 'Hidden type' },
      ] },
    ] }, styles: [
      { selector: '#parent', width: '360px', height: '80px', fontFamily: 'Arial', fontSize: '24px', lineHeight: '32px' },
      { selector: '#hidden', display: 'none' },
    ] };
    const surface = TestBed.inject(Astylar).mount(canvas, data, { diagnostics: { logLevel: 'silent' } });
    try {
      await surface.whenSettled();
      const resources = surface.diagnostics.resources;
      const snapshot = surface.inspectResolvedStyles();
      const child = snapshot.elements.find((entry) => entry.id === 'child')!;
      expect(child.normal.fontSize).toBeUndefined();
      expect(child.retainedText?.source).toBe('core-text-registry');
      expect(child.retainedText?.style.fontSize).toBe('24px');
      expect(child.retainedText?.style.lineHeight).toBe('32px');
      expect(snapshot.elements.find((entry) => entry.id === 'hidden')?.retainedText).toBeUndefined();
      (child.retainedText!.style as { fontSize: string }).fontSize = '999px';
      expect(surface.inspectResolvedStyles().elements.find((entry) => entry.id === 'child')?.retainedText?.style.fontSize).toBe('24px');
      expect(surface.diagnostics.resources).toEqual(resources);
      await surface.update({ ...data, styles: data.styles.map((style) => style.selector === '#parent' ? { ...style, fontSize: '20px' } : style) });
      const updated = surface.inspectResolvedStyles();
      expect(updated.revision).toBeGreaterThan(snapshot.revision);
      expect(updated.elements.find((entry) => entry.id === 'child')?.retainedText?.style.fontSize).toBe('20px');
    } finally {
      surface.dispose();
      canvas.remove();
    }
  }, 30000);

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
