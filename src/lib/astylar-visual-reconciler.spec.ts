import type { SiteData } from '../app/types/site-data';
import { AstylarVisualReconciler } from './astylar-visual-reconciler';

describe('AstylarVisualReconciler', () => {
  it('reuses the visual tree for unchanged and semantic-only updates', () => {
    const reconciler = new AstylarVisualReconciler();
    const initial = site();
    const first = reconciler.plan(initial, ['initial']);
    expect(first.rebuild).toBeTrue();
    expect(first.snapshot.strategy).toBe('initial');
    first.commit();

    const unchanged = reconciler.plan(site(), ['update']);
    expect(unchanged.rebuild).toBeFalse();
    expect(unchanged.snapshot.last).toEqual({
      reused: 2,
      created: 0,
      replaced: 0,
      disposed: 0,
      reconciled: 2,
      reflowed: 0,
    });
    unchanged.commit();

    const semantic = site();
    semantic.root.children[0].ariaLabel = 'Updated label';
    semantic.root.children[0].title = 'Updated title';
    const semanticPlan = reconciler.plan(semantic, ['update']);
    expect(semanticPlan.rebuild).toBeFalse();
    expect(semanticPlan.snapshot.strategy).toBe('reuse');
  });

  it('rebuilds for layout, paint, text, children, image, and input changes', () => {
    const changes: Array<(data: SiteData) => void> = [
      (data) => { data.styles[0].width = '200px'; },
      (data) => { data.root.children[0].style = { background: '#fff' }; },
      (data) => { data.root.children[0].children![0].textContent = 'Changed'; },
      (data) => { data.root.children[0].children!.push({ type: 'img', id: 'image', src: 'b.png' }); },
      (data) => { data.root.children[0].children![0] = { type: 'img', id: 'text', src: 'a.png' }; },
      (data) => { data.root.children[0].children![0] = { type: 'input', id: 'text', value: 'Changed' }; },
    ];

    for (const change of changes) {
      const reconciler = new AstylarVisualReconciler();
      const first = reconciler.plan(site(), ['initial']);
      first.commit();
      const changed = site();
      change(changed);
      expect(reconciler.plan(changed, ['update']).rebuild).toBeTrue();
    }
  });

  it('forces reflow for viewport, asset, and manual invalidations', () => {
    for (const reason of ['resize', 'asset', 'manual'] as const) {
      const reconciler = new AstylarVisualReconciler();
      reconciler.plan(site(), ['initial']).commit();
      const plan = reconciler.plan(site(), [reason]);
      expect(plan.rebuild).toBeTrue();
      expect(plan.snapshot.last.reflowed).toBe(2);
    }
  });

  it('does not publish a failed or abandoned plan', () => {
    const reconciler = new AstylarVisualReconciler();
    reconciler.plan(site(), ['initial']);
    expect(reconciler.snapshot.identities.totalNodes).toBe(0);

    const successful = reconciler.plan(site(), ['initial']);
    successful.commit();
    successful.commit();
    expect(reconciler.snapshot.totals.created).toBe(2);
  });
});

function site(): SiteData {
  return {
    styles: [{ selector: '#panel', width: '100px' }],
    root: {
      children: [{
        type: 'section',
        id: 'panel',
        children: [{ type: 'span', id: 'text', textContent: 'Hello' }],
      }],
    },
  };
}
