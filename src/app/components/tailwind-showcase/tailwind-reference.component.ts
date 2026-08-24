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
  template: '<div #host class="reference-host" data-testid="tailwind-reference"></div>',
  styles: `
    :host,
    .reference-host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .reference-host {
      overflow: hidden;
      background: #020617;
      color: #f1f5f9;
      font-family: Arial, sans-serif;
      font-size: 16px;
    }
  `,
})
export class TailwindReferenceComponent {
  readonly nodes = input.required<readonly DOMElement[]>();

  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  constructor() {
    afterNextRender(() => {
      effect(() => this.render(this.nodes()), { injector: this.injector });
    });
  }

  private render(nodes: readonly DOMElement[]): void {
    const host = this.host().nativeElement;
    host.replaceChildren(...nodes.map((node) => this.createElement(node)));
  }

  private createElement(node: DOMElement): HTMLElement {
    const element = this.document.createElement(node.type);
    if (node.id) {
      element.id = this.referenceId(node.id);
      element.dataset['showcaseId'] = node.id;
    }
    if (node.class) element.className = node.class;
    if (node.title) element.title = node.title;
    if (node.role) element.setAttribute('role', node.role);
    if (node.ariaLabel) element.setAttribute('aria-label', node.ariaLabel);

    if (element instanceof HTMLLabelElement && node.for) {
      element.htmlFor = this.referenceId(node.for);
    }
    if (element instanceof HTMLButtonElement) {
      element.type = 'button';
      element.disabled = node.disabled ?? false;
      element.textContent = node.value ?? node.textContent ?? '';
    } else if (element instanceof HTMLInputElement) {
      element.type = node.inputType ?? 'text';
      element.value = node.value ?? '';
      element.placeholder = node.placeholder ?? '';
      element.checked = node.checked ?? false;
      element.disabled = node.disabled ?? false;
    } else if (element instanceof HTMLSelectElement) {
      element.disabled = node.disabled ?? false;
      for (const option of node.options ?? []) {
        const optionElement = this.document.createElement('option');
        optionElement.value = String(option.value);
        optionElement.textContent = option.label;
        optionElement.disabled = option.disabled ?? false;
        optionElement.selected = String(option.value) === String(node.value ?? '');
        element.append(optionElement);
      }
    } else if (node.textContent) {
      element.textContent = node.textContent;
    }

    for (const child of node.children ?? []) {
      element.append(this.createElement(child));
    }
    return element;
  }

  private referenceId(id: string): string {
    return `reference-${id}`;
  }
}
