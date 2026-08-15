import { ParityFixture } from '../parity.types';

export const composedSettingsFormFixture: ParityFixture = {
  id: 'composed-settings-form',
  title: 'Composed settings form',
  category: 'composed-application',
  expectedBehavior:
    'A settings panel composes labels, text and select controls, checked and disabled states, and right-aligned actions without renderer-specific layout adjustments.',
  measurementIds: [
    'settings-panel',
    'settings-title',
    'settings-grid',
    'settings-name-label',
    'settings-name',
    'settings-theme-label',
    'settings-theme',
    'settings-team-label',
    'settings-team',
    'settings-region-label',
    'settings-region',
    'settings-consent',
    'settings-consent-box',
    'settings-consent-label',
    'settings-actions',
    'settings-cancel',
    'settings-save',
  ],
  reference: {
    html: `
      <section id="settings-panel">
        <h1 id="settings-title">Workspace settings</h1>
        <div id="settings-grid">
          <label id="settings-name-label" for="settings-name">Display name</label>
          <input id="settings-name" type="text" value="Astylar Studio">
          <label id="settings-theme-label" for="settings-theme">Theme</label>
          <select id="settings-theme"><option value="light">Light</option><option value="dark" selected>Dark</option></select>
          <label id="settings-team-label" for="settings-team">Team</label>
          <input id="settings-team" type="text" value="Platform" disabled>
          <label id="settings-region-label" for="settings-region">Region</label>
          <select id="settings-region"><option value="africa" selected>Africa</option><option value="europe">Europe</option></select>
        </div>
        <div id="settings-consent">
          <input id="settings-consent-box" type="checkbox" checked>
          <label id="settings-consent-label" for="settings-consent-box">Email deployment reports</label>
        </div>
        <div id="settings-actions">
          <input id="settings-cancel" type="button" value="Cancel">
          <input id="settings-save" type="button" value="Save changes">
        </div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #e2e8f0; font-family: Arial, sans-serif; }
      #settings-panel { box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; position: absolute; left: 140px; top: 50px; width: 520px; height: 500px; margin: 0; padding: 24px; border: 0; background: #ffffff; }
      #settings-title { box-sizing: border-box; width: 472px; height: 40px; margin: 0; padding: 4px 0; border: 0; color: #0f172a; font: 700 24px/32px Arial, sans-serif; text-align: left; }
      #settings-grid { box-sizing: border-box; display: grid; grid-template-columns: 140px 1fr; grid-template-rows: 52px 52px 52px 52px; column-gap: 16px; row-gap: 12px; width: 472px; height: 244px; margin: 0; padding: 0; border: 0; }
      #settings-grid > label { box-sizing: border-box; width: 140px; height: 52px; margin: 0; padding: 14px 0; border: 0; color: #334155; font: 700 14px/24px Arial, sans-serif; text-align: left; }
      #settings-grid > input, #settings-grid > select { appearance: none; box-sizing: border-box; width: 316px; height: 52px; margin: 0; padding: 12px 14px; border: 2px solid #94a3b8; border-radius: 6px; background: #f8fafc; color: #0f172a; font: 400 15px/24px Arial, sans-serif; text-align: left; }
      #settings-team:disabled { background: #e2e8f0; color: #64748b; opacity: 0.65; }
      #settings-consent { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 12px; width: 472px; height: 40px; margin: 0; padding: 0; border: 0; }
      #settings-consent-box { appearance: none; box-sizing: border-box; flex: 0 0 24px; width: 24px; height: 24px; margin: 0; padding: 0; border: 2px solid #1d4ed8; border-radius: 4px; background: #2563eb; }
      #settings-consent-box::after { content: ''; display: block; width: 14px; height: 14px; margin: 3px; background: #ffffff; }
      #settings-consent-label { box-sizing: border-box; width: 300px; height: 40px; margin: 0; padding: 8px 0; border: 0; color: #334155; font: 400 14px/24px Arial, sans-serif; text-align: left; }
      #settings-actions { box-sizing: border-box; display: flex; flex-direction: row; justify-content: flex-end; gap: 12px; width: 472px; height: 52px; margin: 0; padding: 0; border: 0; }
      #settings-cancel, #settings-save { appearance: none; box-sizing: border-box; height: 52px; margin: 0; padding: 12px 18px; border: 0; border-radius: 6px; font: 700 14px/24px Arial, sans-serif; text-align: center; }
      #settings-cancel { width: 96px; background: #e2e8f0; color: #334155; }
      #settings-save { width: 132px; background: #2563eb; color: #ffffff; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#e2e8f0', fontFamily: 'Arial, sans-serif' },
      { selector: '#settings-panel', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', position: 'absolute', left: '140px', top: '50px', width: '520px', height: '500px', margin: '0', padding: '24px', borderWidth: '0', background: '#ffffff' },
      { selector: '#settings-title', boxSizing: 'border-box', width: '472px', height: '40px', margin: '0', padding: '4px 0', borderWidth: '0', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '24px', fontWeight: '700', lineHeight: '32px', textAlign: 'left' },
      { selector: '#settings-grid', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: '140px 1fr', gridTemplateRows: '52px 52px 52px 52px', columnGap: '16px', rowGap: '12px', width: '472px', height: '244px', margin: '0', padding: '0', borderWidth: '0' },
      { selector: '#settings-grid > label', boxSizing: 'border-box', width: '140px', height: '52px', margin: '0', padding: '14px 0', borderWidth: '0', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px', textAlign: 'left' },
      { selector: '#settings-grid > input, #settings-grid > select', boxSizing: 'border-box', width: '316px', height: '52px', margin: '0', padding: '12px 14px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#94a3b8', borderRadius: '6px', background: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '15px', fontWeight: '400', lineHeight: '24px', textAlign: 'left' },
      { selector: '#settings-team:disabled', background: '#e2e8f0', color: '#64748b', opacity: '0.65' },
      { selector: '#settings-consent', boxSizing: 'border-box', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', width: '472px', height: '40px', margin: '0', padding: '0', borderWidth: '0' },
      { selector: '#settings-consent-box', boxSizing: 'border-box', flex: '0 0 24px', width: '24px', height: '24px', margin: '0', padding: '0', borderWidth: '2px', borderStyle: 'solid', borderColor: '#1d4ed8', borderRadius: '4px', background: '#2563eb' },
      { selector: '#settings-consent-label', boxSizing: 'border-box', width: '300px', height: '40px', margin: '0', padding: '8px 0', borderWidth: '0', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '400', lineHeight: '24px', textAlign: 'left' },
      { selector: '#settings-actions', boxSizing: 'border-box', display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: '12px', width: '472px', height: '52px', margin: '0', padding: '0', borderWidth: '0' },
      { selector: '#settings-cancel, #settings-save', boxSizing: 'border-box', height: '52px', margin: '0', padding: '12px 18px', borderWidth: '0', borderRadius: '6px', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px', textAlign: 'center' },
      { selector: '#settings-cancel', width: '96px', background: '#e2e8f0', color: '#334155' },
      { selector: '#settings-save', width: '132px', background: '#2563eb', color: '#ffffff' },
    ],
    root: {
      children: [{
        type: 'section', id: 'settings-panel', children: [
          { type: 'h1', id: 'settings-title', textContent: 'Workspace settings' },
          { type: 'div', id: 'settings-grid', children: [
            { type: 'label', id: 'settings-name-label', textContent: 'Display name' },
            { type: 'input', inputType: 'text', id: 'settings-name', value: 'Astylar Studio' },
            { type: 'label', id: 'settings-theme-label', textContent: 'Theme' },
            { type: 'select', id: 'settings-theme', value: 'dark', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] },
            { type: 'label', id: 'settings-team-label', textContent: 'Team' },
            { type: 'input', inputType: 'text', id: 'settings-team', value: 'Platform', disabled: true },
            { type: 'label', id: 'settings-region-label', textContent: 'Region' },
            { type: 'select', id: 'settings-region', value: 'africa', options: [{ value: 'africa', label: 'Africa' }, { value: 'europe', label: 'Europe' }] },
          ] },
          { type: 'div', id: 'settings-consent', children: [
            { type: 'input', inputType: 'checkbox', id: 'settings-consent-box', checked: true },
            { type: 'label', id: 'settings-consent-label', textContent: 'Email deployment reports' },
          ] },
          { type: 'div', id: 'settings-actions', children: [
            { type: 'input', inputType: 'button', id: 'settings-cancel', value: 'Cancel' },
            { type: 'input', inputType: 'button', id: 'settings-save', value: 'Save changes' },
          ] },
        ],
      }],
    },
  },
};
