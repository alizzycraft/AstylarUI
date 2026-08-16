import { ParityFixture } from '../parity.types';

export const composedSidebarWorkspaceFixture: ParityFixture = {
  id: 'composed-sidebar-workspace',
  title: 'Composed sidebar workspace',
  category: 'composed-application',
  expectedBehavior:
    'A fixed-width nested navigation and flexible workspace column preserve active-item styling, toolbar alignment, and content geometry.',
  measurementIds: [
    'workspace-shell',
    'workspace-sidebar',
    'workspace-brand',
    'workspace-nav',
    'workspace-section-label',
    'workspace-nav-home',
    'workspace-nav-active',
    'workspace-nav-team',
    'workspace-content',
    'workspace-toolbar',
    'workspace-title',
    'workspace-action',
    'workspace-main',
    'workspace-panel-primary',
    'workspace-panel-secondary',
  ],
  reference: {
    html: `
      <div id="workspace-shell">
        <aside id="workspace-sidebar">
          <div id="workspace-brand">Northstar</div>
          <nav id="workspace-nav">
            <div id="workspace-section-label">Workspace</div>
            <input id="workspace-nav-home" type="button" value="Home">
            <input id="workspace-nav-active" class="active" type="button" value="Projects">
            <input id="workspace-nav-team" type="button" value="Team">
          </nav>
        </aside>
        <section id="workspace-content">
          <header id="workspace-toolbar">
            <h1 id="workspace-title">Projects</h1>
            <input id="workspace-action" type="button" value="New project">
          </header>
          <main id="workspace-main">
            <section id="workspace-panel-primary"></section>
            <aside id="workspace-panel-secondary"></aside>
          </main>
        </section>
      </div>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #dbe4ee; font-family: Arial, sans-serif; }
      #workspace-shell { box-sizing: border-box; display: flex; flex-direction: row; position: absolute; left: 50px; top: 50px; width: 700px; height: 500px; margin: 0; padding: 0; border: 0; background: #ffffff; }
      #workspace-sidebar { box-sizing: border-box; display: flex; flex: 0 0 200px; flex-direction: column; gap: 28px; width: 200px; height: 500px; margin: 0; padding: 24px 18px; border: 0; background: #0f172a; }
      #workspace-brand { box-sizing: border-box; width: 164px; height: 36px; margin: 0; padding: 4px 8px; border: 0; color: #f8fafc; font: 700 20px/28px Arial, sans-serif; text-align: left; }
      #workspace-nav { box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; width: 164px; height: 196px; margin: 0; padding: 0; border: 0; }
      #workspace-section-label { box-sizing: border-box; width: 164px; height: 28px; margin: 0 0 8px 0; padding: 4px 8px; border: 0; color: #94a3b8; font: 700 12px/20px Arial, sans-serif; text-align: left; text-transform: uppercase; }
      #workspace-nav input { appearance: none; box-sizing: border-box; width: 164px; height: 44px; margin: 0; padding: 10px 12px; border: 0; border-radius: 6px; background: #0f172a; color: #cbd5e1; font: 700 14px/24px Arial, sans-serif; text-align: left; }
      #workspace-nav input.active { background: #1d4ed8; color: #ffffff; }
      #workspace-content { box-sizing: border-box; display: flex; flex: 1 1 auto; flex-direction: column; width: 500px; height: 500px; margin: 0; padding: 0; border: 0; background: #f8fafc; }
      #workspace-toolbar { box-sizing: border-box; display: flex; flex: 0 0 72px; flex-direction: row; justify-content: space-between; align-items: center; width: 500px; height: 72px; margin: 0; padding: 16px 20px; border: 0; background: #ffffff; }
      #workspace-title { box-sizing: border-box; width: 180px; height: 40px; margin: 0; padding: 4px 0; border: 0; color: #0f172a; font: 700 24px/32px Arial, sans-serif; text-align: left; }
      #workspace-action { appearance: none; box-sizing: border-box; width: 116px; height: 40px; margin: 0; padding: 8px 12px; border: 0; border-radius: 6px; background: #2563eb; color: #ffffff; font: 700 14px/24px Arial, sans-serif; text-align: center; }
      #workspace-main { box-sizing: border-box; display: flex; flex: 1 1 auto; flex-direction: row; gap: 16px; width: 500px; height: 428px; margin: 0; padding: 20px; border: 0; background: #f1f5f9; }
      #workspace-panel-primary { box-sizing: border-box; flex: 1 1 auto; width: 292px; height: 388px; margin: 0; padding: 0; border: 0; background: #dbeafe; }
      #workspace-panel-secondary { box-sizing: border-box; flex: 0 0 152px; width: 152px; height: 388px; margin: 0; padding: 0; border: 0; background: #e2e8f0; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#dbe4ee', fontFamily: 'Arial, sans-serif' },
      { selector: '#workspace-shell', boxSizing: 'border-box', display: 'flex', flexDirection: 'row', position: 'absolute', left: '50px', top: '50px', width: '700px', height: '500px', margin: '0', padding: '0', borderWidth: '0', background: '#ffffff' },
      { selector: '#workspace-sidebar', boxSizing: 'border-box', display: 'flex', flex: '0 0 200px', flexDirection: 'column', gap: '28px', width: '200px', height: '500px', margin: '0', padding: '24px 18px', borderWidth: '0', background: '#0f172a' },
      { selector: '#workspace-brand', boxSizing: 'border-box', width: '164px', height: '36px', margin: '0', padding: '4px 8px', borderWidth: '0', color: '#f8fafc', fontFamily: 'Arial, sans-serif', fontSize: '20px', fontWeight: '700', lineHeight: '28px', textAlign: 'left' },
      { selector: '#workspace-nav', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px', width: '164px', height: '196px', margin: '0', padding: '0', borderWidth: '0' },
      { selector: '#workspace-section-label', boxSizing: 'border-box', width: '164px', height: '28px', margin: '0 0 8px 0', padding: '4px 8px', borderWidth: '0', color: '#94a3b8', fontFamily: 'Arial, sans-serif', fontSize: '12px', fontWeight: '700', lineHeight: '20px', textAlign: 'left', textTransform: 'uppercase' },
      { selector: '#workspace-nav input', boxSizing: 'border-box', width: '164px', height: '44px', margin: '0', padding: '10px 12px', borderWidth: '0', borderRadius: '6px', background: '#0f172a', color: '#cbd5e1', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px', textAlign: 'left' },
      { selector: '#workspace-nav input.active', background: '#1d4ed8', color: '#ffffff' },
      { selector: '#workspace-content', boxSizing: 'border-box', display: 'flex', flex: '1 1 auto', flexDirection: 'column', width: '500px', height: '500px', margin: '0', padding: '0', borderWidth: '0', background: '#f8fafc' },
      { selector: '#workspace-toolbar', boxSizing: 'border-box', display: 'flex', flex: '0 0 72px', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '500px', height: '72px', margin: '0', padding: '16px 20px', borderWidth: '0', background: '#ffffff' },
      { selector: '#workspace-title', boxSizing: 'border-box', width: '180px', height: '40px', margin: '0', padding: '4px 0', borderWidth: '0', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '24px', fontWeight: '700', lineHeight: '32px', textAlign: 'left' },
      { selector: '#workspace-action', boxSizing: 'border-box', width: '116px', height: '40px', margin: '0', padding: '8px 12px', borderWidth: '0', borderRadius: '6px', background: '#2563eb', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px', textAlign: 'center' },
      { selector: '#workspace-main', boxSizing: 'border-box', display: 'flex', flex: '1 1 auto', flexDirection: 'row', gap: '16px', width: '500px', height: '428px', margin: '0', padding: '20px', borderWidth: '0', background: '#f1f5f9' },
      { selector: '#workspace-panel-primary', boxSizing: 'border-box', flex: '1 1 auto', width: '292px', height: '388px', margin: '0', padding: '0', borderWidth: '0', background: '#dbeafe' },
      { selector: '#workspace-panel-secondary', boxSizing: 'border-box', flex: '0 0 152px', width: '152px', height: '388px', margin: '0', padding: '0', borderWidth: '0', background: '#e2e8f0' },
    ],
    root: { children: [{ type: 'div', id: 'workspace-shell', children: [
      { type: 'aside', id: 'workspace-sidebar', children: [
        { type: 'div', id: 'workspace-brand', textContent: 'Northstar' },
        { type: 'nav', id: 'workspace-nav', children: [
          { type: 'div', id: 'workspace-section-label', textContent: 'Workspace' },
          { type: 'input', inputType: 'button', id: 'workspace-nav-home', value: 'Home' },
          { type: 'input', inputType: 'button', id: 'workspace-nav-active', class: 'active', value: 'Projects' },
          { type: 'input', inputType: 'button', id: 'workspace-nav-team', value: 'Team' },
        ] },
      ] },
      { type: 'section', id: 'workspace-content', children: [
        { type: 'header', id: 'workspace-toolbar', children: [
          { type: 'h1', id: 'workspace-title', textContent: 'Projects' },
          { type: 'input', inputType: 'button', id: 'workspace-action', value: 'New project' },
        ] },
        { type: 'main', id: 'workspace-main', children: [
          { type: 'section', id: 'workspace-panel-primary' },
          { type: 'aside', id: 'workspace-panel-secondary' },
        ] },
      ] },
    ] }] },
  },
};
