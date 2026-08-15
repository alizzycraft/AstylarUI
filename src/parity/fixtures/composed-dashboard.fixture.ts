import { ParityFixture } from '../parity.types';

export const composedDashboardFixture: ParityFixture = {
  id: 'composed-dashboard',
  title: 'Composed dashboard shell',
  category: 'composed-application',
  expectedBehavior:
    'A nested flex dashboard with sidebar controls, header typography and search, and a gapped card grid preserves browser geometry and paint.',
  measurementIds: ['dashboard-shell', 'dashboard-sidebar', 'dashboard-brand', 'dashboard-nav-one', 'dashboard-nav-two', 'dashboard-content', 'dashboard-header', 'dashboard-title', 'dashboard-search', 'dashboard-main', 'dashboard-card-a', 'dashboard-card-b', 'dashboard-card-c', 'dashboard-card-d'],
  reference: {
    html: `
      <div id="dashboard-shell">
        <aside id="dashboard-sidebar">
          <div id="dashboard-brand">Astylar</div>
          <input id="dashboard-nav-one" type="button" value="Overview">
          <input id="dashboard-nav-two" type="button" value="Projects">
        </aside>
        <section id="dashboard-content">
          <header id="dashboard-header">
            <h1 id="dashboard-title">Dashboard</h1>
            <input id="dashboard-search" type="text" value="Search projects">
          </header>
          <main id="dashboard-main">
            <article id="dashboard-card-a"></article><article id="dashboard-card-b"></article>
            <article id="dashboard-card-c"></article><article id="dashboard-card-d"></article>
          </main>
        </section>
      </div>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f1f5f9; font-family: Arial, sans-serif; }
      #dashboard-shell { box-sizing: border-box; display: flex; flex-direction: row; position: absolute; left: 60px; top: 50px; width: 680px; height: 500px; margin: 0; padding: 0; border: 0; background: #ffffff; }
      #dashboard-sidebar { box-sizing: border-box; display: flex; flex: 0 0 180px; flex-direction: column; gap: 16px; width: 180px; height: 500px; margin: 0; padding: 24px 20px; border: 0; background: #172554; }
      #dashboard-brand { box-sizing: border-box; width: 140px; height: 40px; margin: 0; padding: 8px 0; border: 0; color: #ffffff; font: 700 20px/24px Arial, sans-serif; text-align: left; }
      #dashboard-nav-one, #dashboard-nav-two { appearance: none; box-sizing: border-box; width: 140px; height: 44px; margin: 0; padding: 10px 12px; border: 0; background: #1e3a8a; color: #dbeafe; font: 700 14px/24px Arial, sans-serif; text-align: left; }
      #dashboard-content { box-sizing: border-box; display: flex; flex: 0 0 500px; flex-direction: column; width: 500px; height: 500px; margin: 0; padding: 0; border: 0; background: #f8fafc; }
      #dashboard-header { box-sizing: border-box; display: flex; flex: 0 0 80px; flex-direction: row; justify-content: space-between; align-items: center; width: 500px; height: 80px; margin: 0; padding: 20px; border: 0; background: #ffffff; }
      #dashboard-title { box-sizing: border-box; width: 200px; height: 40px; margin: 0; padding: 4px 0; border: 0; color: #0f172a; font: 700 24px/32px Arial, sans-serif; text-align: left; }
      #dashboard-search { appearance: none; box-sizing: border-box; width: 200px; height: 40px; margin: 0; padding: 8px 12px; border: 0; background: #e2e8f0; color: #334155; font: 400 14px/24px Arial, sans-serif; text-align: left; }
      #dashboard-main { box-sizing: border-box; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 180px 180px; gap: 20px; width: 500px; height: 420px; margin: 0; padding: 20px; border: 0; background: #f8fafc; }
      #dashboard-main > article { box-sizing: border-box; min-width: 0; min-height: 0; margin: 0; padding: 0; border: 0; }
      #dashboard-card-a { background: #dbeafe; } #dashboard-card-b { background: #ccfbf1; }
      #dashboard-card-c { background: #ffedd5; } #dashboard-card-d { background: #f3e8ff; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f1f5f9', fontFamily: 'Arial, sans-serif' },
      { selector: '#dashboard-shell', boxSizing: 'border-box', display: 'flex', flexDirection: 'row', position: 'absolute', left: '60px', top: '50px', width: '680px', height: '500px', margin: '0', padding: '0', borderWidth: '0', background: '#ffffff' },
      { selector: '#dashboard-sidebar', boxSizing: 'border-box', display: 'flex', flex: '0 0 180px', flexDirection: 'column', gap: '16px', width: '180px', height: '500px', margin: '0', padding: '24px 20px', borderWidth: '0', background: '#172554' },
      { selector: '#dashboard-brand', boxSizing: 'border-box', width: '140px', height: '40px', margin: '0', padding: '8px 0', borderWidth: '0', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '20px', fontWeight: '700', lineHeight: '24px', textAlign: 'left' },
      { selector: '#dashboard-nav-one, #dashboard-nav-two', boxSizing: 'border-box', width: '140px', height: '44px', margin: '0', padding: '10px 12px', borderWidth: '0', background: '#1e3a8a', color: '#dbeafe', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px', textAlign: 'left' },
      { selector: '#dashboard-content', boxSizing: 'border-box', display: 'flex', flex: '0 0 500px', flexDirection: 'column', width: '500px', height: '500px', margin: '0', padding: '0', borderWidth: '0', background: '#f8fafc' },
      { selector: '#dashboard-header', boxSizing: 'border-box', display: 'flex', flex: '0 0 80px', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '500px', height: '80px', margin: '0', padding: '20px', borderWidth: '0', background: '#ffffff' },
      { selector: '#dashboard-title', boxSizing: 'border-box', width: '200px', height: '40px', margin: '0', padding: '4px 0', borderWidth: '0', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '24px', fontWeight: '700', lineHeight: '32px', textAlign: 'left' },
      { selector: '#dashboard-search', boxSizing: 'border-box', width: '200px', height: '40px', margin: '0', padding: '8px 12px', borderWidth: '0', background: '#e2e8f0', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '400', lineHeight: '24px', textAlign: 'left' },
      { selector: '#dashboard-main', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '180px 180px', gap: '20px', width: '500px', height: '420px', margin: '0', padding: '20px', borderWidth: '0', background: '#f8fafc' },
      { selector: '#dashboard-main > article', boxSizing: 'border-box', minWidth: '0', minHeight: '0', margin: '0', padding: '0', borderWidth: '0' },
      { selector: '#dashboard-card-a', background: '#dbeafe' }, { selector: '#dashboard-card-b', background: '#ccfbf1' },
      { selector: '#dashboard-card-c', background: '#ffedd5' }, { selector: '#dashboard-card-d', background: '#f3e8ff' },
    ],
    root: { children: [{
      type: 'div', id: 'dashboard-shell', children: [
        { type: 'aside', id: 'dashboard-sidebar', children: [
          { type: 'div', id: 'dashboard-brand', textContent: 'Astylar' },
          { type: 'input', inputType: 'button', id: 'dashboard-nav-one', value: 'Overview' },
          { type: 'input', inputType: 'button', id: 'dashboard-nav-two', value: 'Projects' },
        ] },
        { type: 'section', id: 'dashboard-content', children: [
          { type: 'header', id: 'dashboard-header', children: [
            { type: 'h1', id: 'dashboard-title', textContent: 'Dashboard' },
            { type: 'input', inputType: 'text', id: 'dashboard-search', value: 'Search projects' },
          ] },
          { type: 'main', id: 'dashboard-main', children: [
            { type: 'article', id: 'dashboard-card-a' }, { type: 'article', id: 'dashboard-card-b' },
            { type: 'article', id: 'dashboard-card-c' }, { type: 'article', id: 'dashboard-card-d' },
          ] },
        ] },
      ],
    }] },
  },
};
