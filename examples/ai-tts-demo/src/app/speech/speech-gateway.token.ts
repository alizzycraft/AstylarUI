import { inject, InjectionToken } from '@angular/core';
import { MockSpeechGateway } from './mock-speech.gateway';
import type { SpeechGateway } from './speech.types';

export const SPEECH_GATEWAY = new InjectionToken<SpeechGateway>('SPEECH_GATEWAY', {
  providedIn: 'root',
  factory: () => inject(MockSpeechGateway),
});
