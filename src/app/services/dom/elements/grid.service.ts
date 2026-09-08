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
import { ElementBorderService } from './element-border.service';
import { updateCssLayoutNode } from '../../css-layout-geometry';
import {
  positionRenderedCssBox,
  projectCssLength,
  projectCssSize,
} from '../../css-render-boundary';

interface GridItemPlacement {
  column: number;
  columnSpan: number;
  row: number;
  rowSpan: number;
}

interface GridAxisPlacement {
  start?: number;
  span: number;
}

@Injectable({ providedIn: 'root' })
export class GridService {
  constructor(
    @Optional() private flexService?: FlexService,
    @Optional() private borderService?: ElementBorderService,
  ) {}

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
    let contentHeight = Math.max(0, dimensions.height - dimensions.padding.top - dimensions.padding.bottom);
    const columnCount = Math.max(1, this.trackCount(style.gridTemplateColumns));
    const columns = this.resolveTracks(style.gridTemplateColumns, contentWidth, columnGap, columnCount);
    const explicitRowCount = Math.max(1, this.trackCount(style.gridTemplateRows));
    const childStyles = visibleChildren.map((child) =>
      render.actions.style.findStyleForElement(child, styles, dom.context.elementStyles));
    const placements = this.resolveGridPlacements(childStyles, columnCount, explicitRowCount);
    const requiredRows = Math.max(1, ...placements.map(({ row, rowSpan }) => row + rowSpan));
    const rowContributions = Array<number | null>(requiredRows * columnCount).fill(null);
    visibleChildren.forEach((child, index) => {
      const placement = placements[index];
      const measured = this.flexService?.measureIntrinsicFlowChildOuterHeight(
        child,
        styles,
        dom,
        render,
        this.sumTracks(columns, placement.column, placement.columnSpan, columnGap) || contentWidth,
      );
      const childStyle = childStyles[index];
      const height = childStyle?.height?.trim();
      const contribution = measured !== null && measured !== undefined
        ? measured
        : height && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:px)?$/i.test(height)
          ? Math.max(0, Number.parseFloat(height) || 0)
          : null;
      if (placement.rowSpan === 1) {
        rowContributions[placement.row * columnCount + placement.column] = contribution;
      }
    });
    const hasAssignedDefiniteHeight =
      (style.height !== undefined && style.height !== 'auto') ||
      (parent.metadata?.astylarFlexAssignedSize?.height !== undefined &&
        parent.metadata.astylarFlexAssignedSize.heightIsIntrinsic !== true) ||
      parent.metadata?.astylarGridAssignedSize?.height !== undefined;
    const stretchAutoTracks = !style.alignContent ||
      ['normal', 'stretch'].includes(style.alignContent.toLowerCase());
    const intrinsicRows = resolveIntrinsicGridRows(
      style.gridTemplateRows,
      columnCount,
      rowContributions,
      {
        sizeIndefiniteFlexibleTracks: !hasAssignedDefiniteHeight,
        availableSize: hasAssignedDefiniteHeight ? contentHeight : undefined,
        gap: rowGap,
        stretchAutoTracks,
      },
    );
    const rows = intrinsicRows ??
      this.resolveTracks(style.gridTemplateRows, contentHeight, rowGap, requiredRows);
    if (!hasAssignedDefiniteHeight && intrinsicRows) {
      const intrinsicHeight = rows.reduce((sum, row) => sum + row, 0) +
        rowGap * Math.max(0, rows.length - 1) +
        dimensions.padding.top + dimensions.padding.bottom;
      if (Math.abs(intrinsicHeight - dimensions.height) > 0.1) {
        const renderedSize = projectCssSize(render, {
          width: dimensions.width,
          height: intrinsicHeight,
        });
        const borderRadius = this.borderService?.parseBorderRadius(style.borderRadius) ??
          (Number.parseFloat(style.borderRadius ?? '0') || 0);
        const borderWidth = this.borderService?.parseBorderProperties(render, style).width ??
          projectCssLength(render, Number.parseFloat(style.borderWidth ?? '0') || 0);
        render.actions.mesh.updateMeshWithBorderRadius(
          parent,
          'rectangle',
          renderedSize.width,
          renderedSize.height,
          projectCssLength(render, borderRadius),
          borderWidth,
        );
        dimensions.height = intrinsicHeight;
        dom.context.elementDimensions.set(parent.name, dimensions);
        const retainedParent = dom.context.layoutBoxes?.get(parent.name);
        if (retainedParent) {
          const resized = updateCssLayoutNode(
            retainedParent,
            retainedParent.box.borderBox,
            { width: dimensions.width, height: intrinsicHeight },
          );
          dom.context.layoutBoxes.set(parent.name, resized);
          const containingBlock = resized.parentId
            ? dom.context.elementDimensions.get(resized.parentId)
            : undefined;
          if (containingBlock) {
            positionRenderedCssBox(
              render,
              parent,
              resized.box.borderBox,
              containingBlock,
              parent.position.z,
            );
          }
        }
        contentHeight = Math.max(
          0,
          intrinsicHeight - dimensions.padding.top - dimensions.padding.bottom,
        );
      }
    }
    const contentLeft = -dimensions.width / 2 + dimensions.padding.left;
    const contentTop = dimensions.height / 2 - dimensions.padding.top;

    visibleChildren.forEach((child, index) => {
      const { column, columnSpan, row, rowSpan } = placements[index];
      if (row >= rows.length || column >= columns.length) return;

      const xOffset = columns.slice(0, column).reduce((sum, value) => sum + value, 0) + column * columnGap;
      const yOffset = rows.slice(0, row).reduce((sum, value) => sum + value, 0) + row * rowGap;
      const width = this.sumTracks(columns, column, columnSpan, columnGap);
      const height = this.sumTracks(rows, row, rowSpan, rowGap);
      const childStyle = childStyles[index];
      const hasDefiniteWidth = this.hasDefiniteItemSize(childStyle?.width);
      const hasDefiniteHeight = this.hasDefiniteItemSize(childStyle?.height);
      const childMesh = dom.actions.createElement(
        dom,
        render,
        child,
        parent,
        styles,
        {
          x: dimensions.padding.left + xOffset,
          y: dimensions.padding.top + yOffset,
          z: 0.1 + index * 0.01,
        },
        {
          width: hasDefiniteWidth ? undefined : width,
          height: hasDefiniteHeight ? undefined : height,
        },
      );

      const usedSize = dom.context.elementDimensions.get(childMesh.name) ?? { width, height };
      const horizontalAlignment = this.resolveItemAlignment(undefined, hasDefiniteWidth);
      const verticalAlignment = this.resolveItemAlignment(
        childStyle?.alignSelf ?? style.alignItems,
        hasDefiniteHeight,
      );
      const alignedLeft = dimensions.padding.left + xOffset +
        this.itemAlignmentOffset(width, usedSize.width, horizontalAlignment);
      const alignedTop = dimensions.padding.top + yOffset +
        this.itemAlignmentOffset(height, usedSize.height, verticalAlignment);
      const alignedBorderBox = {
        x: alignedLeft,
        y: alignedTop,
        width: usedSize.width,
        height: usedSize.height,
      };
      positionRenderedCssBox(
        render,
        childMesh,
        alignedBorderBox,
        dimensions,
        0.1 + index * 0.01,
      );
      const retained = dom.context.layoutBoxes?.get(childMesh.name);
      if (retained) {
        const aligned = updateCssLayoutNode(
          retained,
          alignedBorderBox,
          usedSize,
        );
        dom.context.layoutBoxes.set(childMesh.name, aligned);
      }

      // Grid track sizing produces a definite used size for the item. Nested
      // flex or block layout must preserve it instead of re-running auto size.
      childMesh.metadata = {
        ...(childMesh.metadata ?? {}),
        astylarGridAssignedSize: { width: usedSize.width, height: usedSize.height },
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

  private itemAlignmentOffset(trackSize: number, itemSize: number, alignment: string): number {
    if (alignment === 'end') return trackSize - itemSize;
    if (alignment === 'center') return (trackSize - itemSize) / 2;
    return 0;
  }

  private resolveGridPlacements(
    childStyles: Array<StyleRule | undefined>,
    columnCount: number,
    explicitRowCount: number,
  ): GridItemPlacement[] {
    const occupied: boolean[][] = [];
    const placements: GridItemPlacement[] = [];

    const isAvailable = (row: number, column: number, rowSpan: number, columnSpan: number): boolean => {
      if (row < 0 || column < 0 || column + columnSpan > columnCount) return false;
      for (let y = row; y < row + rowSpan; y += 1) {
        for (let x = column; x < column + columnSpan; x += 1) {
          if (occupied[y]?.[x]) return false;
        }
      }
      return true;
    };
    const occupy = ({ row, column, rowSpan, columnSpan }: GridItemPlacement): void => {
      for (let y = row; y < row + rowSpan; y += 1) {
        occupied[y] ??= Array<boolean>(columnCount).fill(false);
        for (let x = column; x < column + columnSpan; x += 1) occupied[y][x] = true;
      }
    };

    childStyles.forEach((childStyle) => {
      const columnPlacement = this.parseGridAxisPlacement(childStyle?.gridColumn, columnCount);
      const rowPlacement = this.parseGridAxisPlacement(childStyle?.gridRow, explicitRowCount);
      const columnSpan = Math.min(columnCount, columnPlacement.span);
      const rowSpan = rowPlacement.span;
      let row = rowPlacement.start;
      let column = columnPlacement.start;

      if (row !== undefined && column !== undefined) {
        if (row < 0 || column < 0 || column + columnSpan > columnCount) {
          throw new Error('GridService: explicit grid placement exceeds the supported grid tracks');
        }
      } else if (row !== undefined) {
        column = this.findAvailableColumn(occupied, row, rowSpan, columnSpan, columnCount);
        if (column === undefined) {
          throw new Error('GridService: no column is available for the explicit grid row');
        }
      } else if (column !== undefined) {
        row = 0;
        while (!isAvailable(row, column, rowSpan, columnSpan)) row += 1;
      } else {
        row = 0;
        column = 0;
        while (!isAvailable(row, column, rowSpan, columnSpan)) {
          column += 1;
          if (column + columnSpan > columnCount) {
            column = 0;
            row += 1;
          }
        }
      }

      const placement = { row, column, rowSpan, columnSpan } as GridItemPlacement;
      occupy(placement);
      placements.push(placement);
    });
    return placements;
  }

  private findAvailableColumn(
    occupied: boolean[][],
    row: number,
    rowSpan: number,
    columnSpan: number,
    columnCount: number,
  ): number | undefined {
    for (let column = 0; column + columnSpan <= columnCount; column += 1) {
      let available = true;
      for (let y = row; y < row + rowSpan && available; y += 1) {
        for (let x = column; x < column + columnSpan; x += 1) {
          if (occupied[y]?.[x]) {
            available = false;
            break;
          }
        }
      }
      if (available) return column;
    }
    return undefined;
  }

  private parseGridAxisPlacement(value: string | undefined, trackCount: number): GridAxisPlacement {
    const normalized = value?.trim().toLowerCase();
    if (!normalized || normalized === 'auto') return { span: 1 };
    const parts = normalized.split('/').map((part) => part.trim());
    if (parts.length > 2 || parts.some((part) => !part)) {
      throw new Error(`GridService: unsupported grid placement "${value}"`);
    }
    const parsePart = (part: string): { line?: number; span?: number } => {
      const spanMatch = /^span\s+(\d+)$/.exec(part);
      if (spanMatch) return { span: Math.max(1, Number.parseInt(spanMatch[1], 10)) };
      if (/^-?\d+$/.test(part)) {
        const authoredLine = Number.parseInt(part, 10);
        if (authoredLine === 0) throw new Error('GridService: grid line zero is invalid');
        const resolvedLine = authoredLine < 0 ? trackCount + 2 + authoredLine : authoredLine;
        return { line: resolvedLine - 1 };
      }
      throw new Error(`GridService: only integer grid lines and "span N" are supported (received "${part}")`);
    };
    const startPart = parsePart(parts[0]);
    if (parts.length === 1) {
      return startPart.span ? { span: startPart.span } : { start: startPart.line, span: 1 };
    }
    const endPart = parsePart(parts[1]);
    if (startPart.line !== undefined && endPart.span !== undefined) {
      return { start: startPart.line, span: endPart.span };
    }
    if (startPart.line !== undefined && endPart.line !== undefined) {
      return { start: startPart.line, span: Math.max(1, endPart.line - startPart.line) };
    }
    if (startPart.span !== undefined && endPart.line !== undefined) {
      return { start: Math.max(0, endPart.line - startPart.span), span: startPart.span };
    }
    throw new Error(`GridService: unsupported grid placement "${value}"`);
  }

  private sumTracks(tracks: number[], start: number, span: number, gap: number): number {
    const included = tracks.slice(start, start + span);
    return included.reduce((sum, value) => sum + value, 0) +
      gap * Math.max(0, included.length - 1);
  }

  private hasDefiniteItemSize(value: string | undefined): boolean {
    const normalized = value?.trim().toLowerCase();
    return !!normalized && normalized !== 'auto' &&
      /^[+-]?(?:\d+\.?\d*|\.\d+)(?:px)?$/i.test(normalized);
  }

  private resolveItemAlignment(value: string | undefined, hasDefiniteSize: boolean): 'start' | 'center' | 'end' {
    const normalized = value?.trim().toLowerCase() ?? 'stretch';
    if (normalized === 'center') return 'center';
    if (normalized === 'end' || normalized === 'flex-end') return 'end';
    if (normalized === 'stretch' && !hasDefiniteSize) return 'center';
    return 'start';
  }

  private alignItemWithinTrack(
    trackSize: number,
    itemSize: number,
    alignment: 'start' | 'center' | 'end',
  ): number {
    if (alignment === 'center') return trackSize / 2;
    if (alignment === 'end') return trackSize - itemSize / 2;
    return itemSize / 2;
  }
}
