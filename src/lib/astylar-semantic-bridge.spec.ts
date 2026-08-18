import { AstylarSemanticBridge } from './astylar-semantic-bridge';
import { SiteData } from '../app/types/site-data';

describe('AstylarSemanticBridge', () => {
  let host: HTMLDivElement;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    host = document.createElement('div');
    canvas = document.createElement('canvas');
    host.appendChild(canvas);
    document.body.appendChild(host);
  });

  afterEach(() => host.remove());

  it('creates a native nonvisual semantic hierarchy and hides the visual canvas', () => {
    const bridge = new AstylarSemanticBridge(canvas);
    bridge.reconcile(siteData());

    const root = host.querySelector<HTMLElement>('[data-astylar-semantic-root]');
    expect(root).not.toBeNull();
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(root?.querySelector('[data-astylar-id="main"]')?.tagName).toBe('MAIN');
    expect(root?.querySelector('[data-astylar-id="heading"]')?.tagName).toBe('H1');
    expect(root?.querySelector('[data-astylar-id="link"]')?.textContent).toBe('Read more');
    expect(bridge.snapshot.nodes).toBe(4);
  });

  it('retains unique stable nodes across compatible updates and removes stale nodes', () => {
    const bridge = new AstylarSemanticBridge(canvas);
    const initial = siteData();
    bridge.reconcile(initial);
    const heading = host.querySelector('[data-astylar-id="heading"]');

    const updated = siteData();
    updated.root.children[0].children = [
      { type: 'h1', id: 'heading', textContent: 'Updated heading' },
    ];
    bridge.reconcile(updated);

    expect(host.querySelector('[data-astylar-id="heading"]')).toBe(heading);
    expect(heading?.textContent).toBe('Updated heading');
    expect(host.querySelector('[data-astylar-id="link"]')).toBeNull();
    expect(bridge.snapshot.nodes).toBe(2);
  });

  it('removes owned nodes and restores the canvas accessibility state on disposal', () => {
    canvas.setAttribute('aria-hidden', 'false');
    const bridge = new AstylarSemanticBridge(canvas);
    bridge.reconcile(siteData());
    bridge.dispose();

    expect(host.querySelector('[data-astylar-semantic-root]')).toBeNull();
    expect(canvas.getAttribute('aria-hidden')).toBe('false');
    expect(bridge.snapshot.nodes).toBe(0);
  });

  function siteData(): SiteData {
    return {
      styles: [],
      root: {
        children: [{
          type: 'main', id: 'main', children: [
            { type: 'h1', id: 'heading', textContent: 'Semantic heading' },
            { type: 'p', id: 'paragraph', textContent: 'Introductory copy.' },
            { type: 'a', id: 'link', href: '/details', textContent: 'Read more' },
          ],
        }],
      },
    };
  }
});
