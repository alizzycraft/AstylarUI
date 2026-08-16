import { ParityFixture } from '../parity.types';

export const representativeDataManagementFixture: ParityFixture = {
  id: 'representative-data-management',
  title: 'Representative data management application',
  category: 'composed-application',
  expectedBehavior:
    'A responsive inventory application preserves its navigation shell, filter toolbar, semantic fixed-column table, pagination, clipped narrow representation, local image, and positioned detail panel.',
  viewportIds: ['desktop', 'tablet', 'mobile'],
  measurementIds: [
    'dm-shell', 'dm-nav', 'dm-brand', 'dm-nav-inventory', 'dm-content', 'dm-header',
    'dm-title', 'dm-count', 'dm-main', 'dm-toolbar', 'dm-search', 'dm-filter', 'dm-export',
    'dm-table-card', 'dm-table', 'dm-head-row', 'dm-head-item', 'dm-head-status', 'dm-head-owner',
    'dm-row-one', 'dm-one-item', 'dm-one-status', 'dm-one-owner', 'dm-row-two', 'dm-two-item',
    'dm-pagination',
    'dm-page-prev', 'dm-page-active', 'dm-page-next', 'dm-empty', 'dm-detail', 'dm-detail-image',
    'dm-detail-title', 'dm-detail-copy', 'dm-detail-action',
  ],
  reference: {
    html: `
      <div id="dm-shell">
        <aside id="dm-nav">
          <div id="dm-brand">Stockroom</div>
          <nav id="dm-nav-list">
            <input id="dm-nav-overview" type="button" value="Overview">
            <input id="dm-nav-inventory" class="active" type="button" value="Inventory">
            <input id="dm-nav-orders" type="button" value="Orders">
          </nav>
        </aside>
        <section id="dm-content">
          <header id="dm-header"><h1 id="dm-title">Inventory</h1><span id="dm-count">128 records</span></header>
          <main id="dm-main">
            <div id="dm-toolbar">
              <input id="dm-search" type="text" value="Search inventory">
              <input id="dm-filter" type="button" value="All status">
              <input id="dm-export" type="button" value="Export" disabled>
            </div>
            <section id="dm-table-card">
              <table id="dm-table">
                <colgroup><col style="width:180px"><col style="width:100px"><col style="width:96px"></colgroup>
                <thead><tr id="dm-head-row"><th id="dm-head-item">Item</th><th id="dm-head-status">Status</th><th id="dm-head-owner">Owner</th></tr></thead>
                <tbody>
                  <tr id="dm-row-one"><td id="dm-one-item">Studio camera kit</td><td id="dm-one-status">Available</td><td id="dm-one-owner">Mina</td></tr>
                  <tr id="dm-row-two"><td id="dm-two-item">Portable lighting rig</td><td id="dm-two-status">Reserved</td><td id="dm-two-owner">Ravi</td></tr>
                </tbody>
              </table>
              <div id="dm-pagination"><input id="dm-page-prev" type="button" value="Previous" disabled><input id="dm-page-active" class="active" type="button" value="1"><input id="dm-page-next" type="button" value="Next"></div>
              <div id="dm-empty">No archived records.</div>
            </section>
            <aside id="dm-detail">
              <img id="dm-detail-image" src="/parity/article-pattern.svg" alt="Inventory preview">
              <div id="dm-detail-body">
                <h2 id="dm-detail-title">Studio camera kit</h2>
                <p id="dm-detail-copy">Ready for checkout from the central equipment room.</p>
                <div id="dm-detail-meta"><strong>Asset ID</strong><span>CAM-2048</span></div>
                <input id="dm-detail-action" type="button" value="View record">
              </div>
            </aside>
          </main>
        </section>
      </div>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#dce3ea; font-family:Arial,sans-serif; }
      #dm-shell, #dm-shell * { box-sizing:border-box; }
      #dm-shell { display:flex; position:absolute; left:20px; top:20px; width:760px; height:560px; background:#ffffff; overflow:hidden; }
      #dm-nav { display:flex; flex:0 0 120px; flex-direction:column; gap:28px; width:120px; height:560px; padding:20px 10px; background:#0f172a; }
      #dm-brand { width:100px; height:32px; padding:4px 0; color:#ffffff; font:700 15px/24px Arial,sans-serif; text-align:center; }
      #dm-nav-list { display:flex; flex-direction:column; gap:6px; width:100px; height:132px; }
      #dm-nav-list input { appearance:none; width:100px; height:40px; margin:0; padding:8px; border:0; border-radius:0; background:#0f172a; color:#cbd5e1; font:700 12px/24px Arial,sans-serif; text-align:left; }
      #dm-nav-list input.active { background:#0f766e; color:#ffffff; }
      #dm-content { display:flex; flex:1 1 auto; flex-direction:column; width:640px; height:560px; background:#f8fafc; }
      #dm-header { display:flex; flex:0 0 64px; align-items:center; justify-content:space-between; width:640px; height:64px; padding:12px 16px; background:#ffffff; }
      #dm-title { width:180px; height:40px; margin:0; padding:4px 0; color:#0f172a; font:700 24px/32px Arial,sans-serif; }
      #dm-count { width:96px; height:28px; padding:4px 8px; background:#ccfbf1; color:#115e59; font:700 12px/20px Arial,sans-serif; text-align:center; }
      #dm-main { position:relative; width:640px; height:496px; padding:12px; background:#eef2f7; overflow:hidden; }
      #dm-toolbar { display:flex; align-items:center; gap:8px; width:616px; height:52px; padding:6px; background:#ffffff; }
      #dm-toolbar input { appearance:none; height:40px; margin:0; border:1px solid #cbd5e1; border-radius:0; font:400 13px/22px Arial,sans-serif; }
      #dm-search { flex:1 1 auto; width:396px; padding:8px 10px; background:#f8fafc; color:#475569; text-align:left; }
      #dm-toolbar #dm-filter { flex:0 0 104px; width:104px; padding:8px; background:#ffffff; color:#334155; font-weight:700; text-align:center; }
      #dm-toolbar #dm-export { flex:0 0 92px; width:92px; padding:8px; background:#e2e8f0; color:#94a3b8; font-weight:700; text-align:center; opacity:.65; }
      #dm-table-card { position:absolute; left:12px; top:76px; width:400px; height:408px; padding:12px; background:#ffffff; overflow:hidden; }
      #dm-table { box-sizing:border-box !important; width:376px; height:156px; margin:0; padding:0; border:0; border-spacing:0; table-layout:fixed; background:#ffffff; font:400 10px/20px Arial,sans-serif; }
      #dm-table thead, #dm-table tbody, #dm-table tr { margin:0; padding:0; border:0; }
      #dm-table th, #dm-table td { box-sizing:border-box !important; height:52px; margin:0; padding:14px 8px; border:0; overflow:hidden; color:#334155; font:400 10px/24px Arial,sans-serif; text-align:left; white-space:nowrap; text-overflow:ellipsis; vertical-align:middle; }
      #dm-table th { background:#164e63; color:#ffffff; font-weight:700; }
      #dm-table tbody tr:nth-child(odd) td { background:#f8fafc; }
      #dm-table tbody tr:nth-child(even) td { background:#ffffff; }
      #dm-table #dm-one-status { background:#dcfce7; color:#166534; font-weight:700; }
      #dm-table #dm-two-status { background:#fef3c7; color:#92400e; font-weight:700; }
      #dm-pagination { display:flex; gap:6px; width:376px; height:52px; padding:6px 0; background:#ffffff; }
      #dm-pagination input { appearance:none; height:40px; margin:0; padding:8px; border:0; border-radius:0; background:#e2e8f0; color:#475569; font:700 12px/24px Arial,sans-serif; text-align:center; }
      #dm-page-prev { width:88px; opacity:.55; } #dm-page-active { width:40px; } #dm-page-next { width:72px; }
      #dm-pagination input.active { background:#0f766e; color:#ffffff; }
      #dm-empty { width:376px; height:40px; padding:10px; background:#f8fafc; color:#64748b; font:400 12px/20px Arial,sans-serif; }
      #dm-detail { display:flex; flex-direction:column; gap:12px; position:absolute; left:424px; top:76px; width:204px; height:auto; padding:16px; z-index:2; background:#ecfeff; overflow:hidden; }
      #dm-detail-image { width:172px; height:96px; object-fit:cover; background:#bae6fd; }
      #dm-detail-body { display:flex; flex-direction:column; gap:8px; width:172px; height:auto; }
      #dm-detail-title { width:172px; height:52px; margin:0; color:#164e63; font:700 18px/26px Arial,sans-serif; }
      #dm-detail-copy { width:172px; height:72px; margin:0; color:#475569; font:400 13px/24px Arial,sans-serif; }
      #dm-detail-meta { display:flex; justify-content:space-between; width:172px; height:40px; margin:0; padding:8px 0; color:#334155; font:400 12px/24px Arial,sans-serif; }
      #dm-detail-meta strong { width:68px; height:24px; font-weight:700; } #dm-detail-meta span { width:84px; height:24px; text-align:right; }
      #dm-detail-action { appearance:none; width:172px; height:40px; margin:0; padding:8px; border:0; border-radius:0; background:#0f766e; color:#ffffff; font:700 13px/24px Arial,sans-serif; text-align:center; }
      @media (min-width:600px) and (max-width:749px) {
        #dm-shell { left:20px; top:20px; width:600px; height:680px; }
        #dm-nav { flex-basis:100px; width:100px; height:680px; padding:20px 8px; }
        #dm-brand, #dm-nav-list, #dm-nav-list input { width:84px; } #dm-brand { font-size:13px; }
        #dm-content { width:500px; height:680px; } #dm-header { width:500px; height:72px; flex-basis:72px; }
        #dm-main { width:500px; height:608px; }
        #dm-toolbar { width:476px; } #dm-search { width:256px; }
        #dm-table-card { width:476px; height:330px; }
        #dm-table { height:132px; } #dm-table th, #dm-table td { height:44px; padding:10px 8px; }
        #dm-pagination { height:36px; padding:0; } #dm-pagination input { height:36px; padding:6px; line-height:24px; }
        #dm-empty { height:34px; padding:7px 10px; }
        #dm-detail { flex-direction:row; gap:12px; left:12px; top:418px; width:476px; height:auto; padding:12px; }
        #dm-detail-image { width:144px; height:154px; }
        #dm-detail-body { gap:4px; width:296px; }
        #dm-detail-title { width:296px; height:28px; margin:0; font-size:16px; line-height:28px; }
        #dm-detail-copy { width:296px; height:48px; margin:0; }
        #dm-detail-meta { width:296px; height:32px; margin:0; padding:4px 0; }
        #dm-detail-action { width:140px; height:34px; margin:0; padding:5px; }
      }
      @media (max-width:599px) {
        #dm-shell { flex-direction:column; left:10px; top:10px; width:370px; height:800px; }
        #dm-nav { flex:0 0 64px; flex-direction:row; align-items:center; gap:10px; width:370px; height:64px; padding:12px 10px; }
        #dm-brand { flex:0 0 92px; width:92px; height:40px; font-size:13px; }
        #dm-nav-list { flex-direction:row; gap:4px; width:248px; height:40px; }
        #dm-nav-list input { width:80px; height:40px; padding:8px 4px; font-size:11px; text-align:center; }
        #dm-content { width:370px; height:736px; } #dm-header { width:370px; height:72px; flex-basis:72px; padding:12px 10px; }
        #dm-title { width:160px; } #dm-count { width:100px; }
        #dm-main { width:370px; height:664px; padding:10px; }
        #dm-toolbar { flex-wrap:wrap; gap:6px; width:350px; height:78px; padding:6px; }
        #dm-toolbar #dm-search { flex:0 0 206px; width:206px; height:32px; padding:4px 8px; }
        #dm-toolbar #dm-filter { flex-basis:126px; width:126px; height:32px; padding:4px; }
        #dm-toolbar #dm-export { flex-basis:90px; width:90px; height:28px; padding:3px; }
        #dm-table-card { left:10px; top:98px; width:350px; height:310px; padding:12px; }
        #dm-table { width:376px; height:132px; } #dm-table th, #dm-table td { height:44px; padding:10px 8px; font-size:11px; }
        #dm-pagination { height:36px; padding:0; } #dm-pagination input { height:36px; padding:6px; line-height:24px; }
        #dm-empty { height:34px; padding:7px 10px; }
        #dm-detail { flex-direction:row; gap:10px; left:10px; top:418px; width:350px; height:auto; padding:12px; }
        #dm-detail-image { width:112px; height:96px; }
        #dm-detail-body { gap:6px; width:204px; }
        #dm-detail-title { width:204px; height:52px; margin:0; font-size:16px; }
        #dm-detail-copy { width:204px; height:72px; margin:0; }
        #dm-detail-meta { width:204px; height:36px; margin:0; padding:6px 0; }
        #dm-detail-action { width:140px; height:34px; margin:0; padding:5px; }
      }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#dce3ea', fontFamily:'Arial, sans-serif' }, { selector:'#dm-shell, #dm-shell *', boxSizing:'border-box' },
      { selector:'#dm-shell', display:'flex', position:'absolute', left:'20px', top:'20px', width:'760px', height:'560px', background:'#ffffff', overflow:'hidden' },
      { selector:'#dm-nav', display:'flex', flex:'0 0 120px', flexDirection:'column', gap:'28px', width:'120px', height:'560px', padding:'20px 10px', background:'#0f172a' },
      { selector:'#dm-brand', width:'100px', height:'32px', padding:'4px 0', color:'#ffffff', fontFamily:'Arial, sans-serif', fontSize:'15px', fontWeight:'700', lineHeight:'24px', textAlign:'center' },
      { selector:'#dm-nav-list', display:'flex', flexDirection:'column', gap:'6px', width:'100px', height:'132px' },
      { selector:'#dm-nav-list input', width:'100px', height:'40px', margin:'0', padding:'8px', borderWidth:'0', borderRadius:'0', background:'#0f172a', color:'#cbd5e1', fontFamily:'Arial, sans-serif', fontSize:'12px', fontWeight:'700', lineHeight:'24px', textAlign:'left' },
      { selector:'#dm-nav-list input.active', background:'#0f766e', color:'#ffffff' },
      { selector:'#dm-content', display:'flex', flex:'1 1 auto', flexDirection:'column', width:'640px', height:'560px', background:'#f8fafc' },
      { selector:'#dm-header', display:'flex', flex:'0 0 64px', alignItems:'center', justifyContent:'space-between', width:'640px', height:'64px', padding:'12px 16px', background:'#ffffff' },
      { selector:'#dm-title', width:'180px', height:'40px', margin:'0', padding:'4px 0', color:'#0f172a', fontFamily:'Arial, sans-serif', fontSize:'24px', fontWeight:'700', lineHeight:'32px' },
      { selector:'#dm-count', width:'96px', height:'28px', padding:'4px 8px', background:'#ccfbf1', color:'#115e59', fontFamily:'Arial, sans-serif', fontSize:'12px', fontWeight:'700', lineHeight:'20px', textAlign:'center' },
      { selector:'#dm-main', position:'relative', width:'640px', height:'496px', padding:'12px', background:'#eef2f7', overflow:'hidden' },
      { selector:'#dm-toolbar', display:'flex', alignItems:'center', gap:'8px', width:'616px', height:'52px', padding:'6px', background:'#ffffff' },
      { selector:'#dm-toolbar input', height:'40px', margin:'0', borderWidth:'1px', borderStyle:'solid', borderColor:'#cbd5e1', borderRadius:'0', fontFamily:'Arial, sans-serif', fontSize:'13px', lineHeight:'22px' },
      { selector:'#dm-search', flex:'1 1 auto', width:'396px', padding:'8px 10px', background:'#f8fafc', color:'#475569', textAlign:'left' },
      { selector:'#dm-toolbar #dm-filter', flex:'0 0 104px', width:'104px', padding:'8px', background:'#ffffff', color:'#334155', fontWeight:'700', textAlign:'center' },
      { selector:'#dm-toolbar #dm-export', flex:'0 0 92px', width:'92px', padding:'8px', background:'#e2e8f0', color:'#94a3b8', fontWeight:'700', textAlign:'center', opacity:'.65' },
      { selector:'#dm-table-card', position:'absolute', left:'12px', top:'76px', width:'400px', height:'408px', padding:'12px', background:'#ffffff', overflow:'hidden' },
      { selector:'#dm-table', boxSizing:'border-box', width:'376px', height:'156px', margin:'0', padding:'0', borderWidth:'0', background:'#ffffff', fontFamily:'Arial, sans-serif', fontSize:'10px', lineHeight:'20px' },
      { selector:'#dm-table thead, #dm-table tbody, #dm-table tr', margin:'0', padding:'0', borderWidth:'0' },
      { selector:'#dm-table th, #dm-table td', boxSizing:'border-box', height:'52px', margin:'0', padding:'14px 8px', borderWidth:'0', overflow:'hidden', color:'#334155', fontFamily:'Arial, sans-serif', fontSize:'10px', lineHeight:'24px', textAlign:'left', whiteSpace:'nowrap', textOverflow:'ellipsis', verticalAlign:'middle' },
      { selector:'#dm-table th', background:'#164e63', color:'#ffffff', fontWeight:'700' },
      { selector:'#dm-table tbody tr:nth-child(odd) td', background:'#f8fafc' }, { selector:'#dm-table tbody tr:nth-child(even) td', background:'#ffffff' },
      { selector:'#dm-table #dm-one-status', background:'#dcfce7', color:'#166534', fontWeight:'700' }, { selector:'#dm-table #dm-two-status', background:'#fef3c7', color:'#92400e', fontWeight:'700' },
      { selector:'#dm-pagination', display:'flex', gap:'6px', width:'376px', height:'52px', padding:'6px 0', background:'#ffffff' },
      { selector:'#dm-pagination input', height:'40px', margin:'0', padding:'8px', borderWidth:'0', borderRadius:'0', background:'#e2e8f0', color:'#475569', fontFamily:'Arial, sans-serif', fontSize:'12px', fontWeight:'700', lineHeight:'24px', textAlign:'center' },
      { selector:'#dm-page-prev', width:'88px', opacity:'.55' }, { selector:'#dm-page-active', width:'40px' }, { selector:'#dm-page-next', width:'72px' }, { selector:'#dm-pagination input.active', background:'#0f766e', color:'#ffffff' },
      { selector:'#dm-empty', width:'376px', height:'40px', padding:'10px', background:'#f8fafc', color:'#64748b', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'20px' },
      { selector:'#dm-detail', display:'flex', flexDirection:'column', gap:'12px', position:'absolute', left:'424px', top:'76px', width:'204px', height:'auto', padding:'16px', zIndex:'2', background:'#ecfeff', overflow:'hidden' },
      { selector:'#dm-detail-image', width:'172px', height:'96px', objectFit:'cover', background:'#bae6fd' },
      { selector:'#dm-detail-body', display:'flex', flexDirection:'column', gap:'8px', width:'172px', height:'auto' },
      { selector:'#dm-detail-title', width:'172px', height:'52px', margin:'0', color:'#164e63', fontFamily:'Arial, sans-serif', fontSize:'18px', fontWeight:'700', lineHeight:'26px' },
      { selector:'#dm-detail-copy', width:'172px', height:'72px', margin:'0', color:'#475569', fontFamily:'Arial, sans-serif', fontSize:'13px', lineHeight:'24px' },
      { selector:'#dm-detail-meta', display:'flex', justifyContent:'space-between', width:'172px', height:'40px', margin:'0', padding:'8px 0', color:'#334155', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'24px' },
      { selector:'#dm-detail-meta strong', width:'68px', height:'24px', fontWeight:'700' }, { selector:'#dm-detail-meta span', width:'84px', height:'24px', textAlign:'right' },
      { selector:'#dm-detail-action', width:'172px', height:'40px', margin:'0', padding:'8px', borderWidth:'0', borderRadius:'0', background:'#0f766e', color:'#ffffff', fontFamily:'Arial, sans-serif', fontSize:'13px', fontWeight:'700', lineHeight:'24px', textAlign:'center' },
      { selector:'#dm-shell', mediaMinWidth:'600px', mediaMaxWidth:'749px', left:'20px', top:'20px', width:'600px', height:'680px' }, { selector:'#dm-nav', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 100px', width:'100px', height:'680px', padding:'20px 8px' },
      { selector:'#dm-brand, #dm-nav-list, #dm-nav-list input', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'84px' }, { selector:'#dm-brand', mediaMinWidth:'600px', mediaMaxWidth:'749px', fontSize:'13px' },
      { selector:'#dm-content', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'500px', height:'680px' }, { selector:'#dm-header', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'500px', height:'72px', flex:'0 0 72px' }, { selector:'#dm-main', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'500px', height:'608px' },
      { selector:'#dm-toolbar', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'476px' }, { selector:'#dm-search', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'256px' }, { selector:'#dm-table-card', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'476px', height:'330px' },
      { selector:'#dm-table', mediaMinWidth:'600px', mediaMaxWidth:'749px', height:'132px' }, { selector:'#dm-table th, #dm-table td', mediaMinWidth:'600px', mediaMaxWidth:'749px', height:'44px', padding:'10px 8px' },
      { selector:'#dm-pagination', mediaMinWidth:'600px', mediaMaxWidth:'749px', height:'36px', padding:'0' }, { selector:'#dm-pagination input', mediaMinWidth:'600px', mediaMaxWidth:'749px', height:'36px', padding:'6px', lineHeight:'24px' }, { selector:'#dm-empty', mediaMinWidth:'600px', mediaMaxWidth:'749px', height:'34px', padding:'7px 10px' },
      { selector:'#dm-detail', mediaMinWidth:'600px', mediaMaxWidth:'749px', flexDirection:'row', gap:'12px', left:'12px', top:'418px', width:'476px', height:'auto', padding:'12px' }, { selector:'#dm-detail-image', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'144px', height:'154px' }, { selector:'#dm-detail-body', mediaMinWidth:'600px', mediaMaxWidth:'749px', gap:'4px', width:'296px' },
      { selector:'#dm-detail-title', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'296px', height:'28px', margin:'0', fontSize:'16px', lineHeight:'28px' }, { selector:'#dm-detail-copy', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'296px', height:'48px', margin:'0' },
      { selector:'#dm-detail-meta', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'296px', height:'32px', margin:'0', padding:'4px 0' }, { selector:'#dm-detail-action', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'140px', height:'34px', margin:'0', padding:'5px' },
      { selector:'#dm-shell', mediaMaxWidth:'599px', flexDirection:'column', left:'10px', top:'10px', width:'370px', height:'800px' }, { selector:'#dm-nav', mediaMaxWidth:'599px', flex:'0 0 64px', flexDirection:'row', alignItems:'center', gap:'10px', width:'370px', height:'64px', padding:'12px 10px' },
      { selector:'#dm-brand', mediaMaxWidth:'599px', flex:'0 0 92px', width:'92px', height:'40px', fontSize:'13px' }, { selector:'#dm-nav-list', mediaMaxWidth:'599px', flexDirection:'row', gap:'4px', width:'248px', height:'40px' }, { selector:'#dm-nav-list input', mediaMaxWidth:'599px', width:'80px', height:'40px', padding:'8px 4px', fontSize:'11px', textAlign:'center' },
      { selector:'#dm-content', mediaMaxWidth:'599px', width:'370px', height:'736px' }, { selector:'#dm-header', mediaMaxWidth:'599px', width:'370px', height:'72px', flex:'0 0 72px', padding:'12px 10px' }, { selector:'#dm-title', mediaMaxWidth:'599px', width:'160px' }, { selector:'#dm-count', mediaMaxWidth:'599px', width:'100px' },
      { selector:'#dm-main', mediaMaxWidth:'599px', width:'370px', height:'664px', padding:'10px' }, { selector:'#dm-toolbar', mediaMaxWidth:'599px', flexWrap:'wrap', gap:'6px', width:'350px', height:'78px', padding:'6px' },
      { selector:'#dm-toolbar #dm-search', mediaMaxWidth:'599px', flex:'0 0 206px', width:'206px', height:'32px', padding:'4px 8px' }, { selector:'#dm-toolbar #dm-filter', mediaMaxWidth:'599px', flex:'0 0 126px', width:'126px', height:'32px', padding:'4px' }, { selector:'#dm-toolbar #dm-export', mediaMaxWidth:'599px', flex:'0 0 90px', width:'90px', height:'28px', padding:'3px' },
      { selector:'#dm-table-card', mediaMaxWidth:'599px', left:'10px', top:'98px', width:'350px', height:'310px', padding:'12px' }, { selector:'#dm-table', mediaMaxWidth:'599px', width:'376px', height:'132px' }, { selector:'#dm-table th, #dm-table td', mediaMaxWidth:'599px', height:'44px', padding:'10px 8px', fontSize:'11px' },
      { selector:'#dm-pagination', mediaMaxWidth:'599px', height:'36px', padding:'0' }, { selector:'#dm-pagination input', mediaMaxWidth:'599px', height:'36px', padding:'6px', lineHeight:'24px' }, { selector:'#dm-empty', mediaMaxWidth:'599px', height:'34px', padding:'7px 10px' },
      { selector:'#dm-detail', mediaMaxWidth:'599px', flexDirection:'row', gap:'10px', left:'10px', top:'418px', width:'350px', height:'auto', padding:'12px' }, { selector:'#dm-detail-image', mediaMaxWidth:'599px', width:'112px', height:'96px' }, { selector:'#dm-detail-body', mediaMaxWidth:'599px', gap:'6px', width:'204px' },
      { selector:'#dm-detail-title', mediaMaxWidth:'599px', width:'204px', height:'52px', margin:'0', fontSize:'16px' }, { selector:'#dm-detail-copy', mediaMaxWidth:'599px', width:'204px', height:'72px', margin:'0' }, { selector:'#dm-detail-meta', mediaMaxWidth:'599px', width:'204px', height:'36px', margin:'0', padding:'6px 0' }, { selector:'#dm-detail-action', mediaMaxWidth:'599px', width:'140px', height:'34px', margin:'0', padding:'5px' },
    ],
    root: { children:[{ type:'div', id:'dm-shell', children:[
      { type:'aside', id:'dm-nav', children:[{ type:'div', id:'dm-brand', textContent:'Stockroom' }, { type:'nav', id:'dm-nav-list', children:[{ type:'input', inputType:'button', id:'dm-nav-overview', value:'Overview' }, { type:'input', inputType:'button', id:'dm-nav-inventory', class:'active', value:'Inventory' }, { type:'input', inputType:'button', id:'dm-nav-orders', value:'Orders' }] }] },
      { type:'section', id:'dm-content', children:[
        { type:'header', id:'dm-header', children:[{ type:'h1', id:'dm-title', textContent:'Inventory' }, { type:'span', id:'dm-count', textContent:'128 records' }] },
        { type:'main', id:'dm-main', children:[
          { type:'div', id:'dm-toolbar', children:[{ type:'input', inputType:'text', id:'dm-search', value:'Search inventory' }, { type:'input', inputType:'button', id:'dm-filter', value:'All status' }, { type:'input', inputType:'button', id:'dm-export', value:'Export', disabled:true }] },
          { type:'section', id:'dm-table-card', children:[
            { type:'table', id:'dm-table', tableProperties:{ tableLayout:'fixed' }, children:[
              { type:'colgroup', children:[{ type:'col', tableProperties:{ width:'180px' } }, { type:'col', tableProperties:{ width:'100px' } }, { type:'col', tableProperties:{ width:'96px' } }] },
              { type:'thead', children:[{ type:'tr', id:'dm-head-row', children:[{ type:'th', id:'dm-head-item', textContent:'Item' }, { type:'th', id:'dm-head-status', textContent:'Status' }, { type:'th', id:'dm-head-owner', textContent:'Owner' }] }] },
              { type:'tbody', children:[
                { type:'tr', id:'dm-row-one', children:[{ type:'td', id:'dm-one-item', textContent:'Studio camera kit' }, { type:'td', id:'dm-one-status', textContent:'Available' }, { type:'td', id:'dm-one-owner', textContent:'Mina' }] },
                { type:'tr', id:'dm-row-two', children:[{ type:'td', id:'dm-two-item', textContent:'Portable lighting rig' }, { type:'td', id:'dm-two-status', textContent:'Reserved' }, { type:'td', id:'dm-two-owner', textContent:'Ravi' }] },
              ] },
            ] },
            { type:'div', id:'dm-pagination', children:[{ type:'input', inputType:'button', id:'dm-page-prev', value:'Previous', disabled:true }, { type:'input', inputType:'button', id:'dm-page-active', class:'active', value:'1' }, { type:'input', inputType:'button', id:'dm-page-next', value:'Next' }] },
            { type:'div', id:'dm-empty', textContent:'No archived records.' },
          ] },
          { type:'aside', id:'dm-detail', children:[
            { type:'img', id:'dm-detail-image', src:'/parity/article-pattern.svg', alt:'Inventory preview' }, { type:'div', id:'dm-detail-body', children:[
              { type:'h2', id:'dm-detail-title', textContent:'Studio camera kit' }, { type:'p', id:'dm-detail-copy', textContent:'Ready for checkout from the central equipment room.' },
              { type:'div', id:'dm-detail-meta', children:[{ type:'strong', textContent:'Asset ID' }, { type:'span', textContent:'CAM-2048' }] }, { type:'input', inputType:'button', id:'dm-detail-action', value:'View record' },
            ] },
          ] },
        ] },
      ] },
    ] }] },
  },
};
