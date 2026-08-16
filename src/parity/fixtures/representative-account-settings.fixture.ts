import { ParityFixture } from '../parity.types';

export const representativeAccountSettingsFixture: ParityFixture = {
  id: 'representative-account-settings',
  title: 'Representative account settings application',
  category: 'composed-application',
  expectedBehavior:
    'A responsive account workspace preserves semantic form controls, state selectors, section navigation, a plan summary, overflow boundaries, and a deterministic confirmation modal with backdrop.',
  viewportIds: ['desktop', 'tablet', 'mobile'],
  measurementIds: [
    'as-shell', 'as-sidebar', 'as-brand', 'as-nav-profile', 'as-workspace', 'as-header',
    'as-heading', 'as-main', 'as-form', 'as-form-intro', 'as-profile-fields', 'as-profile-legend',
    'as-name-row', 'as-name', 'as-email-row', 'as-email', 'as-bio-row', 'as-bio',
    'as-region-row', 'as-region', 'as-help', 'as-preferences', 'as-reports-slot',
    'as-actions', 'as-cancel', 'as-save', 'as-plan', 'as-plan-title', 'as-plan-price',
    'as-plan-list', 'as-backdrop', 'as-dialog', 'as-dialog-title',
    'as-dialog-copy', 'as-dialog-actions', 'as-dialog-edit', 'as-dialog-confirm',
  ],
  reference: {
    html: `
      <div id="as-shell">
        <aside id="as-sidebar">
          <div id="as-brand">Astylar ID</div>
          <nav id="as-nav">
            <input id="as-nav-profile" class="active" type="button" value="Profile">
            <input id="as-nav-security" type="button" value="Security">
            <input id="as-nav-billing" type="button" value="Billing">
          </nav>
        </aside>
        <section id="as-workspace">
          <header id="as-header"><div id="as-heading"><strong>Account settings</strong><span>Personal workspace</span></div><span id="as-state">Unsaved changes</span></header>
          <main id="as-main">
            <form id="as-form">
              <div id="as-form-intro"><h1>Profile</h1><p>Manage the details shown to your collaborators.</p></div>
              <fieldset id="as-profile-fields">
                <legend id="as-profile-legend">Account details</legend>
                <div id="as-name-row" class="as-field-row"><label for="as-name">Display name</label><input id="as-name" type="text" value="Maya Chen" required></div>
                <div id="as-email-row" class="as-field-row"><label for="as-email">Email</label><input id="as-email" type="text" value="maya@example.test" readonly></div>
                <div id="as-bio-row" class="as-field-row"><label for="as-bio"><span class="as-label-main">Bio</span><span>Optional</span></label><textarea id="as-bio" rows="2">Design systems and spatial interfaces.</textarea></div>
                <div id="as-region-row" class="as-field-row"><label for="as-region">Region</label><select id="as-region"><option value="africa" selected>Africa</option><option value="europe">Europe</option></select></div>
              </fieldset>
              <p id="as-help">Your email is managed by your organization.</p>
              <fieldset id="as-preferences"><legend>Notifications</legend><div id="as-reports-slot"><input id="as-reports" type="checkbox" checked></div><label for="as-reports">Email weekly account reports</label></fieldset>
              <div id="as-actions"><input id="as-cancel" type="button" value="Cancel"><input id="as-save" type="button" value="Save changes"></div>
            </form>
            <aside id="as-plan"><h2 id="as-plan-title">Current plan</h2><strong id="as-plan-price">Studio</strong><div id="as-plan-list"><span>12 team seats</span><span>Private projects</span><span>Priority support</span></div><p>Renews on 24 September.</p><input id="as-upgrade" type="button" value="Upgrade unavailable" disabled></aside>
          </main>
        </section>
      </div>
      <div id="as-backdrop"></div>
      <section id="as-dialog">
        <h2 id="as-dialog-title">Save account changes?</h2>
        <p id="as-dialog-copy">Your profile and notification preference will be updated.</p>
        <div id="as-dialog-actions"><input id="as-dialog-edit" type="button" value="Keep editing"><input id="as-dialog-confirm" type="button" value="Confirm save"></div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#dbe4ee; font-family:Arial,sans-serif; }
      #as-shell, #as-shell *, #as-dialog, #as-dialog * { box-sizing:border-box; }
      #as-shell { display:flex; position:absolute; left:20px; top:20px; width:760px; height:560px; background:#ffffff; overflow:hidden; }
      #as-sidebar { display:flex; flex:0 0 150px; flex-direction:column; gap:28px; width:150px; height:560px; padding:20px 12px; background:#312e81; }
      #as-brand { width:126px; height:32px; padding:4px 8px; color:#ffffff; font:700 15px/24px Arial,sans-serif; }
      #as-nav { display:flex; flex-direction:column; gap:6px; width:126px; height:132px; }
      #as-nav input { appearance:none; width:126px; height:40px; margin:0; padding:8px 10px; border:0; border-radius:0; background:#312e81; color:#c7d2fe; font:700 12px/24px Arial,sans-serif; text-align:left; }
      #as-nav input.active { background:#4f46e5; color:#ffffff; }
      #as-workspace { display:flex; flex:1 1 auto; flex-direction:column; width:610px; height:560px; background:#f8fafc; }
      #as-header { display:flex; flex:0 0 64px; align-items:center; justify-content:space-between; width:610px; height:64px; padding:10px 16px; background:#ffffff; }
      #as-heading { display:flex; flex-direction:column; width:180px; height:44px; }
      #as-heading strong { height:24px; color:#0f172a; font:700 14px/24px Arial,sans-serif; } #as-heading span { height:20px; color:#64748b; font:400 12px/20px Arial,sans-serif; }
      #as-state { width:112px; height:28px; padding:4px 8px; background:#fef3c7; color:#92400e; font:700 11px/20px Arial,sans-serif; text-align:center; }
      #as-main { display:flex; flex:1 1 auto; gap:12px; width:610px; height:496px; padding:12px; background:#eef2f7; overflow:hidden; }
      #as-form { display:flex; flex:0 0 392px; flex-direction:column; gap:8px; width:392px; height:472px; padding:12px; background:#ffffff; overflow:hidden; }
      #as-form-intro { width:368px; height:40px; } #as-form-intro h1 { width:368px; height:24px; margin:0; color:#0f172a; font:700 17px/24px Arial,sans-serif; } #as-form-intro p { width:368px; height:16px; margin:0; color:#64748b; font:400 11px/16px Arial,sans-serif; }
      #as-profile-fields { display:flex; flex-direction:column; gap:4px; position:relative; width:368px; height:auto; margin:0; padding:32px 10px 10px; border:1px solid #cbd5e1; background:#ffffff; overflow:hidden; }
      #as-profile-legend { position:absolute; left:10px; top:4px; width:132px; height:24px; margin:0; padding:0; color:#3730a3; font:700 13px/24px Arial,sans-serif; }
      .as-field-row { display:flex; flex:0 0 40px; align-items:center; gap:6px; width:346px; height:40px; }
      .as-field-row > label { flex:0 0 92px; width:92px; height:40px; padding:8px 0; color:#334155; font:700 11px/24px Arial,sans-serif; }
      .as-field-row > label span { color:#64748b; font-weight:400; } .as-field-row > label .as-label-main { color:#334155; font-weight:700; }
      .as-field-row > input, .as-field-row > select, .as-field-row > textarea { appearance:none; flex:0 0 248px; width:248px; height:40px; margin:0; padding:7px 9px; border:1px solid #94a3b8; border-radius:0; background:#f8fafc; color:#0f172a; font:400 12px/24px Arial,sans-serif; text-align:left; }
      #as-bio-row { flex-basis:auto; height:auto; align-items:flex-start; } #as-bio { height:auto; padding:5px 9px; white-space:pre-wrap; }
      #as-name:required { border-color:#dc2626; } #as-email:read-only { background:#e2e8f0; color:#64748b; }
      #as-help { width:368px; height:24px; margin:0; padding:2px 8px; background:#fff7ed; color:#9a3412; font:400 11px/20px Arial,sans-serif; }
      #as-preferences { display:flex; align-items:center; gap:8px; position:relative; width:368px; height:56px; margin:0; padding:20px 8px 4px; border:1px solid #cbd5e1; overflow:hidden; }
      #as-preferences legend { position:absolute; left:8px; top:0; width:100px; height:20px; color:#3730a3; font:700 11px/20px Arial,sans-serif; }
      #as-reports-slot { position:relative; flex:0 0 22px; width:22px; height:22px; border:2px solid #4f46e5; background:#4f46e5; overflow:hidden; }
      #as-reports { position:absolute; left:-40px; top:0; width:16px; height:16px; opacity:0; }
      #as-preferences > label { width:270px; height:24px; color:#334155; font:400 11px/24px Arial,sans-serif; }
      #as-actions { display:flex; justify-content:flex-end; gap:8px; width:368px; height:40px; }
      #as-actions input, #as-dialog-actions input, #as-upgrade { appearance:none; height:40px; margin:0; padding:8px 12px; border:0; border-radius:0; font:700 12px/24px Arial,sans-serif; text-align:center; }
      #as-cancel { width:84px; background:#e2e8f0; color:#334155; } #as-save { width:116px; background:#4f46e5; color:#ffffff; }
      #as-plan { display:flex; flex:0 0 182px; flex-direction:column; gap:10px; width:182px; height:472px; padding:14px; background:#eef2ff; overflow:hidden; }
      #as-plan-title { width:154px; height:28px; margin:0; color:#312e81; font:700 16px/28px Arial,sans-serif; }
      #as-plan-price { width:154px; height:36px; color:#4338ca; font:700 24px/36px Arial,sans-serif; }
      #as-plan-list { display:flex; flex-direction:column; width:154px; height:108px; }
      #as-plan-list span { width:154px; height:36px; padding:6px 0; color:#475569; font:400 11px/24px Arial,sans-serif; }
      #as-plan p { width:154px; height:48px; margin:0; color:#64748b; font:400 11px/24px Arial,sans-serif; }
      #as-upgrade { width:154px; background:#c7d2fe; color:#64748b; opacity:.65; }
      #as-backdrop { position:fixed; left:0; top:0; width:100vw; height:100vh; z-index:20; background:#0f172a; opacity:.9; }
      #as-dialog { display:flex; flex-direction:column; gap:12px; position:fixed; left:150px; top:190px; width:500px; height:220px; padding:20px; z-index:21; background:#ffffff; }
      #as-dialog-title { width:460px; height:32px; margin:0; color:#0f172a; font:700 19px/32px Arial,sans-serif; }
      #as-dialog-copy { width:460px; height:48px; margin:0; color:#475569; font:400 12px/24px Arial,sans-serif; }
      #as-dialog-actions { display:flex; justify-content:flex-end; gap:8px; width:460px; height:40px; }
      #as-dialog-edit { width:108px; background:#e2e8f0; color:#334155; } #as-dialog-confirm { width:116px; background:#4f46e5; color:#ffffff; }
      @media (min-width:600px) and (max-width:749px) {
        #as-shell { width:600px; height:680px; } #as-sidebar { flex-basis:120px; width:120px; height:680px; padding:20px 10px; } #as-brand, #as-nav, #as-nav input { width:100px; }
        #as-workspace { width:480px; height:680px; } #as-header { width:480px; } #as-main { flex-direction:column; gap:10px; width:480px; height:616px; }
        #as-form { flex-basis:430px; width:456px; height:430px; } #as-form-intro, #as-form-intro h1, #as-form-intro p, #as-profile-fields, #as-help, #as-preferences, #as-actions { width:432px; }
        #as-form-intro { height:36px; } .as-field-row { flex-basis:36px; width:410px; height:36px; } .as-field-row > label { flex-basis:96px; width:96px; height:36px; padding:6px 0; }
        .as-field-row > input, .as-field-row > select, .as-field-row > textarea { flex-basis:308px; width:308px; height:36px; padding:5px 9px; }
        #as-preferences { height:52px; } #as-plan { flex-basis:150px; flex-direction:row; align-items:center; gap:12px; width:456px; height:150px; padding:12px; }
        #as-plan-title { flex:0 0 80px; width:80px; } #as-plan-price { flex:0 0 64px; width:64px; font-size:18px; } #as-plan-list { flex:0 0 112px; width:112px; height:108px; } #as-plan-list span { width:112px; } #as-plan p { display:none; } #as-upgrade { flex:0 0 112px; width:112px; }
        #as-dialog { left:100px; top:250px; width:440px; height:220px; } #as-dialog-title, #as-dialog-copy, #as-dialog-actions { width:400px; }
      }
      @media (max-width:599px) {
        #as-shell { flex-direction:column; left:10px; top:10px; width:370px; height:824px; } #as-sidebar { flex:0 0 64px; flex-direction:row; align-items:center; gap:10px; width:370px; height:64px; padding:12px 10px; }
        #as-brand { flex:0 0 92px; width:92px; height:40px; padding:8px 2px; font-size:13px; } #as-nav { flex-direction:row; gap:4px; width:248px; height:40px; } #as-nav input { width:80px; height:40px; padding:8px 4px; font-size:11px; text-align:center; }
        #as-workspace { width:370px; height:760px; } #as-header { width:370px; height:64px; padding:10px; } #as-heading { width:160px; } #as-state { width:112px; }
        #as-main { flex-direction:column; gap:10px; width:370px; height:696px; padding:10px; } #as-form { flex-basis:470px; width:350px; height:470px; padding:12px; }
        #as-form-intro, #as-form-intro h1, #as-form-intro p, #as-profile-fields, #as-help, #as-preferences, #as-actions { width:326px; }
        #as-form-intro h1 { font-size:13px; } #as-form-intro p { display:none; }
        .as-field-row { width:304px; } .as-field-row > label { flex-basis:72px; width:72px; font-size:10px; } .as-field-row > input, .as-field-row > select, .as-field-row > textarea { flex-basis:226px; width:226px; }
        #as-preferences > label { width:252px; } #as-plan { flex-basis:140px; flex-direction:row; align-items:center; gap:8px; width:350px; height:140px; padding:10px; }
        #as-plan-title { flex:0 0 90px; width:90px; font-size:14px; } #as-plan-price { flex:0 0 60px; width:60px; font-size:18px; } #as-plan-list { flex:0 0 140px; width:140px; height:108px; } #as-plan-list span { width:140px; font-size:10px; } #as-plan p, #as-upgrade { display:none; }
        #as-dialog { left:20px; top:310px; width:350px; height:220px; padding:18px; } #as-dialog-title, #as-dialog-copy, #as-dialog-actions { width:314px; }
      }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#dbe4ee', fontFamily:'Arial, sans-serif' }, { selector:'#as-shell, #as-shell *, #as-dialog, #as-dialog *', boxSizing:'border-box' },
      { selector:'#as-shell', display:'flex', position:'absolute', left:'20px', top:'20px', width:'760px', height:'560px', background:'#ffffff', overflow:'hidden' },
      { selector:'#as-sidebar', display:'flex', flex:'0 0 150px', flexDirection:'column', gap:'28px', width:'150px', height:'560px', padding:'20px 12px', background:'#312e81' }, { selector:'#as-brand', width:'126px', height:'32px', padding:'4px 8px', color:'#ffffff', fontFamily:'Arial, sans-serif', fontSize:'15px', fontWeight:'700', lineHeight:'24px' },
      { selector:'#as-nav', display:'flex', flexDirection:'column', gap:'6px', width:'126px', height:'132px' }, { selector:'#as-nav input', width:'126px', height:'40px', margin:'0', padding:'8px 10px', borderWidth:'0', borderRadius:'0', background:'#312e81', color:'#c7d2fe', fontFamily:'Arial, sans-serif', fontSize:'12px', fontWeight:'700', lineHeight:'24px', textAlign:'left' }, { selector:'#as-nav input.active', background:'#4f46e5', color:'#ffffff' },
      { selector:'#as-workspace', display:'flex', flex:'1 1 auto', flexDirection:'column', width:'610px', height:'560px', background:'#f8fafc' }, { selector:'#as-header', display:'flex', flex:'0 0 64px', alignItems:'center', justifyContent:'space-between', width:'610px', height:'64px', padding:'10px 16px', background:'#ffffff' },
      { selector:'#as-heading', display:'flex', flexDirection:'column', width:'180px', height:'44px' }, { selector:'#as-heading strong', height:'24px', color:'#0f172a', fontFamily:'Arial, sans-serif', fontSize:'14px', fontWeight:'700', lineHeight:'24px' }, { selector:'#as-heading span', height:'20px', color:'#64748b', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'20px' }, { selector:'#as-state', width:'112px', height:'28px', padding:'4px 8px', background:'#fef3c7', color:'#92400e', fontFamily:'Arial, sans-serif', fontSize:'11px', fontWeight:'700', lineHeight:'20px', textAlign:'center' },
      { selector:'#as-main', display:'flex', flex:'1 1 auto', gap:'12px', width:'610px', height:'496px', padding:'12px', background:'#eef2f7', overflow:'hidden' }, { selector:'#as-form', display:'flex', flex:'0 0 392px', flexDirection:'column', gap:'8px', width:'392px', height:'472px', padding:'12px', background:'#ffffff', overflow:'hidden' },
      { selector:'#as-form-intro', width:'368px', height:'40px' }, { selector:'#as-form-intro h1', width:'368px', height:'24px', margin:'0', color:'#0f172a', fontFamily:'Arial, sans-serif', fontSize:'17px', fontWeight:'700', lineHeight:'24px' }, { selector:'#as-form-intro p', width:'368px', height:'16px', margin:'0', color:'#64748b', fontFamily:'Arial, sans-serif', fontSize:'11px', lineHeight:'16px' },
      { selector:'#as-profile-fields', display:'flex', flexDirection:'column', gap:'4px', position:'relative', width:'368px', height:'auto', margin:'0', padding:'32px 10px 10px', borderWidth:'1px', borderStyle:'solid', borderColor:'#cbd5e1', background:'#ffffff', overflow:'hidden' }, { selector:'#as-profile-legend', position:'absolute', left:'10px', top:'4px', width:'132px', height:'24px', margin:'0', padding:'0', color:'#3730a3', fontFamily:'Arial, sans-serif', fontSize:'13px', fontWeight:'700', lineHeight:'24px' },
      { selector:'.as-field-row', display:'flex', flex:'0 0 40px', alignItems:'center', gap:'6px', width:'346px', height:'40px' }, { selector:'.as-field-row > label', flex:'0 0 92px', width:'92px', height:'40px', padding:'8px 0', color:'#334155', fontFamily:'Arial, sans-serif', fontSize:'11px', fontWeight:'700', lineHeight:'24px' }, { selector:'.as-field-row > label span', color:'#64748b', fontWeight:'400' }, { selector:'.as-field-row > label .as-label-main', color:'#334155', fontWeight:'700' },
      { selector:'.as-field-row > input, .as-field-row > select, .as-field-row > textarea', flex:'0 0 248px', width:'248px', height:'40px', margin:'0', padding:'7px 9px', borderWidth:'1px', borderStyle:'solid', borderColor:'#94a3b8', borderRadius:'0', background:'#f8fafc', color:'#0f172a', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'24px', textAlign:'left' },
      { selector:'#as-bio-row', flexBasis:'auto', height:'auto', alignItems:'flex-start' }, { selector:'#as-bio', height:'auto', padding:'5px 9px', whiteSpace:'pre-wrap' }, { selector:'#as-name:required', borderColor:'#dc2626' }, { selector:'#as-email:read-only', background:'#e2e8f0', color:'#64748b' },
      { selector:'#as-help', width:'368px', height:'24px', margin:'0', padding:'2px 8px', background:'#fff7ed', color:'#9a3412', fontFamily:'Arial, sans-serif', fontSize:'11px', lineHeight:'20px' },
      { selector:'#as-preferences', display:'flex', alignItems:'center', gap:'8px', position:'relative', width:'368px', height:'56px', margin:'0', padding:'20px 8px 4px', borderWidth:'1px', borderStyle:'solid', borderColor:'#cbd5e1', overflow:'hidden' }, { selector:'#as-preferences legend', position:'absolute', left:'8px', top:'0', width:'100px', height:'20px', color:'#3730a3', fontFamily:'Arial, sans-serif', fontSize:'11px', fontWeight:'700', lineHeight:'20px' },
      { selector:'#as-reports-slot', position:'relative', flex:'0 0 22px', width:'22px', height:'22px', borderWidth:'2px', borderStyle:'solid', borderColor:'#4f46e5', background:'#4f46e5', overflow:'hidden' }, { selector:'#as-reports', position:'absolute', left:'-40px', top:'0', width:'16px', height:'16px', opacity:'0' }, { selector:'#as-preferences > label', width:'270px', height:'24px', color:'#334155', fontFamily:'Arial, sans-serif', fontSize:'11px', lineHeight:'24px' },
      { selector:'#as-actions', display:'flex', justifyContent:'flex-end', gap:'8px', width:'368px', height:'40px' }, { selector:'#as-actions input, #as-dialog-actions input, #as-upgrade', height:'40px', margin:'0', padding:'8px 12px', borderWidth:'0', borderRadius:'0', fontFamily:'Arial, sans-serif', fontSize:'12px', fontWeight:'700', lineHeight:'24px', textAlign:'center' }, { selector:'#as-cancel', width:'84px', background:'#e2e8f0', color:'#334155' }, { selector:'#as-save', width:'116px', background:'#4f46e5', color:'#ffffff' },
      { selector:'#as-plan', display:'flex', flex:'0 0 182px', flexDirection:'column', gap:'10px', width:'182px', height:'472px', padding:'14px', background:'#eef2ff', overflow:'hidden' }, { selector:'#as-plan-title', width:'154px', height:'28px', margin:'0', color:'#312e81', fontFamily:'Arial, sans-serif', fontSize:'16px', fontWeight:'700', lineHeight:'28px' }, { selector:'#as-plan-price', width:'154px', height:'36px', color:'#4338ca', fontFamily:'Arial, sans-serif', fontSize:'24px', fontWeight:'700', lineHeight:'36px' },
      { selector:'#as-plan-list', display:'flex', flexDirection:'column', width:'154px', height:'108px' }, { selector:'#as-plan-list span', width:'154px', height:'36px', padding:'6px 0', color:'#475569', fontFamily:'Arial, sans-serif', fontSize:'11px', lineHeight:'24px' }, { selector:'#as-plan p', width:'154px', height:'48px', margin:'0', color:'#64748b', fontFamily:'Arial, sans-serif', fontSize:'11px', lineHeight:'24px' }, { selector:'#as-upgrade', width:'154px', background:'#c7d2fe', color:'#64748b', opacity:'.65' },
      { selector:'#as-backdrop', position:'fixed', left:'0', top:'0', width:'100vw', height:'100vh', zIndex:'20', background:'#0f172a', opacity:'.9' }, { selector:'#as-dialog', display:'flex', flexDirection:'column', gap:'12px', position:'fixed', left:'150px', top:'190px', width:'500px', height:'220px', padding:'20px', zIndex:'21', background:'#ffffff' }, { selector:'#as-dialog-title', width:'460px', height:'32px', margin:'0', color:'#0f172a', fontFamily:'Arial, sans-serif', fontSize:'19px', fontWeight:'700', lineHeight:'32px' }, { selector:'#as-dialog-copy', width:'460px', height:'48px', margin:'0', color:'#475569', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'24px' },
      { selector:'#as-dialog-actions', display:'flex', justifyContent:'flex-end', gap:'8px', width:'460px', height:'40px' }, { selector:'#as-dialog-edit', width:'108px', background:'#e2e8f0', color:'#334155' }, { selector:'#as-dialog-confirm', width:'116px', background:'#4f46e5', color:'#ffffff' },
      { selector:'#as-shell', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'600px', height:'680px' }, { selector:'#as-sidebar', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 120px', width:'120px', height:'680px', padding:'20px 10px' }, { selector:'#as-brand, #as-nav, #as-nav input', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'100px' },
      { selector:'#as-workspace', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'480px', height:'680px' }, { selector:'#as-header', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'480px' }, { selector:'#as-main', mediaMinWidth:'600px', mediaMaxWidth:'749px', flexDirection:'column', gap:'10px', width:'480px', height:'616px' },
      { selector:'#as-form', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 430px', width:'456px', height:'430px' }, { selector:'#as-form-intro, #as-form-intro h1, #as-form-intro p, #as-profile-fields, #as-help, #as-preferences, #as-actions', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'432px' }, { selector:'#as-form-intro', mediaMinWidth:'600px', mediaMaxWidth:'749px', height:'36px' },
      { selector:'.as-field-row', mediaMinWidth:'600px', mediaMaxWidth:'749px', flexBasis:'36px', width:'410px', height:'36px' }, { selector:'.as-field-row > label', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 96px', width:'96px', height:'36px', padding:'6px 0' }, { selector:'.as-field-row > input, .as-field-row > select, .as-field-row > textarea', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 308px', width:'308px', height:'36px', padding:'5px 9px' },
      { selector:'#as-preferences', mediaMinWidth:'600px', mediaMaxWidth:'749px', height:'52px' }, { selector:'#as-plan', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 150px', flexDirection:'row', alignItems:'center', gap:'12px', width:'456px', height:'150px', padding:'12px' }, { selector:'#as-plan-title', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 80px', width:'80px' }, { selector:'#as-plan-price', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 64px', width:'64px', fontSize:'18px' }, { selector:'#as-plan-list', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 112px', width:'112px', height:'108px' }, { selector:'#as-plan-list span', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'112px' }, { selector:'#as-plan p', mediaMinWidth:'600px', mediaMaxWidth:'749px', display:'none' }, { selector:'#as-upgrade', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 112px', width:'112px' }, { selector:'#as-dialog', mediaMinWidth:'600px', mediaMaxWidth:'749px', left:'100px', top:'250px', width:'440px', height:'220px' }, { selector:'#as-dialog-title, #as-dialog-copy, #as-dialog-actions', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'400px' },
      { selector:'#as-shell', mediaMaxWidth:'599px', flexDirection:'column', left:'10px', top:'10px', width:'370px', height:'824px' }, { selector:'#as-sidebar', mediaMaxWidth:'599px', flex:'0 0 64px', flexDirection:'row', alignItems:'center', gap:'10px', width:'370px', height:'64px', padding:'12px 10px' }, { selector:'#as-brand', mediaMaxWidth:'599px', flex:'0 0 92px', width:'92px', height:'40px', padding:'8px 2px', fontSize:'13px' }, { selector:'#as-nav', mediaMaxWidth:'599px', flexDirection:'row', gap:'4px', width:'248px', height:'40px' }, { selector:'#as-nav input', mediaMaxWidth:'599px', width:'80px', height:'40px', padding:'8px 4px', fontSize:'11px', textAlign:'center' },
      { selector:'#as-workspace', mediaMaxWidth:'599px', width:'370px', height:'760px' }, { selector:'#as-header', mediaMaxWidth:'599px', width:'370px', height:'64px', padding:'10px' }, { selector:'#as-heading', mediaMaxWidth:'599px', width:'160px' }, { selector:'#as-state', mediaMaxWidth:'599px', width:'112px' }, { selector:'#as-main', mediaMaxWidth:'599px', flexDirection:'column', gap:'10px', width:'370px', height:'696px', padding:'10px' }, { selector:'#as-form', mediaMaxWidth:'599px', flex:'0 0 470px', width:'350px', height:'470px', padding:'12px' },
      { selector:'#as-form-intro, #as-form-intro h1, #as-form-intro p, #as-profile-fields, #as-help, #as-preferences, #as-actions', mediaMaxWidth:'599px', width:'326px' }, { selector:'#as-form-intro h1', mediaMaxWidth:'599px', fontSize:'13px' }, { selector:'#as-form-intro p', mediaMaxWidth:'599px', display:'none' }, { selector:'.as-field-row', mediaMaxWidth:'599px', width:'304px' }, { selector:'.as-field-row > label', mediaMaxWidth:'599px', flex:'0 0 72px', width:'72px', fontSize:'10px' }, { selector:'.as-field-row > input, .as-field-row > select, .as-field-row > textarea', mediaMaxWidth:'599px', flex:'0 0 226px', width:'226px' }, { selector:'#as-preferences > label', mediaMaxWidth:'599px', width:'252px' },
      { selector:'#as-plan', mediaMaxWidth:'599px', flex:'0 0 140px', flexDirection:'row', alignItems:'center', gap:'8px', width:'350px', height:'140px', padding:'10px' }, { selector:'#as-plan-title', mediaMaxWidth:'599px', flex:'0 0 90px', width:'90px', fontSize:'14px' }, { selector:'#as-plan-price', mediaMaxWidth:'599px', flex:'0 0 60px', width:'60px', fontSize:'18px' }, { selector:'#as-plan-list', mediaMaxWidth:'599px', flex:'0 0 140px', width:'140px', height:'108px' }, { selector:'#as-plan-list span', mediaMaxWidth:'599px', width:'140px', fontSize:'10px' }, { selector:'#as-plan p, #as-upgrade', mediaMaxWidth:'599px', display:'none' }, { selector:'#as-dialog', mediaMaxWidth:'599px', left:'20px', top:'310px', width:'350px', height:'220px', padding:'18px' }, { selector:'#as-dialog-title, #as-dialog-copy, #as-dialog-actions', mediaMaxWidth:'599px', width:'314px' },
    ],
    root: { children:[
      { type:'div', id:'as-shell', children:[
        { type:'aside', id:'as-sidebar', children:[{ type:'div', id:'as-brand', textContent:'Astylar ID' }, { type:'nav', id:'as-nav', children:[{ type:'input', inputType:'button', id:'as-nav-profile', class:'active', value:'Profile' }, { type:'input', inputType:'button', id:'as-nav-security', value:'Security' }, { type:'input', inputType:'button', id:'as-nav-billing', value:'Billing' }] }] },
        { type:'section', id:'as-workspace', children:[
          { type:'header', id:'as-header', children:[{ type:'div', id:'as-heading', children:[{ type:'strong', textContent:'Account settings' }, { type:'span', textContent:'Personal workspace' }] }, { type:'span', id:'as-state', textContent:'Unsaved changes' }] },
          { type:'main', id:'as-main', children:[
            { type:'form', id:'as-form', children:[
              { type:'div', id:'as-form-intro', children:[{ type:'h1', textContent:'Profile' }, { type:'p', textContent:'Manage the details shown to your collaborators.' }] },
              { type:'fieldset', id:'as-profile-fields', children:[
                { type:'legend', id:'as-profile-legend', textContent:'Account details' },
                { type:'div', id:'as-name-row', class:'as-field-row', children:[{ type:'label', for:'as-name', textContent:'Display name' }, { type:'input', inputType:'text', id:'as-name', value:'Maya Chen', required:true }] },
                { type:'div', id:'as-email-row', class:'as-field-row', children:[{ type:'label', for:'as-email', textContent:'Email' }, { type:'input', inputType:'text', id:'as-email', value:'maya@example.test', readonly:true }] },
                { type:'div', id:'as-bio-row', class:'as-field-row', children:[{ type:'label', for:'as-bio', children:[{ type:'span', class:'as-label-main', textContent:'Bio' }, { type:'span', textContent:'Optional' }] }, { type:'textarea', id:'as-bio', value:'Design systems and spatial interfaces.', rows:2 }] },
                { type:'div', id:'as-region-row', class:'as-field-row', children:[{ type:'label', for:'as-region', textContent:'Region' }, { type:'select', id:'as-region', value:'africa', options:[{ value:'africa', label:'Africa' }, { value:'europe', label:'Europe' }] }] },
              ] },
              { type:'p', id:'as-help', textContent:'Your email is managed by your organization.' },
              { type:'fieldset', id:'as-preferences', children:[{ type:'legend', textContent:'Notifications' }, { type:'div', id:'as-reports-slot', children:[{ type:'input', inputType:'checkbox', id:'as-reports', checked:true }] }, { type:'label', for:'as-reports', textContent:'Email weekly account reports' }] },
              { type:'div', id:'as-actions', children:[{ type:'input', inputType:'button', id:'as-cancel', value:'Cancel' }, { type:'input', inputType:'button', id:'as-save', value:'Save changes' }] },
            ] },
            { type:'aside', id:'as-plan', children:[{ type:'h2', id:'as-plan-title', textContent:'Current plan' }, { type:'strong', id:'as-plan-price', textContent:'Studio' }, { type:'div', id:'as-plan-list', children:[{ type:'span', textContent:'12 team seats' }, { type:'span', textContent:'Private projects' }, { type:'span', textContent:'Priority support' }] }, { type:'p', textContent:'Renews on 24 September.' }, { type:'input', inputType:'button', id:'as-upgrade', value:'Upgrade unavailable', disabled:true }] },
          ] },
        ] },
      ] },
      { type:'div', id:'as-backdrop' },
      { type:'section', id:'as-dialog', children:[{ type:'h2', id:'as-dialog-title', textContent:'Save account changes?' }, { type:'p', id:'as-dialog-copy', textContent:'Your profile and notification preference will be updated.' }, { type:'div', id:'as-dialog-actions', children:[{ type:'input', inputType:'button', id:'as-dialog-edit', value:'Keep editing' }, { type:'input', inputType:'button', id:'as-dialog-confirm', value:'Confirm save' }] }] },
    ] },
  },
};
