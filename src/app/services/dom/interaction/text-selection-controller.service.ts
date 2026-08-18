import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TextInteractionEntry } from './text-interaction-registry.service';

export interface CssPoint {
  x: number;
  y: number;
}

export interface TextSelectionRange {
  start: number;
  end: number;
}

export interface TextSelectionState {
  elementId: string | null;
  anchorIndex: number | null;
  focusIndex: number | null;
  range: TextSelectionRange | null;
  isPointerDown: boolean;
  hasSelection: boolean;
}

const DEFAULT_STATE: TextSelectionState = {
  elementId: null,
  anchorIndex: null,
  focusIndex: null,
  range: null,
  isPointerDown: false,
  hasSelection: false
};

@Injectable({ providedIn: 'root' })
export class TextSelectionControllerService {
  private state: TextSelectionState = { ...DEFAULT_STATE };
  private readonly stateSubject = new BehaviorSubject<TextSelectionState>(this.state);
  private activeEntry?: TextInteractionEntry;
  private pointerActive = false;

  get selection$(): Observable<TextSelectionState> {
    return this.stateSubject.asObservable();
  }

  get snapshot(): TextSelectionState {
    return this.state;
  }

  beginSelection(entry: TextInteractionEntry, position: CssPoint): TextSelectionState {
    const caretIndex = this.getCaretIndexForPoint(entry, position);
    const nextState: TextSelectionState = {
      elementId: entry.elementId,
      anchorIndex: caretIndex,
      focusIndex: caretIndex,
      range: { start: caretIndex, end: caretIndex },
      isPointerDown: true,
      hasSelection: false
    };

    this.activeEntry = entry;
    this.pointerActive = true;
    console.log('[TextSelectionController] Begin selection:', nextState);
    return this.updateState(nextState);
  }

  updateSelection(entry: TextInteractionEntry, position: CssPoint): TextSelectionState {
    if (!this.pointerActive || !this.activeEntry) {
      return this.state;
    }

    if (entry.elementId !== this.activeEntry.elementId) {
      return this.beginSelection(entry, position);
    }

    const caretIndex = this.getCaretIndexForPoint(entry, position);
    const anchorIndex = this.state.anchorIndex ?? caretIndex;
    const range = this.createRange(anchorIndex, caretIndex);

    // Always update state during drag to ensure real-time highlighting
    const nextState: TextSelectionState = {
      elementId: entry.elementId,
      anchorIndex,
      focusIndex: caretIndex,
      range,
      isPointerDown: true,
      hasSelection: range !== null && range.start !== range.end
    };

    console.log('[TextSelectionController] Update selection:', nextState);
    return this.updateState(nextState);
  }

  finalizeSelection(): TextSelectionState {
    if (!this.pointerActive) {
      return this.state;
    }

    this.pointerActive = false;
    const finalState = {
      ...this.state,
      isPointerDown: false,
      hasSelection:
        this.state.range !== null &&
        this.state.range.start !== this.state.range.end
    };

    console.log('[TextSelectionController] Finalize selection:', finalState);
    return this.updateState(finalState);
  }

  moveSelectionWithKeyboard(
    entry: TextInteractionEntry,
    direction: 'left' | 'right' | 'up' | 'down',
    extendSelection: boolean
  ): TextSelectionState {
    const metrics = entry.metrics?.css;
    if (!metrics || !metrics.lines.length) {
      return this.state;
    }

    const maxCaretIndex = metrics.lines[metrics.lines.length - 1]?.endIndex ?? 0;
    const currentState = this.state;
    let focusIndex = currentState.focusIndex ?? currentState.anchorIndex ?? 0;
    let anchorIndex = currentState.anchorIndex ?? focusIndex;
    const hasRange =
      currentState.range !== null &&
      currentState.range.start !== currentState.range.end;

    let collapseOnly = false;
    if (!extendSelection && hasRange && currentState.range) {
      if (direction === 'left' || direction === 'up') {
        focusIndex = currentState.range.start;
      } else {
        focusIndex = currentState.range.end;
      }
      anchorIndex = focusIndex;
      collapseOnly = true;
    }

    if (extendSelection && currentState.anchorIndex === null) {
      anchorIndex = focusIndex;
    }

    let nextFocus = focusIndex;
    if (!collapseOnly) {
      switch (direction) {
        case 'left':
          nextFocus = Math.max(0, focusIndex - 1);
          break;
        case 'right':
          nextFocus = Math.min(maxCaretIndex, focusIndex + 1);
          break;
        case 'up':
          nextFocus = this.moveCaretVertically(entry, focusIndex, -1);
          break;
        case 'down':
          nextFocus = this.moveCaretVertically(entry, focusIndex, 1);
          break;
        default:
          break;
      }
    }

    const nextAnchor = extendSelection ? anchorIndex : nextFocus;
    this.pointerActive = false;
    this.activeEntry = entry;

    const range = this.createRange(nextAnchor, nextFocus);
    const hasSelection = range !== null && range.start !== range.end;

    return this.updateState({
      elementId: entry.elementId,
      anchorIndex: nextAnchor,
      focusIndex: nextFocus,
      range,
      isPointerDown: false,
      hasSelection
    });
  }

  /** Sets an exact keyboard-owned selection without approximating it through pointer coordinates. */
  setSelection(entry: TextInteractionEntry, anchorIndex: number, focusIndex: number): TextSelectionState {
    const textLength = entry.text?.length ?? 0;
    const anchor = clamp(anchorIndex, 0, textLength);
    const focus = clamp(focusIndex, 0, textLength);
    const range = this.createRange(anchor, focus);

    this.pointerActive = false;
    this.activeEntry = entry;
    return this.updateState({
      elementId: entry.elementId,
      anchorIndex: anchor,
      focusIndex: focus,
      range,
      isPointerDown: false,
      hasSelection: range !== null && range.start !== range.end
    });
  }

  cancelSelection(): TextSelectionState {
    if (!this.pointerActive) {
      return this.state;
    }

    this.pointerActive = false;
    return this.updateState({
      ...this.state,
      isPointerDown: false
    });
  }

  clearSelection(): TextSelectionState {
    this.pointerActive = false;
    this.activeEntry = undefined;
    return this.updateState({ ...DEFAULT_STATE });
  }

  getCaretIndexForPoint(entry: TextInteractionEntry, position: CssPoint): number {
    const metrics = entry.metrics?.css;
    if (!metrics || !metrics.lines.length) {
      return 0;
    }

    const totalWidth = this.resolveTotalWidth(metrics.characters, metrics.totalWidth);

    const lines = metrics.lines;
    const minTop = lines.reduce((min, line) => Math.min(min, line.top), Infinity);
    const maxBottom = lines.reduce((max, line) => Math.max(max, line.bottom), -Infinity);
    const adjustedY = clamp(position.y + minTop, minTop, maxBottom);

    let targetLine = lines[0];
    for (const line of lines) {
      if (adjustedY <= line.bottom) {
        targetLine = line;
        break;
      }
      targetLine = line;
    }

    const lineOffset = this.resolveLineOffset(entry, targetLine, totalWidth);
    const lineWidth = targetLine.width ?? totalWidth;
    const relativeX = clamp(position.x - lineOffset, 0, lineWidth);

    const lineCharacters = metrics.characters.filter(
      (character) => character.lineIndex === targetLine.index && !character.isLineBreak
    );

    if (!lineCharacters.length) {
      return targetLine.startIndex;
    }

    if (relativeX <= 0) {
      return targetLine.startIndex;
    }

    for (const character of lineCharacters) {
      const nextBoundary = character.x + character.advance;
      if (relativeX <= nextBoundary) {
        const widthForComparison = character.width || character.advance;
        const midpoint = character.x + widthForComparison / 2;
        const result = relativeX < midpoint ? character.index : character.index + 1;
        console.log('[Selection] getCaretIndexForPoint', {
          position,
          lineIndex: targetLine.index,
          relativeX,
          character: entry.text?.[character.index],
          characterIndex: character.index,
          result
        });
        return result;
      }
    }

    console.log('[Selection] getCaretIndexForPoint - end of line', {
      position,
      lineIndex: targetLine.index,
      result: targetLine.endIndex
    });
    return targetLine.endIndex;
  }

  private resolveTotalWidth(characters: Array<{ x: number; advance: number }>, fallback: number): number {
    if (fallback > 0) {
      return fallback;
    }

    let max = 0;
    for (const character of characters) {
      const rightEdge = character.x + character.advance;
      if (rightEdge > max) {
        max = rightEdge;
      }
    }
    return max;
  }

  private resolveLineOffset(entry: TextInteractionEntry, line: { width: number }, totalWidth: number): number {
    const textAlign = entry.style?.textAlign?.toLowerCase() ?? 'left';
    const lineWidth = line.width ?? totalWidth;

    switch (textAlign) {
      case 'center':
      case 'middle':
        return Math.max(0, (totalWidth - lineWidth) / 2);
      case 'right':
        return Math.max(0, totalWidth - lineWidth);
      default:
        return 0;
    }
  }

  private createRange(anchor: number | null, focus: number | null): TextSelectionRange | null {
    if (anchor === null || focus === null) {
      return null;
    }

    const start = Math.min(anchor, focus);
    const end = Math.max(anchor, focus);
    console.log(`[TextSelectionController] createRange: anchor=${anchor}, focus=${focus} -> start=${start}, end=${end}`);
    return { start, end };
  }

  private moveCaretVertically(entry: TextInteractionEntry, currentIndex: number, deltaLine: number): number {
    const metrics = entry.metrics?.css;
    if (!metrics || !metrics.lines.length) {
      return currentIndex;
    }

    const { line, caretX, minTop } = this.resolveCaretContext(entry, currentIndex);
    if (!line) {
      return currentIndex;
    }

    const targetLineIndex = line.index + deltaLine;
    if (targetLineIndex < 0) {
      return 0;
    }

    if (targetLineIndex >= metrics.lines.length) {
      const lastLine = metrics.lines[metrics.lines.length - 1];
      return lastLine?.endIndex ?? currentIndex;
    }

    const targetLine = metrics.lines[targetLineIndex];
    const lineCenter = (targetLine.top + targetLine.bottom) / 2;
    const cssPoint = {
      x: caretX,
      y: lineCenter - minTop
    };

    return this.getCaretIndexForPoint(entry, cssPoint);
  }

  private resolveCaretContext(
    entry: TextInteractionEntry,
    caretIndex: number
  ): { line?: { index: number; top: number; bottom: number }; caretX: number; minTop: number } {
    const metrics = entry.metrics?.css;
    if (!metrics || !metrics.lines.length) {
      return { caretX: 0, minTop: 0 };
    }

    const totalWidth = this.resolveTotalWidth(metrics.characters, metrics.totalWidth);
    const minTop = metrics.lines.reduce((min, line) => Math.min(min, line.top), Infinity);

    let targetLine = metrics.lines[metrics.lines.length - 1];
    for (const line of metrics.lines) {
      if (caretIndex <= line.endIndex) {
        targetLine = line;
        break;
      }
    }

    const lineCharacters = metrics.characters.filter(
      (character) => character.lineIndex === targetLine.index && !character.isLineBreak
    );

    const relativePosition = this.resolveCaretPositionWithinLine(caretIndex, targetLine, lineCharacters);
    const lineOffset = this.resolveLineOffset(entry, targetLine, totalWidth);
    const caretX = clamp(relativePosition + lineOffset, 0, totalWidth);

    return { line: targetLine, caretX, minTop: Number.isFinite(minTop) ? minTop : 0 };
  }

  private resolveCaretPositionWithinLine(
    index: number,
    line: { startIndex: number; endIndex: number },
    lineCharacters: Array<{ index: number; x: number; advance: number }>
  ): number {
    if (!lineCharacters.length || index <= line.startIndex) {
      return 0;
    }

    if (index >= line.endIndex) {
      const last = lineCharacters[lineCharacters.length - 1];
      return last.x + last.advance;
    }

    const exact = lineCharacters.find((character) => character.index === index);
    if (exact) {
      return exact.x;
    }

    const preceding = this.findPrecedingCharacter(index, lineCharacters);
    return preceding ? preceding.x + preceding.advance : 0;
  }

  private findPrecedingCharacter(
    targetIndex: number,
    characters: Array<{ index: number; x: number; advance: number }>
  ): { index: number; x: number; advance: number } | undefined {
    for (let i = characters.length - 1; i >= 0; i -= 1) {
      const candidate = characters[i];
      if (candidate.index < targetIndex) {
        return candidate;
      }
    }
    return undefined;
  }

  private updateState(nextState: TextSelectionState): TextSelectionState {
    console.log('[TextSelectionController] Updating state:', nextState);
    this.state = nextState;
    this.stateSubject.next(this.state);
    return this.state;
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
