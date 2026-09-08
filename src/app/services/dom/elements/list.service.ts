import { Injectable } from '@angular/core';
import { Color3, Mesh } from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { TextRenderingService } from '../../text/text-rendering.service';
import { TextStyleParserService } from '../../text/text-style-parser.service';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { updateCssLayoutNode } from '../../css-layout-geometry';
import {
  positionRenderedCssBox,
  projectCssPoint,
  projectCssSize,
} from '../../css-render-boundary';

@Injectable({
  providedIn: 'root',
})
export class ListService {
  constructor(
    private textRenderingService: TextRenderingService,
    private textStyleParser: TextStyleParserService,
  ) {}

  public processListChildren(
    dom: BabylonDOM,
    render: BabylonRender,
    children: DOMElement[],
    parent: Mesh,
    styles: StyleRule[],
    listType: 'ul' | 'ol',
  ): void {
    const parentDimensions = dom.context.elementDimensions.get(parent.name);
    if (!parentDimensions) {
      throw new Error(`List dimensions not found for ${parent.name}`);
    }

    const padding = parentDimensions.padding;
    const contentLeft = padding.left;
    let cursorY = padding.top;

    children.forEach((child, index) => {
      const resolvedStyle = render.actions.style.findStyleForElement(
        child,
        styles,
        dom.context.elementStyles,
      );
      if (resolvedStyle?.display?.toLowerCase() === 'none') {
        return;
      }

      const childMesh = dom.actions.createElement(
        dom,
        render,
        child,
        parent,
        styles,
      );
      const childDimensions = dom.context.elementDimensions.get(childMesh.name);
      if (!childDimensions) {
        throw new Error(`List item dimensions not found for ${childMesh.name}`);
      }

      const childTop = cursorY;
      const childBorderBox = {
        x: padding.left,
        y: childTop,
        width: childDimensions.width,
        height: childDimensions.height,
      };
      positionRenderedCssBox(
        render,
        childMesh,
        childBorderBox,
        parentDimensions,
        childMesh.position.z,
      );
      const retainedChild = dom.context.layoutBoxes?.get(childMesh.name);
      if (retainedChild) {
        const positioned = updateCssLayoutNode(
          retainedChild,
          childBorderBox,
          childDimensions,
        );
        dom.context.layoutBoxes.set(childMesh.name, positioned);
      }

      this.addListMarker(
        dom,
        render,
        parent,
        child,
        listType,
        index,
        contentLeft,
        childTop + childDimensions.height / 2,
        resolvedStyle,
      );

      cursorY += childDimensions.height;

      if (child.children?.length) {
        dom.actions.processChildren(
          dom,
          render,
          child.children,
          childMesh,
          styles,
          child,
        );
      }
    });
  }

  private addListMarker(
    dom: BabylonDOM,
    render: BabylonRender,
    parent: Mesh,
    child: DOMElement,
    listType: 'ul' | 'ol',
    index: number,
    contentLeft: number,
    childCenterY: number,
    childStyle?: StyleRule,
  ): void {
    const parentStyle = dom.context.elementStyles.get(parent.name)?.normal;
    const markerStyle: StyleRule = {
      selector: `#${child.id ?? `${parent.name}-item-${index}`}-marker`,
      ...parentStyle,
      ...childStyle,
      background: 'transparent',
      textAlign: 'left',
    };

    if (listType === 'ul') {
      const markerSizePx = 5;
      const marker = render.actions.mesh.createPolygon(
        `${child.id ?? parent.name}-marker`,
        'circle',
        projectCssSize(render, { width: markerSizePx, height: markerSizePx }).width,
        projectCssSize(render, { width: markerSizePx, height: markerSizePx }).height,
        0,
      );
      const parsedColor = render.actions.style.parseBackgroundColor(
        markerStyle.color ?? '#000000',
      );
      const color = parsedColor?.type === 'color'
        ? parsedColor.color
        : new Color3(0, 0, 0);
      marker.material = render.actions.mesh.createMaterial(
        `${child.id ?? parent.name}-marker-material`,
        color,
        parsedColor?.type === 'color' ? parsedColor.alpha : 1,
      );
      const markerPoint = projectCssPoint(render, {
        x: contentLeft - parentDimensionsFor(parent, dom).width / 2 - 11,
        y: childCenterY - parentDimensionsFor(parent, dom).height / 2,
      }, 0.005);
      render.actions.mesh.positionTextMesh(marker, markerPoint.x, markerPoint.y, markerPoint.z);
      render.actions.mesh.parentTextMesh(marker, parent);
      marker.metadata = { isListMarker: true, elementId: child.id };
      return;
    }

    const markerText = `${index + 1}.`;
    const markerElement: DOMElement = {
      type: 'span',
      id: `${child.id ?? parent.name}-marker`,
      textContent: markerText,
    };
    const textProperties = this.textStyleParser.parseTextProperties(markerStyle);
    const dimensions = this.textRenderingService.calculateTextDimensions(
      markerText,
      textProperties,
    );
    const texture = this.textRenderingService.renderTextToTexture(
      markerElement,
      markerText,
      markerStyle,
    );
    const marker = render.actions.mesh.createTextMesh(
      markerElement.id!,
      texture,
      projectCssSize(render, dimensions).width,
      projectCssSize(render, dimensions).height,
    );
    const parentDimensions = parentDimensionsFor(parent, dom);
    const markerPoint = projectCssPoint(render, {
      x: contentLeft - parentDimensions.width / 2 - 8 - dimensions.width / 2,
      y: childCenterY - parentDimensions.height / 2,
    }, 0.005);
    render.actions.mesh.positionTextMesh(marker, markerPoint.x, markerPoint.y, markerPoint.z);
    render.actions.mesh.parentTextMesh(marker, parent);
    marker.metadata = { isListMarker: true, elementId: child.id };
  }
}

function parentDimensionsFor(parent: Mesh, dom: BabylonDOM): { width: number; height: number } {
  const dimensions = dom.context.elementDimensions.get(parent.name);
  if (!dimensions) {
    throw new Error(`List dimensions not found for ${parent.name}`);
  }
  return dimensions;
}
