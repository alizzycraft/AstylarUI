import { ParityFixture } from '../parity.types';

export const composedModalFixture: ParityFixture = {
  id: 'composed-modal',
  title: 'Composed modal and backdrop',
  category: 'composed-application',
  expectedBehavior:
    'A fixed backdrop and modal paint above an application surface in z-index order while nested modal typography and actions retain their flex geometry.',
  measurementIds: [
    'modal-page',
    'modal-page-sidebar',
    'modal-page-content',
    'modal-backdrop',
    'modal-dialog',
    'modal-title',
    'modal-copy',
    'modal-actions',
    'modal-cancel',
    'modal-confirm',
  ],
  reference: {
    html: `
      <div id="modal-page">
        <aside id="modal-page-sidebar"></aside>
        <main id="modal-page-content"></main>
      </div>
      <div id="modal-backdrop"></div>
      <section id="modal-dialog">
        <h1 id="modal-title">Delete workspace?</h1>
        <p id="modal-copy">This removes the workspace and its deployment history. This action cannot be undone.</p>
        <div id="modal-actions">
          <input id="modal-cancel" type="button" value="Keep workspace">
          <input id="modal-confirm" type="button" value="Delete">
        </div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #e2e8f0; font-family: Arial, sans-serif; }
      #modal-page { box-sizing: border-box; display: flex; position: absolute; left: 60px; top: 50px; width: 680px; height: 500px; margin: 0; padding: 0; border: 0; background: #ffffff; }
      #modal-page-sidebar { box-sizing: border-box; flex: 0 0 180px; width: 180px; height: 500px; margin: 0; padding: 0; border: 0; background: #1e3a8a; }
      #modal-page-content { box-sizing: border-box; flex: 0 0 500px; width: 500px; height: 500px; margin: 0; padding: 0; border: 0; background: #dbeafe; }
      #modal-backdrop { box-sizing: border-box; position: fixed; left: 0; top: 0; width: 800px; height: 600px; margin: 0; padding: 0; border: 0; z-index: 20; background: #0f172a; opacity: 0.60; }
      #modal-dialog { box-sizing: border-box; display: flex; flex-direction: column; gap: 20px; position: fixed; left: 210px; top: 140px; width: 380px; height: 320px; margin: 0; padding: 28px; border: 0; z-index: 21; background: #ffffff; }
      #modal-title { box-sizing: border-box; width: 324px; height: 40px; margin: 0; padding: 4px 0; border: 0; color: #0f172a; font: 700 24px/32px Arial, sans-serif; text-align: left; }
      #modal-copy { box-sizing: border-box; width: 324px; height: 96px; margin: 0; padding: 0; border: 0; color: #475569; font: 400 16px/24px Arial, sans-serif; text-align: left; }
      #modal-actions { box-sizing: border-box; display: flex; flex-direction: row; justify-content: flex-end; gap: 12px; width: 324px; height: 52px; margin: 0; padding: 0; border: 0; }
      #modal-cancel, #modal-confirm { appearance: none; box-sizing: border-box; height: 52px; margin: 0; padding: 12px 16px; border: 0; border-radius: 6px; font: 700 14px/24px Arial, sans-serif; text-align: center; }
      #modal-cancel { width: 144px; background: #e2e8f0; color: #334155; }
      #modal-confirm { width: 92px; background: #dc2626; color: #ffffff; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#e2e8f0', fontFamily: 'Arial, sans-serif' },
      { selector: '#modal-page', boxSizing: 'border-box', display: 'flex', position: 'absolute', left: '60px', top: '50px', width: '680px', height: '500px', margin: '0', padding: '0', borderWidth: '0', background: '#ffffff' },
      { selector: '#modal-page-sidebar', boxSizing: 'border-box', flex: '0 0 180px', width: '180px', height: '500px', margin: '0', padding: '0', borderWidth: '0', background: '#1e3a8a' },
      { selector: '#modal-page-content', boxSizing: 'border-box', flex: '0 0 500px', width: '500px', height: '500px', margin: '0', padding: '0', borderWidth: '0', background: '#dbeafe' },
      { selector: '#modal-backdrop', boxSizing: 'border-box', position: 'fixed', left: '0', top: '0', width: '800px', height: '600px', margin: '0', padding: '0', borderWidth: '0', zIndex: '20', background: '#0f172a', opacity: '0.60' },
      { selector: '#modal-dialog', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px', position: 'fixed', left: '210px', top: '140px', width: '380px', height: '320px', margin: '0', padding: '28px', borderWidth: '0', zIndex: '21', background: '#ffffff' },
      { selector: '#modal-title', boxSizing: 'border-box', width: '324px', height: '40px', margin: '0', padding: '4px 0', borderWidth: '0', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '24px', fontWeight: '700', lineHeight: '32px', textAlign: 'left' },
      { selector: '#modal-copy', boxSizing: 'border-box', width: '324px', height: '96px', margin: '0', padding: '0', borderWidth: '0', color: '#475569', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400', lineHeight: '24px', textAlign: 'left' },
      { selector: '#modal-actions', boxSizing: 'border-box', display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', gap: '12px', width: '324px', height: '52px', margin: '0', padding: '0', borderWidth: '0' },
      { selector: '#modal-cancel, #modal-confirm', boxSizing: 'border-box', height: '52px', margin: '0', padding: '12px 16px', borderWidth: '0', borderRadius: '6px', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px', textAlign: 'center' },
      { selector: '#modal-cancel', width: '144px', background: '#e2e8f0', color: '#334155' },
      { selector: '#modal-confirm', width: '92px', background: '#dc2626', color: '#ffffff' },
    ],
    root: {
      children: [
        { type: 'div', id: 'modal-page', children: [
          { type: 'aside', id: 'modal-page-sidebar' },
          { type: 'main', id: 'modal-page-content' },
        ] },
        { type: 'div', id: 'modal-backdrop' },
        { type: 'section', id: 'modal-dialog', children: [
          { type: 'h1', id: 'modal-title', textContent: 'Delete workspace?' },
          { type: 'p', id: 'modal-copy', textContent: 'This removes the workspace and its deployment history. This action cannot be undone.' },
          { type: 'div', id: 'modal-actions', children: [
            { type: 'input', inputType: 'button', id: 'modal-cancel', value: 'Keep workspace' },
            { type: 'input', inputType: 'button', id: 'modal-confirm', value: 'Delete' },
          ] },
        ] },
      ],
    },
  },
};
