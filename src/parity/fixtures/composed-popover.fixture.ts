import { ParityFixture } from '../parity.types';

export const composedPopoverFixture: ParityFixture = {
  id: 'composed-popover',
  title: 'Composed clipped popover menu',
  category: 'composed-application',
  expectedBehavior:
    'An anchored menu paints above application content, keeps its nested action layout, and clips consistently at an overflow-hidden shell boundary.',
  measurementIds: [
    'popover-shell',
    'popover-toolbar',
    'popover-trigger',
    'popover-content',
    'popover-card',
    'popover-menu',
    'popover-item-profile',
    'popover-item-billing',
    'popover-item-signout',
  ],
  reference: {
    html: `
      <section id="popover-shell">
        <header id="popover-toolbar"><input id="popover-trigger" type="button" value="Account menu"></header>
        <main id="popover-content"><article id="popover-card"></article></main>
        <nav id="popover-menu">
          <input id="popover-item-profile" type="button" value="Profile">
          <input id="popover-item-billing" type="button" value="Billing">
          <input id="popover-item-signout" type="button" value="Sign out">
        </nav>
      </section>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #e2e8f0; font-family: Arial, sans-serif; }
      #popover-shell { box-sizing: border-box; position: absolute; left: 100px; top: 80px; width: 600px; height: 420px; margin: 0; padding: 0; border: 0; overflow: hidden; background: #ffffff; }
      #popover-toolbar { box-sizing: border-box; display: flex; flex-direction: row; justify-content: flex-end; align-items: center; width: 600px; height: 64px; margin: 0; padding: 12px 16px; border: 0; background: #1e3a8a; }
      #popover-trigger { appearance: none; box-sizing: border-box; width: 132px; height: 40px; margin: 0; padding: 8px 12px; border: 0; border-radius: 6px; background: #dbeafe; color: #1e3a8a; font: 700 14px/24px Arial, sans-serif; text-align: center; }
      #popover-content { box-sizing: border-box; position: relative; width: 600px; height: 356px; margin: 0; padding: 24px; border: 0; background: #f8fafc; }
      #popover-card { box-sizing: border-box; position: absolute; left: 350px; top: 48px; width: 210px; height: 190px; margin: 0; padding: 0; border: 0; background: #bfdbfe; }
      #popover-menu { box-sizing: border-box; display: flex; flex-direction: column; gap: 4px; position: absolute; left: 470px; top: 56px; width: 160px; height: 180px; margin: 0; padding: 8px; border: 2px solid #94a3b8; z-index: 5; background: #ffffff; }
      #popover-menu > input { appearance: none; box-sizing: border-box; width: 140px; height: 52px; margin: 0; padding: 14px 12px; border: 0; background: #f1f5f9; color: #334155; font: 700 14px/24px Arial, sans-serif; text-align: left; }
      #popover-item-signout { color: #b91c1c; background: #fef2f2; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#e2e8f0', fontFamily: 'Arial, sans-serif' },
      { selector: '#popover-shell', boxSizing: 'border-box', position: 'absolute', left: '100px', top: '80px', width: '600px', height: '420px', margin: '0', padding: '0', borderWidth: '0', overflow: 'hidden', background: '#ffffff' },
      { selector: '#popover-toolbar', boxSizing: 'border-box', display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', width: '600px', height: '64px', margin: '0', padding: '12px 16px', borderWidth: '0', background: '#1e3a8a' },
      { selector: '#popover-trigger', boxSizing: 'border-box', width: '132px', height: '40px', margin: '0', padding: '8px 12px', borderWidth: '0', borderRadius: '6px', background: '#dbeafe', color: '#1e3a8a', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px', textAlign: 'center' },
      { selector: '#popover-content', boxSizing: 'border-box', position: 'relative', width: '600px', height: '356px', margin: '0', padding: '24px', borderWidth: '0', background: '#f8fafc' },
      { selector: '#popover-card', boxSizing: 'border-box', position: 'absolute', left: '350px', top: '48px', width: '210px', height: '190px', margin: '0', padding: '0', borderWidth: '0', background: '#bfdbfe' },
      { selector: '#popover-menu', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px', position: 'absolute', left: '470px', top: '56px', width: '160px', height: '180px', margin: '0', padding: '8px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#94a3b8', zIndex: '5', background: '#ffffff' },
      { selector: '#popover-menu > input', boxSizing: 'border-box', width: '140px', height: '52px', margin: '0', padding: '14px 12px', borderWidth: '0', background: '#f1f5f9', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px', textAlign: 'left' },
      { selector: '#popover-item-signout', color: '#b91c1c', background: '#fef2f2' },
    ],
    root: {
      children: [{ type: 'section', id: 'popover-shell', children: [
        { type: 'header', id: 'popover-toolbar', children: [
          { type: 'input', inputType: 'button', id: 'popover-trigger', value: 'Account menu' },
        ] },
        { type: 'main', id: 'popover-content', children: [
          { type: 'article', id: 'popover-card' },
        ] },
        { type: 'nav', id: 'popover-menu', children: [
          { type: 'input', inputType: 'button', id: 'popover-item-profile', value: 'Profile' },
          { type: 'input', inputType: 'button', id: 'popover-item-billing', value: 'Billing' },
          { type: 'input', inputType: 'button', id: 'popover-item-signout', value: 'Sign out' },
        ] },
      ] }],
    },
  },
};
