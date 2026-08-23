import { ParityFixture } from '../parity.types';

export const controlRequirementSelectorsFixture: ParityFixture = {
  id:'control-requirement-selectors', title:'Requirement and editability selectors', category:'controls-states',
  expectedBehavior:'Required, optional, read-only, and read-write pseudo-classes match semantic input state and participate in cascade specificity.',
  measurementIds:['required-field','optional-field','readonly-field','readwrite-field'],
  reference:{ html:`<input id="required-field" required><input id="optional-field"><input id="readonly-field" readonly><input id="readwrite-field">`, css:`
    #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
    input { appearance:none; box-sizing:border-box; position:absolute; top:180px; width:130px; height:60px; margin:0; padding:0; border:0; background:#fee2e2; }
    #required-field { left:80px } #optional-field { left:250px } #readonly-field { left:420px } #readwrite-field { left:590px }
    #required-field:required { background:#2563eb } #optional-field:optional { background:#16a34a } #readonly-field:read-only { background:#9333ea } #readwrite-field:read-write { background:#ea580c }
  `},
  siteData:{ styles:[
    {selector:'root',background:'#f8fafc'},
    {selector:'input',boxSizing:'border-box',position:'absolute',top:'180px',width:'130px',height:'60px',margin:'0',padding:'0',borderWidth:'0',background:'#fee2e2'},
    {selector:'#required-field',left:'80px'},{selector:'#optional-field',left:'250px'},{selector:'#readonly-field',left:'420px'},{selector:'#readwrite-field',left:'590px'},
    {selector:'#required-field:required',background:'#2563eb'},{selector:'#optional-field:optional',background:'#16a34a'},{selector:'#readonly-field:read-only',background:'#9333ea'},{selector:'#readwrite-field:read-write',background:'#ea580c'},
  ],root:{children:[
    {type:'input',id:'required-field',required:true},{type:'input',id:'optional-field'},
    {type:'input',id:'readonly-field',readonly:true},{type:'input',id:'readwrite-field'},
  ]}},
};
