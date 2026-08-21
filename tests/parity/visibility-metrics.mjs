export function intersectRects(left, right) {
  const intersection = {
    left: Math.max(left.left, right.left),
    top: Math.max(left.top, right.top),
    right: Math.min(left.right, right.right),
    bottom: Math.min(left.bottom, right.bottom),
  };
  intersection.width = Math.max(0, intersection.right - intersection.left);
  intersection.height = Math.max(0, intersection.bottom - intersection.top);
  return intersection.width > 0 && intersection.height > 0 ? intersection : undefined;
}

export function measureVisibility(borderBox, viewportBox, clippingAncestors = []) {
  let visible = intersectRects(borderBox, viewportBox);
  const clippingAncestorIds = [];
  for (const ancestor of clippingAncestors) {
    const next = visible && intersectRects(visible, ancestor.rect);
    if (!next || !visible || next.width < visible.width || next.height < visible.height) {
      clippingAncestorIds.push(ancestor.id);
    }
    visible = next;
  }
  const fullyVisible = !!visible &&
    Math.abs(visible.left - borderBox.left) < 0.01 &&
    Math.abs(visible.top - borderBox.top) < 0.01 &&
    Math.abs(visible.right - borderBox.right) < 0.01 &&
    Math.abs(visible.bottom - borderBox.bottom) < 0.01;
  return {
    exists: true,
    intersectsViewport: !!visible,
    fullyVisible,
    clipped: !fullyVisible,
    clippingAncestorIds,
    viewportIntersection: visible,
  };
}

export function enrichScrollState(state, initial = state) {
  const maxScrollLeft = Math.max(0, state.scrollWidth - state.clientWidth);
  const maxScrollTop = Math.max(0, state.scrollHeight - state.clientHeight);
  return {
    ...state,
    initialScrollLeft: initial.scrollLeft,
    initialScrollTop: initial.scrollTop,
    maxScrollLeft,
    maxScrollTop,
    canReachRight: state.scrollLeft >= maxScrollLeft - 1,
    canReachBottom: state.scrollTop >= maxScrollTop - 1,
  };
}

export function compareScrollOwnership(reference = {}, astylar = {}) {
  const ids = new Set([...Object.keys(reference), ...Object.keys(astylar)]);
  return [...ids].flatMap((id) => {
    if (!reference[id]) return [`Unexpected Astylar scroll owner: ${id}`];
    if (!astylar[id]) return [`Missing Astylar scroll owner: ${id}`];
    return [];
  });
}
