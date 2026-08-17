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

  it('activates and can roll back a checkbox through its manager', () => {
    const checkboxManager = {
      setCheckboxChecked: jasmine.createSpy('setCheckboxChecked').and.callFake((input, checked) => {
        input.checked = checked;
      }),
    };
    const service = new InputElementService(
      {} as never,
      {} as never,
      checkboxManager as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const checkbox = {
      type: InputType.Checkbox,
      checked: false,
      disabled: false,
    };
    service['inputElements'].set('alerts', checkbox as never);

    const activation = service.activateInputElement('alerts');

    expect(activation?.changed).toBeTrue();
    expect(checkbox.checked).toBeTrue();
    activation?.rollback();
    expect(checkbox.checked).toBeFalse();
    expect(checkboxManager.setCheckboxChecked.calls.allArgs()).toEqual([
      [checkbox, true],
      [checkbox, false],
    ]);
  });
});
