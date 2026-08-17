import { Injectable, Optional } from '@angular/core';
import { Mesh } from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { FlexService } from './flex.service';
import {
  resolveGridTracks,
  resolveIntrinsicGridRows,
  tokenizeGridTrackList,
} from './grid-track-sizing';

@Injectable({ providedIn: 'root' })
export class GridService {
  constructor(@Optional() private flexService?: FlexService) {}

  isGridContainer(
    render: BabylonRender,
    element: DOMElement,
    styles: StyleRule[],
    dom: BabylonDOM,
  ): boolean {
    const display = render.actions.style
      .findStyleForElement(element, styles, dom.context.elementStyles)
      ?.display?.toLowerCase();
    return display === 'grid' || display === 'inline-grid';
  }

  processGridChildren(
    dom: BabylonDOM,
    render: BabylonRender,
    children: DOMElement[],
    parent: Mesh,
    styles: StyleRule[],
    parentElement: DOMElement,
  ): void {
    const style = render.actions.style.findStyleForElement(
      parentElement,
      styles,
      dom.context.elementStyles,
    );
    const dimensions = dom.context.elementDimensions.get(parent.name);
    if (!style || !dimensions) {
      throw new Error(`GridService: missing style or dimensions for ${parent.name}`);
    }

    const visibleChildren = children.filter((child) =>
      render.actions.style.findStyleForElement(child, styles, dom.context.elementStyles)
        ?.display?.toLowerCase() !== 'none',
    );
    const columnGap = this.parseLength(style.columnGap ?? style.gap);
    const rowGap = this.parseLength(style.rowGap ?? style.gap);
    const contentWidth = Math.max(0, dimensions.width - dimensions.padding.left - dimensions.padding.right);
    const contentHeight = Math.max(0, dimensions.height - dimensions.padding.top - dimensions.padding.bottom);
    const columnCount = Math.max(1, this.trackCount(style.gridTemplateColumns));
    const requiredRows = Math.max(1, Math.ceil(visibleChildren.length / columnCount));
    const columns = this.resolveTracks(style.gridTemplateColumns, contentWidth, columnGap, columnCount);
    const rowContributions = visibleChildren.map((child, index) => {
      const measured = this.flexService?.measureIntrinsicFlowChildOuterHeight(
        child,
        styles,
        dom,
        render,
        columns[index % columns.length] ?? contentWidth,
      );
      if (measured !== null && measured !== undefined) return measured;
      const childStyle = render.actions.style.findStyleForElement(
        child, styles, dom.context.elementStyles,
      );
      const height = childStyle?.height?.trim();
      return height && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:px)?$/i.test(height)
        ? Math.max(0, Number.parseFloat(height) || 0)
        : null;
    });
    const intrinsicRows = resolveIntrinsicGridRows(
      style.gridTemplateRows, columnCount, rowContributions,
    );
    const rows = intrinsicRows ??
      this.resolveTracks(style.gridTemplateRows, contentHeight, rowGap, requiredRows);
    const contentLeft = -dimensions.width / 2 + dimensions.padding.left;
    const contentTop = dimensions.height / 2 - dimensions.padding.top;

    visibleChildren.forEach((child, index) => {
      const column = index % columns.length;
      const row = Math.floor(index / columns.length);
      if (row >= rows.length) return;

      const xOffset = columns.slice(0, column).reduce((sum, value) => sum + value, 0) + column * columnGap;
      const yOffset = rows.slice(0, row).reduce((sum, value) => sum + value, 0) + row * rowGap;
      const width = columns[column];
      const height = rows[row];
      const childMesh = dom.actions.createElement(
        dom,
        render,
        child,
        parent,
        styles,
        {
          x: contentLeft + xOffset + width / 2,
          y: contentTop - yOffset - height / 2,
          z: 0.1 + index * 0.01,
        },
        { width, height },
      );

      // Grid track sizing produces a definite used size for the item. Nested
      // flex or block layout must preserve it instead of re-running auto size.
      childMesh.metadata = {
        ...(childMesh.metadata ?? {}),
        astylarGridAssignedSize: { width, height },
      };

      if (child.children?.length) {
        dom.actions.processChildren(dom, render, child.children, childMesh, styles, child);
      }
    });
  }

  resolveTracks(template: string | undefined, availableSize: number, gap: number, fallbackCount: number): number[] {
    return resolveGridTracks(template, availableSize, gap, fallbackCount);
  }

  private trackCount(template: string | undefined): number {
    return tokenizeGridTrackList(template).length;
  }

  private parseLength(value: string | undefined): number {
    const parsed = Number.parseFloat(value ?? '0');
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
}
