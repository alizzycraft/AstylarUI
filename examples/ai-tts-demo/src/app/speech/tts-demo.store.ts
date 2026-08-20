import { computed, inject, Injectable, signal } from '@angular/core';
import { SPEECH_GATEWAY } from './speech-gateway.token';
import {
  SUPPORTED_VOICES,
  type SpeechGeneration,
  type SpeechVoice,
} from './speech.types';
import type { TtsDemoViewModel } from '../ui/tts-demo-model';
import { AudioPlaybackService } from './audio-playback.service';

const MAX_CHARACTERS = 4_000;

function formatBytes(byteLength: number): string {
  return byteLength < 1_024 ? `${byteLength} B` : `${(byteLength / 1_024).toFixed(1)} KB`;
}

export function formatTime(totalSeconds = 0): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

@Injectable({ providedIn: 'root' })
export class TtsDemoStore {
  private readonly gateway = inject(SPEECH_GATEWAY);
  private readonly playback = inject(AudioPlaybackService);
  private readonly title = signal('');
  private readonly text = signal('AstylarUI brings familiar web application patterns into a Babylon-rendered space.');
  private readonly voice = signal<SpeechVoice>('alloy');
  private readonly instructions = signal('Speak clearly in a warm, natural tone.');
  private readonly status = signal<TtsDemoViewModel['status']>('idle');
  private readonly statusMessage = signal(`Ready to generate a ${this.gateway.mode} preview.`);
  private readonly history = signal<readonly SpeechGeneration[]>([]);
  private readonly historyQuery = signal('');
  private readonly selectedHistoryId = signal<string | undefined>(undefined);
  private readonly storageDisclosureOpen = signal(true);
  private nextGeneration = 1;

  readonly generations = this.history.asReadonly();
  readonly viewModel = computed<TtsDemoViewModel>(() => {
    const history = this.history();
    const selected = history.find((item) => item.id === this.selectedHistoryId());
    const playback = this.playback.snapshot();
    const selectedPlayback = playback.activeId === selected?.id;
    return {
      provider: 'OpenAI',
      mode: this.gateway.mode,
      model: 'gpt-4o-mini-tts',
      voice: this.voice(),
      instructions: this.instructions(),
      title: this.title(),
      text: this.text(),
      maxCharacters: MAX_CHARACTERS,
      status: this.status(),
      statusMessage: this.statusMessage(),
      history: history.map((item) => ({
        id: item.id,
        title: item.title,
        text: item.request.input,
        voice: item.request.voice,
        createdLabel: 'Just now',
        sizeLabel: formatBytes(item.audio.bytes.byteLength),
        durationLabel: formatTime(item.audio.durationSeconds),
        formatLabel: item.audio.fileExtension.toUpperCase(),
      })),
      historyQuery: this.historyQuery(),
      selectedHistoryId: this.selectedHistoryId(),
      playingHistoryId: playback.state === 'playing' ? playback.activeId : undefined,
      currentTimeLabel: formatTime(selectedPlayback ? playback.currentTime : 0),
      durationLabel: formatTime(selectedPlayback ? playback.duration : selected?.audio.durationSeconds),
      progressPercent: selectedPlayback ? playback.progressPercent : 0,
      storageDisclosureOpen: this.storageDisclosureOpen(),
    };
  });

  setTitle(value: string): void {
    this.title.set(value.slice(0, 80));
  }

  setText(value: string): void {
    this.text.set(value.slice(0, MAX_CHARACTERS));
    if (this.status() === 'error') {
      this.status.set('idle');
      this.statusMessage.set(`Ready to generate a ${this.gateway.mode} preview.`);
    }
  }

  setInstructions(value: string): void {
    this.instructions.set(value.slice(0, 500));
  }

  setVoice(value: string): void {
    if (SUPPORTED_VOICES.includes(value as SpeechVoice)) this.voice.set(value as SpeechVoice);
  }

  setHistoryQuery(value: string): void {
    this.historyQuery.set(value);
  }

  toggleStorageDisclosure(): void {
    this.storageDisclosureOpen.update((open) => !open);
  }

  selectGeneration(id: string): void {
    if (this.history().some((item) => item.id === id)) this.selectedHistoryId.set(id);
  }

  deleteGeneration(id: string): void {
    this.playback.stop(id);
    this.history.update((items) => items.filter((item) => item.id !== id));
    if (this.selectedHistoryId() === id) this.selectedHistoryId.set(this.history()[0]?.id);
    this.status.set('idle');
    this.statusMessage.set('Generation removed from this session.');
  }

  clearHistory(): void {
    this.playback.stop();
    this.history.set([]);
    this.selectedHistoryId.set(undefined);
    this.status.set('idle');
    this.statusMessage.set('Session history cleared.');
  }

  async generate(): Promise<void> {
    const input = this.text().trim();
    if (!input) {
      this.status.set('error');
      this.statusMessage.set('Enter some text before generating speech.');
      return;
    }

    this.status.set('generating');
    this.statusMessage.set(this.gateway.mode === 'live'
      ? 'Requesting speech from the secure server endpoint...'
      : 'Generating a deterministic mock preview...');
    try {
      const audio = await this.gateway.generate({
        model: 'gpt-4o-mini-tts',
        voice: this.voice(),
        instructions: this.instructions().trim(),
        input,
      });
      const id = `speech-${this.nextGeneration}`;
      this.nextGeneration += 1;
      const generation: SpeechGeneration = {
        id,
        title: this.title().trim() || `Speech preview ${this.nextGeneration - 1}`,
        request: {
          model: 'gpt-4o-mini-tts',
          voice: this.voice(),
          instructions: this.instructions().trim(),
          input,
        },
        audio,
        createdAt: new Date(),
      };
      this.history.update((items) => [generation, ...items]);
      this.selectedHistoryId.set(id);
      this.status.set('success');
      this.statusMessage.set(`Generated ${audio.fileExtension.toUpperCase()} preview in ${this.gateway.mode} mode.`);
    } catch (error) {
      this.status.set('error');
      this.statusMessage.set(error instanceof Error ? error.message : 'Speech generation failed.');
    }
  }

  async togglePlayback(id: string): Promise<void> {
    const generation = this.history().find((item) => item.id === id);
    if (!generation) return;
    this.selectedHistoryId.set(id);
    try {
      await this.playback.toggle(generation);
      this.status.set('success');
      this.statusMessage.set(this.playback.snapshot().state === 'playing'
        ? `Playing ${generation.title}.`
        : `Paused ${generation.title}.`);
    } catch (error) {
      this.status.set('error');
      this.statusMessage.set(error instanceof Error ? error.message : 'Audio playback failed.');
    }
  }

  async restartSelected(): Promise<void> {
    const id = this.selectedHistoryId();
    if (!id) return;
    try {
      await this.playback.restart(id);
      this.status.set('success');
      this.statusMessage.set('Restarted the selected audio.');
    } catch (error) {
      this.status.set('error');
      this.statusMessage.set(error instanceof Error ? error.message : 'Audio playback failed.');
    }
  }

  downloadGeneration(id: string): void {
    const generation = this.history().find((item) => item.id === id);
    if (!generation) return;
    try {
      this.playback.download(generation);
      this.status.set('success');
      this.statusMessage.set(`Downloading ${generation.audio.fileExtension.toUpperCase()} for ${generation.title}.`);
    } catch (error) {
      this.status.set('error');
      this.statusMessage.set(error instanceof Error ? error.message : 'Audio download failed.');
    }
  }

  selectedGenerationId(): string | undefined {
    return this.selectedHistoryId();
  }
}
