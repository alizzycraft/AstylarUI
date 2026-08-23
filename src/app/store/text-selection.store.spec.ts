import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { TextSelectionStore } from './text-selection.store';
import {
  TextInteractionEntry,
  TextInteractionRegistryEvent,
  TextInteractionRegistryService
} from '../services/dom/interaction/text-interaction-registry.service';
import { TextSelectionControllerService } from '../services/dom/interaction/text-selection-controller.service';
import { StoredTextLayoutMetrics } from '../types/text-rendering';
import type { Mesh } from '@babylonjs/core';

describe('TextSelectionStore', () => {
  let store: TextSelectionStore;
  let controller: TextSelectionControllerService;
  let registry: MockTextInteractionRegistryService;
  let entry: TextInteractionEntry;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TextSelectionStore,
        TextSelectionControllerService,
        { provide: TextInteractionRegistryService, useClass: MockTextInteractionRegistryService }
      ]
    });

    store = TestBed.inject(TextSelectionStore);
    controller = TestBed.inject(TextSelectionControllerService);
    registry = TestBed.inject(TextInteractionRegistryService) as unknown as MockTextInteractionRegistryService;

    entry = createEntry('element-1', 'hello');
    registry.setEntry(entry);
  });

  it('mirrors controller state updates', () => {
    controller.beginSelection(entry, { x: 0, y: 5 });
    controller.updateSelection(entry, { x: 44, y: 5 });

    expect(store.elementId()).toBe('element-1');
    expect(store.range()).toEqual({ start: 0, end: 4 });
    expect(store.hasSelection()).toBeTrue();
    expect(store.anchorIndex()).toBe(0);
    expect(store.focusIndex()).toBe(4);
  });

  it('exposes selectedText based on registry entry text', () => {
    controller.beginSelection(entry, { x: 0, y: 5 });
    controller.updateSelection(entry, { x: 44, y: 5 });

    expect(store.selectedText()).toBe('hell');
  });

  it('clears selection when registry emits unregister for active element', () => {
    controller.beginSelection(entry, { x: 0, y: 5 });
    controller.updateSelection(entry, { x: 44, y: 5 });

    registry.emit({ type: 'unregister', elementId: entry.elementId });

    expect(store.elementId()).toBeNull();
    expect(store.hasSelection()).toBeFalse();
  });
});

class MockTextInteractionRegistryService {
  private subject = new Subject<TextInteractionRegistryEvent>();
  private entries = new Map<string, TextInteractionEntry>();

  readonly events$ = this.subject.asObservable();

  emit(event: TextInteractionRegistryEvent): void {
    this.subject.next(event);
  }

  setEntry(entry: TextInteractionEntry): void {
    this.entries.set(entry.elementId, entry);
  }

  getByElementId(elementId: string): TextInteractionEntry | undefined {
    return this.entries.get(elementId);
  }
}

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
    totalWidth,
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
