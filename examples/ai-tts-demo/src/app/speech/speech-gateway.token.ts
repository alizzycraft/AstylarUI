import { isPlatformBrowser } from '@angular/common';
import { inject, InjectionToken, PLATFORM_ID } from '@angular/core';
import { LiveSpeechGateway } from './live-speech.gateway';
import { MockSpeechGateway } from './mock-speech.gateway';
import type { SpeechGateway } from './speech.types';

export const SPEECH_GATEWAY = new InjectionToken<SpeechGateway>('SPEECH_GATEWAY', {
  providedIn: 'root',
  factory: () => {
    const platformId = inject(PLATFORM_ID);
    const liveRequested = isPlatformBrowser(platformId)
      && new URLSearchParams(globalThis.location.search).get('speech') === 'live';
    return liveRequested ? inject(LiveSpeechGateway) : inject(MockSpeechGateway);
  },
});
