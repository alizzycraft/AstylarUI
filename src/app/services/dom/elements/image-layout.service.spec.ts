import { ImageLayoutService } from './image-layout.service';

describe('ImageLayoutService', () => {
  const service = new ImageLayoutService();

  it('letterboxes contain content without cropping its UVs', () => {
    expect(service.calculateFit(240, 180, 120, 80, 'contain')).toEqual({
      renderedWidth: 240,
      renderedHeight: 160,
      uScale: 1,
      vScale: 1,
      uOffset: 0,
      vOffset: 0,
    });
  });

  it('centers the UV crop for cover content', () => {
    const result = service.calculateFit(180, 180, 120, 80, 'cover');
    expect(result.renderedWidth).toBe(180);
    expect(result.renderedHeight).toBe(180);
    expect(result.uScale).toBeCloseTo(2 / 3, 8);
    expect(result.uOffset).toBeCloseTo(1 / 6, 8);
  });

  it('uses natural dimensions when both CSS dimensions are auto', () => {
    expect(service.resolveIntrinsicBox(40, 600, 0, 0, 120, 80, false, false))
      .toEqual({ width: 120, height: 80 });
  });
});
