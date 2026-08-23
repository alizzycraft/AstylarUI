import type { SiteData } from '../../app/types/site-data';
import type { ParityFixture } from '../parity.types';

const createSiteData = (status: string): SiteData => ({
  styles: [
    { selector: 'root', background: '#f8fafc' },
    {
      selector: '#preserved-input', boxSizing: 'border-box', position: 'absolute',
      left: '180px', top: '210px', width: '300px', height: '64px', margin: '0',
      padding: '12px 16px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#334155',
      borderRadius: '0', background: '#ffffff', color: '#0f172a', fontFamily: 'Arial, sans-serif',
      fontSize: '18px', fontWeight: '400', lineHeight: '36px',
    },
    {
      selector: '#update-status', position: 'absolute', left: '180px', top: '310px',
      width: '360px', height: '40px', color: '#334155', fontFamily: 'Arial, sans-serif',
      fontSize: '18px', lineHeight: '24px',
    },
  ],
  root: { children: [
    { type: 'input', inputType: 'text', id: 'preserved-input', value: 'Seed' },
    { type: 'div', id: 'update-status', textContent: status },
  ] },
});

export const interactionUpdateTextStateFixture: ParityFixture = {
  id: 'interaction-update-text-state',
  title: 'Text-control state across application update',
  category: 'forms-interactive',
  expectedBehavior:
    'A compatible stable-ID text input retains its user-edited value, focus, caret, and selection when an application update changes a sibling.',
  measurementIds: ['preserved-input', 'update-status'],
  interactionIds: ['preserved-input'],
  interactionEventTypes: ['focus', 'keydown', 'input'],
  interactionSteps: [
    {
      id: 'edit-and-select',
      actions: [
        { type: 'click', elementId: 'preserved-input' },
        { type: 'press-key', key: 'Control+A' },
        { type: 'type-text', text: 'Edited' },
        { type: 'press-key', key: 'Shift+ArrowLeft' },
      ],
    },
    { id: 'update-sibling', actions: [{ type: 'apply-update', stepIndex: 0 }] },
    {
      id: 'resize-and-update-sibling-again',
      actions: [{ type: 'apply-update', stepIndex: 1, viewportId: 'tablet' }],
    },
  ],
  reference: {
    html: `<input id="preserved-input" type="text" value="Seed"><div id="update-status">Initial layout</div>`,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      #preserved-input { appearance:none; box-sizing:border-box; position:absolute; left:180px; top:210px; width:300px; height:64px; margin:0; padding:12px 16px; border:2px solid #334155; border-radius:0; outline:0; background:#fff; color:#0f172a; font:400 18px/36px Arial,sans-serif; }
      #update-status { position:absolute; left:180px; top:310px; width:360px; height:40px; color:#334155; font:400 18px/24px Arial,sans-serif; }
    `,
  },
  siteData: createSiteData('Initial layout'),
  dynamicSteps: [{
    id: 'updated-sibling',
    referenceMutations: [{
      type: 'set-text', elementId: 'update-status', textContent: 'Updated layout',
    }],
    siteData: createSiteData('Updated layout'),
  }, {
    id: 'final-sibling',
    referenceMutations: [{
      type: 'set-text', elementId: 'update-status', textContent: 'Final layout',
    }],
    siteData: createSiteData('Final layout'),
  }],
};
