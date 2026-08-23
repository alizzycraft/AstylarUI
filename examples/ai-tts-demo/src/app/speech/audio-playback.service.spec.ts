import { TestBed } from '@angular/core/testing';
import {
  AUDIO_ELEMENT_FACTORY,
  AudioPlaybackService,
  DOWNLOAD_FILE,
  OBJECT_URLS,
  type AudioElementPort,
} from './audio-playback.service';
import type { SpeechGeneration } from './speech.types';

class FakeAudio implements AudioElementPort {
  src = '';
  currentTime = 0;
  duration = 2;
  paused = true;
  readonly listeners = new Map<string, Set<() => void>>();

  async play(): Promise<void> {
    this.paused = false;
    this.emit('play');
  }

  pause(): void {
    this.paused = true;
    this.emit('pause');
  }

  load(): void {}
  addEventListener(type: string, listener: () => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }
  emit(type: string): void {
    this.listeners.get(type)?.forEach((listener) => listener());
  }
}

describe('AudioPlaybackService', () => {
  const generation: SpeechGeneration = {
    id: 'speech-1',
    title: 'Test speech',
    request: { model: 'gpt-4o-mini-tts', voice: 'alloy', instructions: '', input: 'Hello' },
    audio: { bytes: new Uint8Array([1, 2]).buffer, mimeType: 'audio/mpeg', fileExtension: 'mp3', durationSeconds: 2 },
    createdAt: new Date(0),
  };
  let audio: FakeAudio;
  let revoke: jasmine.Spy;
  let download: jasmine.Spy;

  beforeEach(() => {
    audio = new FakeAudio();
    revoke = jasmine.createSpy('revoke');
    download = jasmine.createSpy('download');
    TestBed.configureTestingModule({ providers: [
      { provide: AUDIO_ELEMENT_FACTORY, useValue: () => audio },
      { provide: OBJECT_URLS, useValue: { create: () => 'blob:test', revoke } },
      { provide: DOWNLOAD_FILE, useValue: download },
    ] });
  });

  it('plays, reports progress, restarts, pauses, and releases its object URL', async () => {
    spyOn(Date, 'now').and.returnValues(1_000, 1_050, 1_101);
    const service = TestBed.inject(AudioPlaybackService);
    await service.toggle(generation);
    expect(service.snapshot()).toEqual(jasmine.objectContaining({ activeId: 'speech-1', state: 'playing' }));

    audio.currentTime = 0.5;
    audio.emit('timeupdate');
    expect(service.snapshot().progressPercent).toBe(25);
    audio.currentTime = 1;
    audio.emit('timeupdate');
    expect(service.snapshot().progressPercent).toBe(25);
    audio.currentTime = 1.5;
    audio.emit('timeupdate');
    expect(service.snapshot().progressPercent).toBe(75);
    await service.restart('speech-1');
    expect(audio.currentTime).toBe(0);
    await service.toggle(generation);
    expect(service.snapshot().state).toBe('paused');

    service.stop();
    expect(revoke).toHaveBeenCalledOnceWith('blob:test');
    expect(service.snapshot().state).toBe('idle');
    expect([...audio.listeners.values()].every((listeners) => listeners.size === 0)).toBeTrue();
  });

  it('downloads from in-memory bytes with a safe filename', () => {
    TestBed.inject(AudioPlaybackService).download(generation);
    expect(download).toHaveBeenCalledWith(jasmine.any(Blob), 'test-speech.mp3');
  });
});
