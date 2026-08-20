import { Component, computed, inject, NgZone, signal } from '@angular/core';
import {
  AstylarSurfaceComponent,
  type AstylarEvent,
  type AstylarRenderOptions,
  type AstylarSurface,
} from 'astylarui';
import { TtsDemoStore } from './speech/tts-demo.store';
import { buildTtsDemoSite } from './ui/tts-demo-site';

@Component({
  selector: 'app-root',
  imports: [AstylarSurfaceComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly store = inject(TtsDemoStore);
  private readonly zone = inject(NgZone);

  protected readonly siteData = computed(() => buildTtsDemoSite(this.store.viewModel()));
  protected readonly status = signal('Starting the AstylarUI renderer…');
  protected readonly options: AstylarRenderOptions = {
    events: {
      handlers: {
        'tts-app': {
          input: (event) => this.zone.run(() => this.handleEvent(event)),
          change: (event) => this.zone.run(() => this.handleEvent(event)),
          click: (event) => this.zone.run(() => this.handleEvent(event)),
        },
      },
    },
  };

  protected onMounted(_surface: AstylarSurface): void {
    this.status.set('AstylarUI renderer ready.');
  }

  protected onFailed(error: unknown): void {
    this.status.set(`Renderer error: ${error instanceof Error ? error.message : String(error)}`);
  }

  private handleEvent(event: AstylarEvent): void {
    if (event.type === 'input') {
      const value = event.value ?? '';
      if (event.targetId === 'generation-title') this.store.setTitle(value);
      if (event.targetId === 'speech-text') this.store.setText(value);
      if (event.targetId === 'instructions') this.store.setInstructions(value);
      if (event.targetId === 'history-search') this.store.setHistoryQuery(value);
      return;
    }
    if (event.type === 'change' && event.targetId === 'voice') {
      this.store.setVoice(event.selectedValue ?? event.value ?? '');
      return;
    }
    if (event.type !== 'click') return;
    if (event.targetId === 'generate-speech') void this.store.generate();
    if (event.targetId === 'cancel-speech') this.store.cancelGeneration();
    if (event.targetId === 'clear-history') this.store.clearHistory();
    if (event.targetId === 'storage-summary') this.store.toggleStorageDisclosure();
    if (event.targetId === 'selected-play' && this.store.selectedGenerationId()) {
      void this.store.togglePlayback(this.store.selectedGenerationId()!);
    }
    if (event.targetId === 'selected-restart') void this.store.restartSelected();
    if (event.targetId === 'selected-download' && this.store.selectedGenerationId()) {
      this.store.downloadGeneration(this.store.selectedGenerationId()!);
    }

    const historyAction = /^history-(speech-\d+)-(select|play|download|delete)$/.exec(event.targetId);
    if (historyAction?.[2] === 'select') this.store.selectGeneration(historyAction[1]);
    if (historyAction?.[2] === 'play') void this.store.togglePlayback(historyAction[1]);
    if (historyAction?.[2] === 'download') this.store.downloadGeneration(historyAction[1]);
    if (historyAction?.[2] === 'delete') this.store.deleteGeneration(historyAction[1]);
  }
}
