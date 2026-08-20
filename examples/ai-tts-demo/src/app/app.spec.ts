import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AstylarSurfaceComponent, type DOMElement } from 'astylarui';
import { App } from './app';
import { buildTtsDemoSite } from './ui/tts-demo-site';
import { DEFAULT_TTS_VIEW_MODEL } from './ui/tts-demo-model';

@Component({
  selector: 'astylar-surface',
  standalone: true,
  template: '',
})
class TestSurfaceComponent {
  @Input() siteData: unknown;
  @Input() options: unknown;
  @Output() mounted = new EventEmitter<unknown>();
  @Output() failed = new EventEmitter<unknown>();
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] })
      .overrideComponent(App, {
        remove: { imports: [AstylarSurfaceComponent] },
        add: { imports: [TestSurfaceComponent] },
      })
      .compileComponents();
  });

  it('hosts exactly one AstylarUI surface', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const surfaces = (fixture.nativeElement as HTMLElement).querySelectorAll('astylar-surface');
    expect(surfaces.length).toBe(1);
  });

  it('builds the three representative application regions', () => {
    const site = buildTtsDemoSite();
    const shell = site.root.children?.[0];
    expect(shell?.id).toBe('tts-app');
    expect(shell?.children?.map((child) => child.id)).toEqual([
      'settings-panel',
      'workspace-panel',
      'history-panel',
    ]);
  });

  it('includes reusable settings, editor, status, player, and history states', () => {
    const site = buildTtsDemoSite();
    const serialized = JSON.stringify(site.root);
    expect(serialized).toContain('voice-field');
    expect(serialized).toContain('speech-text');
    expect(serialized).toContain('generation-status');
    expect(serialized).toContain('player-placeholder');
    expect(serialized).toContain('history-empty');
    expect(serialized).toContain('This voice is AI-generated.');
  });

  it('authors stable unique IDs throughout the default document', () => {
    const ids: string[] = [];
    const visit = (element: DOMElement) => {
      if (element.id) ids.push(element.id);
      element.children?.forEach(visit);
    };
    buildTtsDemoSite().root.children?.forEach(visit);

    expect(ids.length).toBeGreaterThan(30);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('provides responsive rules below, at, and above its meaningful breakpoints', () => {
    const styles = buildTtsDemoSite().styles;
    expect(styles.some((rule) => rule.mediaMaxWidth === '1050px')).toBeTrue();
    expect(styles.some((rule) => rule.mediaMaxWidth === '760px')).toBeTrue();
    expect(styles.some((rule) => rule.mediaMaxWidth === '520px')).toBeTrue();
  });

  it('exposes a cancellable static loading state', () => {
    const site = buildTtsDemoSite({
      ...DEFAULT_TTS_VIEW_MODEL,
      status: 'generating',
      statusMessage: 'Generating a deterministic mock preview...',
    });
    const serialized = JSON.stringify(site.root);
    expect(serialized).toContain('cancel-speech');
    expect(serialized).toContain('Generating speech…');
    expect(serialized).toContain('"disabled":true');
  });
});
