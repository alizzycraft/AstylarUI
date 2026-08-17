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

  it('activates and restores every member of a radio group', () => {
    const alpha = { type: InputType.Radio, groupName: 'channel', checked: true, disabled: false };
    const beta = { type: InputType.Radio, groupName: 'channel', checked: false, disabled: false };
    const checkboxManager = {
      getRadioGroup: () => [alpha, beta],
      selectRadioButton: jasmine.createSpy('selectRadioButton').and.callFake((selected) => {
        alpha.checked = selected === alpha;
        beta.checked = selected === beta;
      }),
      setRadioChecked: jasmine.createSpy('setRadioChecked').and.callFake((input, checked) => {
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
    service['inputElements'].set('beta', beta as never);

    const activation = service.activateInputElement('beta');

    expect(activation?.changed).toBeTrue();
    expect(alpha.checked).toBeFalse();
    expect(beta.checked).toBeTrue();
    activation?.rollback();
    expect(alpha.checked).toBeTrue();
    expect(beta.checked).toBeFalse();
  });

  it('wraps radio arrow navigation and skips disabled group members', () => {
    const alpha = {
      type: InputType.Radio,
      groupName: 'channel',
      checked: true,
      disabled: false,
      element: { id: 'alpha' },
    };
    const disabled = {
      type: InputType.Radio,
      groupName: 'channel',
      checked: false,
      disabled: true,
      element: { id: 'disabled' },
    };
    const beta = {
      type: InputType.Radio,
      groupName: 'channel',
      checked: false,
      disabled: false,
      element: { id: 'beta' },
    };
    const checkboxManager = { getRadioGroup: () => [alpha, disabled, beta] };
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
    service['inputElements'].set('alpha', alpha as never);
    service['inputElements'].set('beta', beta as never);

    expect(service.getRadioNavigationTarget('alpha', 1)).toBe('beta');
    expect(service.getRadioNavigationTarget('alpha', -1)).toBe('beta');
    expect(service.getRadioNavigationTarget('beta', 1)).toBe('alpha');
  });

  it('identifies selects as immediate keyboard-change controls', () => {
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
    service['inputElements'].set('choice', { type: InputType.Select } as never);
    service['inputElements'].set('field', { type: InputType.Text } as never);

    expect(service.emitsImmediateChangeOnKeyboardMutation('choice')).toBeTrue();
    expect(service.emitsImmediateChangeOnKeyboardMutation('field')).toBeFalse();
  });

  it('exposes browser keyboard activation keys for buttons and choice controls', () => {
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
    service['inputElements'].set('button', { type: InputType.Button, disabled: false } as never);
    service['inputElements'].set('checkbox', { type: InputType.Checkbox, disabled: false } as never);
    service['inputElements'].set('disabled', { type: InputType.Button, disabled: true } as never);

    expect(service.canActivateWithEnter('button')).toBeTrue();
    expect(service.canActivateWithSpace('button')).toBeTrue();
    expect(service.canActivateWithEnter('checkbox')).toBeFalse();
    expect(service.canActivateWithSpace('checkbox')).toBeTrue();
    expect(service.canActivateWithEnter('disabled')).toBeFalse();
  });
});
