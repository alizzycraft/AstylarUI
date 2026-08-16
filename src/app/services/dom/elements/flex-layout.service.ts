import { Injectable } from '@angular/core';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';

/**
 * FlexLayoutService - Advanced Flexbox Layout Algorithms
 * 
 * IMPORTANT: All calculations in this service are performed in SCREEN UNITS (pixels).
 * The service follows the same pattern as the existing FlexService:
 * - Input dimensions, positions, and sizes are in pixels
 * - All internal calculations are done in pixels
 * - Output values are in pixels
 * - Scale factor conversion to world units happens later in the rendering pipeline
 * 
 * This ensures consistency with the existing flex layout system and proper
 * integration with the BabylonJS 3D rendering context.
 */

export interface FlexItem {
  element: DOMElement;
  style: StyleRule | undefined;
  width: number;
  height: number;
  baseWidth: number;
  baseHeight: number;
  margin: { top: number; right: number; bottom: number; left: number };
  flexGrow: number;
  flexShrink: number;
  flexBasis: number | 'auto' | string;
  alignSelf: string;
  order: number;
}

export interface FlexLine {
  items: FlexItem[];
  crossSize: number;
  mainSize: number;
  crossOffset?: number;
}

export interface FlexContainer {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  flexDirection: string;
  flexWrap: string;
  justifyContent: string;
  alignItems: string;
  alignContent: string;
  gap: number;
  rowGap: number;
  columnGap: number;
}

@Injectable({
  providedIn: 'root'
})
export class FlexLayoutService {

  /**
   * Apply align-content algorithm for multi-line flex containers
   * Handles distribution of flex lines within the cross axis
   * All calculations are done in screen units (pixels)
   */
  public applyAlignContent(
    lines: FlexLine[],
    container: FlexContainer,
    availableCrossSpace: number
  ): FlexLine[] {
    // align-content only applies to multi-line containers
    if (lines.length <= 1 || container.flexWrap === 'nowrap') {
      return lines;
    }

    // Calculate row-gap spacing between lines
    const rowGapSpacing = lines.length > 1 ? container.rowGap * (lines.length - 1) : 0;
    const totalLinesSize = lines.reduce((sum, line) => sum + line.crossSize, 0);
    const gapAdjustedAvailableSpace = availableCrossSpace - rowGapSpacing;
    const remainingSpace = Math.max(0, gapAdjustedAvailableSpace - totalLinesSize);
    
    console.log(`[FLEX-GAP] applyAlignContent: availableCrossSpace=${availableCrossSpace}px, rowGapSpacing=${rowGapSpacing}px, totalLinesSize=${totalLinesSize}px, remainingSpace=${remainingSpace}px`);
    
    let result: FlexLine[];
    
    switch (container.alignContent) {
      case 'flex-start':
        result = this.alignContentFlexStart(lines, container);
        break;
      
      case 'flex-end':
        result = this.alignContentFlexEnd(lines, remainingSpace, container);
        break;
      
      case 'center':
        result = this.alignContentCenter(lines, remainingSpace, container);
        break;
      
      case 'space-between':
        result = this.alignContentSpaceBetween(lines, remainingSpace, container);
        break;
      
      case 'space-around':
        result = this.alignContentSpaceAround(lines, remainingSpace, container);
        break;
      
      case 'space-evenly':
        result = this.alignContentSpaceEvenly(lines, remainingSpace, container);
        break;
      
      case 'stretch':
        result = this.alignContentStretch(lines, remainingSpace, container);
        break;
      
      default:
        result = lines;
    }
    

    result.forEach(line => {
      const identifier = this.describeLine(line);
      const size = `${line.crossSize}px`;
      console.log(`[FLEX-LINE] final ${identifier} crossSize=${size}`);
    });

    return result;
  }

  private alignContentFlexStart(lines: FlexLine[], container: FlexContainer): FlexLine[] {
    // Lines are packed at the start of the cross axis
    let currentOffset = 0;
    return lines.map((line, index) => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      // Add row-gap after each line except the last
      currentOffset += line.crossSize + (index < lines.length - 1 ? container.rowGap : 0);
      return result;
    });
  }

  private alignContentFlexEnd(lines: FlexLine[], remainingSpace: number, container: FlexContainer): FlexLine[] {
    // Lines are packed at the end of the cross axis
    let currentOffset = remainingSpace;
    return lines.map((line, index) => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      // Add row-gap after each line except the last
      currentOffset += line.crossSize + (index < lines.length - 1 ? container.rowGap : 0);
      return result;
    });
  }

  private alignContentCenter(lines: FlexLine[], remainingSpace: number, container: FlexContainer): FlexLine[] {
    // Lines are centered in the cross axis
    const startOffset = remainingSpace / 2;
    let currentOffset = startOffset;
    
    console.log(`[FLEX-ALIGN] Center: ${lines.length} lines, remainingSpace=${remainingSpace}px, startOffset=${startOffset}px, rowGap=${container.rowGap}px`);
    
    return lines.map((line, index) => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      
      console.log(`[FLEX-ALIGN] Center line ${index}: crossOffset=${currentOffset}px, crossSize=${line.crossSize}px`);
      
      // Add row-gap after each line except the last
      currentOffset += line.crossSize + (index < lines.length - 1 ? container.rowGap : 0);
      return result;
    });
  }

  private alignContentSpaceBetween(lines: FlexLine[], remainingSpace: number, container: FlexContainer): FlexLine[] {
    // Lines are evenly distributed with first line at start and last at end
    if (lines.length === 1) {
      return this.alignContentFlexStart(lines, container);
    }
    
    const spacing = remainingSpace / (lines.length - 1);
    let currentOffset = 0;
    
    console.log(`[FLEX-ALIGN] Space-between: ${lines.length} lines, remainingSpace=${remainingSpace}px, spacing=${spacing}px, rowGap=${container.rowGap}px`);
    
    return lines.map((line, index) => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      
      console.log(`[FLEX-ALIGN] Space-between line ${index}: crossOffset=${currentOffset}px, crossSize=${line.crossSize}px`);
      
      // Add line size, row-gap, and spacing after each line except the last one
      if (index < lines.length - 1) {
        currentOffset += line.crossSize + container.rowGap + spacing;
      } else {
        currentOffset += line.crossSize;
      }
      
      return result;
    });
  }

  private alignContentSpaceAround(lines: FlexLine[], remainingSpace: number, container: FlexContainer): FlexLine[] {
    // Lines are evenly distributed with equal space around each line
    const spacing = remainingSpace / lines.length;
    let currentOffset = spacing / 2;
    
    console.log(`[FLEX-ALIGN] Space-around: ${lines.length} lines, remainingSpace=${remainingSpace}px, spacing=${spacing}px, startOffset=${currentOffset}px, rowGap=${container.rowGap}px`);
    
    return lines.map((line, index) => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      
      console.log(`[FLEX-ALIGN] Space-around line ${index}: crossOffset=${currentOffset}px, crossSize=${line.crossSize}px`);
      
      // Add line size, row-gap, and spacing after each line except the last
      if (index < lines.length - 1) {
        currentOffset += line.crossSize + container.rowGap + spacing;
      } else {
        currentOffset += line.crossSize + spacing;
      }
      return result;
    });
  }

  private alignContentSpaceEvenly(lines: FlexLine[], remainingSpace: number, container: FlexContainer): FlexLine[] {
    // Lines are evenly distributed with equal space between and around them
    const spacing = remainingSpace / (lines.length + 1);
    let currentOffset = spacing;
    
    return lines.map((line, index) => {
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: line.crossSize
      };
      // Add line size, row-gap, and spacing after each line
      currentOffset += line.crossSize + (index < lines.length - 1 ? container.rowGap : 0) + spacing;
      return result;
    });
  }

  private alignContentStretch(lines: FlexLine[], remainingSpace: number, container: FlexContainer): FlexLine[] {
    // Lines stretch to fill the available cross space
    const extraSpace = remainingSpace / lines.length;
    let currentOffset = 0;
    
    return lines.map((line, index) => {
      const newCrossSize = line.crossSize + extraSpace;
      const result = {
        ...line,
        crossOffset: currentOffset,
        crossSize: newCrossSize
      };
      // Add stretched line size and row-gap after each line except the last
      currentOffset += newCrossSize + (index < lines.length - 1 ? container.rowGap : 0);
      return result;
    });
  }

  private describeLine(line: FlexLine): string {
    const items = line.items.map(item => this.describeItem(item)).join(', ');
    return `line[crossSize=${line.crossSize}px, mainSize=${line.mainSize}px, items=[${items}]]`;
  }

  private describeItem(item: FlexItem | (FlexItem & { calculatedFlexBasis?: number })): string {
    const { element } = item;
    const idPart = element.id ? `#${element.id}` : '';
    const classPart = element.class ? `.${element.class.replace(/\s+/g, '.')}` : '';
    return `${element.type}${idPart}${classPart}`;
  }

  /**
   * Calculate flex item sizes using flex-basis, flex-grow, and flex-shrink
   * Implements the complete flex sizing algorithm
   * All calculations are done in screen units (pixels)
   */
  public calculateFlexItemSizes(
    items: FlexItem[],
    container: FlexContainer,
    availableMainSpace: number
  ): FlexItem[] {
    const isRow = container.flexDirection === 'row' || container.flexDirection === 'row-reverse';
    
    // Calculate gap spacing that needs to be subtracted from available space
    const gapSpacing = this.calculateGapSpacing(items, container, isRow);
    const gapAdjustedAvailableSpace = availableMainSpace - gapSpacing;
    
    console.log(`[FLEX-GAP] calculateFlexItemSizes: originalAvailableSpace=${availableMainSpace}px, gapSpacing=${gapSpacing}px, adjustedAvailableSpace=${gapAdjustedAvailableSpace}px`);

    // Step 1: Calculate flex-basis for each item (in pixels)
    const itemsWithBasis = items.map(item => ({
      ...item,
      calculatedFlexBasis: this.calculateFlexBasis(item, container, isRow)
    }));

    itemsWithBasis.forEach(item => {
      const identifier = this.describeItem(item);
      const marginSize = isRow
        ? `${item.margin.left}+${item.margin.right}`
        : `${item.margin.top}+${item.margin.bottom}`;
      console.log(
        `[FLEX-ITEM] basis ${identifier} flexBasisProp=${item.flexBasis} -> calculated=${item.calculatedFlexBasis}px | baseSize=${item.baseWidth}x${item.baseHeight} | margin(${isRow ? 'inline' : 'block'})=${marginSize}`
      );
    });

    // Step 2: Calculate total used space and remaining space (all in pixels)
    const totalBasisSize = itemsWithBasis.reduce((sum, item) => {
      const marginSize = isRow 
        ? item.margin.left + item.margin.right
        : item.margin.top + item.margin.bottom;
      return sum + item.calculatedFlexBasis + marginSize;
    }, 0);

    const remainingSpace = gapAdjustedAvailableSpace - totalBasisSize;

    console.log(`[FLEX-ITEM] totalBasisSize=${totalBasisSize}px, remainingSpace=${remainingSpace}px (isRow=${isRow})`);

    // Step 3: Apply flex-grow or flex-shrink based on available space
    let result: FlexItem[];
    
    if (remainingSpace > 0) {
      result = this.applyFlexGrow(itemsWithBasis, remainingSpace, isRow);
    } else if (remainingSpace < 0) {
      result = this.applyFlexShrink(itemsWithBasis, Math.abs(remainingSpace), isRow);
    } else {
      // No remaining space, use flex-basis sizes (in pixels)
      result = itemsWithBasis.map(item => ({
        ...item,
        [isRow ? 'width' : 'height']: item.calculatedFlexBasis
      }));
    }
    
    result.forEach(item => {
      const identifier = this.describeItem(item);
      const size = isRow ? `${item.width}px` : `${item.height}px`;
      console.log(`[FLEX-ITEM] final ${identifier} mainSize=${size} (${isRow ? 'width' : 'height'})`);
    });

    return result;
  }

  /**
   * Calculate total gap spacing for a line of flex items
   * All calculations are done in screen units (pixels)
   */
  private calculateGapSpacing(items: FlexItem[], container: FlexContainer, isRow: boolean): number {
    if (items.length <= 1) {
      return 0; // No gaps needed for single item or empty
    }
    
    // Use column-gap for row direction, row-gap for column direction
    const gapValue = isRow ? container.columnGap : container.rowGap;
    const gapCount = items.length - 1; // Gaps between items
    const totalGapSpacing = gapValue * gapCount;
    
    console.log(`[FLEX-GAP] calculateGapSpacing: isRow=${isRow}, gapValue=${gapValue}px, gapCount=${gapCount}, totalGapSpacing=${totalGapSpacing}px`);
    
    return totalGapSpacing;
  }

  /**
   * Calculate flex-basis for a flex item
   * All calculations are done in screen units (pixels)
   */
  private calculateFlexBasis(item: FlexItem, container: FlexContainer, isRow: boolean): number {
    if (typeof item.flexBasis === 'number') {
      // Already in pixels
      return item.flexBasis;
    }

    if (item.flexBasis === 'auto') {
      // Use the item's main size (width for row, height for column) - already in pixels
      return isRow ? item.baseWidth : item.baseHeight;
    }

    // Parse percentage or other units - all converted to pixels
    if (typeof item.flexBasis === 'string') {
      if (item.flexBasis.endsWith('%')) {
        const percentage = parseFloat(item.flexBasis);
        if (isNaN(percentage)) {
          throw new Error(`Invalid percentage value for flex-basis: ${item.flexBasis}`);
        }
        // Container size is already in CSS pixels
        const containerSize = isRow ? container.width : container.height;
        // Percentage calculations are based on CSS pixels, not affected by DPR
        const result = containerSize * (percentage / 100);

        return result;
      }
      
      if (item.flexBasis.endsWith('px')) {
        const pixelValue = parseFloat(item.flexBasis);
        if (isNaN(pixelValue)) {
          throw new Error(`Invalid pixel value for flex-basis: ${item.flexBasis}`);
        }
        return pixelValue;
      }
      
      throw new Error(`Unsupported flex-basis unit: ${item.flexBasis}`);
    }

    throw new Error(`Invalid flex-basis value: ${item.flexBasis}`);
  }

  /**
   * Apply flex-grow to distribute extra space
   * All calculations in screen units (pixels)
   */
  private applyFlexGrow(items: Array<FlexItem & { calculatedFlexBasis: number }>, extraSpace: number, isRow: boolean): FlexItem[] {
    const totalFlexGrow = items.reduce((sum, item) => sum + item.flexGrow, 0);

    if (totalFlexGrow === 0) {
      // No flex-grow, items keep their flex-basis size (in pixels)
      return items.map(item => ({
        ...item,
        [isRow ? 'width' : 'height']: item.calculatedFlexBasis
      }));
    }

    return items.map(item => {
      const growRatio = item.flexGrow / totalFlexGrow;
      const additionalSize = extraSpace * growRatio;
      const newSize = item.calculatedFlexBasis + additionalSize;
      const identifier = this.describeItem(item);
      console.log(`[FLEX-GROW] ${identifier} flexGrow=${item.flexGrow} ratio=${growRatio.toFixed(3)} additional=${additionalSize}px -> newSize=${newSize}px`);
      
      return {
        ...item,
        [isRow ? 'width' : 'height']: newSize
      };
    });
  }

  /**
   * Apply flex-shrink to reduce item sizes when space is insufficient
   * Distributes negative free space using scaled flex shrink factors:
   * flex-shrink multiplied by the item's flex base size.
   * All calculations in screen units (pixels)
   */
  private applyFlexShrink(items: Array<FlexItem & { calculatedFlexBasis: number }>, deficit: number, isRow: boolean): FlexItem[] {
    // Separate shrinking and non-shrinking items
    const nonShrinkingItems = items.filter(item => Number(item.flexShrink) === 0);
    const shrinkingItems = items.filter(item => Number(item.flexShrink) > 0);
    
    // Calculate space taken by non-shrinking items
    const nonShrinkingSpace = nonShrinkingItems.reduce((sum, item) => sum + item.calculatedFlexBasis, 0);
    
    // Available space after removing deficit
    const totalBasisSpace = items.reduce((sum, item) => sum + item.calculatedFlexBasis, 0);
    const availableSpace = totalBasisSpace - deficit;
    const spaceForShrinkingItems = availableSpace - nonShrinkingSpace;
    
    if (shrinkingItems.length === 0 || spaceForShrinkingItems <= 0) {
      // No shrinking items or no space - keep original sizes or set to 0
      return items.map(item => ({
        ...item,
        [isRow ? 'width' : 'height']: Number(item.flexShrink) === 0 ? item.calculatedFlexBasis : 0
      }));
    }
    
    const totalShrinkingBasis = shrinkingItems.reduce(
      (sum, item) => sum + item.calculatedFlexBasis,
      0,
    );
    const shrinkDeficit = Math.max(0, totalShrinkingBasis - spaceForShrinkingItems);
    const totalScaledShrinkFactor = shrinkingItems.reduce(
      (sum, item) => sum + Number(item.flexShrink) * item.calculatedFlexBasis,
      0,
    );

    return items.map(item => {
      const flexShrinkValue = Number(item.flexShrink);
      
      if (flexShrinkValue === 0) {
        // Non-shrinking items keep their original size
        return {
          ...item,
          [isRow ? 'width' : 'height']: item.calculatedFlexBasis
        };
      }
      
      const scaledShrinkFactor = flexShrinkValue * item.calculatedFlexBasis;
      const shrinkRatio = totalScaledShrinkFactor > 0
        ? scaledShrinkFactor / totalScaledShrinkFactor
        : 0;
      const newSize = item.calculatedFlexBasis - shrinkDeficit * shrinkRatio;
      const identifier = this.describeItem(item);
      console.log(`[FLEX-SHRINK] ${identifier} flexShrink=${flexShrinkValue} scaledFactor=${scaledShrinkFactor.toFixed(3)} shrinkRatio=${shrinkRatio.toFixed(3)} -> newSize=${newSize}px`);
      
      return {
        ...item,
        [isRow ? 'width' : 'height']: Math.max(0, newSize)
      };
    });
  }

  /**
   * Apply align-self algorithm for individual flex item cross-axis alignment
   * Overrides the container's align-items for specific items
   * All calculations are done in screen units (pixels)
   */
  public applyAlignSelf(
    item: FlexItem,
    container: FlexContainer,
    lineHeight: number,
    isRow: boolean
  ): { crossOffset: number; crossSize: number } {
    const alignValue = item.alignSelf === 'auto' ? container.alignItems : item.alignSelf;
    
    console.log(`[FLEX-ALIGN-SELF] Applying align-self for item ${item.element.id}: alignSelf=${item.alignSelf}, containerAlignItems=${container.alignItems}, effectiveValue=${alignValue}, lineHeight=${lineHeight}px, isRow=${isRow}`);

    let result: { crossOffset: number; crossSize: number };
    
    switch (alignValue) {
      case 'flex-start':
        result = this.alignSelfFlexStart(item, isRow);
        break;
      
      case 'flex-end':
        result = this.alignSelfFlexEnd(item, lineHeight, isRow);
        break;
      
      case 'center':
        result = this.alignSelfCenter(item, lineHeight, isRow);
        break;
      
      case 'baseline':
        try {
          result = this.alignSelfBaseline(item, lineHeight, isRow);
        } catch (error) {
          console.warn(`[FLEX-ALIGN-SELF] Baseline not implemented, falling back to flex-start:`, error);
          result = this.alignSelfFlexStart(item, isRow);
        }
        break;
      
      case 'stretch':
        result = this.alignSelfStretch(item, lineHeight, isRow);
        break;
      
      default:
        console.warn(`[FLEX-ALIGN-SELF] Unknown align-self value: ${alignValue}, falling back to flex-start`);
        result = this.alignSelfFlexStart(item, isRow);
    }
    
    console.log(`[FLEX-ALIGN-SELF] Result for item ${item.element.id}: crossOffset=${result.crossOffset}px, crossSize=${result.crossSize}px`);
    
    return result;
  }

  private alignSelfFlexStart(item: FlexItem, isRow: boolean): { crossOffset: number; crossSize: number } {
    const marginStart = isRow ? item.margin.top : item.margin.left;
    const itemCrossSize = isRow ? item.height : item.width;
    
    console.log(`[FLEX-ALIGN-SELF] flex-start for item ${item.element.id}: marginStart=${marginStart}px, itemCrossSize=${itemCrossSize}px`);
    
    return {
      crossOffset: marginStart,
      crossSize: itemCrossSize
    };
  }

  private alignSelfFlexEnd(item: FlexItem, lineHeight: number, isRow: boolean): { crossOffset: number; crossSize: number } {
    const itemCrossSize = isRow ? item.height : item.width;
    const marginEnd = isRow ? item.margin.bottom : item.margin.right;
    const crossOffset = lineHeight - itemCrossSize - marginEnd;
    
    console.log(`[FLEX-ALIGN-SELF] flex-end for item ${item.element.id}: lineHeight=${lineHeight}px, itemCrossSize=${itemCrossSize}px, marginEnd=${marginEnd}px, crossOffset=${crossOffset}px`);
    
    return {
      crossOffset,
      crossSize: itemCrossSize
    };
  }

  private alignSelfCenter(item: FlexItem, lineHeight: number, isRow: boolean): { crossOffset: number; crossSize: number } {
    const itemCrossSize = isRow ? item.height : item.width;
    const marginStart = isRow ? item.margin.top : item.margin.left;
    const marginEnd = isRow ? item.margin.bottom : item.margin.right;
    const availableSpace = lineHeight - itemCrossSize - marginStart - marginEnd;
    const crossOffset = marginStart + (availableSpace / 2);
    
    console.log(`[FLEX-ALIGN-SELF] center for item ${item.element.id}: lineHeight=${lineHeight}px, itemCrossSize=${itemCrossSize}px, marginStart=${marginStart}px, marginEnd=${marginEnd}px, availableSpace=${availableSpace}px, crossOffset=${crossOffset}px`);
    
    return {
      crossOffset,
      crossSize: itemCrossSize
    };
  }

  private alignSelfBaseline(_item: FlexItem, _lineHeight: number, _isRow: boolean): { crossOffset: number; crossSize: number } {
    // Baseline alignment requires text metrics which are not available in this context
    // This should be implemented when text baseline information is available
    throw new Error('Baseline alignment is not yet implemented - requires text metrics');
  }

  private alignSelfStretch(item: FlexItem, lineHeight: number, isRow: boolean): { crossOffset: number; crossSize: number } {
    const marginStart = isRow ? item.margin.top : item.margin.left;
    const marginEnd = isRow ? item.margin.bottom : item.margin.right;
    const stretchedSize = lineHeight - marginStart - marginEnd;
    
    // Check if the item has an explicit height/width that should prevent stretching
    const hasExplicitSize = isRow 
      ? (item.style?.height && item.style.height !== 'auto')
      : (item.style?.width && item.style.width !== 'auto');
    
    // Only stretch if there's no explicit size
    const finalSize = hasExplicitSize 
      ? (isRow ? item.height : item.width)
      : Math.max(0, stretchedSize);
    
    console.log(`[FLEX-ALIGN-SELF] stretch for item ${item.element.id}: lineHeight=${lineHeight}px, marginStart=${marginStart}px, marginEnd=${marginEnd}px, stretchedSize=${stretchedSize}px, hasExplicitSize=${hasExplicitSize}, finalSize=${finalSize}px`);
    
    return {
      crossOffset: marginStart,
      crossSize: finalSize
    };
  }

  /**
   * Sort flex items by their order property
   * Implements stable sorting to maintain source order for items with same order value
   */
  public sortItemsByOrder(items: FlexItem[]): FlexItem[] {
    console.log(`[FLEX-ORDER] Sorting ${items.length} items by order:`, items.map(item => ({
      id: item.element.id,
      order: item.order
    })));
    
    // Create array with original indices for stable sorting
    const itemsWithIndex = items.map((item, index) => ({
      item,
      originalIndex: index
    }));

    // Sort by order value, then by original index for stability
    itemsWithIndex.sort((a, b) => {
      if (a.item.order !== b.item.order) {
        return a.item.order - b.item.order;
      }
      // Same order value, maintain source order
      return a.originalIndex - b.originalIndex;
    });
    
    const result = itemsWithIndex.map(({ item }) => item);
    
    console.log(`[FLEX-ORDER] After sorting:`, result.map(item => ({
      id: item.element.id,
      order: item.order
    })));

    return result;
  }

  /**
   * Apply order sorting with flex-direction consideration
   * Handles interaction between order and flex-direction reverse
   */
  public applySortedOrder(items: FlexItem[], container: FlexContainer): FlexItem[] {
    console.log(`[FLEX-ORDER] Applying sorted order with flexDirection: ${container.flexDirection}`);
    
    const sortedItems = this.sortItemsByOrder(items);
    
    // If flex-direction is reverse, we need to reverse the final order
    const isReverse = container.flexDirection.includes('reverse');
    
    let result: FlexItem[];
    
    if (isReverse) {
      result = [...sortedItems].reverse();
      console.log(`[FLEX-ORDER] Reversed due to flex-direction: ${container.flexDirection}`);
    } else {
      result = sortedItems;
    }
    
    console.log(`[FLEX-ORDER] Final order:`, result.map(item => ({
      id: item.element.id,
      order: item.order
    })));
    
    return result;
  }

  /**
   * Get the effective order value for a flex item
   * Returns the item's order value, defaulting to 0 if not specified
   */
  public getEffectiveOrder(item: FlexItem): number {
    return typeof item.order === 'number' ? item.order : 0;
  }

  /**
   * Validate order values and handle edge cases
   */
  public validateOrderValues(items: FlexItem[]): FlexItem[] {
    return items.map(item => ({
      ...item,
      order: this.normalizeOrderValue(item.order)
    }));
  }

  private normalizeOrderValue(order: number): number {
    // Ensure order is a valid integer
    if (typeof order !== 'number' || isNaN(order)) {
      throw new Error(`Invalid order value: ${order}. Order must be a valid number.`);
    }
    
    // CSS order property accepts any integer, including negative values
    return Math.round(order);
  }
}
