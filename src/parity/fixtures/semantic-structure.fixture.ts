import { ParityFixture } from '../parity.types';

export const semanticStructureFixture: ParityFixture = {
  id: 'semantic-structure',
  title: 'Native document and application semantics',
  category: 'accessibility-semantics',
  expectedBehavior:
    'Astylar exposes the authored landmark, heading, paragraph, list, link, button, and table hierarchy through native browser accessibility semantics without exposing Babylon implementation meshes.',
  measurementIds: ['semantic-shell'],
  semanticIds: [
    'semantic-shell', 'semantic-header', 'semantic-title', 'semantic-nav',
    'semantic-main', 'semantic-section', 'semantic-list', 'semantic-link',
    'semantic-button', 'semantic-table', 'semantic-footer',
  ],
  reference: {
    html: `
      <div id="semantic-shell">
        <header id="semantic-header"><h1 id="semantic-title">Workspace overview</h1></header>
        <nav id="semantic-nav">
          <h2>Sections</h2>
          <ul id="semantic-list"><li><a id="semantic-link" href="#semantic-table">Usage report</a></li><li>Team</li></ul>
        </nav>
        <main id="semantic-main">
          <section id="semantic-section">
            <h2>Current plan</h2><p>Review the latest workspace activity.</p>
            <button id="semantic-button" type="button">Create report</button>
          </section>
          <table id="semantic-table">
            <caption>Monthly usage</caption>
            <thead><tr><th scope="col">Month</th><th scope="col">Runs</th></tr></thead>
            <tbody><tr><th scope="row">July</th><td>42</td></tr></tbody>
          </table>
        </main>
        <footer id="semantic-footer">Updated today</footer>
      </div>`,
    css: `
      #parity-reference-viewport{position:relative;overflow:hidden;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a}
      *{box-sizing:border-box} #semantic-shell{position:absolute;left:24px;top:20px;width:752px;height:552px;opacity:0}
      #semantic-shell *{opacity:0!important;color:transparent!important;background:transparent!important;border-color:transparent!important}
      #semantic-header{height:64px;padding:16px 20px;background:#1e293b;color:#fff}
      h1,h2,p{margin:0} h1{font-size:26px;line-height:32px} h2{font-size:18px;line-height:24px}
      #semantic-nav{position:absolute;left:0;top:80px;width:180px;height:392px;padding:18px;background:#e2e8f0}
      #semantic-list{margin:18px 0 0;padding-left:22px;line-height:30px} a{color:#1d4ed8}
      #semantic-main{position:absolute;left:196px;top:80px;width:556px;height:392px;padding:20px;background:#fff;border:1px solid #cbd5e1}
      #semantic-section{height:118px} #semantic-section p{margin-top:8px;line-height:22px}
      #semantic-button{margin-top:14px;width:120px;height:32px;border:0;background:#2563eb;color:#fff}
      #semantic-table{width:100%;border-collapse:collapse;margin-top:22px;table-layout:fixed}
      caption{text-align:left;font-weight:700;margin-bottom:8px} th,td{height:38px;border:1px solid #94a3b8;padding:8px;text-align:left}
      #semantic-footer{position:absolute;left:0;bottom:0;width:752px;height:48px;padding:14px 18px;background:#cbd5e1}
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif', color: '#0f172a' },
      { selector: '*', boxSizing: 'border-box' },
      { selector: '#semantic-shell', position: 'absolute', left: '24px', top: '20px', width: '752px', height: '552px', opacity: '0' },
      { selector: '#semantic-shell *', opacity: '0', color: 'transparent', background: 'transparent', borderColor: 'transparent' },
      { selector: '#semantic-header', height: '64px', padding: '16px 20px', background: '#1e293b', color: '#ffffff' },
      { selector: 'h1, h2, p', margin: '0' },
      { selector: 'h1', fontSize: '26px', lineHeight: '32px' },
      { selector: 'h2', fontSize: '18px', lineHeight: '24px' },
      { selector: '#semantic-nav', position: 'absolute', left: '0', top: '80px', width: '180px', height: '392px', padding: '18px', background: '#e2e8f0' },
      { selector: '#semantic-list', margin: '18px 0 0', paddingLeft: '22px', lineHeight: '30px' },
      { selector: 'a', color: '#1d4ed8' },
      { selector: '#semantic-main', position: 'absolute', left: '196px', top: '80px', width: '556px', height: '392px', padding: '20px', background: '#ffffff', borderWidth: '1px', borderStyle: 'solid', borderColor: '#cbd5e1' },
      { selector: '#semantic-section', height: '118px' },
      { selector: '#semantic-section p', marginTop: '8px', lineHeight: '22px' },
      { selector: '#semantic-button', marginTop: '14px', width: '120px', height: '32px', borderWidth: '0', background: '#2563eb', color: '#ffffff' },
      { selector: '#semantic-table', width: '100%', marginTop: '22px' },
      { selector: 'caption', textAlign: 'left', fontWeight: '700', marginBottom: '8px' },
      { selector: 'th, td', height: '38px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#94a3b8', padding: '8px', textAlign: 'left' },
      { selector: '#semantic-footer', position: 'absolute', left: '0', bottom: '0', width: '752px', height: '48px', padding: '14px 18px', background: '#cbd5e1' },
    ],
    root: {
      children: [{
        type: 'div', id: 'semantic-shell', children: [
          { type: 'header', id: 'semantic-header', children: [
            { type: 'h1', id: 'semantic-title', textContent: 'Workspace overview' },
          ] },
          { type: 'nav', id: 'semantic-nav', children: [
            { type: 'h2', textContent: 'Sections' },
            { type: 'ul', id: 'semantic-list', children: [
              { type: 'li', children: [{ type: 'a', id: 'semantic-link', href: '#semantic-table', textContent: 'Usage report' }] },
              { type: 'li', textContent: 'Team' },
            ] },
          ] },
          { type: 'main', id: 'semantic-main', children: [
            { type: 'section', id: 'semantic-section', children: [
              { type: 'h2', textContent: 'Current plan' },
              { type: 'p', textContent: 'Review the latest workspace activity.' },
              { type: 'button', id: 'semantic-button', inputType: 'button', textContent: 'Create report' },
            ] },
            { type: 'table', id: 'semantic-table', tableProperties: { tableLayout: 'fixed', borderCollapse: 'collapse' }, children: [
              { type: 'caption', textContent: 'Monthly usage' },
              { type: 'thead', children: [{ type: 'tr', children: [
                { type: 'th', scope: 'col', textContent: 'Month' },
                { type: 'th', scope: 'col', textContent: 'Runs' },
              ] }] },
              { type: 'tbody', children: [{ type: 'tr', children: [
                { type: 'th', scope: 'row', textContent: 'July' },
                { type: 'td', textContent: '42' },
              ] }] },
            ] },
          ] },
          { type: 'footer', id: 'semantic-footer', textContent: 'Updated today' },
        ],
      }],
    },
  },
};
