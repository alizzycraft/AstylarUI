import { createMockWave, MockSpeechGateway } from './mock-speech.gateway';

describe('MockSpeechGateway', () => {
  it('creates deterministic playable WAV bytes without a network request', async () => {
    const first = createMockWave('same input');
    const second = createMockWave('same input');
    expect(Array.from(new Uint8Array(first))).toEqual(Array.from(new Uint8Array(second)));
    expect(new TextDecoder().decode(first.slice(0, 4))).toBe('RIFF');

    const result = await new MockSpeechGateway().generate({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      instructions: 'Warm',
      input: 'Hello',
    });
    expect(result.mimeType).toBe('audio/wav');
    expect(new MockSpeechGateway().mode).toBe('mock');
    expect(result.bytes.byteLength).toBeGreaterThan(44);
  });
});
