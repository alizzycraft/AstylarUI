import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  afterNextRender,
  inject,
  viewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { getParityFixture } from './fixtures';
import {
  getParityViewport,
  ParityElementMeasurement,
  ParityRect,
  ParityRuntimeReport
} from './parity.types';

@Component({
  selector: 'app-parity-reference',
  template: `<div #viewport id="parity-reference-viewport" [style.width.px]="parityViewport.width" [style.height.px]="parityViewport.height"></div>`,
  host: {
    '[style.width.px]': 'parityViewport.width',
    '[style.height.px]': 'parityViewport.height',
  },
  styles: `
    :host {
      display: block;
      overflow: hidden;
    }
  `
})
export class ParityReferenceComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly viewport = viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  protected readonly parityViewport = getParityViewport(
    this.route.snapshot.queryParamMap.get('viewport')
  );

  constructor() {
    afterNextRender(() => void this.initialize());
  }

  private async initialize(): Promise<void> {
    const fixtureId = this.route.snapshot.paramMap.get('fixtureId') ?? '';
    const fixture = getParityFixture(fixtureId);

    if (!fixture) {
      this.publishReport({
        ready: true,
        fixtureId,
        mode: 'reference',
        viewport: this.parityViewport,
        elements: {},
        errors: [`Unknown parity fixture: ${fixtureId}`]
      });
      return;
    }

    const viewport = this.viewport().nativeElement;
    viewport.innerHTML = `<style>${fixture.reference.css}</style>${fixture.reference.html}`;

    await this.document.fonts?.ready;
    await this.nextFrame();
    await this.nextFrame();

    const elements: Record<string, ParityElementMeasurement> = {};
    const errors: string[] = [];

    for (const id of fixture.measurementIds) {
      const element = viewport.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      if (!element) {
        errors.push(`Missing reference element: ${id}`);
        continue;
      }
      elements[id] = this.measureElement(element, viewport);
    }

    for (const id of fixture.expectedAbsentIds ?? []) {
      const element = viewport.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      if (!element) {
        errors.push(`Missing expected hidden reference element: ${id}`);
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (getComputedStyle(element).display !== 'none' || rect.width !== 0 || rect.height !== 0) {
        errors.push(`Reference element expected display:none: ${id}`);
      }
    }

    viewport.dataset['parityReady'] = 'true';
    this.publishReport({
      ready: true,
      fixtureId,
      mode: 'reference',
      viewport: this.parityViewport,
      elements,
      errors
    });
  }

  private measureElement(
    element: HTMLElement,
    viewport: HTMLElement
  ): ParityElementMeasurement {
    const viewportRect = viewport.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const computed = getComputedStyle(element);
    const borderBox = this.toRelativeRect(rect, viewportRect);

    const borderLeft = Number.parseFloat(computed.borderLeftWidth) || 0;
    const borderRight = Number.parseFloat(computed.borderRightWidth) || 0;
    const borderTop = Number.parseFloat(computed.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(computed.borderBottomWidth) || 0;
    const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
    const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;

    const contentBox: ParityRect = {
      left: borderBox.left + borderLeft + paddingLeft,
      top: borderBox.top + borderTop + paddingTop,
      right: borderBox.right - borderRight - paddingRight,
      bottom: borderBox.bottom - borderBottom - paddingBottom,
      width: Math.max(
        0,
        borderBox.width - borderLeft - borderRight - paddingLeft - paddingRight
      ),
      height: Math.max(
        0,
        borderBox.height - borderTop - borderBottom - paddingTop - paddingBottom
      )
    };

    const directTextNodes = this.getDirectTextNodes(element);
    const lineRects = this.getTextLineRects(directTextNodes);
    const textareaValue = element instanceof HTMLTextAreaElement ? element.value : undefined;
    const textContent = textareaValue ?? directTextNodes
      .map((node) => node.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    const lineCount = textareaValue !== undefined
      ? textareaValue.split(/\r?\n/).length
      : lineRects.length;

    return {
      id: element.id,
      borderBox,
      contentBox,
      styles: {
        display: computed.display,
        position: computed.position,
        boxSizing: computed.boxSizing,
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        borderTopWidth: computed.borderTopWidth,
        borderTopColor: computed.borderTopColor,
        borderRadius: computed.borderRadius,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        fontStyle: computed.fontStyle,
        lineHeight: computed.lineHeight,
        textAlign: computed.textAlign,
        whiteSpace: computed.whiteSpace,
        opacity: computed.opacity,
        zIndex: computed.zIndex
      },
      text: textContent ? { content: textContent, lineCount } : undefined
    };
  }

  private getDirectTextNodes(element: HTMLElement): Text[] {
    return Array.from(element.childNodes).filter(
      (node): node is Text =>
        node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim()
    );
  }

  private getTextLineRects(textNodes: Text[]): DOMRect[] {
    const rects = textNodes.flatMap((textNode) => {
      const range = this.document.createRange();
      range.selectNodeContents(textNode);
      const nodeRects = Array.from(range.getClientRects()).filter(
        (rect) => rect.width > 0 && rect.height > 0
      );
      range.detach();
      return nodeRects;
    });

    const lineTops: number[] = [];
    for (const rect of rects) {
      if (!lineTops.some((top) => Math.abs(top - rect.top) < 0.5)) {
        lineTops.push(rect.top);
      }
    }
    return lineTops.map((top) => new DOMRect(0, top, 0, 0));
  }

  private toRelativeRect(rect: DOMRect, viewport: DOMRect): ParityRect {
    return {
      left: rect.left - viewport.left,
      top: rect.top - viewport.top,
      right: rect.right - viewport.left,
      bottom: rect.bottom - viewport.top,
      width: rect.width,
      height: rect.height
    };
  }

  private nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  private publishReport(report: ParityRuntimeReport): void {
    window.__ASTYLAR_PARITY_REPORT__ = report;
  }
}
