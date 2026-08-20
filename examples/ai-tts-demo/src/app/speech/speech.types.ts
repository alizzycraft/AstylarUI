export const SUPPORTED_VOICES = ['alloy', 'coral', 'nova', 'onyx', 'sage', 'shimmer'] as const;

export type SpeechVoice = typeof SUPPORTED_VOICES[number];

export interface SpeechRequest {
  model: 'gpt-4o-mini-tts';
  voice: SpeechVoice;
  instructions: string;
  input: string;
}

export interface SpeechAudio {
  bytes: ArrayBuffer;
  mimeType: 'audio/mpeg' | 'audio/wav';
  fileExtension: 'mp3' | 'wav';
  durationSeconds?: number;
}

export interface SpeechGateway {
  readonly mode: 'mock' | 'live';
  generate(request: SpeechRequest): Promise<SpeechAudio>;
}

export interface SpeechGeneration {
  id: string;
  title: string;
  request: SpeechRequest;
  audio: SpeechAudio;
  createdAt: Date;
}
