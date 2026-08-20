export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

export interface SpeechHistoryItemView {
  id: string;
  title: string;
  text: string;
  voice: string;
  createdLabel: string;
  sizeLabel: string;
  durationLabel: string;
  formatLabel: string;
}

export interface TtsDemoViewModel {
  provider: 'OpenAI';
  model: 'gpt-4o-mini-tts';
  voice: string;
  instructions: string;
  title: string;
  text: string;
  maxCharacters: number;
  status: GenerationStatus;
  statusMessage: string;
  history: readonly SpeechHistoryItemView[];
  historyQuery: string;
  selectedHistoryId?: string;
  playingHistoryId?: string;
  currentTimeLabel: string;
  durationLabel: string;
  progressPercent: number;
  storageDisclosureOpen: boolean;
}

export const DEFAULT_TTS_VIEW_MODEL: TtsDemoViewModel = {
  provider: 'OpenAI',
  model: 'gpt-4o-mini-tts',
  voice: 'alloy',
  instructions: 'Speak clearly in a warm, natural tone.',
  title: '',
  text: 'AstylarUI brings familiar web application patterns into a Babylon-rendered space.',
  maxCharacters: 4_000,
  status: 'idle',
  statusMessage: 'Ready to generate a mock preview.',
  history: [],
  historyQuery: '',
  currentTimeLabel: '0:00',
  durationLabel: '0:00',
  progressPercent: 0,
  storageDisclosureOpen: true,
};
