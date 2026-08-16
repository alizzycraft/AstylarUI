import { ParityFixture } from '../parity.types';

export const composedNotificationCenterFixture: ParityFixture = {
  id: 'composed-notification-center',
  title: 'Composed notification center',
  category: 'composed-application',
  expectedBehavior:
    'A compact toolbar and clipped stack of fixed-height notification rows preserve nested flex alignment, ellipsis, status styling, and the overflow boundary.',
  measurementIds: [
    'notice-shell', 'notice-toolbar', 'notice-title', 'notice-action', 'notice-list',
    'notice-row-one', 'notice-dot-one', 'notice-body-one', 'notice-heading-one', 'notice-copy-one', 'notice-state-one',
    'notice-row-two', 'notice-dot-two', 'notice-body-two', 'notice-heading-two', 'notice-copy-two', 'notice-state-two',
    'notice-row-three', 'notice-row-four', 'notice-row-five',
  ],
  reference: {
    html: `
      <section id="notice-shell">
        <header id="notice-toolbar"><h1 id="notice-title">Notifications</h1><input id="notice-action" type="button" value="Mark all read"></header>
        <main id="notice-list">
          <article id="notice-row-one"><span id="notice-dot-one"></span><div id="notice-body-one"><strong id="notice-heading-one">Build completed</strong><p id="notice-copy-one">The production deployment for Atlas finished successfully.</p></div><span id="notice-state-one">New</span></article>
          <article id="notice-row-two"><span id="notice-dot-two"></span><div id="notice-body-two"><strong id="notice-heading-two">Review requested</strong><p id="notice-copy-two">Mina requested your review on a long project update that should truncate.</p></div><span id="notice-state-two">New</span></article>
          <article id="notice-row-three"></article><article id="notice-row-four"></article><article id="notice-row-five"></article>
        </main>
      </section>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #e2e8f0; font-family: Arial, sans-serif; }
      #notice-shell { box-sizing: border-box; position: absolute; left: 90px; top: 50px; width: 620px; height: 500px; margin: 0; padding: 0; border: 0; overflow: hidden; background: #ffffff; }
      #notice-toolbar { box-sizing: border-box; display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 620px; height: 72px; margin: 0; padding: 16px 20px; border: 0; background: #ffffff; }
      #notice-title { box-sizing: border-box; width: 220px; height: 40px; margin: 0; padding: 4px 0; border: 0; color: #0f172a; font: 700 24px/32px Arial, sans-serif; text-align: left; }
      #notice-action { appearance: none; box-sizing: border-box; width: 124px; height: 40px; margin: 0; padding: 8px 12px; border: 0; border-radius: 6px; background: #dbeafe; color: #1d4ed8; font: 700 14px/24px Arial, sans-serif; text-align: center; }
      #notice-list { box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; width: 620px; height: 428px; margin: 0; padding: 20px; border: 0; overflow: hidden; background: #f8fafc; }
      #notice-list > article { box-sizing: border-box; display: flex; flex: 0 0 88px; flex-direction: row; gap: 16px; align-items: center; width: 580px; height: 88px; margin: 0; padding: 16px; border: 0; background: #ffffff; }
      #notice-row-one, #notice-row-two { background: #eff6ff; }
      #notice-dot-one, #notice-dot-two { box-sizing: border-box; position: relative; z-index: 1; flex: 0 0 12px; width: 12px; height: 12px; margin: 0; padding: 0; border: 0; border-radius: 6px; background: #2563eb; }
      #notice-body-one, #notice-body-two { box-sizing: border-box; display: flex; flex: 0 0 400px; flex-direction: column; gap: 4px; width: 400px; height: 56px; margin: 0; padding: 0; border: 0; }
      #notice-heading-one, #notice-heading-two { box-sizing: border-box; width: 400px; height: 24px; margin: 0; padding: 0; border: 0; color: #0f172a; font: 700 15px/24px Arial, sans-serif; text-align: left; }
      #notice-copy-one, #notice-copy-two { box-sizing: border-box; width: 400px; height: 28px; margin: 0; padding: 2px 0; border: 0; overflow: hidden; color: #475569; font: 400 14px/24px Arial, sans-serif; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
      #notice-state-one, #notice-state-two { box-sizing: border-box; position: relative; z-index: 1; flex: 0 0 88px; width: 88px; height: 28px; margin: 0; padding: 2px 8px; border: 0; border-radius: 14px; background: #dbeafe; color: #1d4ed8; font: 700 12px/24px Arial, sans-serif; text-align: center; }
      #notice-row-three { background: #f1f5f9; } #notice-row-four { background: #e2e8f0; } #notice-row-five { background: #cbd5e1; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#e2e8f0', fontFamily: 'Arial, sans-serif' },
      { selector: '#notice-shell', boxSizing: 'border-box', position: 'absolute', left: '90px', top: '50px', width: '620px', height: '500px', margin: '0', padding: '0', borderWidth: '0', overflow: 'hidden', background: '#ffffff' },
      { selector: '#notice-toolbar', boxSizing: 'border-box', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '620px', height: '72px', margin: '0', padding: '16px 20px', borderWidth: '0', background: '#ffffff' },
      { selector: '#notice-title', boxSizing: 'border-box', width: '220px', height: '40px', margin: '0', padding: '4px 0', borderWidth: '0', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '24px', fontWeight: '700', lineHeight: '32px', textAlign: 'left' },
      { selector: '#notice-action', boxSizing: 'border-box', width: '124px', height: '40px', margin: '0', padding: '8px 12px', borderWidth: '0', borderRadius: '6px', background: '#dbeafe', color: '#1d4ed8', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px', textAlign: 'center' },
      { selector: '#notice-list', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px', width: '620px', height: '428px', margin: '0', padding: '20px', borderWidth: '0', overflow: 'hidden', background: '#f8fafc' },
      { selector: '#notice-list > article', boxSizing: 'border-box', display: 'flex', flex: '0 0 88px', flexDirection: 'row', gap: '16px', alignItems: 'center', width: '580px', height: '88px', margin: '0', padding: '16px', borderWidth: '0', background: '#ffffff' },
      { selector: '#notice-row-one, #notice-row-two', background: '#eff6ff' },
      { selector: '#notice-dot-one, #notice-dot-two', boxSizing: 'border-box', position: 'relative', zIndex: '1', flex: '0 0 12px', width: '12px', height: '12px', margin: '0', padding: '0', borderWidth: '0', borderRadius: '6px', background: '#2563eb' },
      { selector: '#notice-body-one, #notice-body-two', boxSizing: 'border-box', display: 'flex', flex: '0 0 400px', flexDirection: 'column', gap: '4px', width: '400px', height: '56px', margin: '0', padding: '0', borderWidth: '0' },
      { selector: '#notice-heading-one, #notice-heading-two', boxSizing: 'border-box', width: '400px', height: '24px', margin: '0', padding: '0', borderWidth: '0', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '15px', fontWeight: '700', lineHeight: '24px', textAlign: 'left' },
      { selector: '#notice-copy-one, #notice-copy-two', boxSizing: 'border-box', width: '400px', height: '28px', margin: '0', padding: '2px 0', borderWidth: '0', overflow: 'hidden', color: '#475569', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '400', lineHeight: '24px', textAlign: 'left', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      { selector: '#notice-state-one, #notice-state-two', boxSizing: 'border-box', position: 'relative', zIndex: '1', flex: '0 0 88px', width: '88px', height: '28px', margin: '0', padding: '2px 8px', borderWidth: '0', borderRadius: '14px', background: '#dbeafe', color: '#1d4ed8', fontFamily: 'Arial, sans-serif', fontSize: '12px', fontWeight: '700', lineHeight: '24px', textAlign: 'center' },
      { selector: '#notice-row-three', background: '#f1f5f9' },
      { selector: '#notice-row-four', background: '#e2e8f0' },
      { selector: '#notice-row-five', background: '#cbd5e1' },
    ],
    root: { children: [{ type: 'section', id: 'notice-shell', children: [
      { type: 'header', id: 'notice-toolbar', children: [
        { type: 'h1', id: 'notice-title', textContent: 'Notifications' },
        { type: 'input', inputType: 'button', id: 'notice-action', value: 'Mark all read' },
      ] },
      { type: 'main', id: 'notice-list', children: [
        { type: 'article', id: 'notice-row-one', children: [
          { type: 'span', id: 'notice-dot-one' },
          { type: 'div', id: 'notice-body-one', children: [
            { type: 'strong', id: 'notice-heading-one', textContent: 'Build completed' },
            { type: 'p', id: 'notice-copy-one', textContent: 'The production deployment for Atlas finished successfully.' },
          ] },
          { type: 'span', id: 'notice-state-one', textContent: 'New' },
        ] },
        { type: 'article', id: 'notice-row-two', children: [
          { type: 'span', id: 'notice-dot-two' },
          { type: 'div', id: 'notice-body-two', children: [
            { type: 'strong', id: 'notice-heading-two', textContent: 'Review requested' },
            { type: 'p', id: 'notice-copy-two', textContent: 'Mina requested your review on a long project update that should truncate.' },
          ] },
          { type: 'span', id: 'notice-state-two', textContent: 'New' },
        ] },
        { type: 'article', id: 'notice-row-three' },
        { type: 'article', id: 'notice-row-four' },
        { type: 'article', id: 'notice-row-five' },
      ] },
    ] }] },
  },
};
