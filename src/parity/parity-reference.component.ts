import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { getParityFixture } from './fixtures';
import {
  getParityViewport,
  PARITY_VIEWPORTS,
  ParityControlState,
  ParityElementMeasurement,
  ParityInteractionEventType,
  ParityNormalizedEvent,
  ParityReferenceMutation,
  ParityRect,
  ParityRuntimeReport,
  ParityViewport
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewport = viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  protected parityViewport = getParityViewport(
    this.route.snapshot.queryParamMap.get('viewport')
  );
  private revision = 0;
  private resizeGeneration = 0;
  private readonly interactionEvents: ParityNormalizedEvent[] = [];

  constructor() {
    afterNextRender(() => void this.initialize());
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', this.onWindowResize);
      delete window.__ASTYLAR_PARITY_SET_VIEWPORT__;
      delete window.__ASTYLAR_PARITY_APPLY_STEP__;
      delete window.__ASTYLAR_PARITY_INTERACTION_STEPS__;
      delete window.__ASTYLAR_PARITY_CAPTURE_INTERACTION__;
    });
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
    const interactionSequence = this.route.snapshot.queryParamMap.get('interaction') === 'true' &&
      !!fixture.interactionSteps?.length;
    if (interactionSequence) {
      this.installInteractionCapture(
        viewport,
        fixture.interactionEventTypes ?? [],
        fixture.interactionIds ?? [],
      );
      window.__ASTYLAR_PARITY_INTERACTION_STEPS__ = fixture.interactionSteps;
      window.__ASTYLAR_PARITY_CAPTURE_INTERACTION__ = async () => {
        await this.nextFrame();
        await this.nextFrame();
        this.publishCurrentReport(fixture, viewport);
      };
      if (fixture.dynamicSteps?.length) {
        window.__ASTYLAR_PARITY_APPLY_STEP__ = async (index, viewportId) => {
          const step = fixture.dynamicSteps?.[index];
          if (!step) throw new Error(`Unknown interaction update step: ${index}`);
          if (viewportId) this.setViewportBox(PARITY_VIEWPORTS[viewportId]);
          viewport.dataset['parityReady'] = 'false';
          this.applyReferenceStep(viewport, step.referenceMutations);
          await this.waitForImages(viewport);
          await this.nextFrame();
          await this.nextFrame();
        };
      }
    }
    const dynamicSequence = this.route.snapshot.queryParamMap.get('dynamic') === 'true' &&
      !!fixture.dynamicSteps?.length;
    const freshStep = Number.parseInt(
      this.route.snapshot.queryParamMap.get('dynamic-state') ?? '',
      10,
    );

    await this.document.fonts?.ready;
    if (dynamicSequence) {
      window.__ASTYLAR_PARITY_APPLY_STEP__ = async (index, viewportId) => {
        const step = fixture.dynamicSteps?.[index];
        if (!step) throw new Error(`Unknown dynamic step: ${index}`);
        if (viewportId) this.setViewportBox(PARITY_VIEWPORTS[viewportId]);
        viewport.dataset['parityReady'] = 'false';
        this.applyReferenceStep(viewport, step.referenceMutations);
        await this.waitForImages(viewport);
        await this.nextFrame();
        await this.nextFrame();
        this.publishCurrentReport(fixture, viewport);
      };
      return;
    }

    const steps = fixture.dynamicSteps ?? [];
    const lastStep = Number.isInteger(freshStep) ? freshStep : steps.length - 1;
    if (!interactionSequence) {
      for (let index = 0; index <= lastStep && index < steps.length; index++) {
        this.applyReferenceStep(viewport, steps[index].referenceMutations);
      }
    }
    await this.waitForImages(viewport);
    await this.nextFrame();
    await this.nextFrame();

    if (
      fixture.responsiveSequence &&
      this.route.snapshot.queryParamMap.get('responsive') === 'true'
    ) {
      window.addEventListener('resize', this.onWindowResize);
      window.__ASTYLAR_PARITY_SET_VIEWPORT__ = (id) =>
        this.applyResponsiveViewport(PARITY_VIEWPORTS[id]);
    }
    this.publishCurrentReport(fixture, viewport);
  }

  private applyReferenceStep(
    viewport: HTMLElement,
    mutations: ParityReferenceMutation[],
  ): void {
    for (const mutation of mutations) {
      const target = viewport.querySelector<HTMLElement>(
        `#${CSS.escape(mutation.elementId)}`
      );
      if (!target) {
        throw new Error(`Missing reference mutation target: ${mutation.elementId}`);
      }
      switch (mutation.type) {
        case 'set-text':
          target.textContent = mutation.textContent;
          break;
        case 'set-value':
          if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
            throw new Error(`Reference value target is not a control: ${mutation.elementId}`);
          }
          target.value = mutation.value;
          break;
        case 'set-style':
          target.style.setProperty(mutation.property, mutation.value);
          break;
        case 'set-children':
          target.innerHTML = mutation.html;
          break;
        case 'set-source':
          if (!(target instanceof HTMLImageElement)) {
            throw new Error(`Reference source target is not an image: ${mutation.elementId}`);
          }
          target.src = mutation.source;
          break;
        case 'remove-element':
          target.remove();
          break;
      }
    }
  }

  private readonly onWindowResize = (): void => {
    const viewport = Object.values(PARITY_VIEWPORTS).find(
      (candidate) => candidate.width === window.innerWidth
    );
    if (!viewport) return;
    this.applyResponsiveViewport(viewport);
  };

  private applyResponsiveViewport(viewport: ParityViewport): void {
    this.setViewportBox(viewport);
    const element = this.viewport().nativeElement;
    const fixtureId = this.route.snapshot.paramMap.get('fixtureId') ?? '';
    const fixture = getParityFixture(fixtureId);
    if (!fixture) return;
    const generation = ++this.resizeGeneration;
    void this.publishAfterLayout(generation, fixture, element);
  }

  private setViewportBox(viewport: ParityViewport): void {
    this.parityViewport = viewport;
    const element = this.viewport().nativeElement;
    element.style.width = `${viewport.width}px`;
    element.style.height = `${viewport.height}px`;
    if (element.parentElement) {
      element.parentElement.style.width = `${viewport.width}px`;
      element.parentElement.style.height = `${viewport.height}px`;
    }
  }

  private async publishAfterLayout(
    generation: number,
    fixture: NonNullable<ReturnType<typeof getParityFixture>>,
    viewport: HTMLDivElement
  ): Promise<void> {
    await this.nextFrame();
    await this.nextFrame();
    if (generation !== this.resizeGeneration) return;
    this.publishCurrentReport(fixture, viewport);
  }

  private publishCurrentReport(
    fixture: NonNullable<ReturnType<typeof getParityFixture>>,
    viewport: HTMLDivElement
  ): void {
    const elements: Record<string, ParityElementMeasurement> = {};
    const errors: string[] = [];

    for (const id of fixture.measurementIds) {
      const element = viewport.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      if (!element) {
        if (!fixture.optionalMeasurementIds?.includes(id)) {
          errors.push(`Missing reference element: ${id}`);
        }
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

    for (const id of fixture.expectedMissingIds ?? []) {
      if (viewport.querySelector(`#${CSS.escape(id)}`)) {
        errors.push(`Reference element expected to be removed: ${id}`);
      }
    }

    viewport.dataset['parityReady'] = 'true';
    this.publishReport({
      ready: true,
      fixtureId: fixture.id,
      mode: 'reference',
      viewport: this.parityViewport,
      revision: ++this.revision,
      elements,
      errors,
      interaction: fixture.interactionSteps?.length
        ? {
            events: [...this.interactionEvents],
            focusedElementId: this.getFocusedElementId(viewport),
            controls: this.measureControls(viewport, fixture.interactionIds ?? []),
            scrollContainers: this.measureScrollContainers(viewport, fixture.scrollIds ?? []),
          }
        : undefined,
    });
  }

  private installInteractionCapture(
    viewport: HTMLElement,
    eventTypes: ParityInteractionEventType[],
    targetIds: string[],
  ): void {
    const allowedTargets = new Set(targetIds);
    for (const type of eventTypes) {
      viewport.addEventListener(type, (event) => {
        const target = event.target instanceof HTMLElement ? event.target : undefined;
        if (!target?.id || !allowedTargets.has(target.id)) return;
        const pointer = event instanceof PointerEvent ? event : undefined;
        const keyboard = event instanceof KeyboardEvent ? event : undefined;
        const control = target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
          ? target
          : undefined;
        this.interactionEvents.push({
          type,
          targetId: target.id,
          currentTargetId: target.id,
          defaultPrevented: event.defaultPrevented,
          value: control?.value,
          checked: control instanceof HTMLInputElement &&
            (control.type === 'checkbox' || control.type === 'radio')
            ? control.checked
            : undefined,
          selectedValue: control instanceof HTMLSelectElement ? control.value : undefined,
          key: keyboard?.key,
          code: keyboard?.code,
          shiftKey: keyboard?.shiftKey,
          ctrlKey: keyboard?.ctrlKey,
          altKey: keyboard?.altKey,
          metaKey: keyboard?.metaKey,
          button: pointer?.button,
          pointerType: pointer?.pointerType,
        });
        // Keep the parity page measurable after observing an otherwise-uncancelled
        // browser submission. Record first so defaultPrevented still reflects the
        // application-visible event state at this boundary.
        if (type === 'submit') event.preventDefault();
      }, type === 'focus' || type === 'blur' || type === 'invalid' ||
        type === 'pointerenter' || type === 'pointerleave');
    }
  }

  private getFocusedElementId(viewport: HTMLElement): string | undefined {
    const active = this.document.activeElement;
    return active instanceof HTMLElement && viewport.contains(active) && active.id
      ? active.id
      : undefined;
  }

  private measureControls(
    viewport: HTMLElement,
    ids: string[],
  ): Record<string, ParityControlState> {
    const controls: Record<string, ParityControlState> = {};
    for (const id of ids) {
      const control = viewport.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `#${CSS.escape(id)}`,
      );
      if (!(control instanceof HTMLInputElement) &&
          !(control instanceof HTMLTextAreaElement) &&
          !(control instanceof HTMLSelectElement)) continue;
      controls[id] = {
        type: control instanceof HTMLInputElement ? control.type : control.tagName.toLowerCase(),
        value: control.value,
        checked: control instanceof HTMLInputElement &&
          (control.type === 'checkbox' || control.type === 'radio')
          ? control.checked
          : undefined,
        selectedIndex: control instanceof HTMLSelectElement ? control.selectedIndex : undefined,
        selectedValue: control instanceof HTMLSelectElement ? control.value : undefined,
        disabled: control.disabled,
        focused: this.document.activeElement === control,
        selectionStart: control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement
          ? control.selectionStart ?? undefined
          : undefined,
        selectionEnd: control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement
          ? control.selectionEnd ?? undefined
          : undefined,
        cursorPosition: control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement
          ? control.selectionDirection === 'backward'
            ? control.selectionStart ?? undefined
            : control.selectionEnd ?? undefined
          : undefined,
        scrollLeft: control instanceof HTMLTextAreaElement ||
          (control instanceof HTMLInputElement && ['text', 'password', 'email', 'number'].includes(control.type))
          ? control.scrollLeft
          : undefined,
        scrollTop: control instanceof HTMLTextAreaElement ? control.scrollTop : undefined,
      };
    }
    return controls;
  }

  private measureScrollContainers(
    viewport: HTMLElement,
    ids: string[],
  ): Record<string, import('./parity.types').ParityScrollState> {
    const containers: Record<string, import('./parity.types').ParityScrollState> = {};
    for (const id of ids) {
      const matches = viewport.querySelectorAll<HTMLElement>(`#${CSS.escape(id)}`);
      if (matches.length !== 1) continue;
      const element = matches[0];
      const computed = getComputedStyle(element);
      if (computed.overflow !== 'auto' && computed.overflow !== 'scroll') continue;
      containers[id] = {
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
      };
    }
    return containers;
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

  private async waitForImages(viewport: HTMLElement): Promise<void> {
    await Promise.all(
      Array.from(viewport.querySelectorAll('img')).map(async (image) => {
        if (image.complete) return;
        await new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      })
    );
  }

  private publishReport(report: ParityRuntimeReport): void {
    window.__ASTYLAR_PARITY_REPORT__ = report;
  }
}
