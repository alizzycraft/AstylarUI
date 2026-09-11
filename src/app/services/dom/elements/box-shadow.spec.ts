import { parseBoxShadow } from './box-shadow';

describe('parseBoxShadow', () => {
  it('treats omitted and explicit none as the same no-layer input', () => {
    expect(parseBoxShadow(undefined)).toEqual([]);
    expect(parseBoxShadow('none')).toEqual(parseBoxShadow(undefined));
  });

  it('preserves offset, blur, spread, color, and order for layered CSS shadows', () => {
    expect(parseBoxShadow(
      'rgba(0, 0, 0, 0.2) 0px 2px 1px -1px, rgba(0, 0, 0, 0.14) 0px 1px 1px 0px, rgba(0, 0, 0, 0.12) 0px 1px 3px 0px',
    )).toEqual([
      { offsetX: 0, offsetY: 2, blur: 1, spread: -1, color: 'rgba(0, 0, 0, 0.2)' },
      { offsetX: 0, offsetY: 1, blur: 1, spread: 0, color: 'rgba(0, 0, 0, 0.14)' },
      { offsetX: 0, offsetY: 1, blur: 3, spread: 0, color: 'rgba(0, 0, 0, 0.12)' },
    ]);
  });

  it('defaults omitted blur, spread, and color and excludes inset shadows', () => {
    expect(parseBoxShadow('2px -3px')).toEqual([
      { offsetX: 2, offsetY: -3, blur: 0, spread: 0, color: 'rgba(0,0,0,1)' },
    ]);
    expect(parseBoxShadow('inset 0 0 2px #000')).toEqual([]);
  });
});
