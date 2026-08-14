import { DOCUMENT } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TextSelectionKeyboardService } from './text-selection-keyboard.service';
import { TextSelectionStore } from '../../../store/text-selection.store';
import { TextSelectionControllerService } from './text-selection-controller.service';
import { TextSelectionClipboardService } from './text-selection-clipboard.service';
import { TextInteractionEntry } from './text-interaction-registry.service';

describe('TextSelectionKeyboardService', () => {
  let documentStub: FakeDocument;
  let service: TextSelectionKeyboardService;
  let store: MockTextSelectionStore;
  let controller: MockTextSelectionControllerService;
  let clipboard: MockTextSelectionClipboardService;

  beforeEach(() => {
    documentStub = new FakeDocument();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: DOCUMENT, useValue: documentStub as unknown as Document },
        { provide: TextSelectionStore, useClass: MockTextSelectionStore },
        { provide: TextSelectionControllerService, useClass: MockTextSelectionControllerService },
        { provide: TextSelectionClipboardService, useClass: MockTextSelectionClipboardService },
        TextSelectionKeyboardService
      ]
    });

    service = TestBed.inject(TextSelectionKeyboardService);
    store = TestBed.inject(TextSelectionStore) as unknown as MockTextSelectionStore;
    controller = TestBed.inject(TextSelectionControllerService) as unknown as MockTextSelectionControllerService;
    clipboard = TestBed.inject(TextSelectionClipboardService) as unknown as MockTextSelectionClipboardService;
  });

  it('ignores keydown events when no selection context is available', () => {
    const event = createKeyEvent('keydown', 'ArrowRight');

    documentStub.dispatchKeydown(event);

    expect(controller.moveSelectionWithKeyboard).not.toHaveBeenCalled();
  });

  it('routes navigation keys to the selection controller', () => {
    const entry: TextInteractionEntry = {
      elementId: 'element-1',
      mesh: { sideOrientation: 2 } as any
    };
    store.setElementId(entry.elementId);
    store.setActiveEntry(entry);

    const event = createKeyEvent('keydown', 'ArrowRight');
    documentStub.dispatchKeydown(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(controller.moveSelectionWithKeyboard).toHaveBeenCalledWith(entry, 'right', false);
  });

  it('extends selection when shift is held', () => {
    const entry: TextInteractionEntry = {
      elementId: 'element-1',
      mesh: { sideOrientation: 2 } as any
    };
    store.setElementId(entry.elementId);
    store.setActiveEntry(entry);

    const event = createKeyEvent('keydown', 'ArrowLeft', { shiftKey: true });
    documentStub.dispatchKeydown(event);

    expect(controller.moveSelectionWithKeyboard).toHaveBeenCalledWith(entry, 'left', true);
  });

  it('invokes clipboard copy shortcut when selection exists', () => {
    store.setHasSelection(true);
    const event = createKeyEvent('keydown', 'c', { ctrlKey: true });

    documentStub.dispatchKeydown(event);

    expect(clipboard.copySelectedText).toHaveBeenCalled();
    expect(event.defaultPrevented).toBeTrue();
  });

  it('clears selection on Escape key', () => {
    store.setElementId('element-1');

    const event = createKeyEvent('keydown', 'Escape');
    documentStub.dispatchKeydown(event);

    expect(store.clearSelection).toHaveBeenCalled();
    expect(event.defaultPrevented).toBeTrue();
  });
});

class MockTextSelectionStore {
  private elementIdValue: string | null = null;
  private hasSelectionValue = false;
  private activeEntryValue?: TextInteractionEntry;
  readonly clearSelection = jasmine.createSpy('clearSelection');

  elementId(): string | null {
    return this.elementIdValue;
  }

  setElementId(value: string | null): void {
    this.elementIdValue = value;
  }

  hasSelection(): boolean {
    return this.hasSelectionValue;
  }

  setHasSelection(value: boolean): void {
    this.hasSelectionValue = value;
  }

  activeEntry(): TextInteractionEntry | undefined {
    return this.activeEntryValue;
  }

  setActiveEntry(entry: TextInteractionEntry | undefined): void {
    this.activeEntryValue = entry;
  }
}

class MockTextSelectionControllerService {
  readonly moveSelectionWithKeyboard = jasmine.createSpy('moveSelectionWithKeyboard');
}

class MockTextSelectionClipboardService {
  readonly copySelectedText = jasmine.createSpy('copySelectedText');
}

class FakeDocument {
  readonly defaultView = window;
  private listeners = new Map<string, EventListenerOrEventListenerObject[]>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const existing = this.listeners.get(type);
    if (!existing) {
      return;
    }
    this.listeners.set(
      type,
      existing.filter((candidate) => candidate !== listener)
    );
  }

  dispatchKeydown(event: KeyboardEvent): void {
    const listeners = this.listeners.get('keydown') ?? [];
    for (const listener of listeners) {
      if (typeof listener === 'function') {
        listener(event);
      } else {
        listener.handleEvent(event);
      }
    }
  }
}

function createKeyEvent(
  type: string,
  key: string,
  options: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}
): KeyboardEvent {
  const event = new KeyboardEvent(type, {
    key,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    shiftKey: options.shiftKey ?? false,
    bubbles: true,
    cancelable: true
  });

  return event;
}
