export function effectiveBrowserCursor(authoredCursor, hasSelectableTextAtPoint) {
  if (authoredCursor !== 'auto') return authoredCursor;
  return hasSelectableTextAtPoint ? 'text' : 'default';
}

const interactionLayerStates = new Set(['hover', 'held', 'activate-leave']);

export function interactionLayerCursorProbe(family, state) {
  if (!interactionLayerStates.has(state)) return undefined;
  if (family === 'radio') return {
    referenceSelector: '#radio-primary mat-radio-button:nth-of-type(2) .mdc-radio',
    astylarId: 'radio-team-state-layer',
  };
  return undefined;
}
