import type { ParityFixture } from '../parity.types';

export const semanticControlStateFixture: ParityFixture = {
  id: 'semantic-control-state',
  title: 'Native semantic control values and states',
  category: 'accessibility-semantics',
  expectedBehavior:
    'Native checkbox, radio, text, select, readonly, required, invalid, and disabled semantics reflect authored defaults and the same live values after scene interactions and form reset.',
  measurementIds: [
    'semantic-control-surface', 'semantic-control-blur', 'semantic-check',
    'semantic-radio-alpha', 'semantic-radio-beta', 'semantic-text', 'semantic-select',
    'semantic-locked', 'semantic-disabled', 'semantic-reset',
  ],
  interactionIds: [
    'semantic-check', 'semantic-radio-alpha', 'semantic-radio-beta',
    'semantic-select', 'semantic-locked', 'semantic-disabled', 'semantic-reset',
  ],
  semanticIds: [
    'semantic-check', 'semantic-radio-alpha', 'semantic-radio-beta', 'semantic-text',
    'semantic-select', 'semantic-locked', 'semantic-disabled',
  ],
  interactionEventTypes: [],
  interactionSteps: [
    {
      id: 'toggle-checkbox',
      actions: [
        { type: 'click', elementId: 'semantic-check' },
        { type: 'click', elementId: 'semantic-control-blur' },
      ],
    },
    {
      id: 'choose-radio',
      actions: [
        { type: 'click', elementId: 'semantic-radio-beta' },
        { type: 'click', elementId: 'semantic-control-blur' },
      ],
    },
    {
      id: 'edit-text',
      actions: [
        { type: 'click', elementId: 'semantic-text' },
        { type: 'press-key', key: 'End' },
        { type: 'type-text', text: '-edited' },
        { type: 'click', elementId: 'semantic-control-blur' },
      ],
    },
    {
      id: 'choose-select-option',
      actions: [
        { type: 'click', elementId: 'semantic-select' },
        {
          type: 'select-option', elementId: 'semantic-select', value: 'beta',
          offsetX: 110, offsetY: 121,
        },
        { type: 'click', elementId: 'semantic-control-blur' },
      ],
    },
    {
      id: 'reset-controls',
      actions: [
        { type: 'click', elementId: 'semantic-reset' },
        { type: 'click', elementId: 'semantic-control-blur' },
      ],
    },
    {
      id: 'semantic-checkbox-activation',
      actions: [
        { type: 'semantic-focus', elementId: 'semantic-check' },
        { type: 'semantic-activate', elementId: 'semantic-check' },
      ],
    },
    {
      id: 'semantic-checkbox-keyboard',
      actions: [{ type: 'press-key', key: 'Space' }],
    },
    {
      id: 'semantic-text-keyboard',
      actions: [
        { type: 'semantic-focus', elementId: 'semantic-text' },
        { type: 'press-key', key: 'End' },
        { type: 'type-text', text: 'X' },
        { type: 'click', elementId: 'semantic-control-blur' },
      ],
    },
  ],
  reference: {
    html: `
      <section id="semantic-control-surface">
        <form id="semantic-form">
          <input id="semantic-check" type="checkbox" value="yes" required aria-label="Alerts">
          <input id="semantic-radio-alpha" type="radio" name="channel" value="alpha" checked aria-label="Alpha channel">
          <input id="semantic-radio-beta" type="radio" name="channel" value="beta" aria-label="Beta channel">
          <input id="semantic-text" type="text" value="Seed" required aria-label="Project name">
          <select id="semantic-select" required aria-label="Plan">
            <option value="alpha" selected>Alpha plan</option>
            <option value="blocked" disabled>Blocked plan</option>
            <option value="beta">Beta plan</option>
          </select>
          <input id="semantic-locked" type="text" value="Read only" readonly required aria-label="Locked value">
          <input id="semantic-disabled" type="button" value="Unavailable" disabled aria-label="Unavailable">
          <input id="semantic-reset" type="reset" value="Reset">
        </form>
        <div id="semantic-control-blur"></div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      #semantic-control-surface { box-sizing:border-box; position:absolute; left:0; top:0; width:800px; height:600px; background:#f8fafc; }
      #semantic-form > * { appearance:none; box-sizing:border-box; position:absolute; width:220px; height:48px; margin:0; padding:8px; border:0; opacity:0; }
      #semantic-check { left:80px; top:80px; width:32px; height:32px; }
      #semantic-radio-alpha { left:144px; top:80px; width:32px; height:32px; }
      #semantic-radio-beta { left:208px; top:80px; width:32px; height:32px; }
      #semantic-text { left:80px; top:152px; }
      #semantic-select { left:80px; top:224px; }
      #semantic-locked { left:80px; top:296px; }
      #semantic-disabled { left:80px; top:368px; }
      #semantic-reset { left:320px; top:368px; }
      #semantic-control-blur { position:absolute; left:560px; top:80px; width:120px; height:400px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      {
        selector: '#semantic-control-surface', boxSizing: 'border-box', position: 'absolute',
        left: '0', top: '0', width: '800px', height: '600px', background: '#f8fafc',
      },
      {
        selector: '#semantic-form > *', boxSizing: 'border-box',
        position: 'absolute', width: '220px', height: '48px', margin: '0', padding: '8px',
        borderWidth: '0', background: '#f8fafc', color: '#f8fafc', opacity: '0',
      },
      { selector: '#semantic-check', left: '80px', top: '80px', width: '32px', height: '32px' },
      { selector: '#semantic-radio-alpha', left: '144px', top: '80px', width: '32px', height: '32px' },
      { selector: '#semantic-radio-beta', left: '208px', top: '80px', width: '32px', height: '32px' },
      { selector: '#semantic-text', left: '80px', top: '152px' },
      { selector: '#semantic-select', left: '80px', top: '224px' },
      { selector: '#semantic-locked', left: '80px', top: '296px' },
      { selector: '#semantic-disabled', left: '80px', top: '368px' },
      { selector: '#semantic-reset', left: '320px', top: '368px' },
      {
        selector: '#semantic-control-blur', position: 'absolute', left: '560px', top: '80px',
        width: '120px', height: '400px',
      },
    ],
    root: { children: [{
      type: 'section', id: 'semantic-control-surface', children: [
        { type: 'form', id: 'semantic-form', children: [
          {
            type: 'input', id: 'semantic-check', inputType: 'checkbox', value: 'yes',
            checked: false, required: true, ariaLabel: 'Alerts',
          },
          {
            type: 'input', id: 'semantic-radio-alpha', inputType: 'radio', name: 'channel',
            value: 'alpha', checked: true, ariaLabel: 'Alpha channel',
          },
          {
            type: 'input', id: 'semantic-radio-beta', inputType: 'radio', name: 'channel',
            value: 'beta', checked: false, ariaLabel: 'Beta channel',
          },
          {
            type: 'input', id: 'semantic-text', inputType: 'text', value: 'Seed',
            required: true, ariaLabel: 'Project name',
          },
          {
            type: 'select', id: 'semantic-select', value: 'alpha', required: true,
            ariaLabel: 'Plan', options: [
              { value: 'alpha', label: 'Alpha plan' },
              { value: 'blocked', label: 'Blocked plan', disabled: true },
              { value: 'beta', label: 'Beta plan' },
            ],
          },
          {
            type: 'input', id: 'semantic-locked', inputType: 'text', value: 'Read only',
            readonly: true, required: true, ariaLabel: 'Locked value',
          },
          {
            type: 'input', id: 'semantic-disabled', inputType: 'button', disabled: true,
            value: 'Unavailable', ariaLabel: 'Unavailable',
          },
          {
            type: 'input', id: 'semantic-reset', inputType: 'reset', value: 'Reset',
          },
        ] },
        { type: 'div', id: 'semantic-control-blur' },
      ],
    }] },
  },
};
