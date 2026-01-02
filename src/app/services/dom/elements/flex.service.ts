import { Injectable } from '@angular/core';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { Mesh } from '@babylonjs/core';
import { FlexLayoutService, FlexItem, FlexContainer, FlexLine } from './flex-layout.service';
import { TextRenderingService } from '../../text/text-rendering.service';
import { TextStyleParserService } from '../../text/text-style-parser.service';

@Injectable({
  providedIn: 'root'
})
export class FlexService {

  constructor(
    private flexLayoutService: FlexLayoutService,
    private textRenderingService: TextRenderingService,
    private textStyleParser: TextStyleParserService
  ) { }
  public isFlexContainer(render: BabylonRender, parentElement: DOMElement, styles: StyleRule[], dom?: BabylonDOM): boolean {
    // Use elementStyles map if dom context is available for better performance
    const elementStyles = dom?.context?.elementStyles;
    const style = render.actions.style.findStyleForElement(parentElement, styles, elementStyles);
    const isFlex = style?.display === 'flex';
    console.log(`[FlexService] isFlexContainer check for ${parentElement.id || parentElement.type}: display=${style?.display}, isFlex=${isFlex}`);
    return isFlex;
  }

  public processFlexChildren(
    dom: BabylonDOM,
    render: BabylonRender,
    children: DOMElement[],
    parent: Mesh,
    styles: StyleRule[],
    parentElement: DOMElement
  ): void {

    // Get scale factor for debugging
    const scaleFactor = render.actions.camera.getPixelToWorldScale();

    // Get parent style and dimensions
    const parentStyle = render.actions.style.findStyleForElement(parentElement, styles);
    if (!parentStyle) throw new Error('FlexService: parent style not found');

    // Use parent mesh name to look up dimensions (all elements stored by mesh ID now)
    const parentDimensions = dom.context.elementDimensions.get(parent.name);
    if (!parentDimensions) {
        console.error(`[FlexService] Parent dimensions not found for ${parent.name}. Available keys:`, Array.from(dom.context.elementDimensions.keys()));
        throw new Error(`FlexService: parent dimensions not found for ${parent.name}`);
    }
    // Get container dimensions (in pixels)
    const containerWidth = parentDimensions.width;
    const containerHeight = parentDimensions.height;

    // Get viewport info for debugging
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio;

    // DPR debug log for every flex container
    console.log('[DPR-DEBUG] ' + JSON.stringify({
      parentId: parentElement.id,
      containerWidth,
      containerHeight,
      scaleFactor,
      devicePixelRatio,
      viewportWidth,
      viewportHeight
    }));
    console.log(`[FLEX] Viewport: ${viewportWidth}x${viewportHeight}, DPR: ${devicePixelRatio}, Scale: ${scaleFactor}`);
    console.log(`[FLEX] Container ${parentElement.id} dimensions: ${containerWidth}px × ${containerHeight}px`);
    // Parse container padding (in pixels)
    const padding = this.parsePadding(parentStyle?.padding);
    console.log('[FLEX] Container padding (pixels):', padding);
    // Get flex properties
    const flexDirection = parentStyle.flexDirection || 'row';
    const justifyContent = parentStyle.justifyContent || 'flex-start';
    const alignItems = parentStyle.alignItems || 'stretch';
    const flexWrap = parentStyle.flexWrap || 'nowrap';

    // Parse gap properties
    const gapProperties = this.parseGapProperties(parentStyle);

    console.log(`[FLEX] Container: width=${containerWidth}px, height=${containerHeight}px, flexDirection=${flexDirection}, justifyContent=${justifyContent}, alignItems=${alignItems}, flexWrap=${flexWrap}`);
    console.log(`[FLEX-GAP] Gap properties parsed: gap=${gapProperties.gap}px, rowGap=${gapProperties.rowGap}px, columnGap=${gapProperties.columnGap}px`);

    // Create flex container configuration
    const flexContainer: FlexContainer = {
      width: containerWidth,
      height: containerHeight,
      padding,
      flexDirection,
      justifyContent,
      alignItems,
      flexWrap,
      alignContent: parentStyle.alignContent || 'stretch',
      gap: gapProperties.gap,
      rowGap: gapProperties.rowGap,
      columnGap: gapProperties.columnGap
    };

    console.log(`[FLEX-GAP] FlexContainer created with gap integration: gap=${flexContainer.gap}px, rowGap=${flexContainer.rowGap}px, columnGap=${flexContainer.columnGap}px`);

    // Get child items with their styles and dimensions - using FlexLayoutService
    const childItems: FlexItem[] = children.map(child => {
      const style = styles.find(s => s.selector === `#${child.id}`);
      const margin = this.parseMargin(style?.margin);
      console.log(`[FLEX] Child ${child.id} height property: "${style?.height}"`);
      console.log(`[FLEX] Child ${child.id} width property: "${style?.width}"`);

      // Get explicit width and height from style - proper sizing logic
      let width = 0;
      let height = 0;

      if (style?.width && style.width !== 'auto') {
        if (style.width.endsWith('px')) {
          width = parseFloat(style.width);
          console.log(`[FLEX] Child ${child.id} using px width: ${width}px`);
        } else if (style.width.endsWith('%')) {
          // Percentage calculations are based on CSS pixels, not affected by DPR
          const widthPercent = parseFloat(style.width);
          width = (widthPercent / 100) * containerWidth;
          console.log(`[DPR] Flex percentage width calculation for ${child.id}: ${widthPercent}% of ${containerWidth}px = ${width}px`);
        } else {
          width = parseFloat(style.width);
          console.log(`[FLEX] Child ${child.id} using numeric width: ${width}px`);
        }
      } else if (child.type === 'button' || child.type === 'input') {
        // Calculate intrinsic width for buttons and inputs
        width = this.calculateIntrinsicWidth(child, style, styles);
        console.log(`[FLEX] Child ${child.id} using intrinsic width: ${width}px`);
      } else {
        // Default width if not specified and not an intrinsic element
        // In a row, divide space equally. In a column, use full width.
        const isRow = flexDirection === 'row' || flexDirection === 'row-reverse';
        width = isRow ? (containerWidth / children.length) : containerWidth;
        console.log(`[FLEX] Child ${child.id} using default width: ${width}px (no width specified, isRow=${isRow})`);
      }

      if (style?.height) {
        if (style.height.endsWith('px')) {
          height = parseFloat(style.height);
          console.log(`[FLEX] Child ${child.id} using px height: ${height}px`);
        } else if (style.height.endsWith('%')) {
          // Percentage calculations are based on CSS pixels, not affected by DPR
          const heightPercent = parseFloat(style.height);
          height = (heightPercent / 100) * containerHeight;
          console.log(`[DPR] Flex percentage height calculation for ${child.id}: ${heightPercent}% of ${containerHeight}px = ${height}px`);
        } else {
          height = parseFloat(style.height);
          console.log(`[FLEX] Child ${child.id} using numeric height: ${height}px`);
        }
      } else {
        // Default height if not specified - use a reasonable default
        height = 50; // Default height in pixels
        console.log(`[FLEX] Child ${child.id} using default height: ${height}px (no height specified)`);
      }

      console.log(`[FLEX] Child ${child.id} calculated dimensions: width=${width}px, height=${height}px`);

      const flexGrow = parseFloat(style?.flexGrow || '0') || 0;
      // Fix: Handle flexShrink=0 correctly (don't use || 1 which converts 0 to 1)
      const flexShrinkValue = style?.flexShrink !== undefined ? parseFloat(style.flexShrink) : 1;
      const flexShrink = isNaN(flexShrinkValue) ? 1 : flexShrinkValue;
      const flexBasis = style?.flexBasis || 'auto';
      const alignSelf = style?.alignSelf || 'auto';
      const order = parseFloat(style?.order || '0') || 0;

      // Debug flex-shrink parsing for fs- items
      if (child.id?.startsWith('fs-')) {
        console.log(`[FLEX-SHRINK-DEBUG] Style parsing for ${child.id}: style found=${!!style}, flexShrink from style=${style?.flexShrink}, parsed flexShrink=${flexShrink}`);
      }

      console.log(`[FLEX] Child ${child.id} flex properties:`, {
        flexBasis,
        flexGrow,
        flexShrink,
        order,
        alignSelf
      });

      return {
        element: child,
        style,
        width,
        height,
        baseWidth: width,
        baseHeight: height,
        margin,
        flexGrow,
        flexShrink,
        flexBasis,
        alignSelf,
        order
      };
    });

    console.log('[FLEX] Child items:', childItems);

    // Use FlexLayoutService for advanced calculations
    const isRow = flexDirection === 'row' || flexDirection === 'row-reverse';
    const availableMainSpace = isRow
      ? containerWidth - padding.left - padding.right
      : containerHeight - padding.top - padding.bottom;

    // Apply order sorting first
    console.log(`[FLEX] Before order sorting:`, childItems.map(item => ({
      id: item.element.id,
      order: item.order
    })));

    // Ensure order values are numbers, not strings
    const itemsWithNumericOrder = childItems.map(item => ({
      ...item,
      order: typeof item.order === 'string' ? parseFloat(item.order) || 0 : item.order
    }));

    const orderedItems = this.flexLayoutService.applySortedOrder(itemsWithNumericOrder, flexContainer);

    console.log(`[FLEX] After order sorting:`, orderedItems.map(item => ({
      id: item.element.id,
      order: item.order
    })));

    // Calculate flex layout with proper wrapping (FlexLayoutService will be applied per line)
    const layout = this.calculateFlexLayout(
      orderedItems,
      containerWidth,
      containerHeight,
      padding,
      {
        flexDirection,
        justifyContent,
        alignItems,
        flexWrap,
        alignContent: parentStyle.alignContent || 'stretch'
      },
      render,
      flexContainer
    );

    console.log('[FLEX] Layout with FlexLayoutService:', layout);

    // Create and position child elements according to flex layout
    layout.forEach((item, index) => {
      const child = orderedItems[index];
      console.log(`[FLEX] Creating flex child ${index + 1}/${orderedItems.length}: ${child.element.type}#${child.element.id}`);
      console.log(`[FLEX] Child ${child.element.id} layout (pixels):`, item);
      console.log(`[DPR] Flex child ${child.element.id} position: (${item.position.x}, ${item.position.y}) CSS pixels`);
      console.log(`[DPR] Flex child ${child.element.id} size: ${item.size.width}x${item.size.height} CSS pixels`);

      try {
        // The flex layout positions are in CSS pixels, and createElement will convert them to world units
        const childMesh = dom.actions.createElement(
          dom,
          render,
          child.element,
          parent,
          styles,
          item.position, // positions in CSS pixels
          item.size      // sizes in CSS pixels
        );

        console.log(`[FLEX] Created flex child mesh:`, childMesh.name, `Position:`, childMesh.position);

        // Process nested children if any
        if (child.element.children && child.element.children.length > 0) {
          console.log(`[FLEX] Child ${child.element.id} has ${child.element.children.length} sub-children`);
          dom.actions.processChildren(dom, render, child.element.children, childMesh, styles, child.element);
        }
      } catch (error) {
        console.error(`[FLEX] Error processing flex child ${child.element.type}#${child.element.id}:`, error);
        throw error;
      }
    });

    console.log(`[FLEX] Finished processing all flex children for parent:`, parent.name);
  }

  /**
   * Calculate intrinsic width for elements like buttons and inputs
   */
  private calculateIntrinsicWidth(element: DOMElement, style: StyleRule | undefined, styles: StyleRule[]): number {
    const textStyle = this.getInheritedTextStyle(element, styles);
    const textStyleProperties = this.textStyleParser.parseTextProperties(textStyle);

    // Determine the relevant text for measurement
    let textToMeasure = '';
    if (element.type === 'button') {
      textToMeasure = element.value || element.textContent || 'Button';
    } else if (element.type === 'input') {
      textToMeasure = element.value || element.placeholder || '';
    }

    // Measure text dimensions
    let measuredWidth = 0;
    if (textToMeasure) {
      const dimensions = this.textRenderingService.calculateTextDimensions(textToMeasure, textStyleProperties);
      measuredWidth = dimensions.width;
    }

    // Parse padding
    const padding = this.parsePadding(style?.padding);
    const totalPadding = padding.left + padding.right;

    let finalWidth = measuredWidth + totalPadding;

    // Apply minimum width for text inputs
    if (element.type === 'input') {
      finalWidth = Math.max(finalWidth, 170);
    }

    console.log(`[FLEX-INTRINSIC] ${element.type}#${element.id}: text="${textToMeasure}", measured=${measuredWidth}px, padding=${totalPadding}px, final=${finalWidth}px`);

    return finalWidth;
  }

  /**
   * Helper to get inherited text style (similar to BabylonDOMService)
   */
  private getInheritedTextStyle(element: DOMElement, styles: StyleRule[]): StyleRule {
    let inheritedStyle: StyleRule = {
      selector: element.id ? `#${element.id}` : element.type,
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      fontWeight: 'normal',
      color: '#000000'
    };

    // Apply element type defaults (simplified)
    if (element.type === 'button') {
      inheritedStyle.fontWeight = 'bold';
    }

    // Apply class styles
    if (element.class) {
      const classNames = element.class.split(' ').filter(c => c.trim());
      for (const className of classNames) {
        const classStyle = styles.find(s => s.selector === `.${className}` || s.selector === className);
        if (classStyle) {
          inheritedStyle = { ...inheritedStyle, ...classStyle };
        }
      }
    }

    // Apply ID styles
    if (element.id) {
      const idStyle = styles.find(s => s.selector === `#${element.id}`);
      if (idStyle) {
        inheritedStyle = { ...inheritedStyle, ...idStyle };
      }
    }

    return inheritedStyle;
  }

  /**
   * Calculate flex layout for child items with proper wrapping support
   */
  private calculateFlexLayout(
    childItems: FlexItem[],
    containerWidth: number,
    containerHeight: number,
    padding: { top: number; right: number; bottom: number; left: number },
    flexProps: {
      flexDirection: string;
      justifyContent: string;
      alignItems: string;
      flexWrap: string;
      alignContent: string;
    },
    render: BabylonRender,
    flexContainer: FlexContainer
  ): Array<{
    position: { x: number; y: number; z: number };
    size: { width: number; height: number };
  }> {
    const isRow = flexProps.flexDirection === 'row' || flexProps.flexDirection === 'row-reverse';
    const isReverse = flexProps.flexDirection.includes('reverse');

    // Calculate available space for items (before gap adjustments)
    const baseAvailableMainSpace = isRow
      ? containerWidth - padding.left - padding.right
      : containerHeight - padding.top - padding.bottom;

    const availableCrossSpace = isRow
      ? containerHeight - padding.top - padding.bottom
      : containerWidth - padding.left - padding.right;

    console.log(`[FLEX-GAP] Base available space: main=${baseAvailableMainSpace}px, cross=${availableCrossSpace}px`);

    // Create flex lines based on wrapping (using base available space for wrapping decisions)
    const lines = this.createFlexLines(childItems, baseAvailableMainSpace, flexProps.flexWrap, isRow, {
      gap: flexContainer.gap,
      rowGap: flexContainer.rowGap,
      columnGap: flexContainer.columnGap
    });
    console.log(`[FLEX] Created ${lines.length} flex lines:`, lines);

    // Apply align-content if we have multiple lines
    // Force align-content application for testing even with single line
    const shouldApplyAlignContent = flexProps.flexWrap !== 'nowrap';

    console.log(`[FLEX] Should apply align-content: ${shouldApplyAlignContent}, lines: ${lines.length}, flexWrap: ${flexProps.flexWrap}, alignContent: ${flexProps.alignContent || 'stretch'}`);

    const alignedLines = shouldApplyAlignContent
      ? this.flexLayoutService.applyAlignContent(lines, flexContainer, availableCrossSpace)
      : lines;

    console.log(`[FLEX] After align-content, alignedLines:`,
      alignedLines.map((line, i) => ({
        index: i,
        crossOffset: line.crossOffset !== undefined ? line.crossOffset : 0,
        crossSize: line.crossSize,
        itemCount: line.items.length
      }))
    );

    // Position items within each line
    const layout: Array<{
      position: { x: number; y: number; z: number };
      size: { width: number; height: number };
    }> = [];

    alignedLines.forEach((line, lineIndex) => {
      // Use the crossOffset calculated by alignContent instead of our own counter
      const crossOffset = line.crossOffset !== undefined ? line.crossOffset : 0;

      // Calculate gap-adjusted available main space for this line
      // Account for column-gap spacing between items in the same line
      const columnGapSpacing = line.items.length > 1 ? flexContainer.columnGap * (line.items.length - 1) : 0;
      const gapAdjustedAvailableMainSpace = baseAvailableMainSpace - columnGapSpacing;

      console.log(`[FLEX-GAP] Line ${lineIndex} main-axis gap adjustment: baseAvailableMainSpace=${baseAvailableMainSpace}px, columnGapSpacing=${columnGapSpacing}px, adjustedAvailableMainSpace=${gapAdjustedAvailableMainSpace}px`);
      console.log(`[FLEX] Positioning line ${lineIndex}: crossOffset=${crossOffset}px, crossSize=${line.crossSize}px`);

      const lineLayout = this.positionItemsInLine(
        line.items,
        gapAdjustedAvailableMainSpace,
        line.crossSize,
        crossOffset,
        containerWidth,
        containerHeight,
        padding,
        flexProps,
        isRow,
        isReverse,
        {
          gap: flexContainer.gap,
          rowGap: flexContainer.rowGap,
          columnGap: flexContainer.columnGap
        }
      );

      layout.push(...lineLayout);
    });

    return layout;
  }

  /**
   * Parse padding value from style
   */
  private parsePadding(padding?: string): { top: number; right: number; bottom: number; left: number } {
    if (!padding) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const parts = padding.split(/\s+/);

    if (parts.length === 1) {
      // padding: 10px (all sides)
      const value = parseFloat(parts[0]) || 0;
      return { top: value, right: value, bottom: value, left: value };
    } else if (parts.length === 2) {
      // padding: 10px 20px (vertical horizontal)
      const vValue = parseFloat(parts[0]) || 0;
      const hValue = parseFloat(parts[1]) || 0;
      return { top: vValue, right: hValue, bottom: vValue, left: hValue };
    } else if (parts.length === 4) {
      // padding: 10px 20px 30px 40px (top right bottom left)
      return {
        top: parseFloat(parts[0]) || 0,
        right: parseFloat(parts[1]) || 0,
        bottom: parseFloat(parts[2]) || 0,
        left: parseFloat(parts[3]) || 0
      };
    }

    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  /**
   * Parse margin value from style
   */
  private parseMargin(margin?: string): { top: number; right: number; bottom: number; left: number } {
    if (!margin) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const parts = margin.split(/\s+/);

    if (parts.length === 1) {
      // margin: 10px (all sides)
      const value = parseFloat(parts[0]) || 0;
      return { top: value, right: value, bottom: value, left: value };
    } else if (parts.length === 2) {
      // margin: 10px 20px (vertical horizontal)
      const vValue = parseFloat(parts[0]) || 0;
      const hValue = parseFloat(parts[1]) || 0;
      return { top: vValue, right: hValue, bottom: vValue, left: hValue };
    } else if (parts.length === 4) {
      // margin: 10px 20px 30px 40px (top right bottom left)
      return {
        top: parseFloat(parts[0]) || 0,
        right: parseFloat(parts[1]) || 0,
        bottom: parseFloat(parts[2]) || 0,
        left: parseFloat(parts[3]) || 0
      };
    }

    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  /**
   * Parse gap properties from style rule
   * Handles pixel values (e.g., "10px"), numeric values (e.g., "10"), and invalid values with fallback to 0
   * Prioritizes specific rowGap/columnGap over general gap property
   */
  private parseGapProperties(style: StyleRule): { gap: number; rowGap: number; columnGap: number } {
    // Helper function to parse a single gap value
    const parseGapValue = (value?: string): number => {
      if (!value) return 0;

      // Handle pixel values (e.g., "10px")
      if (typeof value === 'string' && value.endsWith('px')) {
        const parsed = parseFloat(value);
        return isNaN(parsed) || parsed < 0 ? 0 : parsed;
      }

      // Handle numeric values (e.g., "10" or 10)
      const parsed = parseFloat(value);
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    };

    // Parse general gap property
    const generalGap = parseGapValue(style.gap);

    // Parse specific gap properties, prioritizing them over general gap
    const rowGap = style.rowGap ? parseGapValue(style.rowGap) : generalGap;
    const columnGap = style.columnGap ? parseGapValue(style.columnGap) : generalGap;

    console.log(`[FLEX-GAP] Parsed gap properties: gap=${generalGap}px, rowGap=${rowGap}px, columnGap=${columnGap}px`);
    console.log(`[FLEX-GAP] Original style values: gap="${style.gap}", rowGap="${style.rowGap}", columnGap="${style.columnGap}"`);

    return {
      gap: generalGap,
      rowGap,
      columnGap
    };
  }

  /**
   * Create flex lines based on wrapping behavior
   */
  private createFlexLines(
    items: FlexItem[],
    availableMainSpace: number,
    flexWrap: string,
    isRow: boolean,
    gapProperties?: { gap: number; rowGap: number; columnGap: number }
  ): FlexLine[] {
    console.log(`[FLEX-WRAP] Creating flex lines: availableMainSpace=${availableMainSpace}px, flexWrap=${flexWrap}, isRow=${isRow}`);

    if (flexWrap === 'nowrap') {
      // Single line - all items go in one line
      const crossSize = Math.max(...items.map(item =>
        isRow ? item.height : item.width
      ));
      console.log(`[FLEX-WRAP] Using nowrap: all ${items.length} items in one line, crossSize=${crossSize}px`);
      return [{
        items,
        crossSize,
        mainSize: availableMainSpace,
        crossOffset: undefined
      }];
    }

    // Multi-line wrapping
    const lines: FlexLine[] = [];
    let currentLine: FlexItem[] = [];
    let currentLineSize = 0;

    console.log(`[FLEX-WRAP] Starting multi-line wrapping for ${items.length} items`);

    for (const item of items) {
      // Use flex-basis for wrapping decisions, not current width/height
      let itemMainSize: number;
      if (typeof item.flexBasis === 'number') {
        itemMainSize = item.flexBasis;
      } else if (item.flexBasis === 'auto') {
        itemMainSize = isRow ? item.baseWidth : item.baseHeight;
      } else if (typeof item.flexBasis === 'string' && item.flexBasis.endsWith('%')) {
        const percentage = parseFloat(item.flexBasis);
        const containerMainSize = isRow ?
          (availableMainSpace) : // Use available space, not total container size
          (availableMainSpace);
        itemMainSize = containerMainSize * (percentage / 100);
        console.log(`[FLEX] Wrapping calculation for ${item.element.id}: ${percentage}% of ${containerMainSize}px = ${itemMainSize}px`);
      } else {
        itemMainSize = isRow ? item.baseWidth : item.baseHeight;
      }

      const itemMarginMain = isRow
        ? item.margin.left + item.margin.right
        : item.margin.top + item.margin.bottom;
      const totalItemSize = itemMainSize + itemMarginMain;

      // Calculate gap spacing needed if this item is added to the current line
      const gapSpacing = gapProperties && currentLine.length > 0
        ? (isRow ? gapProperties.columnGap : gapProperties.rowGap)
        : 0;

      const totalSizeWithGap = totalItemSize + gapSpacing;

      // Check if item fits in current line
      console.log(`[FLEX-GAP] Wrapping check for ${item.element.id}: currentLineSize=${currentLineSize}px + totalItemSize=${totalItemSize}px + gapSpacing=${gapSpacing}px = ${currentLineSize + totalSizeWithGap}px vs availableMainSpace=${availableMainSpace}px`);

      if (currentLine.length === 0 || currentLineSize + totalSizeWithGap <= availableMainSpace) {
        console.log(`[FLEX] Item ${item.element.id} fits in current line`);
        currentLine.push(item);
        currentLineSize += totalSizeWithGap;
      } else {
        console.log(`[FLEX] Item ${item.element.id} does NOT fit, starting new line`);
        // Start new line
        if (currentLine.length > 0) {
          const crossSize = Math.max(...currentLine.map(lineItem =>
            isRow ? lineItem.height : lineItem.width
          ));
          lines.push({
            items: currentLine,
            crossSize,
            mainSize: currentLineSize,
            crossOffset: undefined
          });
        }

        currentLine = [item];
        currentLineSize = totalItemSize;
      }
    }

    // Add the last line
    if (currentLine.length > 0) {
      const crossSize = Math.max(...currentLine.map(lineItem =>
        isRow ? lineItem.height : lineItem.width
      ));
      lines.push({
        items: currentLine,
        crossSize,
        mainSize: currentLineSize,
        crossOffset: undefined
      });
    }

    console.log(`[FLEX-WRAP] Created ${lines.length} flex lines:`,
      lines.map((line, i) => ({
        index: i,
        itemCount: line.items.length,
        crossSize: line.crossSize,
        mainSize: line.mainSize,
        items: line.items.map(item => item.element.id)
      }))
    );

    return lines;
  }

  /**
   * Position items within a single flex line
   * Applies FlexLayoutService to each line for proper sizing
   */
  private positionItemsInLine(
    items: FlexItem[],
    availableMainSpace: number,
    lineCrossSize: number,
    crossOffset: number,
    containerWidth: number,
    containerHeight: number,
    padding: { top: number; right: number; bottom: number; left: number },
    flexProps: {
      flexDirection: string;
      justifyContent: string;
      alignItems: string;
      flexWrap: string;
      alignContent: string;
    },
    isRow: boolean,
    isReverse: boolean,
    gapProperties: { gap: number; rowGap: number; columnGap: number }
  ): Array<{
    position: { x: number; y: number; z: number };
    size: { width: number; height: number };
  }> {
    // Apply FlexLayoutService to this line for proper flex-grow/shrink
    const flexContainer: FlexContainer = {
      width: containerWidth,
      height: containerHeight,
      padding,
      flexDirection: flexProps.flexDirection,
      justifyContent: flexProps.justifyContent,
      alignItems: flexProps.alignItems,
      flexWrap: flexProps.flexWrap,
      alignContent: flexProps.alignContent || 'stretch',
      gap: gapProperties.gap,
      rowGap: gapProperties.rowGap,
      columnGap: gapProperties.columnGap
    };

    console.log(`[FLEX-POSITION] Line container: width=${containerWidth}px, height=${containerHeight}px, flexDirection=${flexProps.flexDirection}, alignItems=${flexProps.alignItems}, lineCrossSize=${lineCrossSize}px`);

    // For multi-line layouts, we need to calculate flex-grow/shrink per line
    // The availableMainSpace here is for the entire container, but we need the space available for this specific line
    const lineAvailableSpace = availableMainSpace; // This is correct for single line or per-line calculation

    console.log(`[FLEX-LINE] Processing line with ${items.length} items, availableMainSpace=${lineAvailableSpace}px`);
    console.log(`[FLEX-LINE] Container: ${flexContainer.width}px × ${flexContainer.height}px`);

    // Check if this is the flex-shrink test
    const isFlexShrinkTest = items.some(item => item.element.id?.startsWith('fs-'));
    if (isFlexShrinkTest) {
      console.log(`[FLEX-SHRINK-TEST] Processing flex-shrink test container`);
    }

    items.forEach(item => {
      console.log(`[FLEX-SHRINK-DEBUG] Item ${item.element.id}: width=${item.width}px, height=${item.height}px, flexGrow=${item.flexGrow}, flexShrink=${item.flexShrink} (${typeof item.flexShrink}), flexBasis=${item.flexBasis}`);
    });

    const sizedItems = this.flexLayoutService.calculateFlexItemSizes(
      items,
      flexContainer,
      lineAvailableSpace
    );

    sizedItems.forEach(item => {
      console.log(`[FLEX-SHRINK-DEBUG] After FlexLayoutService - Item ${item.element.id}: width=${item.width}px, height=${item.height}px`);
    });

    console.log(`[FLEX] Line items after FlexLayoutService:`, sizedItems.map(item => ({
      id: item.element.id,
      width: item.width,
      height: item.height
    })));
    // Calculate total size of items in this line (using sized items)
    const totalSize = sizedItems.reduce((total, item) => {
      if (isRow) {
        return total + item.width + item.margin.left + item.margin.right;
      } else {
        return total + item.height + item.margin.top + item.margin.bottom;
      }
    }, 0);

    const remainingSpace = Math.max(0, availableMainSpace - totalSize);

    // Calculate spacing for justify-content
    let spacing = 0;
    let startOffset = 0;

    switch (flexProps.justifyContent) {
      case 'flex-start':
        startOffset = 0;
        break;
      case 'flex-end':
        startOffset = remainingSpace;
        break;
      case 'center':
        startOffset = remainingSpace / 2;
        break;
      case 'space-between':
        if (items.length > 1) {
          spacing = remainingSpace / (items.length - 1);
        }
        startOffset = 0;
        break;
      case 'space-around':
        spacing = remainingSpace / items.length;
        startOffset = spacing / 2;
        break;
      case 'space-evenly':
        spacing = remainingSpace / (items.length + 1);
        startOffset = spacing;
        break;
    }

    // Position each item
    let currentOffset = startOffset;
    const layout: Array<{
      position: { x: number; y: number; z: number };
      size: { width: number; height: number };
    }> = [];

    const itemsToProcess = isReverse ? [...sizedItems].reverse() : sizedItems;

    itemsToProcess.forEach((item, index) => {
      let x: number, y: number;

      if (isRow) {
        // Calculate X position (main axis)
        const itemLeft = padding.left + currentOffset + item.margin.left;
        x = -(containerWidth / 2) + itemLeft + (item.width / 2);

        // Calculate Y position (cross axis) - handle single line vs multi-line differently
        if (crossOffset === 0) {
          // Single line - check align-self first, then fall back to container's align-items
          const alignValue = item.alignSelf === 'auto' ? flexProps.alignItems : item.alignSelf;

          console.log(`[FLEX-POSITION] Single-line item ${item.element.id}: alignSelf=${item.alignSelf}, containerAlignItems=${flexProps.alignItems}, effectiveValue=${alignValue}`);

          switch (alignValue) {
            case 'flex-start':
              y = (containerHeight / 2) - padding.top - item.margin.top - (item.height / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: flex-start, y=${y}`);
              break;
            case 'flex-end':
              y = -(containerHeight / 2) + padding.bottom + item.margin.bottom + (item.height / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: flex-end, y=${y}`);
              break;
            case 'center':
              // Center within the available container space
              const availableHeight = containerHeight - padding.top - padding.bottom;
              const itemCenterOffset = (availableHeight - item.height) / 2;
              y = (containerHeight / 2) - padding.top - itemCenterOffset - (item.height / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: center, availableHeight=${availableHeight}px, itemCenterOffset=${itemCenterOffset}px, y=${y}`);
              break;
            case 'stretch':
              // For stretch, we should adjust the item height to fill the container height
              if (!item.style?.height) {
                const availableHeight = containerHeight - padding.top - padding.bottom;
                item.height = availableHeight - item.margin.top - item.margin.bottom;
                console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: stretch, new height=${item.height}px`);
                y = 0; // Center of container when stretched to full height
              } else {
                // Item has explicit height, so it can't stretch - position at flex-start instead
                y = (containerHeight / 2) - padding.top - item.margin.top - (item.height / 2);
                console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: stretch with explicit height, positioned at flex-start, y=${y}`);
              }
              console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: stretch, y=${y}`);
              break;
            default:
              y = (containerHeight / 2) - padding.top - item.margin.top - (item.height / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: default, y=${y}`);
          }
        } else {
          // Multi-line - position within the specific line
          const baseCrossPos = padding.top + crossOffset;

          console.log(`[FLEX-POSITION] Multi-line item ${item.element.id}: baseCrossPos=${baseCrossPos}px, crossOffset=${crossOffset}px, lineCrossSize=${lineCrossSize}px`);

          // Check if item has align-self that overrides container's align-items
          const alignValue = item.alignSelf === 'auto' ? flexProps.alignItems : item.alignSelf;

          switch (alignValue) {
            case 'flex-start':
              y = (containerHeight / 2) - baseCrossPos - item.margin.top - (item.height / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: flex-start, y=${y}`);
              break;
            case 'flex-end':
              y = (containerHeight / 2) - baseCrossPos - lineCrossSize + item.margin.bottom + (item.height / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: flex-end, y=${y}`);
              break;
            case 'center':
              const centerOffset = (lineCrossSize - item.height) / 2;
              y = (containerHeight / 2) - baseCrossPos - centerOffset - (item.height / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: center, centerOffset=${centerOffset}px, y=${y}`);
              break;
            case 'stretch':
              // For stretch, we should adjust the item height to fill the line height
              if (!item.style?.height) {
                item.height = lineCrossSize - item.margin.top - item.margin.bottom;
                console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: stretch, new height=${item.height}px`);
                y = (containerHeight / 2) - baseCrossPos - (lineCrossSize / 2);
              } else {
                // Item has explicit height, so it can't stretch - position at flex-start instead
                y = (containerHeight / 2) - baseCrossPos - item.margin.top - (item.height / 2);
                console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: stretch with explicit height, positioned at flex-start, y=${y}`);
              }
              console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: stretch, y=${y}`);
              break;
            default:
              y = (containerHeight / 2) - baseCrossPos - item.margin.top - (item.height / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: default, y=${y}`);
          }
        }

        // Add gap spacing between items (except after the last item)
        const gapSpacing = index < itemsToProcess.length - 1 ? gapProperties.columnGap : 0;
        currentOffset += item.width + item.margin.left + item.margin.right + spacing + gapSpacing;
      } else {
        // Calculate Y position (main axis)
        const itemTop = padding.top + currentOffset + item.margin.top;
        y = (containerHeight / 2) - itemTop - (item.height / 2);

        // Calculate X position (cross axis) - handle single line vs multi-line differently
        if (crossOffset === 0) {
          // Single line - check align-self first, then fall back to container's align-items
          const alignValue = item.alignSelf === 'auto' ? flexProps.alignItems : item.alignSelf;

          console.log(`[FLEX-POSITION] Single-line item ${item.element.id}: alignSelf=${item.alignSelf}, containerAlignItems=${flexProps.alignItems}, effectiveValue=${alignValue}`);

          switch (alignValue) {
            case 'flex-start':
              x = -(containerWidth / 2) + padding.left + item.margin.left + (item.width / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: flex-start, x=${x}`);
              break;
            case 'flex-end':
              x = (containerWidth / 2) - padding.right - item.margin.right - (item.width / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: flex-end, x=${x}`);
              break;
            case 'center':
              // Center within the available container space
              const availableWidth = containerWidth - padding.left - padding.right;
              const itemCenterOffset = (availableWidth - item.width) / 2;
              x = -(containerWidth / 2) + padding.left + itemCenterOffset + (item.width / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: center, availableWidth=${availableWidth}px, itemCenterOffset=${itemCenterOffset}px, x=${x}`);
              break;
            case 'stretch':
              // For stretch, we should adjust the item width to fill the container width
              if (!item.style?.width) {
                const availableWidth = containerWidth - padding.left - padding.right;
                item.width = availableWidth - item.margin.left - item.margin.right;
                console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: stretch, new width=${item.width}px`);
                x = 0; // Center of container when stretched to full width
              } else {
                // Item has explicit width, so it can't stretch - position at flex-start instead
                x = -(containerWidth / 2) + padding.left + item.margin.left + (item.width / 2);
                console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: stretch with explicit width, positioned at flex-start, x=${x}`);
              }
              console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: stretch, x=${x}`);
              break;
            default:
              x = -(containerWidth / 2) + padding.left + item.margin.left + (item.width / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} single-line align: default, x=${x}`);
          }
        } else {
          // Multi-line - position within the specific line
          const baseCrossPos = padding.left + crossOffset;

          console.log(`[FLEX-POSITION] Multi-line item ${item.element.id}: baseCrossPos=${baseCrossPos}px, crossOffset=${crossOffset}px, lineCrossSize=${lineCrossSize}px`);

          // Check if item has align-self that overrides container's align-items
          const alignValue = item.alignSelf === 'auto' ? flexProps.alignItems : item.alignSelf;

          switch (alignValue) {
            case 'flex-start':
              x = -(containerWidth / 2) + baseCrossPos + item.margin.left + (item.width / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: flex-start, x=${x}`);
              break;
            case 'flex-end':
              x = -(containerWidth / 2) + baseCrossPos + lineCrossSize - item.margin.right - (item.width / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: flex-end, x=${x}`);
              break;
            case 'center':
              const centerOffset = (lineCrossSize - item.width) / 2;
              x = -(containerWidth / 2) + baseCrossPos + centerOffset + (item.width / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: center, centerOffset=${centerOffset}px, x=${x}`);
              break;
            case 'stretch':
              // For stretch, we should adjust the item width to fill the line width
              if (!item.style?.width) {
                item.width = lineCrossSize - item.margin.left - item.margin.right;
                console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: stretch, new width=${item.width}px`);
                x = -(containerWidth / 2) + baseCrossPos + (lineCrossSize / 2);
              } else {
                // Item has explicit width, so it can't stretch - position at flex-start instead
                x = -(containerWidth / 2) + baseCrossPos + item.margin.left + (item.width / 2);
                console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: stretch with explicit width, positioned at flex-start, x=${x}`);
              }
              console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: stretch, x=${x}`);
              break;
            default:
              x = -(containerWidth / 2) + baseCrossPos + item.margin.left + (item.width / 2);
              console.log(`[FLEX-POSITION] Item ${item.element.id} align-self: default, x=${x}`);
          }
        }

        // Add gap spacing between items (except after the last item)
        const gapSpacing = index < itemsToProcess.length - 1 ? gapProperties.rowGap : 0;
        currentOffset += item.height + item.margin.top + item.margin.bottom + spacing + gapSpacing;
      }

      layout.push({
        position: { x, y, z: 0.01 + (index * 0.01) },
        size: { width: item.width, height: item.height }
      });
    });

    return layout;
  }
}