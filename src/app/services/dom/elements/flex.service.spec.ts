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
});
