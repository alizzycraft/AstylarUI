import { Injectable } from '@angular/core';
import { Color3, Mesh } from '@babylonjs/core';
import { DOMElement } from '../../../types/dom-element';
import { StyleRule } from '../../../types/style-rule';
import { TextRenderingService } from '../../text/text-rendering.service';
import { TextStyleParserService } from '../../text/text-style-parser.service';
import { BabylonDOM } from '../interfaces/dom.types';
import { BabylonRender } from '../interfaces/render.types';
import { updateCssLayoutNode } from '../../css-layout-geometry';

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

    const scale = render.actions.camera.getPixelToWorldScale();
    const padding = parentDimensions.padding;
    const contentLeft = -parentDimensions.width / 2 + padding.left;
    let cursorY = parentDimensions.height / 2 - padding.top;

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

      const childCenterX = contentLeft + childDimensions.width / 2;
      const childCenterY = cursorY - childDimensions.height / 2;
      render.actions.mesh.positionTextMesh(
        childMesh,
        childCenterX * scale,
        childCenterY * scale,
        childMesh.position.z,
      );
      const retainedChild = dom.context.layoutBoxes?.get(childMesh.name);
      if (retainedChild) {
        dom.context.layoutBoxes.set(childMesh.name, updateCssLayoutNode(
          retainedChild,
          {
            x: padding.left,
            y: parentDimensions.height / 2 - childCenterY - childDimensions.height / 2,
          },
          childDimensions,
        ));
      }

      this.addListMarker(
        dom,
        render,
        parent,
        child,
        listType,
        index,
        contentLeft,
        childCenterY,
        resolvedStyle,
      );

      cursorY -= childDimensions.height;

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
    const scale = render.actions.camera.getPixelToWorldScale();
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
        markerSizePx * scale,
        markerSizePx * scale,
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
      render.actions.mesh.positionTextMesh(
        marker,
        (contentLeft - 11) * scale,
        childCenterY * scale,
        0.005,
      );
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
      dimensions.width * scale,
      dimensions.height * scale,
    );
    render.actions.mesh.positionTextMesh(
      marker,
      (contentLeft - 8 - dimensions.width / 2) * scale,
      childCenterY * scale,
      0.005,
    );
    render.actions.mesh.parentTextMesh(marker, parent);
    marker.metadata = { isListMarker: true, elementId: child.id };
  }
}
