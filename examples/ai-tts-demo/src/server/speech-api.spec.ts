import { validateSpeechRequest } from './speech-api';

describe('validateSpeechRequest', () => {
  it('accepts the bounded OpenAI speech contract', () => {
    expect(validateSpeechRequest({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      instructions: 'Warm and clear',
      input: 'A short test',
    })).toEqual(jasmine.objectContaining({ ok: true }));
  });

  it('rejects unsupported models, voices, empty input, and oversized input', () => {
    expect(validateSpeechRequest({ model: 'tts-1', voice: 'alloy', instructions: '', input: 'test' }).ok).toBeFalse();
    expect(validateSpeechRequest({ model: 'gpt-4o-mini-tts', voice: 'unknown', instructions: '', input: 'test' }).ok).toBeFalse();
    expect(validateSpeechRequest({ model: 'gpt-4o-mini-tts', voice: 'alloy', instructions: '', input: '' }).ok).toBeFalse();
    expect(validateSpeechRequest({ model: 'gpt-4o-mini-tts', voice: 'alloy', instructions: '', input: 'x'.repeat(4_001) }).ok).toBeFalse();
  });
});
