export const reference = {
  repository: 'https://github.com/alizzycraft/ai-tts-mp3',
  commit: '35695edc53a5d848dd60255b902b6a1986e809a5',
};

export const states = ['initial', 'generated'];

// These scenarios are derived from the pinned application's real controls and
// intentionally describe steady states only. The source uses transitions, but
// AstylarUI compares the settled hover/active/focus result rather than timing.
export const interactionScenarios = [
  {
    id: 'generate-pointer', state: 'initial', elementId: 'generate-speech',
    profiles: ['reference-large-dpr1', 'smoke-1280-dpr2'],
    steps: [
      { id: 'hover', styleProperties: ['backgroundColor', 'color', 'cursor', 'transform'], actions: [{ type: 'hover', elementId: 'generate-speech' }] },
      { id: 'held-active', styleProperties: ['backgroundColor', 'color', 'cursor', 'transform'], actions: [{ type: 'pointer-down', elementId: 'generate-speech' }] },
      { id: 'release', styleProperties: ['backgroundColor', 'color', 'cursor', 'transform'], actions: [{ type: 'pointer-up' }] },
    ],
  },
  {
    id: 'generate-keyboard-focus', state: 'initial', elementId: 'generate-speech',
    profiles: ['reference-large-dpr1', 'smoke-1280-dpr2'],
    steps: [{ id: 'focus-visible', visual: 'focus-indicator', actions: [
      { type: 'keyboard-focus', elementId: 'generate-speech' },
    ] }],
  },
  {
    id: 'title-caret', state: 'initial', elementId: 'generation-title',
    profiles: ['reference-large-dpr1', 'smoke-1280-dpr2'],
    steps: [{ id: 'pointer-caret', caretColor: true, focusRingRadius: true, styleProperties: ['backgroundColor', 'color', 'borderColor', 'boxShadow'], actions: [
      { type: 'click', elementId: 'generation-title', offsetX: 72, offsetY: 22 },
      { type: 'type-text', text: 'Demo title' },
      { type: 'press-key', key: 'ArrowLeft' },
    ] }],
  },
  {
    id: 'editor-selection', state: 'generated', elementId: 'speech-text',
    profiles: ['reference-large-dpr1', 'smoke-1280-dpr2'],
    steps: [
      { id: 'focus-caret', caretColor: true, styleProperties: ['backgroundColor', 'color', 'borderColor'], actions: [
        { type: 'click', elementId: 'speech-text' },
        { type: 'press-key', key: 'Control+A' },
        { type: 'type-text', text: 'AstylarUI brings familiar web application patterns into a Babylon-rendered space.' },
        { type: 'press-key', key: 'Control+Home' },
      ] },
      { id: 'forward-selection', selectionContrast: true, visual: 'structural-selection', actions: [
        { type: 'press-key', key: 'Control+Shift+End' },
      ] },
      { id: 'replace-selection', actions: [{ type: 'type-text', text: 'SELECTION' }] },
      { id: 'backward-selection', selectionContrast: true, visual: 'structural-selection', actions: [
        { type: 'press-key', key: 'Control+End' }, { type: 'press-key', key: 'Control+Shift+Home' },
      ] },
      { id: 'pointer-selection-setup', actions: [
        { type: 'press-key', key: 'Control+A' },
        { type: 'type-text', text: 'AstylarUI brings familiar web application patterns into a Babylon-rendered space.' },
        { type: 'press-key', key: 'Control+Home' },
      ] },
      { id: 'pointer-mid-selection', selectionContrast: true, visual: 'structural-selection', actions: [
        { type: 'click', elementId: 'speech-text', offsetX: 42, offsetY: 28 },
        { type: 'pointer-down', elementId: 'speech-text', offsetX: 42, offsetY: 28 },
        { type: 'hover', elementId: 'speech-text', offsetX: 101, offsetY: 28 },
        { type: 'pointer-up' },
        { type: 'keyboard-focus', elementId: 'speech-text' },
      ] },
    ],
  },
  {
    id: 'voice-keyboard', state: 'initial', elementId: 'voice',
    profiles: ['reference-large-dpr1', 'smoke-1280-dpr2'],
    steps: [
      { id: 'focus', visual: 'state-only', actions: [{ type: 'keyboard-focus', elementId: 'voice' }] },
      { id: 'arrow-commit', styleProperties: ['backgroundColor', 'color', 'borderColor', 'boxShadow'], actions: [{ type: 'press-key', key: 'ArrowDown' }] },
    ],
  },
  {
    id: 'voice-pointer', state: 'initial', elementId: 'voice',
    profiles: ['reference-large-dpr1', 'smoke-1280-dpr2'],
    steps: [
      { id: 'open', visual: 'state-only', actions: [{ type: 'click', elementId: 'voice' }] },
      { id: 'commit-coral', styleProperties: ['backgroundColor', 'color', 'borderColor', 'boxShadow'], actions: [
        { type: 'select-option', elementId: 'voice', value: 'coral', offsetX: 120, offsetY: 77 },
      ] },
    ],
  },
  {
    id: 'voice-dismissal', state: 'initial', elementId: 'voice',
    profiles: ['reference-large-dpr1', 'smoke-1280-dpr2'], repeatCycles: 3,
    steps: [
      { id: 'open-for-escape', visual: 'state-only', actions: [{ type: 'click', elementId: 'voice' }] },
      { id: 'escape', actions: [{ type: 'press-key', key: 'Escape' }] },
      { id: 'open-for-click-away', visual: 'state-only', actions: [{ type: 'click', elementId: 'voice' }] },
      { id: 'click-away', actions: [{ type: 'click', elementId: 'settings-title' }] },
    ],
  },
  {
    id: 'history-search-selection', state: 'generated', elementId: 'history-search',
    profiles: ['reference-large-dpr1', 'smoke-1280-dpr2'],
    steps: [
      { id: 'focus-caret', styleProperties: ['backgroundColor', 'color', 'borderColor', 'boxShadow'], actions: [
        { type: 'click', elementId: 'history-search' }, { type: 'type-text', text: 'hello' },
      ] },
      { id: 'selection', selectionContrast: true, visual: 'structural-selection', actions: [
        { type: 'press-key', key: 'Shift+Home' },
      ] },
    ],
  },
  {
    id: 'history-card-hover', state: 'generated', elementId: 'history-speech-1',
    profiles: ['reference-large-dpr1', 'smoke-1280-dpr2'],
    steps: [{
      id: 'blank-padding',
      styleProperties: ['backgroundColor', 'borderColor', 'cursor'],
      actions: [{ type: 'hover', elementId: 'history-speech-1', offsetX: 250, offsetY: 7 }],
    }],
  },
  {
    id: 'history-text-copy', state: 'generated', elementId: 'history-speech-1-text',
    profiles: ['reference-large-dpr1', 'smoke-1280-dpr2'],
    steps: [
      {
        id: 'select-text', selectionContrast: true, visual: 'structural-selection',
        stateProperties: [], compareCursor: false,
        actions: [
          { type: 'pointer-down', elementId: 'history-speech-1-text', offsetX: 1, offsetY: 10 },
          { type: 'hover', elementId: 'history-speech-1-text', offsetX: 75, offsetY: 10 },
          { type: 'pointer-up' },
        ],
      },
      {
        id: 'copy-text', clipboardText: true, visual: 'structural-selection',
        stateProperties: [], compareCursor: false,
        actions: [{ type: 'copy-selection' }],
      },
    ],
  },
  ...['play', 'download', 'delete'].map((action) => ({
    id: `history-${action}-hover`, state: 'generated', elementId: `history-speech-1-${action}`,
    profiles: ['reference-large-dpr1', 'smoke-1280-dpr2'],
    steps: [{ id: 'hover', styleProperties: ['color', 'cursor'], actions: [{ type: 'hover', elementId: `history-speech-1-${action}` }] }],
  })),
];

export const interactionApplicability = {
  desktop: 'All source controls are visible and are enforced at DPR 1 and DPR 2.',
  tablet: 'The fixed three-column source shell clips the workspace/history targets; static visibility remains enforced.',
  mobile: 'The pinned source does not reflow the fixed shell, so off-screen interaction targets are not applicable.',
};

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
  'generation-status', 'player-placeholder-title', 'selected-player-title', 'storage-title',
  'history-empty-title', 'history-empty-copy', 'history-speech-1-text',
];

export const textMeasurementIds = [
  'app-title', 'settings-title', 'workspace-title', 'speech-text', 'generate-speech',
  'generation-status', 'player-placeholder-title', 'selected-player-title', 'history-title',
  'storage-title', 'history-empty-title', 'history-empty-copy', 'history-speech-1-text',
];

export const sharpnessRegions = [
  { id: 'title-text', elementId: 'app-title', kind: 'text', padding: 4 },
  { id: 'editor-text', elementId: 'speech-text', kind: 'text', padding: 4 },
  { id: 'workspace-title', elementId: 'workspace-title', kind: 'text', padding: 4 },
  { id: 'panel-border', elementId: 'settings-panel', kind: 'border', edge: 'right', thickness: 12 },
];

// Calibrated from exact-copy, synthetic blur, and degraded one-pixel-border cases.
// Phase 18 calibrated these without enforcing them; Phase 19 promoted the
// unchanged configuration to release acceptance.
export const acceptance = {
  maximumGeometryEdgeErrorPx: 4,
  maximumPopupWidthErrorPx: 0.5,
  minimumEdgesWithinTolerance: 0.95,
  geometryTolerancePx: 2,
  minimumSsim: 0.965,
  minimumInteractionLocalSsim: 0.74,
  maximumInteractionColorError: 0.08,
  minimumInteractionColorEdgeAlignment: 0.65,
  minimumInteractionEdgeAlignment: 0.7,
  minimumInteractionGradientEnergyRetention: 0.75,
  minimumSelectionGlyphAlignment: 0.7,
  maximumSelectionCaretOffsetPx: 2,
  minimumGradientEnergyRetention: 0.82,
  minimumEdgeAlignment: 0.82,
  maximumGradientRmse: 0.12,
  maximumIncidentalScrollExtentPx: 1,
  visibilityMustMatch: true,
  scrollOwnershipMustMatch: true,
};
