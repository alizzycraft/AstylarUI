import type { SiteData } from '../../app/types/site-data';
import type { StyleRule } from '../../app/types/style-rule';
import type { ParityFixture } from '../parity.types';

const styles: StyleRule[] = [
  { selector: 'root', background: '#eff6ff', fontFamily: 'Arial, sans-serif' },
  { selector: '#announce-surface', boxSizing: 'border-box', position: 'absolute', left: '0', top: '0', width: '800px', height: '600px', padding: '48px', background: '#eff6ff' },
  { selector: '#announce-form', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', width: '420px', height: '300px', padding: '24px', background: '#ffffff' },
  { selector: '#announce-heading', boxSizing: 'border-box', width: '372px', height: '36px', margin: '0', fontFamily: 'Arial, sans-serif', fontSize: '22px', fontWeight: '700', lineHeight: '32px' },
  { selector: '#announce-label', boxSizing: 'border-box', width: '372px', height: '24px', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px' },
  { selector: '#announce-name', boxSizing: 'border-box', width: '372px', height: '44px', margin: '0', padding: '9px 12px', borderWidth: '2px', borderColor: '#94a3b8', borderRadius: '0', background: '#ffffff', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '15px', lineHeight: '22px' },
  { selector: '#announce-name:focus', borderColor: '#2563eb' },
  { selector: '#announce-name:invalid', borderColor: '#dc2626' },
  { selector: '#announce-submit', boxSizing: 'border-box', width: '120px', height: '44px', margin: '0', padding: '10px 12px', borderWidth: '0', borderRadius: '0', background: '#2563eb', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px' },
  { selector: '#announce-error', boxSizing: 'border-box', width: '372px', height: '24px', margin: '0', color: '#b91c1c', fontFamily: 'Arial, sans-serif', fontSize: '13px', fontWeight: '700', lineHeight: '24px' },
  { selector: '#announce-status', boxSizing: 'border-box', position: 'absolute', left: '48px', top: '372px', width: '420px', height: '44px', padding: '10px 12px', background: '#dcfce7', color: '#166534', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px' },
  { selector: '#announce-summary', boxSizing: 'border-box', position: 'absolute', left: '48px', top: '436px', width: '420px', height: '32px', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '24px' },
];

function siteData(
  errorText = '',
  statusText = '',
  summaryText = 'No changes applied.',
  includeMessages = true,
): SiteData {
  return {
    styles,
    root: { children: [{
      type: 'section', id: 'announce-surface', children: [
        {
          type: 'form', id: 'announce-form', children: [
            { type: 'h2', id: 'announce-heading', textContent: 'Workspace profile' },
            { type: 'label', id: 'announce-label', for: 'announce-name', textContent: 'Workspace name' },
            {
              type: 'input', inputType: 'text', id: 'announce-name', value: '', required: true,
              ariaDescribedby: errorText ? 'announce-error' : undefined,
            },
            { type: 'input', inputType: 'submit', id: 'announce-submit', value: 'Save profile' },
            ...(includeMessages ? [{
              type: 'p' as const, id: 'announce-error', role: 'alert', ariaLive: 'assertive' as const,
              ariaAtomic: true, textContent: errorText,
            }] : []),
          ],
        },
        ...(includeMessages ? [{
          type: 'div' as const, id: 'announce-status', role: 'status', ariaLive: 'polite' as const,
          ariaAtomic: true, textContent: statusText,
        }] : []),
        { type: 'p', id: 'announce-summary', textContent: summaryText },
      ],
    }] },
  };
}

export const semanticStatusValidationFixture: ParityFixture = {
  id: 'semantic-status-validation',
  title: 'Status and validation announcements',
  category: 'accessibility-semantics',
  expectedBehavior:
    'Required-field invalid state and error descriptions stay synchronized while assertive error and polite status regions emit one deterministic non-empty update, ignore unrelated repeated data updates, and cleanly disappear when removed.',
  measurementIds: [
    'announce-surface', 'announce-form', 'announce-heading', 'announce-label',
    'announce-name', 'announce-submit', 'announce-summary',
  ],
  interactionIds: ['announce-name', 'announce-submit'],
  semanticIds: ['announce-form', 'announce-name', 'announce-error', 'announce-status', 'announce-summary'],
  announcementIds: ['announce-error', 'announce-status'],
  interactionEventTypes: ['pointerdown', 'pointerup', 'click', 'focus', 'blur', 'keydown', 'keyup', 'input', 'change', 'invalid', 'submit'],
  interactionSteps: [
    { id: 'submit-empty-required-field', actions: [{ type: 'click', elementId: 'announce-submit' }] },
    { id: 'publish-validation-error', actions: [{ type: 'apply-update', stepIndex: 0 }] },
    { id: 'enter-valid-name', actions: [{ type: 'type-text', text: 'Atlas' }] },
    { id: 'publish-success-status', actions: [{ type: 'apply-update', stepIndex: 1 }] },
    { id: 'unrelated-update-does-not-repeat-status', actions: [{ type: 'apply-update', stepIndex: 2 }] },
    { id: 'remove-live-regions', actions: [{ type: 'apply-update', stepIndex: 3 }] },
  ],
  reference: {
    html: `
      <section id="announce-surface">
        <form id="announce-form">
          <h2 id="announce-heading">Workspace profile</h2>
          <label id="announce-label" for="announce-name">Workspace name</label>
          <input id="announce-name" type="text" value="" required>
          <input id="announce-submit" type="submit" value="Save profile">
          <p id="announce-error" role="alert" aria-live="assertive" aria-atomic="true"></p>
        </form>
        <div id="announce-status" role="status" aria-live="polite" aria-atomic="true"></div>
        <p id="announce-summary">No changes applied.</p>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#eff6ff; font-family:Arial,sans-serif; }
      #announce-surface { box-sizing:border-box; position:absolute; left:0; top:0; width:800px; height:600px; padding:48px; background:#eff6ff; }
      #announce-form { box-sizing:border-box; display:flex; flex-direction:column; gap:12px; width:420px; height:300px; padding:24px; background:#fff; }
      #announce-heading { box-sizing:border-box; width:372px; height:36px; margin:0; font:700 22px/32px Arial,sans-serif; }
      #announce-label { box-sizing:border-box; width:372px; height:24px; font:700 14px/24px Arial,sans-serif; }
      #announce-name { appearance:none; box-sizing:border-box; width:372px; height:44px; margin:0; padding:9px 12px; border:2px solid #94a3b8; border-radius:0; background:#fff; color:#0f172a; font:400 15px/22px Arial,sans-serif; }
      #announce-name:focus { outline:0; border-color:#2563eb; } #announce-name:invalid { border-color:#dc2626; }
      #announce-submit { appearance:none; box-sizing:border-box; width:120px; height:44px; margin:0; padding:10px 12px; border:0; border-radius:0; background:#2563eb; color:#fff; font:700 14px/24px Arial,sans-serif; }
      #announce-error { box-sizing:border-box; width:372px; height:24px; margin:0; color:#b91c1c; font:700 13px/24px Arial,sans-serif; }
      #announce-status { box-sizing:border-box; position:absolute; left:48px; top:372px; width:420px; height:44px; padding:10px 12px; background:#dcfce7; color:#166534; font:700 14px/24px Arial,sans-serif; }
      #announce-summary { box-sizing:border-box; position:absolute; left:48px; top:436px; width:420px; height:32px; margin:0; color:#334155; font:400 14px/24px Arial,sans-serif; }
    `,
  },
  siteData: siteData(),
  dynamicSteps: [
    {
      id: 'validation-error',
      referenceMutations: [
        { type: 'set-text', elementId: 'announce-error', textContent: 'Workspace name is required.' },
        { type: 'set-attribute', elementId: 'announce-name', name: 'aria-describedby', value: 'announce-error' },
      ],
      siteData: siteData('Workspace name is required.'),
    },
    {
      id: 'success-status',
      referenceMutations: [
        { type: 'set-text', elementId: 'announce-error', textContent: '' },
        { type: 'set-attribute', elementId: 'announce-name', name: 'aria-describedby' },
        { type: 'set-text', elementId: 'announce-status', textContent: 'Workspace profile saved.' },
      ],
      siteData: siteData('', 'Workspace profile saved.'),
    },
    {
      id: 'unrelated-summary',
      referenceMutations: [
        { type: 'set-text', elementId: 'announce-summary', textContent: 'Autosave is enabled.' },
      ],
      siteData: siteData('', 'Workspace profile saved.', 'Autosave is enabled.'),
    },
    {
      id: 'remove-live-regions',
      referenceMutations: [
        { type: 'remove-element', elementId: 'announce-error' },
        { type: 'remove-element', elementId: 'announce-status' },
      ],
      siteData: siteData('', '', 'Autosave is enabled.', false),
    },
  ],
};
