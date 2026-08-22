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
        parseBackgroundColor: () => ({ type: 'color', color: Color3.FromHexString('#e6edf3') }),
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
