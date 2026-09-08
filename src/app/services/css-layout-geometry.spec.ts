import {
  createCssLayoutBox,
  cssLocalCenter,
  resolveCssViewportRect,
  resolveCssRectRelativeToAncestor,
  updateCssLayoutNode,
} from './css-layout-geometry';
import { CssLayoutNode } from './coordinate-space.types';

describe('CSS layout geometry', () => {
  it('retains fractional top-left boxes and derives their content boxes', () => {
    const box = createCssLayoutBox(
      { x: 12.25, y: 8.5, width: 100.75, height: 40.25 },
      { top: 2.25, right: 3.5, bottom: 4.75, left: 5.125 },
    );

    expect(box.contentBox).toEqual({
      x: 17.375,
      y: 10.75,
      width: 92.125,
      height: 33.25,
    });
    expect(cssLocalCenter(box.borderBox, { width: 300, height: 200 }))
      .toEqual({ x: -87.375, y: -71.375 });
  });

  it('resolves nested boxes to viewport CSS coordinates without render state', () => {
    const nodes = new Map<string, CssLayoutNode>([
      ['root-body', { parentId: null, box: createCssLayoutBox({ x: 0, y: 0, width: 800, height: 600 }) }],
      ['outer', { parentId: 'root-body', box: createCssLayoutBox({ x: 20.5, y: 30.25, width: 300, height: 200 }) }],
      ['inner', { parentId: 'outer', box: createCssLayoutBox({ x: 7.75, y: 9.5, width: 80.5, height: 24.25 }) }],
    ]);

    expect(resolveCssViewportRect('inner', nodes)).toEqual({
      x: 28.25,
      y: 39.75,
      width: 80.5,
      height: 24.25,
    });
    expect(resolveCssRectRelativeToAncestor('inner', 'outer', nodes)).toEqual({
      x: 7.75,
      y: 9.5,
      width: 80.5,
      height: 24.25,
    });
    expect(resolveCssRectRelativeToAncestor('inner', 'root-body', nodes)).toEqual({
      x: 28.25,
      y: 39.75,
      width: 80.5,
      height: 24.25,
    });
  });

  it('moves and resizes a node while preserving CSS insets', () => {
    const node: CssLayoutNode = {
      parentId: 'parent',
      box: createCssLayoutBox(
        { x: 1, y: 2, width: 20, height: 10 },
        { top: 1, right: 2, bottom: 3, left: 4 },
      ),
    };
    const updated = updateCssLayoutNode(node, { x: 8, y: 9 }, { width: 40, height: 30 });

    expect(updated.box.borderBox).toEqual({ x: 8, y: 9, width: 40, height: 30 });
    expect(updated.box.contentBox).toEqual({ x: 12, y: 10, width: 34, height: 26 });
  });
});
