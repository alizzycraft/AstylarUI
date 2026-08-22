import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { TextSelectionStore } from '../../../store/text-selection.store';

@Injectable({ providedIn: 'root' })
export class TextSelectionClipboardService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document?.defaultView ?? window;

  constructor(private readonly selectionStore: TextSelectionStore) {}

  async copySelectedText(event?: ClipboardEvent): Promise<boolean> {
    const text = this.selectionStore.selectedText();
    if (!text) {
      return false;
    }

    if (event?.clipboardData) {
      event.clipboardData.setData('text/plain', text);
      return true;
    }

    const navigatorRef = this.window?.navigator as Navigator | undefined;

    if (navigatorRef?.clipboard?.writeText) {
      try {
        await navigatorRef.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.warn('[Clipboard] Failed to write via navigator.clipboard, falling back.', error);
      }
    }

    if (!this.document?.body) {
      return false;
    }

    const textarea = this.document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.style.zIndex = '-1';

    this.document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();

    let succeeded = false;
    try {
      succeeded = this.document.execCommand('copy');
    } catch (error) {
      console.warn('[Clipboard] execCommand copy failed.', error);
    } finally {
      this.document.body.removeChild(textarea);
    }

    return succeeded;
  }
}
