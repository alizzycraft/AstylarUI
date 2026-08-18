import type { Mesh } from '@babylonjs/core';
import type { DOMElement } from '../app/types/dom-element';
import type { SiteData } from '../app/types/site-data';
import type { StyleRule } from '../app/types/style-rule';

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
  roots: Array<{ mesh: Mesh; x: number; y: number }>;
}

interface ElementDimensions {
  width: number;
  height: number;
  padding?: { top: number; right: number; bottom: number; left: number };
}

export interface AstylarScrollRuntimeOptions {
  getMesh(elementId: string): Mesh | undefined;
  getDimensions(elementId: string): ElementDimensions | undefined;
  getStyle(elementId: string): StyleRule | undefined;
  resolveStyle?(element: DOMElement, siteData: SiteData): StyleRule | undefined;
  getPixelToWorldScale(): number;
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

  isPointVisible(elementId: string, point?: { x: number; y: number }): boolean {
    if (!point) return true;
    let currentId = this.parentIds.get(elementId);
    while (currentId) {
      const container = this.containers.get(currentId);
      if (container) {
        container.mesh.computeWorldMatrix(true);
        const bounds = container.mesh.getBoundingInfo().boundingBox;
        if (point.x < bounds.minimumWorld.x || point.x > bounds.maximumWorld.x ||
            point.y < bounds.minimumWorld.y || point.y > bounds.maximumWorld.y) {
          return false;
        }
      }
      currentId = this.parentIds.get(currentId);
    }
    return true;
  }

  dispose(): void {
    this.disposed = true;
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
    const scale = this.options.getPixelToWorldScale();
    mesh.computeWorldMatrix(true);
    const containerBounds = mesh.getBoundingInfo().boundingBox;
    const roots = (element.children ?? [])
      .map((child) => this.findDirectChildMesh(mesh, child))
      .filter((child): child is Mesh => !!child)
      .map((child) => ({ mesh: child, x: child.position.x, y: child.position.y }));

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const root of roots) {
      const bounds = root.mesh.getHierarchyBoundingVectors(true);
      minX = Math.min(minX, bounds.min.x);
      maxX = Math.max(maxX, bounds.max.x);
      minY = Math.min(minY, bounds.min.y);
      maxY = Math.max(maxY, bounds.max.y);
    }
    const borderWidth = style?.borderStyle && style.borderStyle !== 'none' &&
        style.borderStyle !== 'hidden'
      ? this.parsePixelLength(style.borderWidth)
      : 0;
    const borderBoxAdjustment = borderWidth * 2;
    const clientWidth = this.round(Math.max(0, dimensions.width - borderBoxAdjustment));
    const clientHeight = this.round(Math.max(0, dimensions.height - borderBoxAdjustment));
    const trailingPaddingX = dimensions.padding?.right ?? 0;
    const trailingPaddingY = dimensions.padding?.bottom ?? 0;
    const contentWidth = roots.length ? Math.max(0, Math.max(
      maxX - containerBounds.minimumWorld.x,
      containerBounds.maximumWorld.x - minX,
    ) / scale + trailingPaddingX - borderBoxAdjustment) : 0;
    const contentHeight = roots.length ? Math.max(0, Math.max(
      maxY - containerBounds.minimumWorld.y,
      containerBounds.maximumWorld.y - minY,
    ) / scale + trailingPaddingY - borderBoxAdjustment) : 0;
    return {
      id,
      mesh,
      roots,
      scrollLeft: 0,
      scrollTop: 0,
      scrollWidth: Math.max(clientWidth, this.round(contentWidth)),
      scrollHeight: Math.max(clientHeight, this.round(contentHeight)),
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
    const scale = this.options.getPixelToWorldScale();
    for (const root of container.roots) {
      // Astylar's camera faces the planes from negative Z, so increasing world X
      // moves content toward the screen's left edge as browser scrollLeft grows.
      root.mesh.position.x = root.x + container.scrollLeft * scale;
      root.mesh.position.y = root.y + container.scrollTop * scale;
      root.mesh.computeWorldMatrix(true);
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
