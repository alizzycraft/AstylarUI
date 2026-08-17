import { CursorDirection, InputType, TextInput } from '../../../types/input-types';
import { TextInputManager } from './text-input.manager';

describe('TextInputManager', () => {
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

  it('collapses an existing selection when moving without shift', () => {
    const manager = Object.create(TextInputManager.prototype) as TextInputManager;
    const textInput = createTextInput('Alpha', 3);
    textInput.selectionStart = 3;
    textInput.selectionEnd = 5;
    textInput.cursorState.selectionActive = true;
    textInput.cursorState.selectionStart = 5;
    textInput.cursorState.selectionEnd = 3;

    manager.moveCursor(textInput, CursorDirection.Right);

    expect(textInput.cursorPosition).toBe(4);
    expect(textInput.selectionStart).toBe(4);
    expect(textInput.selectionEnd).toBe(4);
    expect(textInput.cursorState.selectionActive).toBeFalse();
    expect(textInput.cursorState.selectionStart).toBe(4);
    expect(textInput.cursorState.selectionEnd).toBe(4);
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
