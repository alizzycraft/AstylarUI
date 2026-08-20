import { TestBed } from '@angular/core/testing';
import { SPEECH_GATEWAY } from './speech-gateway.token';
import type { SpeechGateway } from './speech.types';
import { TtsDemoStore } from './tts-demo.store';
import { AudioPlaybackService } from './audio-playback.service';

describe('TtsDemoStore', () => {
  const gateway: SpeechGateway = {
    mode: 'mock',
    generate: jasmine.createSpy('generate').and.resolveTo({
      bytes: new Uint8Array([1, 2, 3]).buffer,
      mimeType: 'audio/mpeg',
      fileExtension: 'mp3',
      durationSeconds: 2,
    }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      { provide: SPEECH_GATEWAY, useValue: gateway },
      { provide: AudioPlaybackService, useValue: {
        snapshot: () => ({ state: 'idle', currentTime: 0, duration: 0, progressPercent: 0 }),
        stop: jasmine.createSpy('stop'),
        toggle: jasmine.createSpy('toggle').and.resolveTo(),
        restart: jasmine.createSpy('restart').and.resolveTo(),
        download: jasmine.createSpy('download'),
      } },
    ] });
  });

  it('generates, selects, searches, and removes session-only history', async () => {
    const store = TestBed.inject(TtsDemoStore);
    store.setTitle('Launch message');
    store.setText('Hello from AstylarUI');
    store.setVoice('coral');
    await store.generate();

    expect(store.viewModel().status).toBe('success');
    expect(store.viewModel().history[0]).toEqual(jasmine.objectContaining({
      id: 'speech-1',
      title: 'Launch message',
      voice: 'coral',
      formatLabel: 'MP3',
    }));
    expect(store.viewModel().selectedHistoryId).toBe('speech-1');

    store.setHistoryQuery('launch');
    expect(store.viewModel().historyQuery).toBe('launch');
    store.deleteGeneration('speech-1');
    expect(store.viewModel().history).toEqual([]);
  });

  it('reports validation errors without calling the gateway', async () => {
    const store = TestBed.inject(TtsDemoStore);
    store.setText('   ');
    await store.generate();
    expect(store.viewModel().status).toBe('error');
  });
});
