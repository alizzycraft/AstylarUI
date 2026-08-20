import { SUPPORTED_VOICES, type SpeechRequest, type SpeechVoice } from '../app/speech/speech.types';

const MAX_INPUT_CHARACTERS = 4_000;
const MAX_INSTRUCTION_CHARACTERS = 500;

export interface ValidationFailure {
  code: 'invalid_request';
  message: string;
}

export type ValidationResult =
  | { ok: true; value: SpeechRequest }
  | { ok: false; error: ValidationFailure };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateSpeechRequest(body: unknown): ValidationResult {
  if (!isRecord(body)) {
    return { ok: false, error: { code: 'invalid_request', message: 'Request body must be a JSON object.' } };
  }
  if (body['model'] !== 'gpt-4o-mini-tts') {
    return { ok: false, error: { code: 'invalid_request', message: 'Only gpt-4o-mini-tts is supported.' } };
  }
  if (typeof body['voice'] !== 'string' || !SUPPORTED_VOICES.includes(body['voice'] as SpeechVoice)) {
    return { ok: false, error: { code: 'invalid_request', message: 'Choose a supported voice.' } };
  }
  if (typeof body['input'] !== 'string' || !body['input'].trim()) {
    return { ok: false, error: { code: 'invalid_request', message: 'Speech text is required.' } };
  }
  if (body['input'].length > MAX_INPUT_CHARACTERS) {
    return { ok: false, error: { code: 'invalid_request', message: `Speech text cannot exceed ${MAX_INPUT_CHARACTERS} characters.` } };
  }
  if (typeof body['instructions'] !== 'string') {
    return { ok: false, error: { code: 'invalid_request', message: 'Voice instructions must be text.' } };
  }
  if (body['instructions'].length > MAX_INSTRUCTION_CHARACTERS) {
    return { ok: false, error: { code: 'invalid_request', message: `Voice instructions cannot exceed ${MAX_INSTRUCTION_CHARACTERS} characters.` } };
  }
  return {
    ok: true,
    value: {
      model: 'gpt-4o-mini-tts',
      voice: body['voice'] as SpeechVoice,
      input: body['input'].trim(),
      instructions: body['instructions'].trim(),
    },
  };
}
