import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
// Derive the maintained public-package capture;never edit consumer/core sources.
assert.equal(process.argv.length, 3);
const base = 'scripts/audit-public-semantic-css-hidden.mjs';
const bytes = fs.readFileSync(base), hash = b => createHash('sha256').update(b).digest('hex');
assert.equal(hash(bytes), '54d86b62291e69492752bdb0ddb6df269f13f95d691d34d3d7437f5be58317bc');
let source = bytes.toString().replace(/\r\n/g, '\n');
function replaceOnce(before, after) { assert.equal(source.split(before).length, 2, before); source = source.replace(before, after); }
replaceOnce("[path.resolve(entry), entryOriginal.replace('function append(parent, description) {',\n    'function append(parent, description) { if(description.hidden) return;')],",
  `[path.resolve(entry), entryOriginal.replace('const node = document.createElement(description.type); node.id = description.id;',
    'const node = document.createElement(description.type); node.id = description.id; node.hidden = !!description.hidden; if (description.ariaDescribedby) node.setAttribute("aria-describedby", description.ariaDescribedby);')],`);
replaceOnce("['visible','display-none','visibility-hidden','authored-hidden']", "['visible','hidden-child','hidden-root','hidden-parent']");
replaceOnce(`  site.root.children[0].children=[{type:'p',id:'target',textContent:'Hidden content',
    ...(name==='authored-hidden'?{hidden:true}:{})}];
  Object.assign(site.styles[1],{display:name==='display-none'?'none':'block',
    visibility:name==='visibility-hidden'?'hidden':'visible'});`,
  `  const target={type:'button',id:'target',value:'Target',ariaDescribedby:'description'};
  const description={type:'span',id:'description',textContent:'Help info',
    ...(['hidden-child','hidden-root'].includes(name)?{hidden:true}:{})};
  site.root.children=[{type:'div',id:'parent',children:[target,
    ...(name==='hidden-root'?[]:name==='hidden-parent'
      ?[{type:'div',id:'hidden-parent',hidden:true,children:[description]}]:[description])]},
    ...(name==='hidden-root'?[description]:[])];`);
replaceOnce("name: 'semantic-css-hidden-proof'", "name: 'hidden-description-proof'");
replaceOnce("const producer = 'scripts/audit-public-semantic-css-hidden.mjs';", "const producer = 'scripts/audit-public-hidden-description.mjs';");
replaceOnce("writeFileSync(path.join(output, 'producer.mjs'), readFileSync(producer));", "writeFileSync(path.join(output, 'producer.mjs'), process.execArgv[2]);");
replaceOnce('const provenance = { producer: { file: producer, sha256: hash(readFileSync(producer)) },',
  `const provenance = { producer: { file: producer, sha256: hash(readFileSync(producer)) },
  baseProducer: { file: '${base}', sha256: hash(readFileSync('${base}')) },
  generatedProducer: { file: path.relative(process.cwd(),path.join(output,'producer.mjs')).split(path.sep).join('/'), sha256: hash(readFileSync(path.join(output,'producer.mjs'))) },`);
replaceOnce("['visible', 'display-none', 'visibility-hidden', 'authored-hidden']", "['visible', 'hidden-child', 'hidden-root', 'hidden-parent']");
replaceOnce("n.name?.value === 'Hidden content'", "n.name?.value === 'Help info'");
replaceOnce(`        const expected = variant === 'visible' ? 1 : 0;
        if (exposedText.length !== expected) failures.push({ mode, variant, dpr, expected, actual: exposedText.length });`,
  `        const expected = variant === 'visible' ? 1 : 0;
        if (exposedText.length !== expected) failures.push({ check:'text-exposure', mode, variant, dpr, expected, actual:exposedText.length });
        const buttons=nodes.filter(n=>!n.ignored&&n.role?.value==='button'&&n.name?.value==='Target');
        assert.equal(buttons.length,1);
        const description=buttons[0].description?.value??null,expectedDescription='Help info';
        const semanticDom=await page.evaluate(mode=>{
          const button=mode==='reference'?document.getElementById('target'):document.querySelector('[data-astylar-id="target"]');
          const referenceId=button?.getAttribute('aria-describedby')??null;
          const described=referenceId?document.getElementById(referenceId):null;
          return {buttonExists:!!button,buttonTag:button?.tagName??null,
            buttonAttributes:button?[...button.attributes].map(a=>[a.name,a.value]):[],referenceId,
            targetExists:!!described,targetTag:described?.tagName??null,targetText:described?.textContent??null,
            targetHidden:described?.hidden??null,targetParentHidden:described?.parentElement?.hidden??null};
        },mode);
        if(description!==expectedDescription)failures.push({check:'description',mode,variant,dpr,expected:expectedDescription,actual:description});`);
replaceOnce('const observation = { mode, variant, dpr, snapshot, nodes, exposedText: exposedText.length, expected, disposed };',
  'const observation = { mode, variant, dpr, snapshot, nodes, semanticDom, description, expectedDescription, exposedText: exposedText.length, expected, disposed };');
replaceOnce('captures.push({ mode, variant, dpr, file, sha256: hash(bytes), exposedText: exposedText.length, expected });',
  'captures.push({ mode, variant, dpr, file, sha256: hash(bytes), exposedText: exposedText.length, expected, description, expectedDescription });');
replaceOnce('Equal public-package static text inputs;visible,CSS display:none,CSS visibility:hidden and authored hidden atDPR1/2. Actual AX text exposure only;not Material wrappers,AT navigation,updates,paint or full rendering acceptance.',
  'Equal public-package button/described-text inputs;visible,nested hidden target,root hidden target and hidden ancestor atDPR1/2. Reference creates native hidden DOM nodes rather than eliding them. Actual AX description/exposure and DOM target presence only;not Material cause attribution,AT navigation,updates,paint or full rendering acceptance.');
replaceOnce("'CSS-hidden content remains exposed in actual AX'", "'Referenced hidden descriptions are lost in actual AX'");
source = 'process.argv.splice(1,0,"derived-hidden-description");\n' + source;
const result = spawnSync(process.execPath, ['--input-type=module', '-e', source, process.argv[2]],
  { cwd: process.cwd(), env: process.env, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
assert.equal(result.signal, null, 'Public hidden-description capture terminated by signal');
process.exitCode = result.status ?? 1;
