import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { TextSelectionClipboardService } from './text-selection-clipboard.service';
import { TextSelectionControllerService } from './text-selection-controller.service';
import { TextSelectionStore } from '../../../store/text-selection.store';

type KeyboardDirection = 'left' | 'right' | 'up' | 'down';

@Injectable({ providedIn: 'root' })
export class TextSelectionKeyboardService {
  private readonly document = inject(DOCUMENT, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly windowRef = this.document?.defaultView ?? window;

  private readonly keydownListener = (event: KeyboardEvent) => this.handleKeyDown(event);
  private readonly copyListener = (event: ClipboardEvent) => this.handleCopy(event);

  constructor(
    private readonly selectionStore: TextSelectionStore,
    private readonly selectionController: TextSelectionControllerService,
    private readonly clipboardService: TextSelectionClipboardService
  ) {
    if (this.document) {
      this.document.addEventListener('keydown', this.keydownListener, true);
      this.document.addEventListener('copy', this.copyListener, true);
      this.destroyRef.onDestroy(() => {
        this.document?.removeEventListener('keydown', this.keydownListener, true);
        this.document?.removeEventListener('copy', this.copyListener, true);
      });
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.shouldHandleEvent(event)) {
      return;
    }

    if (this.handleNavigation(event)) {
      return;
    }

    if (this.handleEscape(event)) {
      return;
    }
  }

  private shouldHandleEvent(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    if (this.isEditableTarget(target)) {
      return false;
    }

    // Astylar text controls render their editable value on a child text mesh.
    // When one is focused the browser event still targets the canvas, so the
    // DOM tag checks above cannot distinguish control editing from page-text
    // selection. Let the control keyboard handler own those events.
    const activeEntry = this.selectionStore.activeEntry();
    if (activeEntry?.mesh.parent?.metadata?.textInput?.focused) {
      return false;
    }

    return !!this.selectionStore.elementId();
  }

  private isEditableTarget(target: HTMLElement | null): boolean {
    if (!target) return false;
    const tagName = target.tagName?.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' ||
      target.getAttribute('role') === 'textbox' || target.isContentEditable;
  }

  private handleNavigation(event: KeyboardEvent): boolean {
    const key = event.key;
    const direction = this.mapKeyToDirection(key);
    if (!direction) {
      return false;
    }

    const entry = this.selectionStore.activeEntry();
    if (!entry) {
      return false;
    }

    const extend = event.shiftKey;
    this.selectionController.moveSelectionWithKeyboard(entry, direction, extend);
    event.preventDefault();
    event.stopPropagation();
    return true;
  }

  private mapKeyToDirection(key: string): KeyboardDirection | undefined {
    switch (key) {
      case 'ArrowLeft':
        return 'left';
      case 'ArrowRight':
        return 'right';
      case 'ArrowUp':
        return 'up';
      case 'ArrowDown':
        return 'down';
      default:
        return undefined;
    }
  }

  private handleCopy(event: ClipboardEvent): void {
    if (this.isEditableTarget(event.target as HTMLElement | null) ||
        !this.selectionStore.hasSelection()) return;
    void this.clipboardService.copySelectedText(event);
    event.preventDefault();
    event.stopPropagation();
  }

  private handleEscape(event: KeyboardEvent): boolean {
    if (event.key !== 'Escape') {
      return false;
    }

    if (!this.selectionStore.elementId()) {
      return false;
    }

    this.selectionStore.clearSelection();
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
}
