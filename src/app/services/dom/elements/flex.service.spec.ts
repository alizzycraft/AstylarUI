import { FlexService } from './flex.service';
import { BabylonRender } from '../interfaces/render.types';

describe('FlexService', () => {
  it('recognizes both block-level and inline-level flex containers', () => {
    const service = new FlexService({} as never, {} as never, {} as never);
    const render = {
      actions: {
        style: {
          findStyleForElement: (element: { id?: string }) => ({
            display: element.id,
          }),
        },
      },
    } as unknown as BabylonRender;

    expect(service.isFlexContainer(render, { type: 'div', id: 'flex' }, []))
      .toBeTrue();
    expect(service.isFlexContainer(render, { type: 'div', id: 'inline-flex' }, []))
      .toBeTrue();
    expect(service.isFlexContainer(render, { type: 'div', id: 'block' }, []))
      .toBeFalse();
  });

  it('applies longhand margins over the flex item margin shorthand', () => {
    const service = new FlexService({} as never, {} as never, {} as never);

    const margin = service['parseMarginBox']({
      selector: '#item',
      margin: '1px 2px 3px 4px',
      marginTop: '8px',
    });

    expect(margin).toEqual({ top: 8, right: 2, bottom: 3, left: 4 });
  });

  it('expands the flex shorthand and lets longhands override it', () => {
    const service = new FlexService({} as never, {} as never, {} as never);
    const render = {
      actions: {
        style: {
          parseFlexShorthand: () => ({ flexGrow: 0, flexShrink: 0, flexBasis: '88px' }),
          parseFlexGrow: (value: string) => Number(value),
          parseFlexShrink: (value: string) => Number(value),
          parseFlexBasis: (value: string) => value,
        },
      },
    } as unknown as BabylonRender;

    expect(service['resolveFlexProperties'](render, {
      selector: '#item',
      flex: '0 0 88px',
      flexGrow: '2',
    })).toEqual({ flexGrow: 2, flexShrink: 0, flexBasis: '88px' });
  });
});
