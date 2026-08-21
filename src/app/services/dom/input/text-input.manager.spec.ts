import { CursorDirection, InputType, TextInput } from '../../../types/input-types';
import { TextInputManager } from './text-input.manager';

describe('TextInputManager', () => {
  it('treats normal and pre-wrap textareas as horizontally wrapped', () => {
    const manager = Object.create(TextInputManager.prototype) as TextInputManager;
    const wrapped = createTextInput('hello', 5);
    wrapped.style = { selector: '#textarea-1', whiteSpace: 'pre-wrap' };
    expect((manager as any).isHorizontallyWrappedTextarea(wrapped)).toBeTrue();

    wrapped.element.wrap = 'off';
    expect((manager as any).isHorizontallyWrappedTextarea(wrapped)).toBeFalse();
  });

  it('masks password display text without changing the stored value', () => {
    const manager = Object.create(TextInputManager.prototype) as TextInputManager;
    const textInput = createTextInput('secret', 6);
    textInput.type = InputType.Password;

    expect((manager as any).getDisplayText(textInput)).toBe('••••••');
    expect(textInput.value).toBe('secret');
    expect(textInput.textContent).toBe('secret');
  });

  it('reports leftward selections with ordered DOM-style endpoints', () => {
    const manager = Object.create(TextInputManager.prototype) as TextInputManager;
    const textInput = createTextInput('Alpha', 5);

    manager.moveCursor(textInput, CursorDirection.Left, true);
    manager.moveCursor(textInput, CursorDirection.Left, true);

    expect(textInput.cursorPosition).toBe(3);
    expect(textInput.selectionStart).toBe(3);
    expect(textInput.selectionEnd).toBe(5);
    expect(textInput.cursorState.selectionStart).toBe(5);
    expect(textInput.cursorState.selectionEnd).toBe(3);
  });

  it('collapses an existing selection to its end when moving right without shift', () => {
    const manager = Object.create(TextInputManager.prototype) as TextInputManager;
    const textInput = createTextInput('Alpha', 3);
    textInput.selectionStart = 3;
    textInput.selectionEnd = 5;
    textInput.cursorState.selectionActive = true;
    textInput.cursorState.selectionStart = 5;
    textInput.cursorState.selectionEnd = 3;

    manager.moveCursor(textInput, CursorDirection.Right);

    expect(textInput.cursorPosition).toBe(5);
    expect(textInput.selectionStart).toBe(5);
    expect(textInput.selectionEnd).toBe(5);
    expect(textInput.cursorState.selectionActive).toBeFalse();
    expect(textInput.cursorState.selectionStart).toBe(5);
    expect(textInput.cursorState.selectionEnd).toBe(5);
  });

  it('collapses an existing selection to its start when moving left without shift', () => {
    const manager = Object.create(TextInputManager.prototype) as TextInputManager;
    const textInput = createTextInput('Alpha', 5);
    textInput.selectionStart = 1;
    textInput.selectionEnd = 5;
    textInput.cursorState.selectionActive = true;

    manager.moveCursor(textInput, CursorDirection.Left);

    expect(textInput.cursorPosition).toBe(1);
    expect(textInput.selectionStart).toBe(1);
    expect(textInput.selectionEnd).toBe(1);
  });

  it('restores and clamps mutable value, caret, selection, and scroll state', () => {
    const manager = Object.create(TextInputManager.prototype) as TextInputManager;
    const textInput = createTextInput('Seed', 0);

    manager.restoreMutableState(textInput, {
      value: 'Edited',
      cursorPosition: 5,
      selectionStart: 5,
      selectionEnd: 99,
      selectionActive: true,
      selectionAnchor: 6,
      selectionFocus: 5,
      scrollOffset: 12,
      scrollTop: 36,
      preserveSelectionOnReset: true,
    });

    expect(textInput.value).toBe('Edited');
    expect(textInput.textContent).toBe('Edited');
    expect(textInput.cursorPosition).toBe(5);
    expect(textInput.selectionStart).toBe(5);
    expect(textInput.selectionEnd).toBe(6);
    expect(textInput.cursorState.selectionActive).toBeTrue();
    expect(textInput.cursorState.selectionStart).toBe(6);
    expect(textInput.cursorState.selectionEnd).toBe(5);
    expect(textInput.scrollOffset).toBe(12);
    expect(textInput.scrollTop).toBe(36);
    expect(textInput.preserveSelectionOnReset).toBeTrue();
  });

  it('restores a scrolled viewport without snapping it back to the caret', () => {
    const manager = Object.create(TextInputManager.prototype) as TextInputManager;
    const textInput = createTextInput('Alpha\nBravo\nCharlie', 2);
    (manager as any).activeRender = {};
    (manager as any).suppressSelectionScroll = new Set<string>();
    const update = spyOn<any>(manager, 'updateTextDisplay').and.callFake(() => {
      expect((manager as any).suppressSelectionScroll.has('textarea-1')).toBeTrue();
      expect(textInput.scrollTop).toBe(96);
    });

    manager.restoreMutableState(textInput, {
      value: textInput.value,
      cursorPosition: 2,
      selectionStart: 2,
      selectionEnd: 2,
      selectionActive: false,
      selectionAnchor: 2,
      selectionFocus: 2,
      scrollOffset: 0,
      scrollTop: 96,
      preserveSelectionOnReset: true,
    });

    expect(update).toHaveBeenCalled();
    expect((manager as any).suppressSelectionScroll.size).toBe(0);
  });

  it('preserves and clamps caret state when a form reset restores its authored value', () => {
    const manager = Object.create(TextInputManager.prototype) as TextInputManager;
    const textInput = createTextInput('Maya Rivera', 11);
    textInput.selectionStart = 11;
    textInput.selectionEnd = 11;
    textInput.cursorState.position = 11;
    textInput.cursorState.selectionStart = 11;
    textInput.cursorState.selectionEnd = 11;
    textInput.scrollOffset = 7;
    textInput.scrollTop = 15;
    textInput.preserveSelectionOnReset = true;
    (manager as any).activeRender = {};
    (manager as any).suppressSelectionScroll = new Set<string>();
    const update = spyOn<any>(manager, 'updateTextDisplay').and.callFake(() => {
      expect((manager as any).suppressSelectionScroll.has('textarea-1')).toBeTrue();
      expect(textInput.scrollTop).toBe(15);
    });

    manager.resetTextValue(textInput, 'Maya Chen');

    expect(textInput.value).toBe('Maya Chen');
    expect(textInput.textContent).toBe('Maya Chen');
    expect(textInput.cursorPosition).toBe(9);
    expect(textInput.selectionStart).toBe(9);
    expect(textInput.selectionEnd).toBe(9);
    expect(textInput.cursorState.position).toBe(9);
    expect(textInput.cursorState.selectionStart).toBe(9);
    expect(textInput.cursorState.selectionEnd).toBe(9);
    expect(textInput.cursorState.selectionActive).toBeFalse();
    expect(textInput.scrollOffset).toBe(7);
    expect(textInput.scrollTop).toBe(15);
    expect(update).toHaveBeenCalled();
    expect((manager as any).suppressSelectionScroll.size).toBe(0);
  });

  it('clears caret and scroll state after a pointer-blurred control is reset', () => {
    const manager = Object.create(TextInputManager.prototype) as TextInputManager;
    const textInput = createTextInput('SeedX', 5);
    textInput.selectionStart = 5;
    textInput.selectionEnd = 5;
    textInput.cursorState.position = 5;
    textInput.cursorState.selectionStart = 5;
    textInput.cursorState.selectionEnd = 5;
    textInput.scrollOffset = 7;
    textInput.scrollTop = 15;
    textInput.preserveSelectionOnReset = false;

    manager.resetTextValue(textInput, 'Seed');

    expect(textInput.value).toBe('Seed');
    expect(textInput.cursorPosition).toBe(0);
    expect(textInput.selectionStart).toBe(0);
    expect(textInput.selectionEnd).toBe(0);
    expect(textInput.cursorState.position).toBe(0);
    expect(textInput.cursorState.selectionStart).toBe(0);
    expect(textInput.cursorState.selectionEnd).toBe(0);
    expect(textInput.cursorState.selectionActive).toBeFalse();
    expect(textInput.scrollOffset).toBe(0);
    expect(textInput.scrollTop).toBe(0);
  });

  it('applies and clamps textarea wheel scrolling without retaining suppression state', () => {
    const manager = Object.create(TextInputManager.prototype) as TextInputManager;
    const textInput = createTextInput('Alpha\nBravo\nCharlie', 0);
    textInput.textMesh = {} as never;
    textInput.textLayoutMetrics = { lines: [] };
    (manager as any).activeRender = {};
    (manager as any).suppressSelectionScroll = new Set<string>();
    spyOn<any>(manager, 'syncScroll').and.callFake((input: TextInput) => {
      input.scrollTop = Math.min(input.scrollTop ?? 0, 120);
    });

    expect(manager.scrollBy(textInput, 0, 96)).toBeTrue();
    expect(textInput.scrollTop).toBe(96);
    expect((manager as any).suppressSelectionScroll.size).toBe(0);
    expect(manager.scrollBy(textInput, 0, 500)).toBeTrue();
    expect(textInput.scrollTop).toBe(120);
    expect(manager.scrollBy(textInput, 0, 10)).toBeFalse();
  });
});

function createTextInput(value: string, cursorPosition: number): TextInput {
  return {
    element: { id: 'textarea-1', type: 'textarea' },
    type: InputType.Textarea,
    value,
    textContent: value,
    cursorPosition,
    selectionStart: cursorPosition,
    selectionEnd: cursorPosition,
    focused: true,
    disabled: false,
    required: false,
    validationRules: [],
    validationState: { valid: true, errors: [], touched: false, dirty: false },
    mesh: {} as never,
    style: { selector: '#textarea-1' },
    cursorState: {
      position: cursorPosition,
      visible: true,
      selectionActive: false,
      selectionStart: cursorPosition,
      selectionEnd: cursorPosition,
    },
  };
}
