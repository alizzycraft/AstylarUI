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

  it('sets an exact multiline-sized selection without pointer approximation', () => {
    const state = service.setSelection(entry, 0, entry.text!.length);

    expectState(state, {
      anchorIndex: 0,
      focusIndex: 5,
      range: { start: 0, end: 5 },
      hasSelection: true,
      isPointerDown: false
    });
  });

  it('preserves the preferred caret x across proportional multiline navigation', () => {
    const multilineEntry = createProportionalMultilineEntry();
    service.setSelection(multilineEntry, 2, 2);

    const firstMove = service.moveSelectionWithKeyboard(multilineEntry, 'down', false);
    const secondMove = service.moveSelectionWithKeyboard(multilineEntry, 'down', false);

    expect(firstMove.focusIndex).toBe(4);
    expect(secondMove.focusIndex).toBe(8);
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

function createProportionalMultilineEntry(): TextInteractionEntry {
  const text = 'aa\nbb\ncc';
  const lines = [
    { index: 0, text: 'aa', startIndex: 0, endIndex: 2, width: 15, top: 0, bottom: 20 },
    { index: 1, text: 'bb', startIndex: 3, endIndex: 5, width: 20, top: 20, bottom: 40 },
    { index: 2, text: 'cc', startIndex: 6, endIndex: 8, width: 17, top: 40, bottom: 60 },
  ].map((line) => ({
    ...line,
    widthWithSpacing: line.width,
    height: 20,
    baseline: 15,
    ascent: 15,
    descent: 5,
    x: 0,
    y: line.top,
    actualLeft: 0,
    actualRight: line.width,
  }));
  const characters = [
    { index: 0, char: 'a', lineIndex: 0, column: 0, x: 0, width: 7, advance: 7, isLineBreak: false },
    { index: 1, char: 'a', lineIndex: 0, column: 1, x: 7, width: 8, advance: 8, isLineBreak: false },
    { index: 3, char: 'b', lineIndex: 1, column: 0, x: 0, width: 11, advance: 11, isLineBreak: false },
    { index: 4, char: 'b', lineIndex: 1, column: 1, x: 11, width: 9, advance: 9, isLineBreak: false },
    { index: 6, char: 'c', lineIndex: 2, column: 0, x: 0, width: 10, advance: 10, isLineBreak: false },
    { index: 7, char: 'c', lineIndex: 2, column: 1, x: 10, width: 7, advance: 7, isLineBreak: false },
  ];
  const css = {
    text,
    transformedText: text,
    totalWidth: 20,
    totalHeight: 60,
    lineHeight: 20,
    ascent: 15,
    descent: 5,
    lines,
    characters,
  } as StoredTextLayoutMetrics['css'];

  return {
    elementId: 'multiline',
    mesh: { sideOrientation: 2 } as unknown as Mesh,
    metrics: { scale: 1, css, world: css as StoredTextLayoutMetrics['world'] },
    style: { selector: '.multiline', textAlign: 'left' },
    text,
  };
}

function expectState(state: TextSelectionState, expected: Partial<TextSelectionState>) {
  Object.entries(expected).forEach(([key, value]) => {
    const snapshot = state as unknown as Record<string, unknown>;
    expect(snapshot[key]).toEqual(value);
  });
}
