import {
  CssInsets,
  CssLayoutBox,
  CssLayoutNode,
  CssPoint,
  CssRect,
  CssSize,
} from './coordinate-space.types';

const ZERO_INSETS: CssInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export function createCssLayoutBox(
  borderBox: CssRect,
  padding: CssInsets = ZERO_INSETS,
  margin: CssInsets = ZERO_INSETS,
): CssLayoutBox {
  return {
    borderBox: { ...borderBox },
    padding: { ...padding },
    contentBox: {
      x: borderBox.x + padding.left,
      y: borderBox.y + padding.top,
      width: Math.max(0, borderBox.width - padding.left - padding.right),
      height: Math.max(0, borderBox.height - padding.top - padding.bottom),
    },
    margin: { ...margin },
  };
}

export function updateCssLayoutNode(
  node: CssLayoutNode,
  position: CssPoint = node.box.borderBox,
  size: CssSize = node.box.borderBox,
): CssLayoutNode {
  return {
    parentId: node.parentId,
    box: createCssLayoutBox(
      { x: position.x, y: position.y, width: size.width, height: size.height },
      node.box.padding,
      node.box.margin,
    ),
  };
}

export function cssLocalCenter(box: CssRect, parentSize: CssSize): CssPoint {
  return {
    x: box.x + box.width / 2 - parentSize.width / 2,
    y: box.y + box.height / 2 - parentSize.height / 2,
  };
}

export function resolveCssViewportRect(
  elementId: string,
  nodes: ReadonlyMap<string, CssLayoutNode>,
): CssRect | undefined {
  const node = nodes.get(elementId);
  if (!node) return undefined;
  let x = node.box.borderBox.x;
  let y = node.box.borderBox.y;
  let parentId = node.parentId;
  const visited = new Set<string>([elementId]);
  while (parentId) {
    if (visited.has(parentId)) {
      throw new Error(`CSS layout ancestry contains a cycle at ${parentId}.`);
    }
    visited.add(parentId);
    const parent = nodes.get(parentId);
    if (!parent) return undefined;
    x += parent.box.borderBox.x;
    y += parent.box.borderBox.y;
    parentId = parent.parentId;
  }
  return { x, y, width: node.box.borderBox.width, height: node.box.borderBox.height };
}

export function resolveCssRectRelativeToAncestor(
  elementId: string,
  ancestorId: string,
  nodes: ReadonlyMap<string, CssLayoutNode>,
): CssRect | undefined {
  const node = nodes.get(elementId);
  if (!node) return undefined;
  let x = node.box.borderBox.x;
  let y = node.box.borderBox.y;
  let parentId = node.parentId;
  const visited = new Set<string>([elementId]);
  while (parentId && parentId !== ancestorId) {
    if (visited.has(parentId)) {
      throw new Error(`CSS layout ancestry contains a cycle at ${parentId}.`);
    }
    visited.add(parentId);
    const parent = nodes.get(parentId);
    if (!parent) return undefined;
    x += parent.box.borderBox.x;
    y += parent.box.borderBox.y;
    parentId = parent.parentId;
  }
  if (parentId !== ancestorId) return undefined;
  return { x, y, width: node.box.borderBox.width, height: node.box.borderBox.height };
}
