import { DOCUMENT } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TextSelectionClipboardService } from './text-selection-clipboard.service';
import { TextSelectionStore } from '../../../store/text-selection.store';

describe('TextSelectionClipboardService', () => {
  let service: TextSelectionClipboardService;
  let store: MockTextSelectionStore;
  let documentStub: FakeDocument;

  beforeEach(() => {
    documentStub = new FakeDocument();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TextSelectionClipboardService,
        { provide: DOCUMENT, useValue: documentStub as unknown as Document },
        { provide: TextSelectionStore, useClass: MockTextSelectionStore }
      ]
    });

    service = TestBed.inject(TextSelectionClipboardService);
    store = TestBed.inject(TextSelectionStore) as unknown as MockTextSelectionStore;
  });

  it('returns false when no selected text is available', async () => {
    store.setSelectedText('');
    const copied = await service.copySelectedText();
    expect(copied).toBeFalse();
    expect(documentStub.execCommandSpy).not.toHaveBeenCalled();
  });

  it('falls back to execCommand when navigator clipboard is unavailable', async () => {
    store.setSelectedText('hello world');
    const copied = await service.copySelectedText();

    expect(copied).toBeTrue();
    expect(documentStub.execCommandSpy).toHaveBeenCalledWith('copy');
    expect(documentStub.body.lastAppended?.value).toBe('hello world');
    expect(documentStub.body.lastRemoved).toBe(documentStub.body.lastAppended);
  });

  it('writes selected text synchronously to a native copy event', async () => {
    store.setSelectedText('scene selection');
    const setData = jasmine.createSpy('setData');
    const event = { clipboardData: { setData } } as unknown as ClipboardEvent;

    expect(await service.copySelectedText(event)).toBeTrue();
    expect(setData).toHaveBeenCalledWith('text/plain', 'scene selection');
    expect(documentStub.execCommandSpy).not.toHaveBeenCalled();
  });
});

class MockTextSelectionStore {
  private text = '';

  selectedText(): string {
    return this.text;
  }

  setSelectedText(text: string): void {
    this.text = text;
  }
}

class FakeDocument {
  readonly defaultView = { navigator: {} };
  readonly body = new FakeBody();
  readonly execCommandSpy = jasmine.createSpy('execCommand').and.returnValue(true);

  addEventListener(): void {}

  removeEventListener(): void {}

  createElement(): FakeTextarea {
    return new FakeTextarea();
  }

  execCommand(command: string): boolean {
    return this.execCommandSpy(command);
  }
}

class FakeBody {
  lastAppended?: FakeTextarea;
  lastRemoved?: FakeTextarea;

  appendChild(node: FakeTextarea): void {
    this.lastAppended = node;
  }

  removeChild(node: FakeTextarea): void {
    this.lastRemoved = node;
  }
}

class FakeTextarea {
  value = '';
  style: Record<string, string> = {};

  setAttribute(): void {}
  focus(): void {}
  select(): void {}
}
