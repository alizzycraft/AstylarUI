import { GridService } from './grid.service';

describe('GridService', () => {
  const service = new GridService();

  it('allocates remaining track space across fr units after fixed tracks and gaps', () => {
    expect(service.resolveTracks('160px 1fr', 460, 20, 2)).toEqual([160, 280]);
    expect(service.resolveTracks('1fr 2fr', 320, 20, 2)).toEqual([100, 200]);
  });

  it('creates equal implicit tracks when no template is supplied', () => {
    expect(service.resolveTracks(undefined, 220, 10, 2)).toEqual([105, 105]);
  });
});
