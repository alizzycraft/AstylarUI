import type { DOMElement } from '../../app/types/dom-element';
import type { StyleRule } from '../../app/types/style-rule';
import type { ParityFixture } from '../parity.types';

const cancelDialogHtml = `
  <dialog id="modal-life-cancel-dialog" aria-labelledby="modal-life-cancel-title">
    <h2 id="modal-life-cancel-title">Unsaved draft</h2>
    <p id="modal-life-cancel-copy">Escape is canceled by application policy.</p>
    <input id="modal-life-cancel-action" type="button" value="Keep editing" autofocus>
  </dialog>
`;

const closeDialogHtml = `
  <dialog id="modal-life-close-dialog" aria-labelledby="modal-life-close-title">
    <h2 id="modal-life-close-title">Close workspace?</h2>
    <p id="modal-life-close-copy">Escape closes this dialog and restores its invoker.</p>
    <input id="modal-life-close-action" type="button" value="Close dialog" autofocus>
  </dialog>
`;

const dialogElement = (
  id: 'modal-life-cancel-dialog' | 'modal-life-close-dialog',
  titleId: 'modal-life-cancel-title' | 'modal-life-close-title',
  copyId: 'modal-life-cancel-copy' | 'modal-life-close-copy',
  actionId: 'modal-life-cancel-action' | 'modal-life-close-action',
  title: string,
  copy: string,
  action: string,
): DOMElement => ({
  type: 'dialog', id, open: true, modal: true, ariaLabelledby: titleId,
  children: [
    { type: 'h2', id: titleId, textContent: title },
    { type: 'p', id: copyId, textContent: copy },
    { type: 'input', inputType: 'button', id: actionId, value: action, autofocus: true },
  ],
});

const cancelDialog = dialogElement(
  'modal-life-cancel-dialog', 'modal-life-cancel-title', 'modal-life-cancel-copy',
  'modal-life-cancel-action', 'Unsaved draft',
  'Escape is canceled by application policy.', 'Keep editing',
);
const closeDialog = dialogElement(
  'modal-life-close-dialog', 'modal-life-close-title', 'modal-life-close-copy',
  'modal-life-close-action', 'Close workspace?',
  'Escape closes this dialog and restores its invoker.', 'Close dialog',
);

const styles: StyleRule[] = [
  { selector: 'root', background: '#dbeafe', fontFamily: 'Arial, sans-serif' },
  { selector: '#modal-life-surface', boxSizing: 'border-box', position: 'absolute', left: '0', top: '0', width: '800px', height: '600px', background: '#dbeafe' },
  { selector: '#modal-life-invoker', boxSizing: 'border-box', position: 'absolute', left: '40px', top: '40px', width: '164px', height: '44px', margin: '0', padding: '10px 12px', borderWidth: '0', borderRadius: '0', background: '#1d4ed8', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px' },
  { selector: '#modal-life-invoker:focus', background: '#f59e0b', color: '#111827' },
  { selector: '#modal-life-high-layer', boxSizing: 'border-box', position: 'absolute', left: '180px', top: '130px', width: '440px', height: '340px', zIndex: '3', background: '#be123c' },
  { selector: '#modal-life-cancel-dialog, #modal-life-close-dialog', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px', position: 'fixed', left: '220px', top: '170px', width: '360px', height: '260px', margin: '0', padding: '24px', borderWidth: '0', zIndex: '1', background: '#ffffff', color: '#0f172a' },
  { selector: '#modal-life-cancel-title, #modal-life-close-title', boxSizing: 'border-box', width: '312px', height: '36px', margin: '0', padding: '2px 0', fontFamily: 'Arial, sans-serif', fontSize: '22px', fontWeight: '700', lineHeight: '32px' },
  { selector: '#modal-life-cancel-copy, #modal-life-close-copy', boxSizing: 'border-box', width: '312px', height: '72px', margin: '0', padding: '0', color: '#475569', fontFamily: 'Arial, sans-serif', fontSize: '15px', lineHeight: '24px' },
  { selector: '#modal-life-cancel-action, #modal-life-close-action', boxSizing: 'border-box', alignSelf: 'flex-end', width: '126px', height: '44px', margin: '0', padding: '10px 12px', borderWidth: '0', borderRadius: '0', background: '#2563eb', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px' },
  { selector: '#modal-life-cancel-action:focus, #modal-life-close-action:focus', background: '#f59e0b', color: '#111827' },
];

const rootChildren = (dialog?: DOMElement): DOMElement[] => [
  {
    type: 'div', id: 'modal-life-surface', children: [
      { type: 'input', inputType: 'button', id: 'modal-life-invoker', value: 'Open workspace' },
      { type: 'div', id: 'modal-life-high-layer' },
      { type: 'div', id: 'modal-life-host', children: dialog ? [dialog] : [] },
    ],
  },
];

export const semanticModalLifecycleFixture: ParityFixture = {
  id: 'semantic-modal-lifecycle',
  title: 'Semantic modal dismissal and restoration',
  category: 'accessibility-semantics',
  expectedBehavior:
    'Modal Escape dispatches a cancelable cancel event, accepted dismissal closes the dialog and restores its invoker, canceled dismissal remains contained, and application removal releases modal and focus ownership without a synthetic close event.',
  measurementIds: ['modal-life-surface', 'modal-life-invoker', 'modal-life-high-layer'],
  interactionIds: [
    'modal-life-invoker',
    'modal-life-cancel-dialog', 'modal-life-cancel-action',
    'modal-life-close-dialog', 'modal-life-close-action',
  ],
  semanticIds: [
    'modal-life-invoker',
    'modal-life-cancel-dialog', 'modal-life-cancel-title', 'modal-life-cancel-action',
    'modal-life-close-dialog', 'modal-life-close-title', 'modal-life-close-action',
  ],
  modalDialogIds: ['modal-life-cancel-dialog', 'modal-life-close-dialog'],
  cancelDialogIds: ['modal-life-cancel-dialog'],
  interactionEventTypes: ['focus', 'blur', 'keydown', 'keyup', 'cancel', 'close'],
  interactionSteps: [
    { id: 'focus-invoker-before-canceled-open', actions: [{ type: 'semantic-focus', elementId: 'modal-life-invoker' }] },
    { id: 'open-cancelable-dialog', actions: [{ type: 'apply-update', stepIndex: 0 }] },
    { id: 'cancel-escape-dismissal', actions: [{ type: 'press-key', key: 'Escape' }] },
    { id: 'remove-canceled-dialog', actions: [{ type: 'apply-update', stepIndex: 1 }] },
    { id: 'focus-invoker-before-accepted-open', actions: [{ type: 'semantic-focus', elementId: 'modal-life-invoker' }] },
    { id: 'open-accepted-dialog', actions: [{ type: 'apply-update', stepIndex: 2 }] },
    { id: 'accept-escape-dismissal', actions: [{ type: 'press-key', key: 'Escape' }] },
    { id: 'reopen-accepted-dialog', actions: [{ type: 'apply-update', stepIndex: 2 }] },
    { id: 'remove-active-dialog', actions: [{ type: 'apply-update', stepIndex: 3 }] },
  ],
  reference: {
    html: `
      <div id="modal-life-surface">
        <input id="modal-life-invoker" type="button" value="Open workspace">
        <div id="modal-life-high-layer"></div>
        <div id="modal-life-host"></div>
      </div>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#dbeafe; font-family:Arial,sans-serif; }
      #modal-life-surface { box-sizing:border-box; position:absolute; left:0; top:0; width:800px; height:600px; background:#dbeafe; }
      #modal-life-invoker { appearance:none; box-sizing:border-box; position:absolute; left:40px; top:40px; width:164px; height:44px; margin:0; padding:10px 12px; border:0; border-radius:0; background:#1d4ed8; color:#fff; font:700 14px/24px Arial,sans-serif; }
      #modal-life-invoker:focus { outline:0; background:#f59e0b; color:#111827; }
      #modal-life-high-layer { box-sizing:border-box; position:absolute; left:180px; top:130px; width:440px; height:340px; z-index:3; background:#be123c; }
      #modal-life-cancel-dialog, #modal-life-close-dialog { box-sizing:border-box; flex-direction:column; gap:16px; position:fixed; left:220px; top:170px; width:360px; height:260px; margin:0; padding:24px; border:0; z-index:1; background:#fff; color:#0f172a; }
      #modal-life-cancel-dialog[open], #modal-life-close-dialog[open] { display:flex; }
      #modal-life-cancel-dialog::backdrop, #modal-life-close-dialog::backdrop { background:transparent; }
      #modal-life-cancel-title, #modal-life-close-title { box-sizing:border-box; width:312px; height:36px; margin:0; padding:2px 0; font:700 22px/32px Arial,sans-serif; }
      #modal-life-cancel-copy, #modal-life-close-copy { box-sizing:border-box; width:312px; height:72px; margin:0; padding:0; color:#475569; font:400 15px/24px Arial,sans-serif; }
      #modal-life-cancel-action, #modal-life-close-action { appearance:none; box-sizing:border-box; align-self:flex-end; width:126px; height:44px; margin:0; padding:10px 12px; border:0; border-radius:0; background:#2563eb; color:#fff; font:700 14px/24px Arial,sans-serif; }
      #modal-life-cancel-action:focus, #modal-life-close-action:focus { outline:0; background:#f59e0b; color:#111827; }
    `,
  },
  siteData: { styles, root: { children: rootChildren() } },
  dynamicSteps: [
    {
      id: 'open-cancel-dialog',
      referenceMutations: [{ type: 'set-children', elementId: 'modal-life-host', html: cancelDialogHtml }],
      siteData: { styles, root: { children: rootChildren(cancelDialog) } },
    },
    {
      id: 'remove-cancel-dialog',
      referenceMutations: [{ type: 'set-children', elementId: 'modal-life-host', html: '' }],
      siteData: { styles, root: { children: rootChildren() } },
    },
    {
      id: 'open-close-dialog',
      referenceMutations: [{ type: 'set-children', elementId: 'modal-life-host', html: closeDialogHtml }],
      siteData: { styles, root: { children: rootChildren(closeDialog) } },
    },
    {
      id: 'remove-close-dialog',
      referenceMutations: [{ type: 'set-children', elementId: 'modal-life-host', html: '' }],
      siteData: { styles, root: { children: rootChildren() } },
    },
  ],
};
