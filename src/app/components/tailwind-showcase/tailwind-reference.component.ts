import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import type { DOMElement } from '../../../lib';

/** Renders the shared showcase model as ordinary browser elements. */
@Component({
  selector: 'app-tailwind-reference',
  template: `
    <iframe
      #frame
      data-testid="tailwind-reference"
      title="Browser and Tailwind reference rendering"
      [style.width.px]="width()"
      [style.height.px]="height()"
    ></iframe>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    iframe {
      display: block;
      border: 0;
      background: #020617;
    }
  `,
})
export class TailwindReferenceComponent {
  readonly nodes = input.required<readonly DOMElement[]>();
  readonly width = input.required<number>();
  readonly height = input.required<number>();

  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly frame = viewChild.required<ElementRef<HTMLIFrameElement>>('frame');

  constructor() {
    afterNextRender(() => {
      effect(() => this.render(this.nodes()), { injector: this.injector });
    });
  }

  private render(nodes: readonly DOMElement[]): void {
    const frameDocument = this.frame().nativeElement.contentDocument;
    if (!frameDocument) return;

    const style = frameDocument.createElement('style');
    style.textContent = this.hostStyleText();
    frameDocument.head.replaceChildren(style);
    frameDocument.body.replaceChildren(...nodes.map((node) => this.createElement(frameDocument, node)));
  }

  private hostStyleText(): string {
    return Array.from(this.document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules, (rule) => rule.cssText);
        } catch {
          return [];
        }
      })
      .join('\n');
  }

  private createElement(document: Document, node: DOMElement): HTMLElement {
    const element = document.createElement(node.type);
    if (node.id) {
      element.id = this.referenceId(node.id);
      element.dataset['showcaseId'] = node.id;
    }
    if (node.class) element.className = node.class;
    if (node.title) element.title = node.title;
    if (node.role) element.setAttribute('role', node.role);
    if (node.ariaLabel) element.setAttribute('aria-label', node.ariaLabel);

    if (node.type === 'label' && node.for) {
      (element as HTMLLabelElement).htmlFor = this.referenceId(node.for);
    }
    if (node.type === 'button') {
      const button = element as HTMLButtonElement;
      button.type = 'button';
      button.disabled = node.disabled ?? false;
      button.textContent = node.value ?? node.textContent ?? '';
    } else if (node.type === 'input') {
      const input = element as HTMLInputElement;
      input.type = node.inputType ?? 'text';
      input.value = node.value ?? '';
      input.placeholder = node.placeholder ?? '';
      input.checked = node.checked ?? false;
      input.disabled = node.disabled ?? false;
    } else if (node.type === 'select') {
      const select = element as HTMLSelectElement;
      select.disabled = node.disabled ?? false;
      for (const option of node.options ?? []) {
        const optionElement = document.createElement('option');
        optionElement.value = String(option.value);
        optionElement.textContent = option.label;
        optionElement.disabled = option.disabled ?? false;
        optionElement.selected = String(option.value) === String(node.value ?? '');
        select.append(optionElement);
      }
    } else if (node.textContent) {
      element.textContent = node.textContent;
    }

    for (const child of node.children ?? []) {
      element.append(this.createElement(document, child));
    }
    return element;
  }

  private referenceId(id: string): string {
    return `reference-${id}`;
  }
}
