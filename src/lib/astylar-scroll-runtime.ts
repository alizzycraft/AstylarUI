import {
  Mesh,
} from '@babylonjs/core';
import type { DOMElement } from '../app/types/dom-element';
import type { SiteData } from '../app/types/site-data';
import type { StyleRule } from '../app/types/style-rule';
import type { CssLayoutNode, CssPoint, CssRect } from '../app/services/coordinate-space.types';
import {
  resolveCssRectRelativeToAncestor,
  resolveCssViewportRect,
} from '../app/services/css-layout-geometry';

export interface AstylarScrollState {
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
}

export interface AstylarScrollSnapshot {
  containers: Record<string, AstylarScrollState>;
  disposed: boolean;
}

interface ScrollContainer extends AstylarScrollState {
  id: string;
  mesh: Mesh;
  roots: Array<{ mesh: Mesh; borderBox: CssRect }>;
  borderWidth: number;
  verticalScrollbar?: ScrollbarVisual;
  horizontalScrollbar?: ScrollbarVisual;
}

interface ScrollbarVisual extends AstylarScrollbarPaint {
  trackBox: CssRect;
  thumbBox: CssRect;
  containerSize: { width: number; height: number };
  travel: number;
}

export interface AstylarScrollbarPaint {
  track: Mesh;
  thumb: Mesh;
  axis: 'horizontal' | 'vertical';
}

export interface AstylarScrollPaintAdapter {
  positionContent(
    mesh: Mesh,
    borderBox: CssRect,
    containerSize: { width: number; height: number },
    scrollOffset: CssPoint,
  ): void;
  createScrollbar(
    container: Mesh,
    containerId: string,
    axis: 'horizontal' | 'vertical',
    trackBox: CssRect,
    thumbBox: CssRect,
    containerSize: { width: number; height: number },
  ): AstylarScrollbarPaint;
  positionScrollbarThumb(
    visual: AstylarScrollbarPaint,
    thumbBox: CssRect,
    containerSize: { width: number; height: number },
  ): void;
  disposeScrollbar(visual: AstylarScrollbarPaint): void;
}

interface ElementDimensions {
  width: number;
  height: number;
  padding?: { top: number; right: number; bottom: number; left: number };
}

export interface AstylarScrollRuntimeOptions {
  getMesh(elementId: string): Mesh | undefined;
  getDimensions(elementId: string): ElementDimensions | undefined;
  getLayoutBoxes(): ReadonlyMap<string, CssLayoutNode>;
  getStyle(elementId: string): StyleRule | undefined;
  resolveStyle?(element: DOMElement, siteData: SiteData): StyleRule | undefined;
  paint: AstylarScrollPaintAdapter;
  refreshClipping?(entries: ReadonlyArray<{ mesh: Mesh; style: StyleRule }>): void;
}

/** Owns scroll-container state and content transforms for one Astylar scene. */
export class AstylarScrollRuntime {
  private containers = new Map<string, ScrollContainer>();
  private parentIds = new Map<string, string>();
  private clipEntries: Array<{ mesh: Mesh; style: StyleRule }> = [];
  private disposed = false;

  constructor(private readonly options: AstylarScrollRuntimeOptions) {}

  get snapshot(): AstylarScrollSnapshot {
    const containers: Record<string, AstylarScrollState> = {};
    for (const [id, state] of this.containers) {
      containers[id] = this.publicState(state);
    }
    return { containers, disposed: this.disposed };
  }

  reconcile(
    siteData: SiteData,
    preserved: Record<string, AstylarScrollState> = {},
  ): void {
    if (this.disposed) return;
    for (const container of this.containers.values()) this.disposeScrollbars(container);
    this.containers.clear();
    this.parentIds.clear();
    this.clipEntries = [];

    const counts = new Map<string, number>();
    const visit = (element: DOMElement, parentId?: string): void => {
      if (element.id) {
        counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
        if (parentId) this.parentIds.set(element.id, parentId);
      }
      const nextParentId = element.id ?? parentId;
      element.children?.forEach((child) => visit(child, nextParentId));
    };
    siteData.root.children.forEach((element) => visit(element));

    const register = (element: DOMElement): void => {
      const id = element.id;
      const style = this.options.resolveStyle?.(element, siteData) ??
        (id ? this.options.getStyle(id) : undefined);
      const overflow = element.style?.overflow ?? style?.overflow;
      const mesh = id && counts.get(id) === 1 ? this.options.getMesh(id) : undefined;
      if (mesh && style && (overflow === 'hidden' || overflow === 'clip' ||
          overflow === 'auto' || overflow === 'scroll')) {
        this.clipEntries.push({ mesh, style: { ...style, overflow } });
      }
      if (id && counts.get(id) === 1 && (overflow === 'auto' || overflow === 'scroll')) {
        const container = this.createContainer(element, style);
        if (container) {
          const previous = preserved[id];
          container.scrollLeft = this.clamp(previous?.scrollLeft ?? 0, 0,
            Math.max(0, container.scrollWidth - container.clientWidth));
          container.scrollTop = this.clamp(previous?.scrollTop ?? 0, 0,
            Math.max(0, container.scrollHeight - container.clientHeight));
          if (overflow === 'scroll') this.createScrollbars(container);
          this.containers.set(id, container);
          this.applyOffset(container);
        }
      }
      element.children?.forEach(register);
    };
    siteData.root.children.forEach(register);
    this.refreshClipping();
  }

  scrollFrom(elementId: string, deltaX: number, deltaY: number): boolean {
    if (this.disposed) return false;
    let currentId: string | undefined = elementId;
    while (currentId) {
      const container = this.containers.get(currentId);
      if (container) {
        const nextLeft = this.clamp(
          container.scrollLeft + deltaX,
          0,
          Math.max(0, container.scrollWidth - container.clientWidth),
        );
        const nextTop = this.clamp(
          container.scrollTop + deltaY,
          0,
          Math.max(0, container.scrollHeight - container.clientHeight),
        );
        if (nextLeft !== container.scrollLeft || nextTop !== container.scrollTop) {
          container.scrollLeft = nextLeft;
          container.scrollTop = nextTop;
          this.applyOffset(container);
          this.refreshClipping();
          return true;
        }
      }
      currentId = this.parentIds.get(currentId);
    }
    return false;
  }

  isPointVisible(elementId: string, point?: CssPoint): boolean {
    if (!point) return true;
    let currentId = this.parentIds.get(elementId);
    while (currentId) {
      const container = this.containers.get(currentId);
      if (container) {
        const rect = this.visualViewportRect(currentId);
        if (!rect || point.x < rect.x || point.x > rect.x + rect.width ||
            point.y < rect.y || point.y > rect.y + rect.height) {
          return false;
        }
      }
      currentId = this.parentIds.get(currentId);
    }
    return true;
  }

  /** Resolves retained element geometry into the canvas CSS viewport. */
  getViewportRect(elementId: string): CssRect | undefined {
    const rect = resolveCssViewportRect(elementId, this.options.getLayoutBoxes());
    if (!rect) return undefined;
    let x = rect.x;
    let y = rect.y;
    let currentId = this.parentIds.get(elementId);
    while (currentId) {
      const ancestor = this.containers.get(currentId);
      if (ancestor) {
        x -= ancestor.scrollLeft;
        y -= ancestor.scrollTop;
      }
      currentId = this.parentIds.get(currentId);
    }
    return { ...rect, x, y };
  }

  /** Aligns a fragment destination to each scrollable ancestor's start edge. */
  scrollIntoView(elementId: string, alignment: 'start' | 'nearest' = 'start'): boolean {
    if (this.disposed) return false;
    if (!this.options.getLayoutBoxes().has(elementId)) return false;
    const ancestors: ScrollContainer[] = [];
    let currentId = this.parentIds.get(elementId);
    while (currentId) {
      const container = this.containers.get(currentId);
      if (container) ancestors.push(container);
      currentId = this.parentIds.get(currentId);
    }
    let changed = false;
    for (const container of ancestors) {
      const targetRect = this.rectInScrollableContent(elementId, container.id);
      if (!targetRect) continue;
      const viewportLeft = container.borderWidth + container.scrollLeft;
      const viewportTop = container.borderWidth + container.scrollTop;
      const viewportRight = viewportLeft + container.clientWidth;
      const viewportBottom = viewportTop + container.clientHeight;
      const horizontallyVisible = targetRect.x >= viewportLeft &&
        targetRect.x + targetRect.width <= viewportRight;
      const verticallyVisible = targetRect.y >= viewportTop &&
        targetRect.y + targetRect.height <= viewportBottom;
      const desiredLeft = alignment === 'start' || targetRect.x < viewportLeft
        ? targetRect.x - container.borderWidth
        : targetRect.x + targetRect.width - container.borderWidth - container.clientWidth;
      const desiredTop = alignment === 'start' || targetRect.y < viewportTop
        ? targetRect.y - container.borderWidth
        : targetRect.y + targetRect.height - container.borderWidth - container.clientHeight;
      const nextLeft = this.clamp(
        alignment === 'nearest' && horizontallyVisible ? container.scrollLeft : desiredLeft,
        0,
        Math.max(0, container.scrollWidth - container.clientWidth),
      );
      const nextTop = this.clamp(
        alignment === 'nearest' && verticallyVisible ? container.scrollTop : desiredTop,
        0,
        Math.max(0, container.scrollHeight - container.clientHeight),
      );
      if (nextLeft === container.scrollLeft && nextTop === container.scrollTop) continue;
      container.scrollLeft = nextLeft;
      container.scrollTop = nextTop;
      this.applyOffset(container);
      changed = true;
    }
    if (changed) this.refreshClipping();
    return changed;
  }

  dispose(): void {
    this.disposed = true;
    for (const container of this.containers.values()) this.disposeScrollbars(container);
    this.containers.clear();
    this.parentIds.clear();
    this.clipEntries = [];
  }

  private createContainer(element: DOMElement, style?: StyleRule): ScrollContainer | undefined {
    const id = element.id;
    if (!id) return undefined;
    const mesh = this.options.getMesh(id);
    const dimensions = this.options.getDimensions(id);
    if (!mesh || !dimensions) return undefined;
    const layoutBoxes = this.options.getLayoutBoxes();
    if (!layoutBoxes.has(id)) return undefined;
    const roots = (element.children ?? [])
      .map((child) => this.findDirectChildMesh(mesh, child))
      .filter((child): child is Mesh => !!child)
      .map((child) => ({
        mesh: child,
        borderBox: layoutBoxes.get(child.name)?.box.borderBox,
      }))
      .filter((root): root is { mesh: Mesh; borderBox: CssRect } => !!root.borderBox);

    let maxX = 0;
    let maxY = 0;
    for (const candidateId of layoutBoxes.keys()) {
      const rect = resolveCssRectRelativeToAncestor(candidateId, id, layoutBoxes);
      if (!rect) continue;
      maxX = Math.max(maxX, rect.x + rect.width);
      maxY = Math.max(maxY, rect.y + rect.height);
    }
    const borderWidth = style?.borderStyle && style.borderStyle !== 'none' &&
        style.borderStyle !== 'hidden'
      ? this.parsePixelLength(style.borderWidth)
      : 0;
    const borderBoxAdjustment = borderWidth * 2;
    const clientWidth = Math.max(0, dimensions.width - borderBoxAdjustment);
    const clientHeight = Math.max(0, dimensions.height - borderBoxAdjustment);
    const trailingPaddingX = dimensions.padding?.right ?? 0;
    const trailingPaddingY = dimensions.padding?.bottom ?? 0;
    const contentWidth = roots.length
      ? Math.max(0, maxX + trailingPaddingX - borderBoxAdjustment)
      : 0;
    const contentHeight = roots.length
      ? Math.max(0, maxY + trailingPaddingY - borderBoxAdjustment)
      : 0;
    return {
      id,
      mesh,
      roots,
      borderWidth,
      scrollLeft: 0,
      scrollTop: 0,
      scrollWidth: Math.max(clientWidth, contentWidth),
      scrollHeight: Math.max(clientHeight, contentHeight),
      clientWidth,
      clientHeight,
    };
  }

  private findDirectChildMesh(parent: Mesh, element: DOMElement): Mesh | undefined {
    if (element.id) {
      const mesh = this.options.getMesh(element.id);
      if (mesh?.parent === parent) return mesh;
    }
    return parent.getChildMeshes(true).find((mesh) =>
      mesh.parent === parent && mesh.metadata?.element === element,
    ) as Mesh | undefined;
  }

  private applyOffset(container: ScrollContainer): void {
    for (const root of container.roots) {
      this.options.paint.positionContent(
        root.mesh,
        root.borderBox,
        this.options.getDimensions(container.id)!,
        { x: container.scrollLeft, y: container.scrollTop },
      );
    }
    this.updateScrollbars(container);
  }

  private visualViewportRect(elementId: string): CssRect | undefined {
    const rect = resolveCssViewportRect(elementId, this.options.getLayoutBoxes());
    const container = this.containers.get(elementId);
    if (!rect || !container) return undefined;
    let x = rect.x + container.borderWidth;
    let y = rect.y + container.borderWidth;
    let currentId = this.parentIds.get(elementId);
    while (currentId) {
      const ancestor = this.containers.get(currentId);
      if (ancestor) {
        x -= ancestor.scrollLeft;
        y -= ancestor.scrollTop;
      }
      currentId = this.parentIds.get(currentId);
    }
    return { x, y, width: container.clientWidth, height: container.clientHeight };
  }

  private rectInScrollableContent(elementId: string, ancestorId: string): CssRect | undefined {
    const rect = resolveCssRectRelativeToAncestor(
      elementId,
      ancestorId,
      this.options.getLayoutBoxes(),
    );
    if (!rect) return undefined;
    let x = rect.x;
    let y = rect.y;
    let currentId = this.parentIds.get(elementId);
    while (currentId && currentId !== ancestorId) {
      const nested = this.containers.get(currentId);
      if (nested) {
        x -= nested.scrollLeft;
        y -= nested.scrollTop;
      }
      currentId = this.parentIds.get(currentId);
    }
    return { ...rect, x, y };
  }

  private createScrollbars(container: ScrollContainer): void {
    if (container.scrollHeight > container.clientHeight) {
      container.verticalScrollbar = this.createScrollbar(
        container,
        'vertical',
        container.clientHeight,
        container.scrollHeight,
      );
    }
    if (container.scrollWidth > container.clientWidth) {
      container.horizontalScrollbar = this.createScrollbar(
        container,
        'horizontal',
        container.clientWidth,
        container.scrollWidth,
      );
    }
  }

  private createScrollbar(
    container: ScrollContainer,
    axis: 'horizontal' | 'vertical',
    clientLength: number,
    scrollLength: number,
  ): ScrollbarVisual {
    const thickness = Math.min(12, clientLength);
    const thumbLength = Math.min(
      clientLength,
      Math.max(28, clientLength * clientLength / scrollLength),
    );
    const vertical = axis === 'vertical';
    const containerSize = this.options.getDimensions(container.id)!;
    const trackBox = vertical
      ? {
          x: container.borderWidth + container.clientWidth - thickness,
          y: container.borderWidth,
          width: thickness,
          height: clientLength,
        }
      : {
          x: container.borderWidth,
          y: container.borderWidth + container.clientHeight - thickness,
          width: clientLength,
          height: thickness,
        };
    const thumbBox = vertical
      ? {
          x: trackBox.x + (thickness - Math.max(8, thickness - 4)) / 2,
          y: trackBox.y,
          width: Math.max(8, thickness - 4),
          height: thumbLength,
        }
      : {
          x: trackBox.x,
          y: trackBox.y + (thickness - Math.max(8, thickness - 4)) / 2,
          width: thumbLength,
          height: Math.max(8, thickness - 4),
        };
    const paint = this.options.paint.createScrollbar(
      container.mesh,
      container.id,
      axis,
      trackBox,
      thumbBox,
      containerSize,
    );
    return {
      ...paint,
      trackBox,
      thumbBox,
      containerSize,
      travel: Math.max(0, clientLength - thumbLength),
    };
  }

  private updateScrollbars(container: ScrollContainer): void {
    this.updateScrollbar(
      container.verticalScrollbar,
      container.scrollTop,
      Math.max(0, container.scrollHeight - container.clientHeight),
    );
    this.updateScrollbar(
      container.horizontalScrollbar,
      container.scrollLeft,
      Math.max(0, container.scrollWidth - container.clientWidth),
    );
  }

  private updateScrollbar(
    visual: ScrollbarVisual | undefined,
    scrollOffset: number,
    maximumOffset: number,
  ): void {
    if (!visual) return;
    const ratio = maximumOffset > 0 ? this.clamp(scrollOffset / maximumOffset, 0, 1) : 0;
    const thumbBox = {
      ...visual.thumbBox,
      ...(visual.axis === 'vertical'
        ? { y: visual.trackBox.y + visual.travel * ratio }
        : { x: visual.trackBox.x + visual.travel * ratio }),
    };
    this.options.paint.positionScrollbarThumb(
      visual,
      thumbBox,
      visual.containerSize,
    );
  }

  private disposeScrollbars(container: ScrollContainer): void {
    for (const visual of [container.verticalScrollbar, container.horizontalScrollbar]) {
      if (!visual) continue;
      this.options.paint.disposeScrollbar(visual);
    }
  }

  private refreshClipping(): void {
    this.options.refreshClipping?.(this.clipEntries);
  }

  private publicState(container: ScrollContainer): AstylarScrollState {
    return {
      scrollLeft: this.round(container.scrollLeft),
      scrollTop: this.round(container.scrollTop),
      scrollWidth: this.round(container.scrollWidth),
      scrollHeight: this.round(container.scrollHeight),
      clientWidth: this.round(container.clientWidth),
      clientHeight: this.round(container.clientHeight),
    };
  }

  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : 0));
  }

  private round(value: number): number {
    return Math.round(value * 1000) / 1000;
  }

  private parsePixelLength(value: string | undefined): number {
    const parsed = Number.parseFloat(value ?? '0');
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
}
