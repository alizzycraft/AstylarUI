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

  it('builds the three application panels and fixed reference banner', () => {
    const site = buildTtsDemoSite();
    const shell = site.root.children?.[0];
    expect(shell?.id).toBe('tts-app');
    expect(shell?.children?.map((child) => child.id)).toEqual([
      'settings-panel',
      'workspace-panel',
      'history-panel',
      'github-banner',
    ]);
  });

  it('includes the reference-derived settings, editor, player, storage, and history states', () => {
    const site = buildTtsDemoSite();
    const serialized = JSON.stringify(site.root);
    expect(serialized).toContain('provider-field');
    expect(serialized).toContain('voice-field');
    expect(serialized).toContain('speech-text');
    expect(serialized).toContain('player-placeholder');
    expect(serialized).toContain('history-empty');
    expect(serialized).toContain('storage-disclosure');
    expect(serialized).not.toContain('generation-status');
  });

  it('renders the generated status, selected player, and history item together', () => {
    const site = buildTtsDemoSite({
      ...DEFAULT_TTS_VIEW_MODEL,
      status: 'success',
      statusMessage: 'Generated.',
      selectedHistoryId: 'speech-1',
      history: [{
        id: 'speech-1', title: 'Speech preview 1', text: 'hello', voice: 'alloy',
        createdLabel: 'Just now', sizeLabel: '7.5 KB', durationLabel: '0:00', formatLabel: 'WAV',
      }],
    });
    const serialized = JSON.stringify(site.root);
    expect(serialized).toContain('generation-status');
    expect(serialized).toContain('selected-player');
    expect(serialized).toContain('history-speech-1');
  });

  it('lets history cards grow and uses authored transport focus color', () => {
    const site = buildTtsDemoSite({
      ...DEFAULT_TTS_VIEW_MODEL,
      selectedHistoryId: 'speech-1',
      playingHistoryId: 'speech-1',
      history: [{
        id: 'speech-1', title: 'Speech preview 1',
        text: 'A longer generated passage that wraps across multiple history-card lines.',
        voice: 'alloy', createdLabel: 'Just now', sizeLabel: '10.2 KB',
        durationLabel: '0:01', formatLabel: 'WAV',
      }],
    });
    const cardStyle = site.styles.find((rule) => rule.selector === '.history-item.expanded');
    const focusStyle = site.styles.find((rule) =>
      rule.selector === '.transport-play:focus, .transport-play.playing');
    const serialized = JSON.stringify(site.root);

    expect(cardStyle).toEqual(jasmine.objectContaining({ height: 'auto', minHeight: '133px' }));
    expect(focusStyle?.color).toBe('#58a6ff');
    expect(serialized).toContain('history-item selected expanded');
    expect(serialized).toContain('transport-play playing');
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

  it('provides the reference application responsive breakpoint rules', () => {
    const styles = buildTtsDemoSite().styles;
    expect(styles.some((rule) => rule.mediaMaxWidth === '768px')).toBeTrue();
    expect(styles.some((rule) => rule.mediaMaxWidth === '760px')).toBeFalse();
  });

  it('exposes a cancellable static loading state', () => {
    const site = buildTtsDemoSite({
      ...DEFAULT_TTS_VIEW_MODEL,
      status: 'generating',
      statusMessage: 'Generating a deterministic mock preview...',
    });
    const serialized = JSON.stringify(site.root);
    expect(serialized).toContain('cancel-speech');
    expect(serialized).toContain('Generating...');
    expect(serialized).toContain('"disabled":true');
  });
});
