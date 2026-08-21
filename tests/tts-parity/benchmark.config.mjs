export const reference = {
  repository: 'https://github.com/alizzycraft/ai-tts-mp3',
  commit: '35695edc53a5d848dd60255b902b6a1986e809a5',
};

export const states = ['initial', 'generated'];

export const viewports = [
  { id: 'reference-large-dpr1', width: 1919, height: 870, deviceScaleFactor: 1 },
  { id: 'smoke-1280-dpr1', width: 1280, height: 800, deviceScaleFactor: 1 },
  { id: 'smoke-1280-dpr2', width: 1280, height: 800, deviceScaleFactor: 2 },
  { id: 'tablet-dpr1', width: 760, height: 900, deviceScaleFactor: 1 },
  { id: 'mobile-dpr2', width: 390, height: 844, deviceScaleFactor: 2 },
];

export const measurementIds = [
  'tts-app', 'settings-panel', 'app-title', 'settings-title', 'provider', 'model', 'voice',
  'instructions', 'workspace-panel', 'speech-form', 'workspace-title', 'generation-title',
  'speech-text', 'generate-speech', 'player-placeholder', 'selected-player', 'history-panel',
  'history-header', 'history-title', 'storage-disclosure', 'history-search', 'history-list',
  'history-empty', 'history-speech-1',
];

export const sharpnessRegions = [
  { id: 'title-text', elementId: 'app-title', kind: 'text', padding: 4 },
  { id: 'editor-text', elementId: 'speech-text', kind: 'text', padding: 4 },
  { id: 'workspace-title', elementId: 'workspace-title', kind: 'text', padding: 4 },
  { id: 'panel-border', elementId: 'settings-panel', kind: 'border', edge: 'right', thickness: 12 },
];

// Calibrated from exact-copy, synthetic blur, and degraded one-pixel-border cases.
// Phase 18 reports these without enforcing them; Phase 19 activates them unchanged.
export const acceptance = {
  maximumGeometryEdgeErrorPx: 4,
  minimumEdgesWithinTolerance: 0.95,
  geometryTolerancePx: 2,
  minimumSsim: 0.965,
  minimumGradientEnergyRetention: 0.82,
  minimumEdgeAlignment: 0.82,
  maximumGradientRmse: 0.12,
  visibilityMustMatch: true,
  scrollOwnershipMustMatch: true,
};
