import { inject, Injectable, InjectionToken } from '@angular/core';
import type { SpeechAudio, SpeechGateway, SpeechRequest } from './speech.types';

type FetchFunction = typeof globalThis.fetch;

export const SPEECH_FETCH = new InjectionToken<FetchFunction>('SPEECH_FETCH', {
  providedIn: 'root',
  factory: () => globalThis.fetch.bind(globalThis),
});

interface ApiErrorBody {
  error?: { message?: string };
}

@Injectable({ providedIn: 'root' })
export class LiveSpeechGateway implements SpeechGateway {
  private readonly fetch = inject(SPEECH_FETCH);
  readonly mode = 'live' as const;

  async generate(request: SpeechRequest): Promise<SpeechAudio> {
    const response = await this.fetch('/api/speech', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as ApiErrorBody;
      throw new Error(body.error?.message || `Speech generation failed (${response.status}).`);
    }
    return {
      bytes: await response.arrayBuffer(),
      mimeType: 'audio/mpeg',
      fileExtension: 'mp3',
    };
  }
}
