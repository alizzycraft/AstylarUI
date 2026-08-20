import { Injectable } from '@angular/core';
import type { SpeechAudio, SpeechGateway, SpeechRequest } from './speech.types';

const SAMPLE_RATE = 8_000;
const DURATION_SECONDS = 0.65;

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

/** Builds a tiny deterministic WAV tone so mock mode can exercise real browser audio without network use. */
export function createMockWave(input: string): ArrayBuffer {
  const sampleCount = Math.floor(SAMPLE_RATE * DURATION_SECONDS);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const hash = [...input].reduce((total, character) => total + character.charCodeAt(0), 0);
  const frequency = 330 + (hash % 110);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, sampleCount * 2, true);

  for (let index = 0; index < sampleCount; index += 1) {
    const fade = Math.min(1, index / 300, (sampleCount - index) / 300);
    const sample = Math.sin((2 * Math.PI * frequency * index) / SAMPLE_RATE) * 0.16 * fade;
    view.setInt16(44 + index * 2, Math.round(sample * 0x7fff), true);
  }
  return buffer;
}

@Injectable({ providedIn: 'root' })
export class MockSpeechGateway implements SpeechGateway {
  async generate(request: SpeechRequest): Promise<SpeechAudio> {
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 180));
    return {
      bytes: createMockWave(`${request.voice}:${request.instructions}:${request.input}`),
      mimeType: 'audio/wav',
      fileExtension: 'wav',
      durationSeconds: DURATION_SECONDS,
    };
  }
}
