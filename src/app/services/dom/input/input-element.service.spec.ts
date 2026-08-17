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

  it('recognizes reset inputs as buttons', () => {
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

    expect(service['mapStringToInputType']('reset')).toBe(InputType.Button);
  });

  it('restores authored form defaults through each control manager', () => {
    const textInputManager = {
      resetTextValue: jasmine.createSpy('resetTextValue').and.callFake((input, value) => {
        input.value = value;
      }),
    };
    const checkboxManager = {
      setCheckboxChecked: jasmine.createSpy('setCheckboxChecked').and.callFake((input, checked) => {
        input.checked = checked;
      }),
      setRadioChecked: jasmine.createSpy('setRadioChecked').and.callFake((input, checked) => {
        input.checked = checked;
      }),
    };
    const selectManager = {
      selectOption: jasmine.createSpy('selectOption').and.callFake((input, index) => {
        input.selectedIndex = index;
        input.value = input.options[index].value;
      }),
    };
    const service = new InputElementService(
      textInputManager as never,
      {} as never,
      checkboxManager as never,
      selectManager as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const validationState = () => ({ valid: false, errors: ['edited'], touched: true, dirty: true });
    const text = {
      type: InputType.Text, value: 'SeedX', element: { value: 'Seed' }, validationState: validationState(),
    };
    const checkbox = {
      type: InputType.Checkbox, checked: false, element: { checked: true }, validationState: validationState(),
    };
    const radio = {
      type: InputType.Radio, checked: true, element: { checked: false }, validationState: validationState(),
    };
    const select = {
      type: InputType.Select,
      value: 'alpha',
      selectedIndex: 0,
      options: [{ value: 'alpha', label: 'Alpha' }, { value: 'beta', label: 'Beta' }],
      element: { value: 'beta' },
      validationState: validationState(),
    };
    service['inputElements'].set('text', text as never);
    service['inputElements'].set('checkbox', checkbox as never);
    service['inputElements'].set('radio', radio as never);
    service['inputElements'].set('select', select as never);

    service.resetFormControls(['text', 'checkbox', 'radio', 'select']);

    expect(textInputManager.resetTextValue).toHaveBeenCalledWith(text, 'Seed');
    expect(checkboxManager.setCheckboxChecked).toHaveBeenCalledWith(checkbox, true);
    expect(checkboxManager.setRadioChecked).toHaveBeenCalledWith(radio, false);
    expect(selectManager.selectOption).toHaveBeenCalledWith(select, 1);
    for (const input of [text, checkbox, radio, select]) {
      expect(input.validationState).toEqual({ valid: true, errors: [], touched: false, dirty: false });
    }
  });

  it('validates eligible form controls in authored order', () => {
    const formValidator = {
      validateInput: jasmine.createSpy('validateInput').and.callFake((input) => ({
        valid: input.value !== '', errors: input.value === '' ? ['required'] : [],
      })),
    };
    const service = new InputElementService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      formValidator as never,
      {} as never,
      {} as never,
    );
    const control = (value: string, extra: Record<string, unknown> = {}) => ({
      type: InputType.Text,
      value,
      disabled: false,
      element: {},
      ...extra,
    });
    const first = control('');
    const valid = control('ready');
    const second = control('');
    const disabled = control('', { disabled: true });
    const readonly = control('', { element: { readonly: true } });
    service['inputElements'].set('first', first as never);
    service['inputElements'].set('valid', valid as never);
    service['inputElements'].set('second', second as never);
    service['inputElements'].set('disabled', disabled as never);
    service['inputElements'].set('readonly', readonly as never);

    expect(service.validateFormControls([
      'first', 'valid', 'second', 'disabled', 'readonly', 'missing',
    ])).toEqual(['first', 'second']);
    expect(formValidator.validateInput.calls.allArgs()).toEqual([[first], [valid], [second]]);
  });
});
