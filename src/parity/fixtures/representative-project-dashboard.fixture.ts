import { ParityFixture } from '../parity.types';
import type { SiteData } from '../../app/types/site-data';

export const representativeProjectDashboardFixture: ParityFixture = {
  id: 'representative-project-dashboard',
  title: 'Representative project management dashboard',
  category: 'composed-application',
  expectedBehavior:
    'A realistic project workspace reflows across desktop, tablet, and mobile while search editing, filtered application updates, and pointer/keyboard task toggling retain browser-equivalent state and events.',
  viewportIds: ['desktop', 'tablet', 'mobile'],
  responsiveSequence: ['desktop', 'tablet', 'mobile', 'desktop'],
  measurementIds: [
    'pm-shell', 'pm-sidebar', 'pm-brand', 'pm-nav', 'pm-nav-projects', 'pm-workspace',
    'pm-header', 'pm-heading', 'pm-search', 'pm-new', 'pm-main', 'pm-primary', 'pm-intro',
    'pm-title', 'pm-summary', 'pm-summary-active', 'pm-summary-due', 'pm-summary-done',
    'pm-tasks', 'pm-task-heading', 'pm-task-one', 'pm-task-one-slot', 'pm-task-one-title',
    'pm-task-two', 'pm-task-two-slot', 'pm-task-two-title', 'pm-task-three', 'pm-task-three-title',
    'pm-activity', 'pm-activity-title', 'pm-activity-list', 'pm-activity-one',
    'pm-activity-two', 'pm-activity-three', 'pm-activity-four', 'pm-help',
  ],
  optionalMeasurementIds: [
    'pm-task-one', 'pm-task-one-slot', 'pm-task-one-title',
    'pm-task-three', 'pm-task-three-title',
  ],
  interactionIds: ['pm-search', 'pm-task-two-slot', 'pm-task-two-check'],
  interactionEventTypes: [
    'pointerdown', 'pointerup', 'click', 'focus', 'blur',
    'keydown', 'keyup', 'input', 'change',
  ],
  interactionSteps: [
    { id: 'focus-search', actions: [{ type: 'click', elementId: 'pm-search' }] },
    { id: 'select-search', actions: [{ type: 'press-key', key: 'Control+A' }] },
    { id: 'enter-filter', actions: [{ type: 'type-text', text: 'launch' }] },
    {
      id: 'filter-and-reflow-mobile',
      actions: [{ type: 'apply-update', stepIndex: 0, viewportId: 'mobile' }],
    },
    { id: 'complete-filtered-task', actions: [{ type: 'click', elementId: 'pm-task-two-slot' }] },
    { id: 'reopen-filtered-task', actions: [{ type: 'press-key', key: 'Space' }] },
  ],
  reference: {
    html: `
      <div id="pm-shell">
        <aside id="pm-sidebar">
          <div id="pm-brand"><span>Northstar</span></div>
          <nav id="pm-nav">
            <input id="pm-nav-overview" type="button" value="Overview">
            <input id="pm-nav-projects" class="active" type="button" value="Projects">
            <input id="pm-nav-team" type="button" value="Team">
          </nav>
        </aside>
        <section id="pm-workspace">
          <header id="pm-header">
            <div id="pm-heading"><strong>Studio workspace</strong><span>12 members</span></div>
            <div id="pm-tools"><input id="pm-search" type="text" value="Search tasks"><input id="pm-new" type="button" value="New task"></div>
          </header>
          <main id="pm-main">
            <section id="pm-primary">
              <div id="pm-intro"><h1 id="pm-title">Website launch</h1><p id="pm-meta">Updated today · Product and design</p></div>
              <section id="pm-summary">
                <article id="pm-summary-active"><strong>8</strong><span>Active tasks</span></article>
                <article id="pm-summary-due"><strong>3</strong><span>Due this week</span></article>
                <article id="pm-summary-done"><strong>72%</strong><span>Completed</span></article>
              </section>
              <section id="pm-tasks">
                <h2 id="pm-task-heading">Priority tasks</h2>
                <div id="pm-task-list">
                  <article id="pm-task-one"><label id="pm-task-one-slot" class="pm-check-slot" for="pm-task-one-check"><input id="pm-task-one-check" type="checkbox" checked></label><strong id="pm-task-one-title">Approve responsive homepage</strong><span id="pm-status-one">Review</span></article>
                  <article id="pm-task-two"><label id="pm-task-two-slot" class="pm-check-slot" for="pm-task-two-check"><input id="pm-task-two-check" type="checkbox"></label><strong id="pm-task-two-title">Prepare launch checklist and owner notes</strong><span id="pm-status-two">In progress</span></article>
                  <article id="pm-task-three"><label id="pm-task-three-slot" class="pm-check-slot" for="pm-task-three-check"><input id="pm-task-three-check" type="checkbox" disabled></label><strong id="pm-task-three-title">Archive the previous campaign</strong><span id="pm-status-three">Blocked</span></article>
                </div>
              </section>
            </section>
            <aside id="pm-activity">
              <h2 id="pm-activity-title">Activity</h2>
              <div id="pm-activity-list">
                <article id="pm-activity-one"><span>Mina approved the brief</span></article>
                <article id="pm-activity-two"><span>Ravi moved a task to review</span></article>
                <article id="pm-activity-three"><span>Sasha shared final assets</span></article>
                <article id="pm-activity-four"><span>Jon added a launch note</span></article>
              </div>
            </aside>
          </main>
        </section>
      </div>
      <input id="pm-help" type="button" value="?">
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#dbe4ee; font-family:Arial,sans-serif; }
      #pm-shell, #pm-shell * { box-sizing:border-box; }
      #pm-shell { display:flex; position:absolute; left:20px; top:20px; width:760px; height:560px; margin:0; padding:0; background:#ffffff; overflow:hidden; }
      #pm-sidebar { display:flex; flex:0 0 160px; flex-direction:column; gap:28px; margin:0; padding:20px 14px; background:#172554; overflow:hidden; }
      #pm-brand { display:flex; align-items:center; gap:8px; width:132px; height:32px; color:#ffffff; font:700 16px/24px Arial,sans-serif; }
      #pm-brand span { width:132px; height:24px; }
      #pm-nav { display:flex; flex-direction:column; gap:6px; width:132px; height:132px; }
      #pm-nav input { appearance:none; width:132px; height:40px; margin:0; padding:8px 10px; border:0; border-radius:6px; background:#172554; color:#bfdbfe; font:700 13px/24px Arial,sans-serif; text-align:left; }
      #pm-nav input.active { background:#2563eb; color:#ffffff; }
      #pm-workspace { display:flex; flex:1 1 auto; flex-direction:column; background:#f8fafc; }
      #pm-header { display:flex; flex:0 0 72px; align-items:center; justify-content:space-between; padding:12px 16px; background:#ffffff; }
      #pm-heading { display:flex; flex-direction:column; width:150px; height:48px; }
      #pm-heading strong { height:24px; color:#0f172a; font:700 14px/24px Arial,sans-serif; }
      #pm-heading span { height:20px; color:#64748b; font:400 12px/20px Arial,sans-serif; }
      #pm-tools { display:flex; align-items:center; gap:8px; width:288px; height:40px; }
      #pm-search, #pm-new { appearance:none; height:40px; margin:0; border:1px solid #cbd5e1; border-radius:6px; font:400 13px/22px Arial,sans-serif; }
      #pm-search { width:184px; padding:8px 10px; outline:0; background:#f8fafc; color:#475569; text-align:left; }
      #pm-search:focus { background:#dbeafe; }
      #pm-new { width:96px; padding:8px; background:#2563eb; border-color:#2563eb; color:#ffffff; font-weight:700; text-align:center; }
      #pm-main { display:flex; flex:1 1 auto; flex-direction:row; gap:12px; padding:12px; background:#eef2f7; overflow:hidden; }
      #pm-primary { display:flex; flex:0 0 396px; flex-direction:column; gap:12px; background:#eef2f7; }
      #pm-intro { width:396px; height:68px; padding:8px 10px; background:#ffffff; }
      #pm-title { width:376px; margin:0; color:#0f172a; font:700 20px/28px Arial,sans-serif; }
      #pm-meta { width:376px; margin:4px 0 0; color:#64748b; font:400 12px/20px Arial,sans-serif; }
      #pm-summary { display:grid; flex:1 1 auto; grid-template-columns:1fr 1fr 1fr; gap:12px; background:#eef2f7; }
      #pm-summary article { display:flex; flex-direction:column; justify-content:center; width:auto; padding:14px; }
      #pm-summary strong { height:32px; font:700 24px/32px Arial,sans-serif; }
      #pm-summary span { font:400 12px/20px Arial,sans-serif; }
      #pm-summary-active { background:#dbeafe; color:#1e3a8a; } #pm-summary-due { background:#ffedd5; color:#9a3412; } #pm-summary-done { background:#dcfce7; color:#166534; }
      #pm-tasks { width:396px; height:252px; padding:12px; background:#ffffff; overflow:hidden; }
      #pm-task-heading { width:372px; height:28px; margin:0 0 8px; color:#0f172a; font:700 16px/28px Arial,sans-serif; }
      #pm-task-list { display:flex; flex-direction:column; width:372px; height:204px; background:#ffffff; overflow:hidden; }
      #pm-task-list article { display:flex; flex:0 0 68px; align-items:center; gap:8px; width:372px; height:68px; padding:8px 0; border:0; background:#ffffff; }
      .pm-check-slot { position:relative; flex:0 0 20px; width:20px; height:20px; border:2px solid #94a3b8; border-radius:4px; background:#ffffff; overflow:hidden; }
      #pm-task-one .pm-check-slot { border-color:#2563eb; background:#2563eb; }
      #pm-task-three .pm-check-slot { opacity:.45; background:#cbd5e1; }
      #pm-task-list input { appearance:none; position:absolute; left:-40px; top:0; width:16px; height:16px; margin:0; padding:0; border:0; opacity:0; }
      #pm-task-list > article > strong { flex:1 1 auto; width:244px; height:24px; min-width:0; overflow:hidden; color:#1e293b; font:700 12px/24px Arial,sans-serif; white-space:nowrap; text-overflow:ellipsis; }
      #pm-status-one, #pm-status-two, #pm-status-three { flex:0 0 88px; width:88px; height:24px; padding:2px 6px; border-radius:12px; font:700 10px/20px Arial,sans-serif; text-align:center; }
      #pm-status-one { background:#ede9fe; color:#6d28d9; } #pm-status-two { background:#fef3c7; color:#92400e; } #pm-status-three { background:#fee2e2; color:#991b1b; }
      #pm-activity { width:168px; padding:12px; background:#ffffff; overflow:hidden; }
      #pm-activity-title { width:144px; height:28px; margin:0 0 8px; color:#0f172a; font:700 16px/28px Arial,sans-serif; }
      #pm-activity-list { display:flex; flex-direction:column; gap:8px; width:144px; height:428px; background:#f1f5f9; overflow:hidden; }
      #pm-activity-list article { display:flex; flex:0 0 88px; flex-direction:column; width:144px; height:88px; padding:10px; background:#f1f5f9; border-radius:6px; }
      #pm-activity-list strong { height:24px; color:#1e3a8a; font:700 12px/24px Arial,sans-serif; }
      #pm-activity-list span { height:60px; color:#475569; font:400 12px/20px Arial,sans-serif; }
      #pm-help { appearance:none; box-sizing:border-box; position:fixed; left:756px; top:556px; width:36px; height:36px; margin:0; padding:6px; border:0; border-radius:18px; z-index:5; background:#0f172a; color:#ffffff; font:700 16px/24px Arial,sans-serif; text-align:center; }
      @media (min-width:600px) and (max-width:749px) {
        #pm-help { left:596px; top:676px; }
        #pm-shell { left:20px; top:20px; width:600px; height:680px; }
        #pm-sidebar { flex-basis:120px; padding:20px 10px; }
        #pm-brand { width:100px; } #pm-brand span { width:68px; font-size:13px; }
        #pm-nav, #pm-nav input { width:100px; }
        #pm-heading { width:132px; } #pm-tools { width:280px; } #pm-search { width:176px; }
        #pm-primary { flex-basis:320px; }
        #pm-intro { width:320px; height:76px; } #pm-title, #pm-meta { width:300px; }
        #pm-summary { grid-template-columns:1fr 1fr; }
        #pm-summary article { padding:8px 12px; } #pm-summary strong { height:28px; font-size:20px; line-height:28px; } #pm-summary span { white-space:nowrap; }
        #pm-tasks { width:320px; height:304px; } #pm-task-heading, #pm-task-list { width:296px; }
        #pm-task-list { height:252px; } #pm-task-list article { width:296px; height:84px; flex-basis:84px; }
        #pm-task-list > article > strong { width:172px; }
        #pm-status-one, #pm-status-two, #pm-status-three { flex-basis:72px; width:72px; }
        #pm-activity { width:124px; padding:10px; } #pm-activity-title, #pm-activity-list { width:104px; }
        #pm-activity-list { height:536px; } #pm-activity-list article { width:104px; height:112px; flex-basis:112px; padding:8px; }
      }
      @media (max-width:599px) {
        #pm-help { left:346px; top:800px; }
        #pm-shell { flex-direction:column; left:10px; top:10px; width:370px; height:824px; }
        #pm-sidebar { flex:0 0 64px; flex-direction:row; align-items:center; gap:10px; padding:12px 10px; }
        #pm-brand { flex:0 0 100px; width:100px; height:40px; } #pm-brand span { width:68px; font-size:13px; }
        #pm-nav { flex-direction:row; gap:4px; width:240px; height:40px; }
        #pm-nav input { width:77.333px; height:40px; padding:8px 5px; font-size:11px; text-align:center; }
        #pm-header { flex-basis:96px; padding:12px 10px; }
        #pm-heading { width:144px; } #pm-tools { width:198px; } #pm-search { width:110px; } #pm-new { width:80px; }
        #pm-main { flex-direction:column; gap:10px; padding:10px; }
        #pm-primary { flex:0 0 430px; gap:10px; }
        #pm-intro { width:350px; height:76px; } #pm-title, #pm-meta { width:330px; }
        #pm-summary { grid-template-columns:1fr 1fr 1fr; gap:8px; }
        #pm-summary article { padding:10px; } #pm-summary strong { height:32px; font-size:20px; }
        #pm-tasks { width:350px; height:204px; padding:10px; } #pm-task-heading, #pm-task-list { width:330px; }
        #pm-task-heading { height:24px; margin-bottom:4px; line-height:24px; } #pm-task-list { height:156px; }
        #pm-task-list article { flex-basis:52px; width:330px; height:52px; padding:4px 0; }
        #pm-task-list > article > strong { width:202px; }
        #pm-status-one, #pm-status-two, #pm-status-three { flex-basis:84px; width:84px; }
        #pm-activity { width:350px; height:204px; padding:10px; } #pm-activity-title { width:330px; height:24px; margin-bottom:4px; line-height:24px; }
        #pm-activity-list { flex-direction:row; gap:8px; width:330px; height:156px; }
        #pm-activity-list article { flex:0 0 104px; width:104px; height:156px; padding:8px; }
      }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#dbe4ee', fontFamily:'Arial, sans-serif' },
      { selector:'#pm-shell, #pm-shell *', boxSizing:'border-box' },
      { selector:'#pm-shell', display:'flex', position:'absolute', left:'20px', top:'20px', width:'760px', height:'560px', margin:'0', padding:'0', background:'#ffffff', overflow:'hidden' },
      { selector:'#pm-sidebar', display:'flex', flex:'0 0 160px', flexDirection:'column', gap:'28px', margin:'0', padding:'20px 14px', background:'#172554', overflow:'hidden' },
      { selector:'#pm-brand', display:'flex', alignItems:'center', gap:'8px', width:'132px', height:'32px', color:'#ffffff', fontFamily:'Arial, sans-serif', fontSize:'16px', fontWeight:'700', lineHeight:'24px' },
      { selector:'#pm-brand span', width:'132px', height:'24px' },
      { selector:'#pm-nav', display:'flex', flexDirection:'column', gap:'6px', width:'132px', height:'132px' },
      { selector:'#pm-nav input', width:'132px', height:'40px', margin:'0', padding:'8px 10px', borderWidth:'0', borderRadius:'6px', background:'#172554', color:'#bfdbfe', fontFamily:'Arial, sans-serif', fontSize:'13px', fontWeight:'700', lineHeight:'24px', textAlign:'left' },
      { selector:'#pm-nav input.active', background:'#2563eb', color:'#ffffff' },
      { selector:'#pm-workspace', display:'flex', flex:'1 1 auto', flexDirection:'column', background:'#f8fafc' },
      { selector:'#pm-header', display:'flex', flex:'0 0 72px', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'#ffffff' },
      { selector:'#pm-heading', display:'flex', flexDirection:'column', width:'150px', height:'48px' },
      { selector:'#pm-heading strong', height:'24px', color:'#0f172a', fontFamily:'Arial, sans-serif', fontSize:'14px', fontWeight:'700', lineHeight:'24px' },
      { selector:'#pm-heading span', height:'20px', color:'#64748b', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'20px' },
      { selector:'#pm-tools', display:'flex', alignItems:'center', gap:'8px', width:'288px', height:'40px' },
      { selector:'#pm-search, #pm-new', height:'40px', margin:'0', borderWidth:'1px', borderStyle:'solid', borderColor:'#cbd5e1', borderRadius:'6px', fontFamily:'Arial, sans-serif', fontSize:'13px', lineHeight:'22px' },
      { selector:'#pm-search', width:'184px', padding:'8px 10px', background:'#f8fafc', color:'#475569', textAlign:'left' },
      { selector:'#pm-search:focus', background:'#dbeafe' },
      { selector:'#pm-new', width:'96px', padding:'8px', background:'#2563eb', borderColor:'#2563eb', color:'#ffffff', fontWeight:'700', textAlign:'center' },
      { selector:'#pm-main', display:'flex', flex:'1 1 auto', flexDirection:'row', gap:'12px', padding:'12px', background:'#eef2f7', overflow:'hidden' },
      { selector:'#pm-primary', display:'flex', flex:'0 0 396px', flexDirection:'column', gap:'12px', background:'#eef2f7' },
      { selector:'#pm-intro', width:'396px', height:'68px', padding:'8px 10px', background:'#ffffff' },
      { selector:'#pm-title', width:'376px', margin:'0', color:'#0f172a', fontFamily:'Arial, sans-serif', fontSize:'20px', fontWeight:'700', lineHeight:'28px' },
      { selector:'#pm-meta', width:'376px', margin:'4px 0 0', color:'#64748b', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'20px' },
      { selector:'#pm-summary', display:'grid', flex:'1 1 auto', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', background:'#eef2f7' },
      { selector:'#pm-summary article', display:'flex', flexDirection:'column', justifyContent:'center', padding:'14px' },
      { selector:'#pm-summary strong', height:'32px', fontFamily:'Arial, sans-serif', fontSize:'24px', fontWeight:'700', lineHeight:'32px' },
      { selector:'#pm-summary span', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'20px' },
      { selector:'#pm-summary-active', background:'#dbeafe', color:'#1e3a8a' }, { selector:'#pm-summary-due', background:'#ffedd5', color:'#9a3412' }, { selector:'#pm-summary-done', background:'#dcfce7', color:'#166534' },
      { selector:'#pm-tasks', width:'396px', height:'252px', padding:'12px', background:'#ffffff', overflow:'hidden' },
      { selector:'#pm-task-heading', width:'372px', height:'28px', margin:'0 0 8px', color:'#0f172a', fontFamily:'Arial, sans-serif', fontSize:'16px', fontWeight:'700', lineHeight:'28px' },
      { selector:'#pm-task-list', display:'flex', flexDirection:'column', width:'372px', height:'204px', background:'#ffffff', overflow:'hidden' },
      { selector:'#pm-task-list article', display:'flex', flex:'0 0 68px', alignItems:'center', gap:'8px', width:'372px', height:'68px', padding:'8px 0', borderWidth:'0', background:'#ffffff' },
      { selector:'.pm-check-slot', position:'relative', flex:'0 0 20px', width:'20px', height:'20px', borderWidth:'2px', borderStyle:'solid', borderColor:'#94a3b8', borderRadius:'4px', background:'#ffffff', overflow:'hidden' },
      { selector:'#pm-task-one .pm-check-slot', borderColor:'#2563eb', background:'#2563eb' }, { selector:'#pm-task-three .pm-check-slot', opacity:'.45', background:'#cbd5e1' },
      { selector:'#pm-task-list input', position:'absolute', left:'-40px', top:'0', width:'16px', height:'16px', margin:'0', padding:'0', borderWidth:'0', opacity:'0' },
      { selector:'#pm-task-list > article > strong', flex:'1 1 auto', width:'244px', height:'24px', minWidth:'0', overflow:'hidden', color:'#1e293b', fontFamily:'Arial, sans-serif', fontSize:'12px', fontWeight:'700', lineHeight:'24px', whiteSpace:'nowrap', textOverflow:'ellipsis' },
      { selector:'#pm-status-one, #pm-status-two, #pm-status-three', flex:'0 0 88px', width:'88px', height:'24px', padding:'2px 6px', borderRadius:'12px', fontFamily:'Arial, sans-serif', fontSize:'10px', fontWeight:'700', lineHeight:'20px', textAlign:'center' },
      { selector:'#pm-status-one', background:'#ede9fe', color:'#6d28d9' }, { selector:'#pm-status-two', background:'#fef3c7', color:'#92400e' }, { selector:'#pm-status-three', background:'#fee2e2', color:'#991b1b' },
      { selector:'#pm-activity', width:'168px', padding:'12px', background:'#ffffff', overflow:'hidden' },
      { selector:'#pm-activity-title', width:'144px', height:'28px', margin:'0 0 8px', color:'#0f172a', fontFamily:'Arial, sans-serif', fontSize:'16px', fontWeight:'700', lineHeight:'28px' },
      { selector:'#pm-activity-list', display:'flex', flexDirection:'column', gap:'8px', width:'144px', height:'428px', background:'#f1f5f9', overflow:'hidden' },
      { selector:'#pm-activity-list article', display:'flex', flex:'0 0 88px', flexDirection:'column', width:'144px', height:'88px', padding:'10px', background:'#f1f5f9', borderRadius:'6px' },
      { selector:'#pm-activity-list strong', height:'24px', color:'#1e3a8a', fontFamily:'Arial, sans-serif', fontSize:'12px', fontWeight:'700', lineHeight:'24px' },
      { selector:'#pm-activity-list span', height:'60px', color:'#475569', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'20px' },
      { selector:'#pm-help', position:'fixed', left:'756px', top:'556px', width:'36px', height:'36px', margin:'0', padding:'6px', borderWidth:'0', borderRadius:'18px', zIndex:'5', background:'#0f172a', color:'#ffffff', fontFamily:'Arial, sans-serif', fontSize:'16px', fontWeight:'700', lineHeight:'24px', textAlign:'center' },
      { selector:'#pm-help', mediaMinWidth:'600px', mediaMaxWidth:'749px', left:'596px', top:'676px' },
      { selector:'#pm-shell', mediaMinWidth:'600px', mediaMaxWidth:'749px', left:'20px', top:'20px', width:'600px', height:'680px' },
      { selector:'#pm-sidebar', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 120px', padding:'20px 10px' },
      { selector:'#pm-brand', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'100px' }, { selector:'#pm-brand span', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'68px', fontSize:'13px' },
      { selector:'#pm-nav, #pm-nav input', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'100px' },
      { selector:'#pm-heading', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'132px' }, { selector:'#pm-tools', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'280px' }, { selector:'#pm-search', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'176px' },
      { selector:'#pm-primary', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 320px' },
      { selector:'#pm-intro', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'320px', height:'76px' }, { selector:'#pm-title, #pm-meta', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'300px' },
      { selector:'#pm-summary', mediaMinWidth:'600px', mediaMaxWidth:'749px', gridTemplateColumns:'1fr 1fr' },
      { selector:'#pm-summary article', mediaMinWidth:'600px', mediaMaxWidth:'749px', padding:'8px 12px' }, { selector:'#pm-summary strong', mediaMinWidth:'600px', mediaMaxWidth:'749px', height:'28px', fontSize:'20px', lineHeight:'28px' }, { selector:'#pm-summary span', mediaMinWidth:'600px', mediaMaxWidth:'749px', whiteSpace:'nowrap' },
      { selector:'#pm-tasks', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'320px', height:'304px' }, { selector:'#pm-task-heading, #pm-task-list', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'296px' },
      { selector:'#pm-task-list', mediaMinWidth:'600px', mediaMaxWidth:'749px', height:'252px' }, { selector:'#pm-task-list article', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 84px', width:'296px', height:'84px' },
      { selector:'#pm-task-list > article > strong', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'172px' }, { selector:'#pm-status-one, #pm-status-two, #pm-status-three', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 72px', width:'72px' },
      { selector:'#pm-activity', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'124px', padding:'10px' }, { selector:'#pm-activity-title, #pm-activity-list', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'104px' },
      { selector:'#pm-activity-list', mediaMinWidth:'600px', mediaMaxWidth:'749px', height:'536px' }, { selector:'#pm-activity-list article', mediaMinWidth:'600px', mediaMaxWidth:'749px', flex:'0 0 112px', width:'104px', height:'112px', padding:'8px' },
      { selector:'#pm-shell', mediaMaxWidth:'599px', flexDirection:'column', left:'10px', top:'10px', width:'370px', height:'824px' },
      { selector:'#pm-help', mediaMaxWidth:'599px', left:'346px', top:'800px' },
      { selector:'#pm-sidebar', mediaMaxWidth:'599px', flex:'0 0 64px', flexDirection:'row', alignItems:'center', gap:'10px', padding:'12px 10px' },
      { selector:'#pm-brand', mediaMaxWidth:'599px', flex:'0 0 100px', width:'100px', height:'40px' }, { selector:'#pm-brand span', mediaMaxWidth:'599px', width:'68px', fontSize:'13px' },
      { selector:'#pm-nav', mediaMaxWidth:'599px', flexDirection:'row', gap:'4px', width:'240px', height:'40px' }, { selector:'#pm-nav input', mediaMaxWidth:'599px', width:'77.333px', height:'40px', padding:'8px 5px', fontSize:'11px', textAlign:'center' },
      { selector:'#pm-header', mediaMaxWidth:'599px', flex:'0 0 96px', padding:'12px 10px' },
      { selector:'#pm-heading', mediaMaxWidth:'599px', width:'144px' }, { selector:'#pm-tools', mediaMaxWidth:'599px', width:'198px' }, { selector:'#pm-search', mediaMaxWidth:'599px', width:'110px' }, { selector:'#pm-new', mediaMaxWidth:'599px', width:'80px' },
      { selector:'#pm-main', mediaMaxWidth:'599px', flexDirection:'column', gap:'10px', padding:'10px' }, { selector:'#pm-primary', mediaMaxWidth:'599px', flex:'0 0 430px', gap:'10px' },
      { selector:'#pm-intro', mediaMaxWidth:'599px', width:'350px', height:'76px' }, { selector:'#pm-title, #pm-meta', mediaMaxWidth:'599px', width:'330px' },
      { selector:'#pm-summary', mediaMaxWidth:'599px', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }, { selector:'#pm-summary article', mediaMaxWidth:'599px', padding:'10px' },
      { selector:'#pm-summary strong', mediaMaxWidth:'599px', height:'32px', fontSize:'20px' },
      { selector:'#pm-tasks', mediaMaxWidth:'599px', width:'350px', height:'204px', padding:'10px' }, { selector:'#pm-task-heading, #pm-task-list', mediaMaxWidth:'599px', width:'330px' },
      { selector:'#pm-task-heading', mediaMaxWidth:'599px', height:'24px', margin:'0 0 4px', lineHeight:'24px' }, { selector:'#pm-task-list', mediaMaxWidth:'599px', height:'156px' }, { selector:'#pm-task-list article', mediaMaxWidth:'599px', flex:'0 0 52px', width:'330px', height:'52px', padding:'4px 0' },
      { selector:'#pm-task-list > article > strong', mediaMaxWidth:'599px', width:'202px' }, { selector:'#pm-status-one, #pm-status-two, #pm-status-three', mediaMaxWidth:'599px', flex:'0 0 84px', width:'84px' },
      { selector:'#pm-activity', mediaMaxWidth:'599px', width:'350px', height:'204px', padding:'10px' }, { selector:'#pm-activity-title', mediaMaxWidth:'599px', width:'330px', height:'24px', margin:'0 0 4px', lineHeight:'24px' },
      { selector:'#pm-activity-list', mediaMaxWidth:'599px', flexDirection:'row', gap:'8px', width:'330px', height:'156px' }, { selector:'#pm-activity-list article', mediaMaxWidth:'599px', flex:'0 0 104px', width:'104px', height:'156px', padding:'8px' },
    ],
    root: { children: [
      { type:'div', id:'pm-shell', children:[
        { type:'aside', id:'pm-sidebar', children:[
          { type:'div', id:'pm-brand', children:[{ type:'span', textContent:'Northstar' }] },
          { type:'nav', id:'pm-nav', children:[
            { type:'input', inputType:'button', id:'pm-nav-overview', value:'Overview' }, { type:'input', inputType:'button', id:'pm-nav-projects', class:'active', value:'Projects' }, { type:'input', inputType:'button', id:'pm-nav-team', value:'Team' },
          ] },
        ] },
        { type:'section', id:'pm-workspace', children:[
          { type:'header', id:'pm-header', children:[
            { type:'div', id:'pm-heading', children:[{ type:'strong', textContent:'Studio workspace' }, { type:'span', textContent:'12 members' }] },
            { type:'div', id:'pm-tools', children:[{ type:'input', inputType:'text', id:'pm-search', value:'Search tasks' }, { type:'input', inputType:'button', id:'pm-new', value:'New task' }] },
          ] },
          { type:'main', id:'pm-main', children:[
            { type:'section', id:'pm-primary', children:[
              { type:'div', id:'pm-intro', children:[{ type:'h1', id:'pm-title', textContent:'Website launch' }, { type:'p', id:'pm-meta', textContent:'Updated today · Product and design' }] },
              { type:'section', id:'pm-summary', children:[
                { type:'article', id:'pm-summary-active', children:[{ type:'strong', textContent:'8' }, { type:'span', textContent:'Active tasks' }] },
                { type:'article', id:'pm-summary-due', children:[{ type:'strong', textContent:'3' }, { type:'span', textContent:'Due this week' }] },
                { type:'article', id:'pm-summary-done', children:[{ type:'strong', textContent:'72%' }, { type:'span', textContent:'Completed' }] },
              ] },
              { type:'section', id:'pm-tasks', children:[
                { type:'h2', id:'pm-task-heading', textContent:'Priority tasks' },
                { type:'div', id:'pm-task-list', children:[
                  { type:'article', id:'pm-task-one', children:[{ type:'label', id:'pm-task-one-slot', class:'pm-check-slot', for:'pm-task-one-check', children:[{ type:'input', inputType:'checkbox', id:'pm-task-one-check', checked:true }] }, { type:'strong', id:'pm-task-one-title', textContent:'Approve responsive homepage' }, { type:'span', id:'pm-status-one', textContent:'Review' }] },
                  { type:'article', id:'pm-task-two', children:[{ type:'label', id:'pm-task-two-slot', class:'pm-check-slot', for:'pm-task-two-check', children:[{ type:'input', inputType:'checkbox', id:'pm-task-two-check' }] }, { type:'strong', id:'pm-task-two-title', textContent:'Prepare launch checklist and owner notes' }, { type:'span', id:'pm-status-two', textContent:'In progress' }] },
                  { type:'article', id:'pm-task-three', children:[{ type:'label', id:'pm-task-three-slot', class:'pm-check-slot', for:'pm-task-three-check', children:[{ type:'input', inputType:'checkbox', id:'pm-task-three-check', disabled:true }] }, { type:'strong', id:'pm-task-three-title', textContent:'Archive the previous campaign' }, { type:'span', id:'pm-status-three', textContent:'Blocked' }] },
                ] },
              ] },
            ] },
            { type:'aside', id:'pm-activity', children:[
              { type:'h2', id:'pm-activity-title', textContent:'Activity' },
              { type:'div', id:'pm-activity-list', children:[
                { type:'article', id:'pm-activity-one', children:[{ type:'span', textContent:'Mina approved the brief' }] },
                { type:'article', id:'pm-activity-two', children:[{ type:'span', textContent:'Ravi moved a task to review' }] },
                { type:'article', id:'pm-activity-three', children:[{ type:'span', textContent:'Sasha shared final assets' }] },
                { type:'article', id:'pm-activity-four', children:[{ type:'span', textContent:'Jon added a launch note' }] },
              ] },
            ] },
          ] },
        ] },
      ] },
      { type:'input', inputType:'button', id:'pm-help', value:'?' },
    ] },
  },
};

const filteredDashboardSiteData = JSON.parse(
  JSON.stringify(representativeProjectDashboardFixture.siteData),
) as SiteData;
const filteredTaskList = findDashboardElement(filteredDashboardSiteData, 'pm-task-list');
const filteredHeading = findDashboardElement(filteredDashboardSiteData, 'pm-task-heading');
if (!filteredTaskList?.children || !filteredHeading) {
  throw new Error('Representative dashboard filter targets are missing');
}
filteredTaskList.children = filteredTaskList.children.filter((child) => child.id === 'pm-task-two');
filteredHeading.textContent = 'Filtered tasks';
representativeProjectDashboardFixture.dynamicSteps = [{
  id: 'filtered-launch-tasks',
  referenceMutations: [
    { type: 'set-text', elementId: 'pm-task-heading', textContent: 'Filtered tasks' },
    {
      type: 'set-children',
      elementId: 'pm-task-list',
      html: '<article id="pm-task-two"><label id="pm-task-two-slot" class="pm-check-slot" for="pm-task-two-check"><input id="pm-task-two-check" type="checkbox"></label><strong id="pm-task-two-title">Prepare launch checklist and owner notes</strong><span id="pm-status-two">In progress</span></article>',
    },
  ],
  siteData: filteredDashboardSiteData,
}];

function findDashboardElement(
  siteData: SiteData,
  elementId: string,
): SiteData['root']['children'][number] | undefined {
  const pending = [...siteData.root.children];
  while (pending.length) {
    const element = pending.shift();
    if (element?.id === elementId) return element;
    if (element?.children) pending.push(...element.children);
  }
  return undefined;
}
