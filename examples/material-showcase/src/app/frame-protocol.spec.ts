import { parseFrameCommand } from './frame-protocol';

describe('frame protocol', () => {
  it('accepts deterministic benchmark phases', () => {
    expect(parseFrameCommand({ type: 'showcase:benchmark', phase: 'held' })).toEqual({
      type: 'showcase:benchmark', phase: 'held',
    });
  });

  it('rejects unknown benchmark phases and families', () => {
    expect(parseFrameCommand({ type: 'showcase:benchmark', phase: 'moving' })).toBeUndefined();
    expect(parseFrameCommand({ type: 'showcase:family', family: 'not-material' })).toBeUndefined();
  });
});
