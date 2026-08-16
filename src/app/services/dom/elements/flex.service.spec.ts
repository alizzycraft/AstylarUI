import { FlexService } from './flex.service';
import { BabylonRender } from '../interfaces/render.types';
import { FlexContainer, FlexItem, FlexLayoutService } from './flex-layout.service';

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

  it('positions the first wrapped line at the cross-axis start', () => {
    const service = new FlexService(new FlexLayoutService(), {} as never, {} as never);
    const item = (id: string, width: number, height: number): FlexItem => ({
      element: { type: 'input', id },
      style: { selector: `#${id}`, width: `${width}px`, height: `${height}px` },
      width,
      height,
      baseWidth: width,
      baseHeight: height,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: width,
      alignSelf: 'auto',
      order: 0,
    });
    const padding = { top: 6, right: 6, bottom: 6, left: 6 };
    const flexProps = {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      flexWrap: 'wrap',
      alignContent: 'stretch',
    };
    const container: FlexContainer = {
      width: 350,
      height: 78,
      padding,
      ...flexProps,
      gap: 6,
      rowGap: 6,
      columnGap: 6,
    };

    const result = service['calculateFlexLayout'](
      [item('search', 206, 32), item('filter', 126, 32), item('export', 90, 28)],
      container.width,
      container.height,
      padding,
      flexProps,
      {} as BabylonRender,
      container,
    );
    const top = (index: number) =>
      container.height / 2 - result[index].position.y - result[index].size.height / 2;

    expect(top(0)).toBe(6);
    expect(top(1)).toBe(6);
    expect(top(2)).toBe(44);
  });
});
