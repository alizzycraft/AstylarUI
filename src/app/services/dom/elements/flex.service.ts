import { Injectable } from '@angular/core';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { Mesh } from '@babylonjs/core';
import { FlexLayoutService, FlexItem, FlexContainer, FlexLine } from './flex-layout.service';
import { TextRenderingService } from '../../text/text-rendering.service';
import { TextStyleParserService } from '../../text/text-style-parser.service';
import { ElementBorderService } from './element-border.service';
import {
  resolveGridTracks,
  resolveIntrinsicGridRows,
  tokenizeGridTrackList,
} from './grid-track-sizing';

@Injectable({
  providedIn: 'root'
})
export class FlexService {

  constructor(
    private flexLayoutService: FlexLayoutService,
    private textRenderingService: TextRenderingService,
    private textStyleParser: TextStyleParserService,
    private borderService?: ElementBorderService,
  ) { }
  public isFlexContainer(render: BabylonRender, parentElement: DOMElement, styles: StyleRule[], dom?: BabylonDOM): boolean {
    // Use elementStyles map if dom context is available for better performance
    const elementStyles = dom?.context?.elementStyles;
    const style = render.actions.style.findStyleForElement(parentElement, styles, elementStyles);
    const display = style?.display?.toLowerCase();
    const isFlex = display === 'flex' || display === 'inline-flex';
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
    const containerHeight = this.resizeStandaloneAutoHeightContainer(
      parentElement,
      parentStyle,
      styles,
      dom,
      render,
      parent,
      parentDimensions.width,
      parentDimensions.height,
      scaleFactor,
    );

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
    // Element dimensions retain the complete inset from the border box to the
    // content box (border + padding), which is the flex container's layout area.
    const padding = parentDimensions.padding;
    console.log('[FLEX] Container content inset (pixels):', padding);
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

    const childStyles = new Map<DOMElement, StyleRule | undefined>();
    for (const child of children) {
      childStyles.set(
        child,
        render.actions.style.findStyleForElement(child, styles, dom.context.elementStyles),
      );
    }
    const flowChildren = children.filter(
      child => this.classifyFlexChild(childStyles.get(child)) === 'flow',
    );
    const positionedChildren = children.filter(
      child => this.classifyFlexChild(childStyles.get(child)) === 'positioned',
    );

    // Get child items with their styles and dimensions - using FlexLayoutService
    const childItems: FlexItem[] = flowChildren.map(child => {
      // Use findStyleForElement to properly resolve styles including type defaults, classes, and IDs
      const style = childStyles.get(child);
      const margin = this.parseMarginBox(style);
      console.log(`[FLEX] Child ${child.id || child.type} margin: top=${margin.top}, right=${margin.right}, bottom=${margin.bottom}, left=${margin.left}`);
      console.log(`[FLEX] Child ${child.id || child.type} height property: "${style?.height}"`);
      console.log(`[FLEX] Child ${child.id || child.type} width property: "${style?.width}"`);

      // Get explicit width and height from style - proper sizing logic
      let width = 0;
      let height = 0;

      if (style?.width && style.width !== 'auto') {
        if (style.width.endsWith('px')) {
          width = parseFloat(style.width);
          console.log(`[FLEX] Child ${child.id} using px width: ${width}px`);
        } else if (style.width.endsWith('%')) {
          // A flex item's percentage width uses its containing block's
          // content box, excluding the container border and padding insets.
          width = this.resolvePercentageFlexItemSize(
            style.width,
            containerWidth,
            padding.left,
            padding.right,
          );
          console.log(`[DPR] Flex percentage width calculation for ${child.id}: ${style.width} of content box = ${width}px`);
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
        width = isRow ? (containerWidth / flowChildren.length) : containerWidth;
        console.log(`[FLEX] Child ${child.id} using default width: ${width}px (no width specified, isRow=${isRow})`);
      }

      if (style?.height && style.height !== 'auto') {
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
        const intrinsicTextHeight = this.calculateIntrinsicTextHeight(
          child,
          style,
          styles,
          width,
        );
        const intrinsicContainerHeight = intrinsicTextHeight === null
          ? this.calculateIntrinsicContainerHeight(child, style, styles, dom, render, width)
          : null;
        height = intrinsicTextHeight ?? intrinsicContainerHeight ?? 50;
        const heightKind = intrinsicTextHeight !== null
          ? 'intrinsic text'
          : intrinsicContainerHeight !== null
            ? 'intrinsic container'
            : 'default';
        console.log(`[FLEX] Child ${child.id} using ${heightKind} height: ${height}px`);
      }

      console.log(`[FLEX] Child ${child.id} calculated dimensions: width=${width}px, height=${height}px`);

      const flexProperties = this.resolveFlexProperties(render, style);
      const { flexGrow, flexShrink, flexBasis } = flexProperties;
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

        // A flex item's used size is definite for this layout pass. Nested
        // block processing must not later replace it with descendant-driven
        // auto sizing and undo flex grow, shrink, basis, or stretch.
        childMesh.metadata = {
          ...(childMesh.metadata ?? {}),
          astylarFlexAssignedSize: { ...item.size },
        };

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

    for (const child of positionedChildren) {
      const childMesh = dom.actions.createElement(dom, render, child, parent, styles);
      if (child.children?.length) {
        dom.actions.processChildren(dom, render, child.children, childMesh, styles, child);
      }
    }

    console.log(`[FLEX] Finished processing all flex children for parent:`, parent.name);
  }

  private classifyFlexChild(style: StyleRule | undefined): 'flow' | 'positioned' | 'hidden' {
    if (style?.display?.toLowerCase() === 'none') return 'hidden';
    if (style?.position === 'absolute' || style?.position === 'fixed') return 'positioned';
    return 'flow';
  }

  private resizeStandaloneAutoHeightContainer(
    element: DOMElement,
    style: StyleRule,
    styles: StyleRule[],
    dom: BabylonDOM,
    render: BabylonRender,
    mesh: Mesh,
    width: number,
    currentHeight: number,
    scaleFactor: number,
  ): number {
    const hasExplicitHeight = style.height !== undefined && style.height !== 'auto';
    const hasLayoutAssignedHeight =
      mesh.metadata?.astylarFlexAssignedSize?.height !== undefined ||
      mesh.metadata?.astylarGridAssignedSize?.height !== undefined;
    if (mesh.name === 'root-body' || hasExplicitHeight || hasLayoutAssignedHeight) {
      return currentHeight;
    }

    const intrinsicHeight = this.calculateIntrinsicContainerHeight(
      element,
      style,
      styles,
      dom,
      render,
      width,
    );
    if (intrinsicHeight === null || Math.abs(intrinsicHeight - currentHeight) <= 0.1) {
      return currentHeight;
    }

    const borderRadius = this.borderService?.parseBorderRadius(style.borderRadius) ??
      (Number.parseFloat(style.borderRadius ?? '0') || 0);
    const borderWidth = this.borderService?.parseBorderProperties(render, style).width ??
      (Number.parseFloat(style.borderWidth ?? '0') || 0) * scaleFactor;
    render.actions.mesh.updateMeshWithBorderRadius(
      mesh,
      'rectangle',
      width * scaleFactor,
      intrinsicHeight * scaleFactor,
      borderRadius * scaleFactor,
      borderWidth,
    );

    // CSS top positioning fixes the top border edge, so changing auto height
    // moves only the bottom edge and therefore shifts the mesh center upward.
    mesh.position.y += ((currentHeight - intrinsicHeight) / 2) * scaleFactor;
    const stored = dom.context.elementDimensions.get(mesh.name);
    if (stored) {
      dom.context.elementDimensions.set(mesh.name, {
        ...stored,
        height: intrinsicHeight,
      });
    }
    return intrinsicHeight;
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
    const borderWidth = Math.max(0, Number.parseFloat(style?.borderWidth ?? '0') || 0);

    let finalWidth = measuredWidth + totalPadding + borderWidth * 2;

    // Apply minimum width for text inputs
    if (element.type === 'input' && !this.isButtonLikeInput(element)) {
      finalWidth = Math.max(finalWidth, 170);
    }

    console.log(`[FLEX-INTRINSIC] ${element.type}#${element.id}: text="${textToMeasure}", measured=${measuredWidth}px, padding=${totalPadding}px, final=${finalWidth}px`);

    return finalWidth;
  }

  private isButtonLikeInput(element: DOMElement): boolean {
    return element.type === 'input' &&
      ['button', 'submit', 'reset'].includes((element.inputType ?? '').toLowerCase());
  }

  private calculateIntrinsicTextHeight(
    element: DOMElement,
    style: StyleRule | undefined,
    styles: StyleRule[],
    borderBoxWidth: number,
  ): number | null {
    const text = element.type === 'button'
      ? element.value || element.textContent || 'Button'
      : element.type === 'input'
        ? element.value || element.placeholder || ''
        : element.type === 'textarea'
          ? element.value || element.placeholder || ' '
        : element.textContent || '';
    if (element.type !== 'textarea' && !text.trim()) return null;

    const effectiveStyle = { ...this.getInheritedTextStyle(element, styles), ...style };
    const textStyle = this.textStyleParser.parseTextProperties(effectiveStyle);
    const padding = this.parsePadding(style?.padding);
    const borderWidth = Math.max(0, Number.parseFloat(style?.borderWidth ?? '0') || 0);
    const contentWidth = Math.max(
      0,
      borderBoxWidth - padding.left - padding.right - borderWidth * 2,
    );
    const dimensions = this.textRenderingService.calculateTextDimensions(
      text,
      textStyle,
      contentWidth || undefined,
    );
    const lineHeight = dimensions.lineHeight ?? textStyle.fontSize * textStyle.lineHeight;
    if (element.type === 'textarea') {
      const rows = Math.max(1, element.rows ?? 2);
      return rows * lineHeight +
        padding.top + padding.bottom + borderWidth * 2;
    }
    return Math.max(dimensions.height, lineHeight) +
      padding.top + padding.bottom + borderWidth * 2;
  }

  private calculateIntrinsicContainerHeight(
    element: DOMElement,
    style: StyleRule | undefined,
    styles: StyleRule[],
    dom: BabylonDOM,
    render: BabylonRender,
    borderBoxWidth: number,
  ): number | null {
    const children = element.children ?? [];
    if (children.length === 0) return null;

    const padding = this.parsePadding(style?.padding);
    const borderWidth = Math.max(0, Number.parseFloat(style?.borderWidth ?? '0') || 0);
    const contentWidth = Math.max(
      0,
      borderBoxWidth - padding.left - padding.right - borderWidth * 2,
    );
    const fixedGridRows = style?.display?.toLowerCase() === 'grid'
      ? this.parseFixedGridTracks(style.gridTemplateRows)
      : null;
    if (fixedGridRows && fixedGridRows.length > 0) {
      const rowGap = this.parseGapProperties(style!).rowGap;
      return fixedGridRows.reduce((sum, track) => sum + track, 0) +
        rowGap * (fixedGridRows.length - 1) +
        padding.top + padding.bottom + borderWidth * 2;
    }
    if (style?.display?.toLowerCase() === 'grid') {
      const columnCount = Math.max(1, tokenizeGridTrackList(style.gridTemplateColumns).length);
      const { rowGap, columnGap } = this.parseGapProperties(style);
      const columns = resolveGridTracks(
        style.gridTemplateColumns, contentWidth, columnGap, columnCount,
      );
      const contributions = children.map((child, index) => {
        const measured = this.measureIntrinsicFlowChild(
          child, styles, dom, render, columns[index % columns.length] ?? contentWidth,
        );
        return measured
          ? measured.margin.top + measured.height + measured.margin.bottom
          : null;
      });
      const intrinsicRows = resolveIntrinsicGridRows(
        style.gridTemplateRows, columnCount, contributions, true,
      );
      if (intrinsicRows) {
        return intrinsicRows.reduce((sum, track) => sum + track, 0) +
          rowGap * (intrinsicRows.length - 1) +
          padding.top + padding.bottom + borderWidth * 2;
      }
    }
    const isWrappedRowFlex = ['flex', 'inline-flex'].includes(style?.display?.toLowerCase() ?? '') &&
      ['row', 'row-reverse'].includes(style?.flexDirection?.toLowerCase() ?? 'row') &&
      (style?.flexWrap?.toLowerCase() ?? 'nowrap') !== 'nowrap';
    if (isWrappedRowFlex) {
      const { rowGap, columnGap } = this.parseGapProperties(style!);
      let currentLineWidth = 0;
      let currentLineHeight = 0;
      const lineHeights: number[] = [];

      for (const child of children) {
        const measured = this.measureIntrinsicFlowChild(
          child, styles, dom, render, contentWidth,
        );
        if (!measured) continue;

        const outerMainSize = measured.width + measured.margin.left + measured.margin.right;
        const outerCrossSize = measured.height + measured.margin.top + measured.margin.bottom;
        const requiredWidth = currentLineWidth === 0
          ? outerMainSize
          : columnGap + outerMainSize;
        if (currentLineWidth > 0 && currentLineWidth + requiredWidth > contentWidth) {
          lineHeights.push(currentLineHeight);
          currentLineWidth = outerMainSize;
          currentLineHeight = outerCrossSize;
        } else {
          currentLineWidth += requiredWidth;
          currentLineHeight = Math.max(currentLineHeight, outerCrossSize);
        }
      }

      if (currentLineWidth > 0) {
        lineHeights.push(currentLineHeight);
        return lineHeights.reduce((sum, lineHeight) => sum + lineHeight, 0) +
          rowGap * (lineHeights.length - 1) +
          padding.top + padding.bottom + borderWidth * 2;
      }
    }
    const isNowrapRowFlex = ['flex', 'inline-flex'].includes(style?.display?.toLowerCase() ?? '') &&
      ['row', 'row-reverse'].includes(style?.flexDirection?.toLowerCase() ?? 'row') &&
      (style?.flexWrap?.toLowerCase() ?? 'nowrap') === 'nowrap';
    if (isNowrapRowFlex) {
      let largestOuterCrossSize: number | null = null;
      for (const child of children) {
        const measured = this.measureIntrinsicFlowChild(
          child, styles, dom, render, contentWidth,
        );
        if (!measured) continue;
        const outerCrossSize = measured.margin.top + measured.height + measured.margin.bottom;
        largestOuterCrossSize = Math.max(largestOuterCrossSize ?? 0, outerCrossSize);
      }
      if (largestOuterCrossSize !== null) {
        return largestOuterCrossSize + padding.top + padding.bottom + borderWidth * 2;
      }
    }
    const isNowrapColumnFlex = ['flex', 'inline-flex'].includes(style?.display?.toLowerCase() ?? '') &&
      ['column', 'column-reverse'].includes(style?.flexDirection?.toLowerCase() ?? 'row') &&
      (style?.flexWrap?.toLowerCase() ?? 'nowrap') === 'nowrap';
    if (isNowrapColumnFlex) {
      let flexContentHeight = 0;
      let flowChildCount = 0;
      for (const child of children) {
        const measured = this.measureIntrinsicFlowChild(
          child, styles, dom, render, contentWidth,
        );
        if (!measured) continue;
        flexContentHeight += measured.margin.top + measured.height + measured.margin.bottom;
        flowChildCount++;
      }
      if (flowChildCount > 0) {
        const rowGap = this.parseGapProperties(style!).rowGap;
        return flexContentHeight + rowGap * (flowChildCount - 1) +
          padding.top + padding.bottom + borderWidth * 2;
      }
    }
    let contentHeight = 0;
    let previousBottomMargin = 0;
    let hasFlowChild = false;

    for (const child of children) {
      const measured = this.measureIntrinsicFlowChild(
        child, styles, dom, render, contentWidth,
      );
      if (!measured) continue;

      contentHeight += hasFlowChild
        ? Math.max(previousBottomMargin, measured.margin.top)
        : measured.margin.top;
      contentHeight += measured.height;
      previousBottomMargin = measured.margin.bottom;
      hasFlowChild = true;
    }

    if (!hasFlowChild) return null;
    return contentHeight + previousBottomMargin +
      padding.top + padding.bottom + borderWidth * 2;
  }

  public measureIntrinsicFlowChildOuterHeight(
    child: DOMElement,
    styles: StyleRule[],
    dom: BabylonDOM,
    render: BabylonRender,
    contentWidth: number,
  ): number | null {
    const measured = this.measureIntrinsicFlowChild(child, styles, dom, render, contentWidth);
    return measured
      ? measured.margin.top + measured.height + measured.margin.bottom
      : null;
  }

  private measureIntrinsicFlowChild(
    child: DOMElement,
    styles: StyleRule[],
    dom: BabylonDOM,
    render: BabylonRender,
    contentWidth: number,
  ): { width: number; height: number; margin: { top: number; right: number; bottom: number; left: number } } | null {
    const childStyle = render.actions.style.findStyleForElement(
      child,
      styles,
      dom.context.elementStyles,
    );
    if (this.classifyFlexChild(childStyle) !== 'flow') return null;

    let childWidth = childStyle?.width && childStyle.width !== 'auto'
      ? this.parseIntrinsicPixelLength(childStyle.width, contentWidth)
      : ['button', 'input'].includes(child.type)
        ? this.calculateIntrinsicWidth(child, childStyle, styles)
        : contentWidth;
    const definiteFlexBasis = this.parseDefiniteIntrinsicFlexBasis(childStyle, contentWidth);
    if (definiteFlexBasis !== null) childWidth = definiteFlexBasis;
    let childHeight = childStyle?.height && childStyle.height !== 'auto'
      ? this.parseIntrinsicPixelLength(childStyle.height, 0)
      : null;
    if (childHeight === null) {
      childHeight = this.calculateIntrinsicTextHeight(
        child,
        childStyle,
        styles,
        childWidth,
      ) ?? this.calculateIntrinsicContainerHeight(
        child,
        childStyle,
        styles,
        dom,
        render,
        childWidth,
      );
    }
    if (childHeight === null) return null;
    return { width: childWidth, height: childHeight, margin: this.parseMarginBox(childStyle) };
  }

  private parseDefiniteIntrinsicFlexBasis(
    style: StyleRule | undefined,
    percentageReference: number,
  ): number | null {
    const longhand = style?.flexBasis?.trim();
    if (longhand && longhand !== 'auto' && longhand !== 'content') {
      return this.parseIntrinsicPixelLength(longhand, percentageReference);
    }

    const shorthand = style?.flex?.trim();
    if (!shorthand || ['auto', 'none', 'initial'].includes(shorthand)) return null;
    const basis = shorthand.split(/\s+/).at(-1);
    if (!basis || basis === 'auto' || basis === 'content' || !/[a-z%]$/i.test(basis)) {
      return null;
    }
    return this.parseIntrinsicPixelLength(basis, percentageReference);
  }

  private parseIntrinsicPixelLength(value: string, percentageReference: number): number {
    if (value.endsWith('%')) {
      return percentageReference * (Number.parseFloat(value) || 0) / 100;
    }
    return Number.parseFloat(value) || 0;
  }

  private resolvePercentageFlexItemSize(
    value: string,
    containerBorderBoxSize: number,
    startInset: number,
    endInset: number,
  ): number {
    const contentBoxSize = Math.max(
      0,
      containerBorderBoxSize - startInset - endInset,
    );
    return contentBoxSize * (Number.parseFloat(value) || 0) / 100;
  }

  private parseFixedGridTracks(template: string | undefined): number[] | null {
    if (!template?.trim()) return null;
    const expanded = template.replace(
      /repeat\(\s*(\d+)\s*,\s*([+-]?(?:\d+\.?\d*|\.\d+))px\s*\)/gi,
      (_match, count: string, size: string) =>
        Array(Number.parseInt(count, 10)).fill(`${size}px`).join(' '),
    );
    const tokens = expanded.trim().split(/\s+/);
    if (tokens.some(token => !/^[+-]?(?:\d+\.?\d*|\.\d+)px$/i.test(token))) {
      return null;
    }
    return tokens.map(token => Math.max(0, Number.parseFloat(token)));
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

      const mainAxisGap = isRow
        ? flexContainer.columnGap
        : flexContainer.rowGap;
      const mainAxisGapSpacing =
        line.items.length > 1 ? mainAxisGap * (line.items.length - 1) : 0;

      console.log(`[FLEX-GAP] Line ${lineIndex} main-axis spacing: baseAvailableMainSpace=${baseAvailableMainSpace}px, gapSpacing=${mainAxisGapSpacing}px`);
      console.log(`[FLEX] Positioning line ${lineIndex}: crossOffset=${crossOffset}px, crossSize=${line.crossSize}px`);

      const lineLayout = this.positionItemsInLine(
        line.items,
        baseAvailableMainSpace,
        line.crossSize,
        crossOffset,
        alignedLines.length > 1,
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
    } else if (parts.length === 3) {
      // padding: 10px 20px 30px (top horizontal bottom)
      return {
        top: parseFloat(parts[0]) || 0,
        right: parseFloat(parts[1]) || 0,
        bottom: parseFloat(parts[2]) || 0,
        left: parseFloat(parts[1]) || 0,
      };
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
    } else if (parts.length === 3) {
      // margin: 10px 20px 30px (top horizontal bottom)
      return {
        top: parseFloat(parts[0]) || 0,
        right: parseFloat(parts[1]) || 0,
        bottom: parseFloat(parts[2]) || 0,
        left: parseFloat(parts[1]) || 0,
      };
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

  private resolveFlexProperties(
    render: BabylonRender,
    style: StyleRule | undefined,
  ): { flexGrow: number; flexShrink: number; flexBasis: string } {
    const shorthand = render.actions.style.parseFlexShorthand(style?.flex);
    return {
      flexGrow: style?.flexGrow !== undefined
        ? render.actions.style.parseFlexGrow(style.flexGrow)
        : shorthand.flexGrow,
      flexShrink: style?.flexShrink !== undefined
        ? render.actions.style.parseFlexShrink(style.flexShrink)
        : shorthand.flexShrink,
      flexBasis: style?.flexBasis !== undefined
        ? render.actions.style.parseFlexBasis(style.flexBasis)
        : shorthand.flexBasis,
    };
  }

  private parseMarginBox(style?: StyleRule): { top: number; right: number; bottom: number; left: number } {
    const margin = this.parseMargin(style?.margin);
    if (style?.marginTop !== undefined) margin.top = parseFloat(style.marginTop) || 0;
    if (style?.marginRight !== undefined) margin.right = parseFloat(style.marginRight) || 0;
    if (style?.marginBottom !== undefined) margin.bottom = parseFloat(style.marginBottom) || 0;
    if (style?.marginLeft !== undefined) margin.left = parseFloat(style.marginLeft) || 0;
    return margin;
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
    isMultiLine: boolean,
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

    const mainAxisGap = isRow
      ? gapProperties.columnGap
      : gapProperties.rowGap;
    const totalGapSpacing =
      sizedItems.length > 1 ? mainAxisGap * (sizedItems.length - 1) : 0;
    const remainingSpace = Math.max(
      0,
      availableMainSpace - totalSize - totalGapSpacing,
    );

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
        if (!isMultiLine) {
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
              if (!item.style?.height || item.style.height === 'auto') {
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
              if (!item.style?.height || item.style.height === 'auto') {
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
        if (!isMultiLine) {
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
              if (!item.style?.width || item.style.width === 'auto') {
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
              if (!item.style?.width || item.style.width === 'auto') {
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
        position: { x, y, z: 0.1 + (index * 0.01) },
        size: { width: item.width, height: item.height }
      });
    });

    return layout;
  }
}
