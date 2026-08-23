import { StyleDefaultsService } from './style-defaults.service';

describe('StyleDefaultsService', () => {
  let service: StyleDefaultsService;

  beforeEach(() => {
    service = new StyleDefaultsService();
  });

  it('preserves structural and text defaults extracted to configuration', () => {
    expect(service.getElementTypeDefaults('figure')).toEqual(
      jasmine.objectContaining({ display: 'block', margin: '1em 40px' })
    );
    expect(service.getElementTypeDefaults('figcaption')).toEqual(
      jasmine.objectContaining({ display: 'block', padding: '4px 8px' })
    );
    expect(service.getElementTypeDefaults('hgroup').display).toBe('block');
    expect(service.getElementTypeDefaults('cite')).toEqual(
      jasmine.objectContaining({ display: 'inline', fontStyle: 'italic' })
    );
    expect(service.getElementTypeDefaults('hr')).toEqual(
      jasmine.objectContaining({
        display: 'block',
        height: '1px',
        borderStyle: 'inset',
        width: '100%'
      })
    );
  });

  it('lets shorthand spacing replace inherited side-specific values', () => {
    const merged = StyleDefaultsService.mergeStyles(
      { paddingTop: '1px', paddingRight: '2px', marginLeft: '3px' },
      { padding: '8px', margin: '4px' }
    );

    expect(merged.padding).toBe('8px');
    expect(merged.margin).toBe('4px');
    expect(merged.paddingTop).toBeUndefined();
    expect(merged.paddingRight).toBeUndefined();
    expect(merged.marginLeft).toBeUndefined();
  });
});
