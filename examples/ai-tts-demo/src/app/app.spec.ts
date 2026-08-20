import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AstylarSurfaceComponent } from 'astylarui';
import { App } from './app';
import { buildTtsDemoSite } from './ui/tts-demo-site';

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
  });
});
