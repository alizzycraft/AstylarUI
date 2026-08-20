import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, InjectionToken, PLATFORM_ID, signal } from '@angular/core';
import type { SpeechGeneration } from './speech.types';

export interface AudioElementPort {
  src: string;
  currentTime: number;
  readonly duration: number;
  readonly paused: boolean;
  play(): Promise<void>;
  pause(): void;
  load(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface ObjectUrlPort {
  create(blob: Blob): string;
  revoke(url: string): void;
}

export type AudioElementFactory = () => AudioElementPort | undefined;
export type DownloadFile = (blob: Blob, filename: string) => void;

export const AUDIO_ELEMENT_FACTORY = new InjectionToken<AudioElementFactory>('AUDIO_ELEMENT_FACTORY', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    return () => browser ? document.createElement('audio') : undefined;
  },
});

export const OBJECT_URLS = new InjectionToken<ObjectUrlPort>('OBJECT_URLS', {
  providedIn: 'root',
  factory: () => ({
    create: (blob) => globalThis.URL.createObjectURL(blob),
    revoke: (url) => globalThis.URL.revokeObjectURL(url),
  }),
});

export const DOWNLOAD_FILE = new InjectionToken<DownloadFile>('DOWNLOAD_FILE', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    const objectUrls = inject(OBJECT_URLS);
    return (blob, filename) => {
      if (!browser) throw new Error('Downloads are available only in a browser.');
      const url = objectUrls.create(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      globalThis.setTimeout(() => objectUrls.revoke(url), 0);
    };
  },
});

export interface PlaybackSnapshot {
  activeId?: string;
  state: 'idle' | 'playing' | 'paused' | 'ended' | 'error';
  currentTime: number;
  duration: number;
  progressPercent: number;
  error?: string;
}

const IDLE_PLAYBACK: PlaybackSnapshot = {
  state: 'idle',
  currentTime: 0,
  duration: 0,
  progressPercent: 0,
};

@Injectable({ providedIn: 'root' })
export class AudioPlaybackService {
  private readonly createAudio = inject(AUDIO_ELEMENT_FACTORY);
  private readonly objectUrls = inject(OBJECT_URLS);
  private readonly downloadFile = inject(DOWNLOAD_FILE);
  private readonly state = signal<PlaybackSnapshot>(IDLE_PLAYBACK);
  private audio?: AudioElementPort;
  private objectUrl?: string;
  private listeners: readonly [string, () => void][] = [];

  readonly snapshot = this.state.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  async toggle(generation: SpeechGeneration): Promise<void> {
    if (this.state().activeId !== generation.id || !this.audio) this.load(generation);
    if (!this.audio) throw new Error('Audio playback is available only in a browser.');
    if (this.audio.paused) await this.audio.play();
    else this.audio.pause();
    this.syncTime(this.audio.paused ? 'paused' : 'playing');
  }

  async restart(id: string): Promise<void> {
    if (!this.audio || this.state().activeId !== id) return;
    this.audio.currentTime = 0;
    await this.audio.play();
    this.syncTime('playing');
  }

  stop(id?: string): void {
    if (id && this.state().activeId !== id) return;
    this.releaseAudio();
    this.state.set(IDLE_PLAYBACK);
  }

  download(generation: SpeechGeneration): void {
    const safeTitle = generation.title
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLocaleLowerCase() || generation.id;
    this.downloadFile(
      new Blob([generation.audio.bytes], { type: generation.audio.mimeType }),
      `${safeTitle}.${generation.audio.fileExtension}`,
    );
  }

  dispose(): void {
    this.stop();
  }

  private load(generation: SpeechGeneration): void {
    this.releaseAudio();
    const audio = this.createAudio();
    if (!audio) return;
    const url = this.objectUrls.create(new Blob([generation.audio.bytes], { type: generation.audio.mimeType }));
    this.audio = audio;
    this.objectUrl = url;
    audio.src = url;
    const sync = () => this.syncTime(audio.paused ? 'paused' : 'playing');
    const ended = () => this.syncTime('ended');
    const error = () => this.state.set({
      ...this.state(),
      state: 'error',
      error: 'The browser could not play this audio.',
    });
    this.listeners = [
      ['loadedmetadata', sync],
      ['timeupdate', sync],
      ['play', sync],
      ['pause', sync],
      ['ended', ended],
      ['error', error],
    ];
    this.listeners.forEach(([type, listener]) => audio.addEventListener(type, listener));
    this.state.set({
      activeId: generation.id,
      state: 'paused',
      currentTime: 0,
      duration: generation.audio.durationSeconds ?? 0,
      progressPercent: 0,
    });
    audio.load();
  }

  private syncTime(state: PlaybackSnapshot['state']): void {
    if (!this.audio) return;
    const duration = Number.isFinite(this.audio.duration) && this.audio.duration > 0
      ? this.audio.duration
      : this.state().duration;
    const currentTime = Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
    this.state.set({
      activeId: this.state().activeId,
      state,
      currentTime,
      duration,
      progressPercent: duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0,
    });
  }

  private releaseAudio(): void {
    if (this.audio) {
      this.audio.pause();
      this.listeners.forEach(([type, listener]) => this.audio?.removeEventListener(type, listener));
      this.audio.src = '';
      this.audio.load();
    }
    if (this.objectUrl) this.objectUrls.revoke(this.objectUrl);
    this.audio = undefined;
    this.objectUrl = undefined;
    this.listeners = [];
  }
}
