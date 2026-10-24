import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const file='scripts/audit-material-divider-heading-boxes.mjs';
const bytes=readFileSync(file);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'fc2337b12a2786837680eccc7c3de1cd81f8d5e9f6685244a7585acd39827cb1');
let source=bytes.toString();
const replace=(before,after)=>{assert.equal(source.split(before).length,2);source=source.replace(before,after);};
replace("import.meta.resolve('playwright-core')",JSON.stringify(import.meta.resolve('playwright-core')));
replace("readFileSync('scripts/audit-material-divider-heading-boxes.mjs')","readFileSync('scripts/audit-material-divider-heading-ua.mjs')");
const insertion=`
replace('in four desktop-DPR1 themes.', 'in one light desktop-DPR1 reference-only CDP context.');
replace("for(const profile of ['light','dark','contrast','custom'])for(const side of ['reference','astylar'])", "for(const profile of ['light'])for(const side of ['reference'])");
replace('const observation=await page.evaluate(', 'let observation=await page.evaluate(');
replace('      await Promise.all(pending);', \x60      const session=await page.context().newCDPSession(page);
      try {
        await session.send('DOM.enable');await session.send('CSS.enable');
        const doc=await session.send('DOM.getDocument');
        const {nodeId}=await session.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.frame h1'});
        assert.ok(nodeId);
        const matched=await session.send('CSS.getMatchedStylesForNode',{nodeId});
        const computed=await session.send('CSS.getComputedStyleForNode',{nodeId});
        observation={...observation,uaMargin:{nodeId,
          rules:matched.matchedCSSRules.map(({rule})=>({origin:rule.origin,selector:rule.selectorList.text,
            properties:rule.style.cssProperties.filter(p=>p.name.startsWith('margin')).map(p=>({name:p.name,value:p.value,important:p.important??false,disabled:p.disabled??false}))})).filter(r=>r.properties.length),
          computed:Object.fromEntries(computed.computedStyle.filter(p=>['font-size','margin-top','margin-bottom','margin-left','margin-right','writing-mode'].includes(p.name)).map(p=>[p.name,p.value]))}};
      } finally {await session.detach();}
      await Promise.all(pending);\x60);
`;
replace("await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));",insertion+"\nawait import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));");
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
