import { ParityFixture } from '../parity.types';

export const composedDataTableFixture: ParityFixture = {
  id: 'composed-data-table',
  title: 'Composed data table page',
  category: 'composed-application',
  expectedBehavior:
    'A semantic table with explicit columns and distinct header/body styling retains its row geometry inside a toolbar-based application page.',
  measurementIds: [
    'data-shell', 'data-toolbar', 'data-title', 'data-filter', 'data-main', 'data-table',
    'data-head-row', 'data-head-name', 'data-head-status', 'data-head-owner',
    'data-row-one', 'data-one-name', 'data-one-status', 'data-one-owner',
    'data-row-two', 'data-two-name', 'data-two-status', 'data-two-owner',
    'data-row-three', 'data-three-name', 'data-three-status', 'data-three-owner',
  ],
  reference: {
    html: `
      <section id="data-shell">
        <header id="data-toolbar"><h1 id="data-title">Deployments</h1><input id="data-filter" type="button" value="Filter results"></header>
        <main id="data-main">
          <table id="data-table">
            <colgroup><col style="width:260px"><col style="width:180px"><col style="width:180px"></colgroup>
            <thead><tr id="data-head-row"><th id="data-head-name">Project</th><th id="data-head-status">Status</th><th id="data-head-owner">Owner</th></tr></thead>
            <tbody>
              <tr id="data-row-one"><td id="data-one-name">Atlas web</td><td id="data-one-status">Ready</td><td id="data-one-owner">Mina</td></tr>
              <tr id="data-row-two"><td id="data-two-name">Orbit console</td><td id="data-two-status">Building</td><td id="data-two-owner">Sasha</td></tr>
              <tr id="data-row-three"><td id="data-three-name">Beacon API</td><td id="data-three-status">Paused</td><td id="data-three-owner">Ravi</td></tr>
            </tbody>
          </table>
        </main>
      </section>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #e2e8f0; font-family: Arial, sans-serif; }
      #data-shell { box-sizing: border-box; display: flex; flex-direction: column; position: absolute; left: 50px; top: 50px; width: 700px; height: 500px; margin: 0; padding: 0; border: 0; background: #ffffff; }
      #data-toolbar { box-sizing: border-box; display: flex; flex: 0 0 80px; flex-direction: row; justify-content: space-between; align-items: center; width: 700px; height: 80px; margin: 0; padding: 20px 40px; border: 0; background: #ffffff; }
      #data-title { box-sizing: border-box; width: 220px; height: 40px; margin: 0; padding: 4px 0; border: 0; color: #0f172a; font: 700 24px/32px Arial, sans-serif; text-align: left; }
      #data-filter { appearance: none; box-sizing: border-box; width: 120px; height: 40px; margin: 0; padding: 8px 12px; border: 0; border-radius: 6px; background: #e2e8f0; color: #334155; font: 700 14px/24px Arial, sans-serif; text-align: center; }
      #data-main { box-sizing: border-box; position: relative; width: 700px; height: 420px; margin: 0; padding: 40px; border: 0; background: #f8fafc; }
      #data-table { box-sizing: border-box !important; position: absolute; left: 40px; top: 40px; width: 620px; height: 300px; margin: 0; padding: 0; border: 0; border-spacing: 0; table-layout: fixed; background: #ffffff; font: 400 15px/24px Arial, sans-serif; }
      #data-table thead, #data-table tbody, #data-table tr { margin: 0; padding: 0; border: 0; }
      #data-table th, #data-table td { box-sizing: border-box !important; height: 75px; margin: 0; padding: 25px 16px; border: 0; color: #334155; font: 400 15px/24px Arial, sans-serif; text-align: left; vertical-align: middle; }
      #data-table th { background: #1e3a8a; color: #ffffff; font-weight: 700; }
      #data-row-one td { background: #ffffff; }
      #data-row-two td { background: #f1f5f9; }
      #data-row-three td { background: #ffffff; }
      #data-one-status { color: #047857; font-weight: 700; }
      #data-two-status { color: #b45309; font-weight: 700; }
      #data-three-status { color: #64748b; font-weight: 700; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#e2e8f0', fontFamily: 'Arial, sans-serif' },
      { selector: '#data-shell', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', position: 'absolute', left: '50px', top: '50px', width: '700px', height: '500px', margin: '0', padding: '0', borderWidth: '0', background: '#ffffff' },
      { selector: '#data-toolbar', boxSizing: 'border-box', display: 'flex', flex: '0 0 80px', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '700px', height: '80px', margin: '0', padding: '20px 40px', borderWidth: '0', background: '#ffffff' },
      { selector: '#data-title', boxSizing: 'border-box', width: '220px', height: '40px', margin: '0', padding: '4px 0', borderWidth: '0', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '24px', fontWeight: '700', lineHeight: '32px', textAlign: 'left' },
      { selector: '#data-filter', boxSizing: 'border-box', width: '120px', height: '40px', margin: '0', padding: '8px 12px', borderWidth: '0', borderRadius: '6px', background: '#e2e8f0', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '700', lineHeight: '24px', textAlign: 'center' },
      { selector: '#data-main', boxSizing: 'border-box', position: 'relative', width: '700px', height: '420px', margin: '0', padding: '40px', borderWidth: '0', background: '#f8fafc' },
      { selector: '#data-table', boxSizing: 'border-box', position: 'absolute', left: '40px', top: '40px', width: '620px', height: '300px', margin: '0', padding: '0', borderWidth: '0', background: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '15px', fontWeight: '400', lineHeight: '24px' },
      { selector: '#data-table thead, #data-table tbody, #data-table tr', margin: '0', padding: '0', borderWidth: '0' },
      { selector: '#data-table th, #data-table td', boxSizing: 'border-box', height: '75px', margin: '0', padding: '25px 16px', borderWidth: '0', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '15px', fontWeight: '400', lineHeight: '24px', textAlign: 'left', verticalAlign: 'middle' },
      { selector: '#data-table th', background: '#1e3a8a', color: '#ffffff', fontWeight: '700' },
      { selector: '#data-row-one td', background: '#ffffff' },
      { selector: '#data-row-two td', background: '#f1f5f9' },
      { selector: '#data-row-three td', background: '#ffffff' },
      { selector: '#data-one-status', color: '#047857', fontWeight: '700' },
      { selector: '#data-two-status', color: '#b45309', fontWeight: '700' },
      { selector: '#data-three-status', color: '#64748b', fontWeight: '700' },
    ],
    root: { children: [{ type: 'section', id: 'data-shell', children: [
      { type: 'header', id: 'data-toolbar', children: [
        { type: 'h1', id: 'data-title', textContent: 'Deployments' },
        { type: 'input', inputType: 'button', id: 'data-filter', value: 'Filter results' },
      ] },
      { type: 'main', id: 'data-main', children: [{ type: 'table', id: 'data-table', children: [
        { type: 'colgroup', children: [
          { type: 'col', tableProperties: { width: '260px' } },
          { type: 'col', tableProperties: { width: '180px' } },
          { type: 'col', tableProperties: { width: '180px' } },
        ] },
        { type: 'thead', children: [{ type: 'tr', id: 'data-head-row', children: [
          { type: 'th', id: 'data-head-name', textContent: 'Project' },
          { type: 'th', id: 'data-head-status', textContent: 'Status' },
          { type: 'th', id: 'data-head-owner', textContent: 'Owner' },
        ] }] },
        { type: 'tbody', children: [
          { type: 'tr', id: 'data-row-one', children: [
            { type: 'td', id: 'data-one-name', textContent: 'Atlas web' },
            { type: 'td', id: 'data-one-status', textContent: 'Ready' },
            { type: 'td', id: 'data-one-owner', textContent: 'Mina' },
          ] },
          { type: 'tr', id: 'data-row-two', children: [
            { type: 'td', id: 'data-two-name', textContent: 'Orbit console' },
            { type: 'td', id: 'data-two-status', textContent: 'Building' },
            { type: 'td', id: 'data-two-owner', textContent: 'Sasha' },
          ] },
          { type: 'tr', id: 'data-row-three', children: [
            { type: 'td', id: 'data-three-name', textContent: 'Beacon API' },
            { type: 'td', id: 'data-three-status', textContent: 'Paused' },
            { type: 'td', id: 'data-three-owner', textContent: 'Ravi' },
          ] },
        ] },
      ] }] },
    ] }] },
  },
};
