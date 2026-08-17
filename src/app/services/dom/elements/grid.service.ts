import { Injectable } from '@angular/core';
import { Mesh } from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';

export function tokenizeGridTrackList(template: string | undefined): string[] {
  const source = template?.trim() ?? '';
  if (!source) return [];
  const tokens: string[] = [];
  let token = '';
  let depth = 0;
  for (const character of source) {
    if (/\s/.test(character) && depth === 0) {
      if (token) tokens.push(token);
      token = '';
      continue;
    }
    token += character;
    if (character === '(') depth++;
    if (character === ')') depth = Math.max(0, depth - 1);
  }
  if (token) tokens.push(token);
  return tokens;
}

export function resolveIntrinsicGridRows(
  template: string | undefined,
  columnCount: number,
  itemOuterHeights: Array<number | null>,
): number[] | null {
  const explicitTokens = tokenizeGridTrackList(template);
  const requiredRows = Math.max(1, Math.ceil(itemOuterHeights.length / Math.max(1, columnCount)));
  const rowTokens = Array.from(
    { length: Math.max(requiredRows, explicitTokens.length) },
    (_, index) => explicitTokens[index] ?? 'auto',
  );
  if (rowTokens.some((token) => token !== 'auto' && !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:px)?$/i.test(token))) {
    return null;
  }

  const rows = rowTokens.map((token) => token === 'auto'
    ? 0
    : Math.max(0, Number.parseFloat(token) || 0));
  for (let index = 0; index < itemOuterHeights.length; index++) {
    const row = Math.floor(index / Math.max(1, columnCount));
    if (rowTokens[row] !== 'auto') continue;
    const contribution = itemOuterHeights[index];
    if (contribution === null) return null;
    rows[row] = Math.max(rows[row], contribution);
  }
  return rows;
}

@Injectable({ providedIn: 'root' })
export class GridService {
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
    const rowContributions = visibleChildren.map((child) => {
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
    const tokens = tokenizeGridTrackList(template);
    const trackTokens = tokens.length ? tokens : Array.from({ length: fallbackCount }, () => '1fr');
    const trackSpace = Math.max(0, availableSize - Math.max(0, trackTokens.length - 1) * gap);
    let fixed = 0;

    const parsed = trackTokens.map((token) => {
      const minmax = /^minmax\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i.exec(token);
      if (minmax) {
        const minimum = this.resolveDefiniteTrackLength(minmax[1], availableSize);
        const maximum = minmax[2].trim();
        if (maximum.endsWith('fr')) {
          const value = Number.parseFloat(maximum);
          const fraction = Number.isFinite(value) && value > 0 ? value : 1;
          return { type: 'fr' as const, value: fraction, minimum };
        }
        const maximumLength = this.resolveDefiniteTrackLength(maximum, availableSize);
        const pixels = Math.max(minimum, maximumLength);
        fixed += pixels;
        return { type: 'fixed' as const, value: pixels, minimum: 0 };
      }
      if (token.endsWith('fr')) {
        const value = Number.parseFloat(token);
        const fraction = Number.isFinite(value) && value > 0 ? value : 1;
        return { type: 'fr' as const, value: fraction, minimum: 0 };
      }
      const pixels = this.resolveDefiniteTrackLength(token, availableSize);
      fixed += pixels;
      return { type: 'fixed' as const, value: pixels, minimum: 0 };
    });

    let remaining = Math.max(0, trackSpace - fixed);
    const flexible = parsed
      .map((track, index) => ({ track, index }))
      .filter((entry) => entry.track.type === 'fr');
    const allocations = new Map<number, number>();
    let active = flexible;

    while (active.length > 0) {
      const fractionTotal = active.reduce((sum, entry) => sum + entry.track.value, 0);
      const constrained = active.filter((entry) =>
        remaining * entry.track.value / fractionTotal < entry.track.minimum,
      );
      if (constrained.length === 0) {
        active.forEach((entry) => allocations.set(
          entry.index,
          remaining * entry.track.value / fractionTotal,
        ));
        break;
      }
      constrained.forEach((entry) => {
        allocations.set(entry.index, entry.track.minimum);
        remaining = Math.max(0, remaining - entry.track.minimum);
      });
      const constrainedIndexes = new Set(constrained.map((entry) => entry.index));
      active = active.filter((entry) => !constrainedIndexes.has(entry.index));
    }

    return parsed.map((track, index) => track.type === 'fr'
      ? allocations.get(index) ?? track.minimum
      : track.value);
  }

  private trackCount(template: string | undefined): number {
    return tokenizeGridTrackList(template).length;
  }

  private resolveDefiniteTrackLength(value: string, percentageReference: number): number {
    const parsed = value.trim().endsWith('%')
      ? percentageReference * Number.parseFloat(value) / 100
      : Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  private parseLength(value: string | undefined): number {
    const parsed = Number.parseFloat(value ?? '0');
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
}
