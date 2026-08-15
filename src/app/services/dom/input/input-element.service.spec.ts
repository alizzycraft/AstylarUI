import { InputElementService } from './input-element.service';
import { InputType } from '../../../types/input-types';

describe('InputElementService', () => {
  it('derives control type from semantic select and textarea elements', () => {
    const service = new InputElementService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    expect(service['determineInputType']({ type: 'select' })).toBe(InputType.Select);
    expect(service['determineInputType']({ type: 'textarea' })).toBe(InputType.Textarea);
    expect(service['determineInputType']({ type: 'input' })).toBe(InputType.Text);
  });
});
