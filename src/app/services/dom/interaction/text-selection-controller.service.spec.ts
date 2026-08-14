import { TextSelectionControllerService, TextSelectionState } from './text-selection-controller.service';
import { TextInteractionEntry } from './text-interaction-registry.service';
import { StoredTextLayoutMetrics } from '../../../types/text-rendering';
import type { Mesh } from '@babylonjs/core';

describe('TextSelectionControllerService', () => {
  let service: TextSelectionControllerService;
  let entry: TextInteractionEntry;

  beforeEach(() => {
    service = new TextSelectionControllerService();
    entry = createEntry('element-1', 'hello');
  });

  it('begins a selection at the caret derived from the pointer position', () => {
    const state = service.beginSelection(entry, { x: 15, y: 5 });

    expectState(state, {
      elementId: 'element-1',
      anchorIndex: 2,
      focusIndex: 2,
      isPointerDown: true,
      hasSelection: false
    });
  });

  it('updates selection range as pointer moves', () => {
    service.beginSelection(entry, { x: 0, y: 5 });
    const state = service.updateSelection(entry, { x: 44, y: 5 });

    expectState(state, {
      elementId: 'element-1',
      anchorIndex: 0,
      focusIndex: 4,
      isPointerDown: true,
      hasSelection: true,
      range: { start: 0, end: 4 }
    });
  });

  it('finalizes selection and preserves range state', () => {
    service.beginSelection(entry, { x: 0, y: 5 });
    service.updateSelection(entry, { x: 44, y: 5 });
    const state = service.finalizeSelection();

    expectState(state, {
      elementId: 'element-1',
      isPointerDown: false,
      hasSelection: true,
      range: { start: 0, end: 4 }
    });
  });

  it('moves caret with keyboard navigation', () => {
    service.beginSelection(entry, { x: 0, y: 5 });
    service.finalizeSelection();

    const stateAfterRight = service.moveSelectionWithKeyboard(entry, 'right', false);
    expectState(stateAfterRight, {
      anchorIndex: 1,
      focusIndex: 1,
      hasSelection: false
    });

    const stateAfterShift = service.moveSelectionWithKeyboard(entry, 'right', true);
    expectState(stateAfterShift, {
      anchorIndex: 1,
      focusIndex: 2,
      hasSelection: true,
      range: { start: 1, end: 2 }
    });
  });

  it('clears selection', () => {
    service.beginSelection(entry, { x: 0, y: 5 });
    service.updateSelection(entry, { x: 44, y: 5 });
    const state = service.clearSelection();

    expectState(state, {
      elementId: null,
      anchorIndex: null,
      focusIndex: null,
      hasSelection: false,
      isPointerDown: false,
      range: null
    });
  });
});

function createEntry(elementId: string, text: string): TextInteractionEntry {
  const characters = createCharacters(text);
  const lastCharacter = characters[characters.length - 1];
  const totalWidth = lastCharacter ? lastCharacter.x + lastCharacter.advance : 0;
  const cssMetrics: StoredTextLayoutMetrics['css'] = {
    text,
    transformedText: text,
    totalWidth,
    totalHeight: 20,
    lineHeight: 20,
    ascent: 15,
    descent: 5,
    lines: [
      {
        index: 0,
        text,
        startIndex: 0,
        endIndex: text.length,
        width: totalWidth,
        widthWithSpacing: totalWidth,
        height: 20,
        baseline: 15,
        ascent: 15,
        descent: 5,
        top: 0,
        bottom: 20,
        x: 0,
        y: 0,
        actualLeft: 0,
        actualRight: totalWidth
      }
    ],
    characters
  };

  const worldMetrics: StoredTextLayoutMetrics['world'] = {
    totalWidth: cssMetrics.totalWidth,
    totalHeight: cssMetrics.totalHeight,
    lineHeight: cssMetrics.lineHeight,
    ascent: cssMetrics.ascent,
    descent: cssMetrics.descent,
    lines: cssMetrics.lines.map((line) => ({
      ...line,
      actualLeft: line.actualLeft,
      actualRight: line.actualRight
    })),
    characters: cssMetrics.characters.map((character) => ({
      ...character,
      x: character.x,
      width: character.width,
      advance: character.advance
    }))
  };

  const metrics: StoredTextLayoutMetrics = {
    scale: 1,
    css: cssMetrics,
    world: worldMetrics
  };

  return {
    elementId,
    mesh: { sideOrientation: 2 } as unknown as Mesh,
    metrics,
    style: { selector: `.mock-${elementId}`, textAlign: 'left' },
    text
  };
}

function createCharacters(text: string) {
  const characters = [] as StoredTextLayoutMetrics['css']['characters'];
  const advance = 10;
  for (let index = 0; index < text.length; index += 1) {
    characters.push({
      index,
      char: text[index],
      lineIndex: 0,
      column: index,
      x: advance * index,
      width: advance,
      advance,
      isLineBreak: false
    });
  }
  return characters;
}

function expectState(state: TextSelectionState, expected: Partial<TextSelectionState>) {
  Object.entries(expected).forEach(([key, value]) => {
    const snapshot = state as unknown as Record<string, unknown>;
    expect(snapshot[key]).toEqual(value);
  });
}
