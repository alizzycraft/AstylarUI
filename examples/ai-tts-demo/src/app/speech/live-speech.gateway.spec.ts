import { TestBed } from '@angular/core/testing';
import { LiveSpeechGateway, SPEECH_FETCH } from './live-speech.gateway';

describe('LiveSpeechGateway', () => {
  it('posts the typed request to the same-origin endpoint and returns MP3 bytes', async () => {
    const bytes = new Uint8Array([73, 68, 51]).buffer;
    const fetch = jasmine.createSpy('fetch').and.resolveTo(new Response(bytes, {
      status: 200,
      headers: { 'content-type': 'audio/mpeg' },
    }));
    TestBed.configureTestingModule({ providers: [{ provide: SPEECH_FETCH, useValue: fetch }] });

    const abort = new AbortController();
    const result = await TestBed.inject(LiveSpeechGateway).generate({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      instructions: 'Warm',
      input: 'Hello',
    }, abort.signal);

    expect(fetch).toHaveBeenCalledOnceWith('/api/speech', jasmine.objectContaining({
      method: 'POST',
      signal: abort.signal,
    }));
    expect(result.fileExtension).toBe('mp3');
    expect(Array.from(new Uint8Array(result.bytes))).toEqual([73, 68, 51]);
  });

  it('surfaces a safe server error message', async () => {
    const fetch = jasmine.createSpy('fetch').and.resolveTo(new Response(JSON.stringify({
      error: { message: 'Live mode is disabled.' },
    }), { status: 403, headers: { 'content-type': 'application/json' } }));
    TestBed.configureTestingModule({ providers: [{ provide: SPEECH_FETCH, useValue: fetch }] });
    await expectAsync(TestBed.inject(LiveSpeechGateway).generate({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      instructions: '',
      input: 'Hello',
    })).toBeRejectedWithError('Live mode is disabled.');
  });
});
