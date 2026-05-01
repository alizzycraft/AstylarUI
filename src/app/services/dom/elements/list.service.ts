import { Injectable } from "@angular/core";
import { DOMElement } from "../../../types/dom-element";
import { StyleRule } from "../../../types/style-rule";
import { Mesh, Color3 } from "@babylonjs/core";
import { BabylonDOM } from "../interfaces/dom.types";
import { BabylonRender } from "../interfaces/render.types";

@Injectable({
  providedIn: "root",
})
export class ListService {
  public processListChildren(
    dom: BabylonDOM,
    render: BabylonRender,
    children: DOMElement[],
    parent: Mesh,
    styles: StyleRule[],
    listType: "ul" | "ol",
  ): void {
    console.log(
      `📋 Processing ${children.length} list items in ${listType} container "${parent.name}"`,
    );

    try {
      // Get list item spacing from parent style
      const listItemSpacing = this.parseListItemSpacing(dom, parent);
      console.log(`📐 List item spacing:`, listItemSpacing);

      // Calculate automatic item height based on container size and number of items
      const containerHeight = this.getContainerAvailableHeight(
        dom,
        render,
        parent,
      );
      const parentId = this.getElementIdFromMeshName(parent.name);
      console.log(
        `[LIST CONTAINER DEBUG] Container: ${parentId}, height: ${containerHeight}, itemCount: ${children.length}, spacing: ${listItemSpacing}`,
      );
      const automaticItemHeight = this.calculateAutomaticItemHeight(
        containerHeight,
        children.length,
        listItemSpacing,
      );
      console.log(
        `📊 ${listType.toUpperCase()} Container "${parent.name}": height=${containerHeight}px, items=${children.length}, auto item height=${automaticItemHeight}px`,
      );

      let currentY = 0; // Start at top of container

      children.forEach((child, index) => {
        console.log(
          `📝 Processing list item ${index + 1}/${children.length}: ${child.type}#${child.id}`,
        );
        console.log(
          `📍 Item ${index + 1} positioning: currentY=${currentY}, height=${automaticItemHeight}, spacing=${listItemSpacing}`,
        );

        try {
          // Create the list item with automatic positioning and height
          const listItemMesh = this.createListItem(
            dom,
            render,
            child,
            parent,
            styles,
            currentY,
            index,
            listType,
            automaticItemHeight,
            parentId || undefined,
          );
          console.log(
            `✅ Created list item mesh:`,
            listItemMesh.name,
            `Position:`,
            listItemMesh.position,
          );
          console.log(
            `📏 Item ${index + 1} final position: x=${listItemMesh.position.x}, y=${listItemMesh.position.y}, z=${listItemMesh.position.z}`,
          );

          // Determine the actual height for this item
          const elementStyles = child.id
            ? dom.context.elementStyles.get(child.id)
            : undefined;
          const explicitStyle = elementStyles?.normal;
          let itemHeight = automaticItemHeight;
          if (
            explicitStyle?.height &&
            typeof explicitStyle.height === "string" &&
            explicitStyle.height.endsWith("px")
          ) {
            itemHeight = parseFloat(explicitStyle.height);
          }

          // Move to next item position
          console.log(
            `📐 Item ${index + 1} height: ${itemHeight}, moving currentY from ${currentY} to ${currentY + itemHeight + listItemSpacing}`,
          );
          currentY += itemHeight + listItemSpacing;

          // Process nested children if any
          if (child.children && child.children.length > 0) {
            console.log(
              `🔄 List item ${child.id} has ${child.children.length} sub-children`,
            );
            this.processListChildren(
              dom,
              render,
              child.children,
              listItemMesh,
              styles,
              child.type as "ul" | "ol",
            );
          }
        } catch (error) {
          console.error(
            `❌ Error processing list item ${child.type}#${child.id}:`,
            error,
          );
          throw error;
        }
      });

      console.log(
        `✅ Successfully processed all ${children.length} list items for ${listType}`,
      );
      console.log(
        `📊 Final positioning summary for ${listType}: ${children.length} items, final currentY=${currentY}`,
      );

      // Check if items fit within container bounds
      const totalContentHeight = currentY - listItemSpacing; // Remove spacing after last item
      console.log(
        `📏 Container ${listType} available height: ${containerHeight}px, total content height: ${totalContentHeight}px`,
      );
      if (totalContentHeight <= containerHeight) {
        console.log(`✅ All items fit perfectly within ${listType} container`);
      } else {
        console.warn(
          `⚠️ Content overflow in ${listType}: needed ${totalContentHeight}px but container has ${containerHeight}px`,
        );
      }
    } catch (error) {
      console.error(
        `❌ Critical error in processListChildren for ${listType}:`,
        error,
      );
      throw error;
    }
  }

  private getContainerAvailableHeight(
    dom: BabylonDOM,
    render: BabylonRender,
    parentMesh: Mesh,
  ): number {
    // Get the container's actual content height (excluding padding)
    const parentId = this.getElementIdFromMeshName(parentMesh.name);
    console.log(
      `🔍 Getting container height for: ${parentMesh.name}, extracted ID: ${parentId}`,
    );

    if (parentId) {
      const parentStyle = dom.context.elementStyles.get(parentId)?.normal;
      console.log(`📋 Parent style found:`, parentStyle);

      if (parentStyle) {
        // Get the container's dimensions from our element dimensions cache
        const containerDimensions = dom.context.elementDimensions.get(parentId);
        console.log(`📐 Container dimensions:`, containerDimensions);

        if (containerDimensions) {
          // Calculate available height by subtracting padding
          const padding = containerDimensions.padding || {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          };
          const availableHeight =
            containerDimensions.height - padding.top - padding.bottom;
          console.log(
            `📏 Calculated available height: ${availableHeight} (total: ${containerDimensions.height}, padding: ${padding.top + padding.bottom})`,
          );
          return Math.max(availableHeight, 50); // Minimum 50px height
        }
      }
    }

    return 0;
  }

  private getElementIdFromMeshName(meshName: string): string | null {
    // Extract element ID from mesh name patterns
    console.log(`🔍 Extracting ID from mesh name: "${meshName}"`);

    // Handle different mesh naming patterns
    if (meshName.includes("-")) {
      const parts = meshName.split("-");
      console.log(`📝 Split parts:`, parts);

      // For containers like "unordered-list" or "ordered-list", the ID is the full compound name
      if (parts.length === 2 && parts[1] === "list") {
        const id = parts[0] + "-" + parts[1]; // "unordered-list" or "ordered-list"
        console.log(`📋 Container ID extracted: "${id}"`);
        return id;
      }

      // For other elements, last part is usually the ID
      const id = parts[parts.length - 1];
      console.log(`📄 Element ID extracted: "${id}"`);
      return id;
    }

    // Fallback: use the whole name as ID
    console.log(`⚠️ Using full mesh name as ID: "${meshName}"`);
    return meshName;
  }

  private addListIndicator(
    dom: BabylonDOM,
    render: BabylonRender,
    listItemMesh: Mesh,
    listType: "ul" | "ol",
    index: number,
    style: StyleRule,
  ): void {
    console.log(`🔘 Adding ${listType} indicator for item ${index + 1}`);
    const scaleFactor = render.actions.camera.getPixelToWorldScale();
    // Create indicator based on list type
    let indicatorMesh: any;
    const indicatorSizeInPx = 6;
    const indicatorSize = indicatorSizeInPx * scaleFactor; // Larger indicator size for better visibility

    if (listType === "ul") {
      console.log(`🔵 Creating BULLET (circle) for ul item ${index + 1}`);
      // Create bullet point (small circle/disc)
      indicatorMesh = render.actions.mesh.createPolygon(
        `${listItemMesh.name}-bullet`,
        "circle",
        indicatorSize,
        indicatorSize,
        0,
      );
    } else {
      console.log(`🔴 Creating NUMBER (rectangle) for ol item ${index + 1}`);
      // Create number indicator (small rectangle for now, will be text later)
      indicatorMesh = render.actions.mesh.createPolygon(
        `${listItemMesh.name}-number-${index + 1}`,
        "rectangle",
        indicatorSize,
        indicatorSize,
        0.05,
      );
    }

    // Position indicator to the left of the list item
    // Get element dimensions to find left edge
    const elementId = listItemMesh.metadata?.elementId;
    let halfWidth = 0;

    if (elementId) {
      const dims = dom.context.elementDimensions.get(elementId);
      if (dims) {
        halfWidth = (dims.width * scaleFactor) / 2;
      }
    }

    // Fallback if no dimensions found (shouldn't happen for created elements)
    if (halfWidth === 0) {
      const bounds = listItemMesh.getBoundingInfo().boundingBox;
      halfWidth = (bounds.maximum.x - bounds.minimum.x) / 2;
    }

    const indicatorOffsetPx = 12; // 12px padding between indicator and item
    const indicatorX = -halfWidth - indicatorOffsetPx * scaleFactor;
    const indicatorY = 0; // Center vertically with list item
    const indicatorZ = 0.005; // Firmly in front

    render.actions.mesh.positionTextMesh(
      indicatorMesh,
      indicatorX,
      indicatorY,
      indicatorZ,
    );
    render.actions.mesh.parentTextMesh(indicatorMesh, listItemMesh);

    // Apply indicator styling with more debugging
    const indicatorColor = listType === "ul" ? "#3498db" : "#e74c3c"; // Blue for bullets, red for numbers
    console.log(`🎨 Applying ${listType} indicator color: ${indicatorColor}`);
    const parsedColor =
      render.actions.style.parseBackgroundColor(indicatorColor);
    const indicatorColor3 =
      parsedColor && parsedColor.type === "color"
        ? parsedColor.color
        : new Color3(0, 0, 0);
    const indicatorAlpha =
      parsedColor &&
      parsedColor.type === "color" &&
      parsedColor.alpha !== undefined
        ? parsedColor.alpha
        : 1.0;
    console.log(
      `🎨 Parsed color:`,
      parsedColor,
      `(r=${indicatorColor3.r}, g=${indicatorColor3.g}, b=${indicatorColor3.b})`,
    );

    const indicatorMaterial = render.actions.mesh.createMaterial(
      `${listItemMesh.name}-indicator-material-${Date.now()}`, // Add timestamp to avoid caching
      indicatorColor3,
      indicatorAlpha,
    );
    indicatorMesh.material = indicatorMaterial;

    console.log(
      `✅ Added ${listType} indicator:`,
      indicatorMesh.name,
      `with material:`,
      indicatorMaterial.name,
    );
  }

  private createListItem(
    dom: BabylonDOM,
    render: BabylonRender,
    element: DOMElement,
    parent: Mesh,
    styles: StyleRule[],
    yOffset: number,
    index: number,
    listType: "ul" | "ol",
    automaticHeight?: number,
    parentId?: string,
  ): Mesh {
    // Create modified element styles for automatic positioning
    const elementStyles = element.id
      ? dom.context.elementStyles.get(element.id)
      : undefined;
    const explicitStyle = elementStyles?.normal;

    // Get default styles and merge
    const typeDefaults = render.actions.style.getElementTypeDefaults(
      element.type,
    );

    // Get the container's dimensions from our element dimensions cache
    const containerDimensions = parentId
      ? dom.context.elementDimensions.get(parentId)
      : undefined;
    const containerPadding = containerDimensions?.padding || {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    };
    const containerWidth = containerDimensions?.width || 0;

    // Calculate indentation and width
    const indentation = 25; // Space for bullet point (12px offset + 6px size + margin)

    let widthStyle = "85%"; // Fallback
    if (containerWidth > 0) {
      const availableWidth =
        containerWidth -
        containerPadding.left -
        containerPadding.right -
        indentation;
      // Ensure we don't go negative or too small
      const finalWidth = Math.max(availableWidth, 10);
      widthStyle = `${finalWidth}px`;
      console.log(
        `📏 Calculated list item width: ${widthStyle} (container=${containerWidth}, indent=${indentation})`,
      );
    }

    // Create auto-positioned style - modify the explicit style to add automatic positioning
    const autoPositionedStyle: StyleRule = {
      selector: element.id ? `#${element.id}` : element.type,
      ...typeDefaults,
      ...explicitStyle,
      top: `${yOffset}px`, // Automatic Y positioning
      left: `${containerPadding.left + indentation}px`, // Offset by container's left padding + indentation
      width: widthStyle, // Calculated width
      ...(explicitStyle?.height
        ? {}
        : automaticHeight
          ? { height: `${automaticHeight}px` }
          : {}), // Only use automatic height if not explicitly set
    };

    // Temporarily store the auto-positioned style
    const tempId = element.id || `temp-list-item-${Date.now()}`;
    const tempStyles = element.id
      ? dom.context.elementStyles.get(element.id)
      : undefined;

    // Override stored styles temporarily
    if (element.id) {
      dom.context.elementStyles.set(element.id, {
        normal: autoPositionedStyle,
        hover: tempStyles?.hover,
      });
    }

    // Create the element using existing createElement method
    const listItemMesh = dom.actions.createElement(
      dom,
      render,
      element,
      parent,
      styles,
    );

    // Restore original styles
    if (element.id && tempStyles) {
      dom.context.elementStyles.set(element.id, tempStyles);
    }

    // Store dimensions for the new list item so addListIndicator can use them
    if (element.id) {
      const bounds = listItemMesh.getBoundingInfo().boundingBox;
      const width = bounds.maximum.x - bounds.minimum.x;
      const height = bounds.maximum.y - bounds.minimum.y;

      // Convert back to pixels (approx)
      const scaleFactor = render.actions.camera.getPixelToWorldScale();
      const widthPx = width / scaleFactor;
      const heightPx = height / scaleFactor;

      console.log(
        `[ListService] Storing dimensions for ${element.id}: width=${widthPx}px, height=${heightPx}px`,
      );

      dom.context.elementDimensions.set(element.id, {
        width: widthPx,
        height: heightPx,
        padding: { top: 0, right: 0, bottom: 0, left: 0 }, // List items usually don't have padding logic yet
      });
    }

    // Add bullet point or number indicator
    this.addListIndicator(
      dom,
      render,
      listItemMesh,
      listType,
      index,
      autoPositionedStyle,
    );

    return listItemMesh;
  }

  private parsePixelValue(value: string): number {
    // Parse pixel values like "8px", "16px", etc.
    if (typeof value === "string" && value.endsWith("px")) {
      return parseFloat(value.replace("px", ""));
    }
    // If no unit, assume pixels
    return parseFloat(value) || 0;
  }

  private calculateAutomaticItemHeight(
    containerHeight: number,
    itemCount: number,
    spacing: number,
  ): number {
    console.log(`🧮 AUTO HEIGHT CALCULATION:`);
    console.log(`   Container height: ${containerHeight}px`);
    console.log(`   Number of items: ${itemCount}`);
    console.log(`   Spacing between items: ${spacing}px`);

    // Calculate how much space is needed for spacing
    const totalSpacing = spacing * (itemCount - 1); // n-1 spaces between n items
    console.log(
      `   Total spacing needed: ${totalSpacing}px (${spacing}px × ${itemCount - 1} gaps)`,
    );

    // Calculate available space for actual items
    const availableForItems = containerHeight - totalSpacing;
    console.log(`   Available space for items: ${availableForItems}px`);

    // Distribute evenly among items
    const rawItemHeight = availableForItems / itemCount;
    // Use a minimum that's proportional to container size (10% of container height)
    const minHeight = Math.max(containerHeight * 0.1, 8); // Minimum 8px, but proportional to container
    const itemHeight = Math.max(rawItemHeight, minHeight);
    const finalHeight = Math.floor(itemHeight); // Use whole pixels

    console.log(
      `   Per-item calculation: ${availableForItems}px ÷ ${itemCount} = ${rawItemHeight}px`,
    );
    console.log(`   Minimum height: ${minHeight}px (10% of container or 8px)`);
    console.log(
      `   Final item height: ${finalHeight}px (after min ${minHeight}px clamp and floor)`,
    );
    console.log(`🧮 ================================`);
    return finalHeight;
  }

  private parseListItemSpacing(dom: BabylonDOM, parentMesh: Mesh): number {
    // Try to get spacing from parent's style, fallback to default
    const parentId = this.getElementIdFromMeshName(parentMesh.name);
    if (parentId) {
      const parentStyle = dom.context.elementStyles.get(parentId)?.normal;
      const spacing = parentStyle?.listItemSpacing || "4px";
      return this.parsePixelValue(spacing);
    }
    return 4; // Default spacing in pixels
  }
}
