import { access, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillDirectory = path.resolve(scriptDirectory, '..');
const repositoryRoot = path.resolve(skillDirectory, '..', '..', '..');
const failures = [];

const readText = (filePath) => readFile(filePath, 'utf8');
const fail = (message) => failures.push(message);

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(entryPath));
    else files.push(entryPath);
  }
  return files;
}

function catalogNames(groups) {
  return new Set(groups.flatMap((group) => group.names));
}

function collectElements(element, output = []) {
  if (!element) return output;
  output.push(element);
  for (const child of element.children ?? []) collectElements(child, output);
  return output;
}

const skillPath = path.join(skillDirectory, 'SKILL.md');
const openaiPath = path.join(skillDirectory, 'agents', 'openai.yaml');
const skill = await readText(skillPath);
const openai = await readText(openaiPath);
const files = await collectFiles(skillDirectory);
const unfinishedPattern = new RegExp(
  ['\\bTO', 'DO\\b|\\[TO', 'DO|PLACE', 'HOLDER CONTENT'].join(''),
  'i',
);

const frontmatterMatch = skill.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
if (!frontmatterMatch) {
  fail('SKILL.md must begin with YAML frontmatter.');
} else {
  const frontmatterKeys = [...frontmatterMatch[1].matchAll(/^([A-Za-z][\w-]*):/gm)]
    .map((match) => match[1]);
  if (frontmatterKeys.join(',') !== 'name,description') {
    fail(`SKILL.md frontmatter must contain only name and description; received ${frontmatterKeys.join(', ')}.`);
  }
  if (!/^name:\s*astylarui-developer\s*$/m.test(frontmatterMatch[1])) {
    fail('SKILL.md name must be astylarui-developer.');
  }
  const description = frontmatterMatch[1].match(/^description:\s*(.+)$/m)?.[1] ?? '';
  for (const term of [
    'Build', 'convert', 'integrate', 'diagnose', 'review', 'test', 'HTML/CSS',
    'responsive', 'Angular', 'events', 'accessibility', 'plugins', 'Do not use',
    'renderer internals', 'parity harness',
  ]) {
    if (!description.toLowerCase().includes(term.toLowerCase())) {
      fail(`Skill description is missing trigger/boundary term: ${term}`);
    }
  }
}

const lineCount = skill.split(/\r?\n/).length;
if (lineCount > 500) fail(`SKILL.md has ${lineCount} lines; maximum is 500.`);

for (const expected of [
  'display_name: "AstylarUI Developer"',
  'short_description: "Build Angular applications with AstylarUI"',
  'default_prompt: "Use $astylarui-developer',
]) {
  if (!openai.includes(expected)) fail(`agents/openai.yaml is missing: ${expected}`);
}
const shortDescription = openai.match(/short_description:\s*"([^"]+)"/)?.[1] ?? '';
if (shortDescription.length < 25 || shortDescription.length > 64) {
  fail('agents/openai.yaml short_description must contain 25-64 characters.');
}

for (const filePath of files.filter((file) => file.endsWith('.md'))) {
  const markdown = await readText(filePath);
  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(filePath), target);
    if (!await exists(resolved)) {
      fail(`${path.relative(skillDirectory, filePath)} has missing link target: ${match[1]}`);
    }
  }
}

for (const filePath of files.filter((file) => /\.(?:md|json|mjs|ts|html|yaml)$/.test(file))) {
  const content = await readText(filePath);
  if (unfinishedPattern.test(content)) {
    fail(`${path.relative(skillDirectory, filePath)} contains an unfinished marker.`);
  }
  if (/from\s+['"]astylarui\//.test(content)) {
    fail(`${path.relative(skillDirectory, filePath)} uses a forbidden AstylarUI deep import.`);
  }
}

if (/ASTYLAR_INTERNAL_INSPECTION|src\/app\/services|src\/lib\//.test(skill)) {
  fail('SKILL.md instructs agents through a private renderer/source boundary.');
}

const manifest = JSON.parse(await readText(path.join(skillDirectory, 'references', 'source-manifest.json')));
const packageJson = JSON.parse(await readText(path.join(repositoryRoot, 'package.json')));
if (manifest.schema !== 'astylarui-skill-reference-sources' || manifest.version !== 1) {
  fail('Bundled source manifest has an unsupported schema.');
}
if (manifest.astylarVersion !== packageJson.version) {
  fail(`Bundled references target ${manifest.astylarVersion}, package is ${packageJson.version}.`);
}
const destinations = new Set();
for (const source of manifest.sources ?? []) {
  if (destinations.has(source.destination)) fail(`Duplicate bundled destination: ${source.destination}`);
  destinations.add(source.destination);
  if (!await exists(path.join(skillDirectory, 'references', source.destination))) {
    fail(`Manifest destination does not exist: ${source.destination}`);
  }
  if (!/^[a-f0-9]{64}$/.test(source.sourceSha256 ?? '') ||
      !/^[a-f0-9]{64}$/.test(source.bundledSha256 ?? '')) {
    fail(`Manifest hashes are invalid for ${source.destination}.`);
  }
}

const publicApi = JSON.parse(await readText(path.join(skillDirectory, 'references', 'public-api.json')));
if (publicApi.astylarVersion !== packageJson.version || publicApi.packageRoot !== 'astylarui') {
  fail('Bundled public API metadata does not match the package root/version.');
}
const publicSymbols = new Set(publicApi.symbols.map((symbol) => symbol.name));
for (const symbol of [
  'ASTYLAR_PLUGIN_API_VERSION', 'ASTYLAR_PLUGIN_SURFACE_CONTEXT',
  'ASTYLAR_VERSION', 'Astylar', 'AstylarDocumentPreparationResult',
  'AstylarPluginElementRenderer', 'AstylarPluginRenderContext',
  'AstylarRenderOptions', 'AstylarSurface', 'AstylarSurfaceComponent',
  'DOMElement', 'SiteData', 'StyleRule', 'astylar', 'defineAstylarPlugin',
  'prepareAstylarDocument', 'provideAstylar', 'provideAstylarPlugin',
]) {
  if (!publicSymbols.has(symbol)) fail(`Required documented root export is missing: ${symbol}`);
}

const catalog = JSON.parse(await readText(path.join(skillDirectory, 'references', 'capabilities.json')));
const examples = JSON.parse(await readText(path.join(skillDirectory, 'references', 'translation-examples.json')));
const classifications = new Set(Object.keys(catalog.classifications ?? {}));
for (const classification of ['direct', 'compatible', 'different', 'unsupported', 'plugin']) {
  if (!classifications.has(classification)) fail(`Capability taxonomy is missing: ${classification}`);
}
const elementNames = catalogNames(catalog.elements.groups);
const styleNames = catalogNames(catalog.styleProperties.groups);
for (const example of examples.examples ?? []) {
  if (!classifications.has(example.classification)) {
    fail(`Translation ${example.id} has unknown classification ${example.classification}.`);
  }
  const siteData = example.astylar?.siteData;
  if (!siteData) continue;
  for (const element of collectElements(siteData.root)) {
    if (element === siteData.root || !element.type || element.type.includes(':')) continue;
    if (!elementNames.has(element.type)) {
      fail(`Translation ${example.id} uses unknown element ${element.type}.`);
    }
  }
  for (const rule of siteData.styles ?? []) {
    for (const property of Object.keys(rule)) {
      if (!styleNames.has(property)) {
        fail(`Translation ${example.id} uses unknown style property ${property}.`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `AstylarUI developer skill is valid: ${lineCount} SKILL.md lines, ` +
    `${manifest.sources.length} synchronized sources, ${publicApi.symbols.length} public exports, ` +
    `${examples.examples.length} verified translations.`,
  );
}
