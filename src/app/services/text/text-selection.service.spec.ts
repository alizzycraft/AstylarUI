import { Color3, NullEngine, Scene, MeshBuilder, StandardMaterial } from '@babylonjs/core';
import { TextLayoutMetrics, TextStyleProperties } from '../../types/text-rendering';
import { TextSelectionService } from './text-selection.service';

describe('TextSelectionService', () => {
  it('uses the resolved text color for the automatic input caret', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const parent = MeshBuilder.CreatePlane('dark-input', { width: 4, height: 1 }, scene);
    const service = new TextSelectionService(
      {} as never,
      {
        parseBackgroundColor: (value: string) => ({ type: 'color', color: Color3.FromHexString(value) }),
      } as never,
    );

    const cursor = service.createTextCursor(
      0,
      emptyMetrics(),
      parent,
      scene,
      0.01,
      textStyle('#e6edf3'),
      0,
    );
    const material = cursor.material as StandardMaterial;

    expect(material.emissiveColor.toHexString().toLowerCase()).toBe('#e6edf3');
    service.updateTextCursorColor(cursor, textStyle('#f7fafc'));
    expect(material.emissiveColor.toHexString().toLowerCase()).toBe('#f7fafc');
    cursor.dispose(false, true);
    parent.dispose(false, true);
    scene.dispose();
    engine.dispose();
  });

  it('hides the caret when caretColor is transparent', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const parent = MeshBuilder.CreatePlane('readonly-picker', { width: 4, height: 1 }, scene);
    const service = new TextSelectionService(
      {} as never,
      {
        parseBackgroundColor: (value: string) => ({ type: 'color', color: Color3.FromHexString(value) }),
      } as never,
    );
    const style = { ...textStyle('#1d1b20'), caretColor: 'transparent' };

    const cursor = service.createTextCursor(0, emptyMetrics(), parent, scene, 0.01, style, 0);
    expect((cursor.material as StandardMaterial).alpha).toBe(0);

    cursor.dispose(false, true);
    parent.dispose(false, true);
    scene.dispose();
    engine.dispose();
  });

  it('positions the caret from the rendered text edge instead of a fixed input inset', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const parent = MeshBuilder.CreatePlane('padded-input', { width: 4, height: 1 }, scene);
    const service = new TextSelectionService(
      {} as never,
      {
        parseBackgroundColor: (value: string) => ({ type: 'color', color: Color3.FromHexString(value) }),
      } as never,
    );
    const metrics = {
      ...emptyMetrics(),
      text: 'ABCD', transformedText: 'ABCD', totalWidth: 40,
      characters: Array.from({ length: 4 }, (_, index) => ({
        index, character: 'ABCD'[index], x: index * 10, y: 0,
        width: 10, height: 20, advance: 10, lineIndex: 0,
      })),
      lines: [{ index: 0, startIndex: 0, endIndex: 4, top: 0, bottom: 20, width: 40, height: 20 }],
    } as unknown as TextLayoutMetrics;

    const cursor = service.createTextCursor(
      2, metrics, parent, scene, 0.01, textStyle('#ffffff'), 0.4, 1, 0, 1.25,
    );
    expect(cursor.position.x).toBeCloseTo(1.05);

    service.updateCursorPosition(cursor, 3, metrics, 0.01, 0.4, 1, 0, 1.25);
    expect(cursor.position.x).toBeCloseTo(0.95);
    cursor.dispose(false, true);
    parent.dispose(false, true);
    scene.dispose();
    engine.dispose();
  });
});

function emptyMetrics(): TextLayoutMetrics {
  return {
    text: '', transformedText: '', totalWidth: 0, totalHeight: 20,
    lineHeight: 20, ascent: 15, descent: 5, lines: [], characters: [],
  };
}

function textStyle(color: string): TextStyleProperties {
  return {
    fontFamily: 'Arial', fontSize: 16, fontWeight: '400', fontStyle: 'normal',
    color, textAlign: 'left', verticalAlign: 'baseline', lineHeight: 1.2,
    letterSpacing: 0, wordSpacing: 0, whiteSpace: 'normal', wordWrap: 'normal',
    textOverflow: 'clip', textDecoration: 'none', textTransform: 'none',
  };
}
