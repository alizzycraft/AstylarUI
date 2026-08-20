import { access, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillDirectory = path.resolve(scriptDirectory, '..');
const skillsDirectory = path.resolve(skillDirectory, '..');
const developerDirectory = path.join(skillsDirectory, 'astylarui-developer');
const repositoryRoot = path.resolve(skillsDirectory, '..', '..');
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

function frontmatter(content, expectedName) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    fail(`${expectedName}/SKILL.md must begin with YAML frontmatter.`);
    return '';
  }
  const keys = [...match[1].matchAll(/^([A-Za-z][\w-]*):/gm)]
    .map((entry) => entry[1]);
  if (keys.join(',') !== 'name,description') {
    fail(`${expectedName} frontmatter must contain only name and description.`);
  }
  if (!new RegExp(`^name:\\s*${expectedName}\\s*$`, 'm').test(match[1])) {
    fail(`${expectedName} has the wrong skill name.`);
  }
  return match[1].match(/^description:\s*(.+)$/m)?.[1] ?? '';
}

function requireTerms(label, content, terms) {
  const normalized = content.replace(/\s+/g, ' ').toLowerCase();
  for (const term of terms) {
    if (!normalized.includes(term.replace(/\s+/g, ' ').toLowerCase())) {
      fail(`${label} is missing required term: ${term}`);
    }
  }
}

async function validateLinks(baseDirectory, files) {
  for (const filePath of files.filter((file) => file.endsWith('.md'))) {
    const markdown = await readText(filePath);
    for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].trim().replace(/^<|>$/g, '').split('#')[0];
      if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
      const resolved = path.resolve(path.dirname(filePath), target);
      if (!await exists(resolved)) {
        fail(`${path.relative(baseDirectory, filePath)} has missing link target: ${match[1]}`);
      }
    }
  }
}

const maintainerSkillPath = path.join(skillDirectory, 'SKILL.md');
const maintainerOpenaiPath = path.join(skillDirectory, 'agents', 'openai.yaml');
const developerSkillPath = path.join(developerDirectory, 'SKILL.md');
const developerOpenaiPath = path.join(developerDirectory, 'agents', 'openai.yaml');
const maintainerSkill = await readText(maintainerSkillPath);
const maintainerOpenai = await readText(maintainerOpenaiPath);
const developerSkill = await readText(developerSkillPath);
const developerOpenai = await readText(developerOpenaiPath);
const maintainerFiles = await collectFiles(skillDirectory);
const developerFiles = await collectFiles(developerDirectory);

const maintainerDescription = frontmatter(maintainerSkill, 'astylarui-maintainer');
requireTerms('Maintainer description', maintainerDescription, [
  'Diagnose', 'modify', 'test', 'AstylarUI', 'renderer internals', 'document validation',
  'cascade', 'layout', 'typography', 'paint', 'interaction', 'semantics',
  'reconciliation', 'Angular', 'Babylon', 'plugins', 'public API', 'packaging',
  'parity', 'astylarui-developer', 'Do not use', 'consuming-application',
]);

const developerDescription = frontmatter(developerSkill, 'astylarui-developer');
requireTerms('Developer description', developerDescription, [
  'Build', 'public API', 'Do not use', 'renderer internals', 'parity harness',
]);

for (const expected of [
  'display_name: "AstylarUI Maintainer"',
  'short_description: "Maintain and improve AstylarUI core"',
  'default_prompt: "Use $astylarui-maintainer',
]) {
  if (!maintainerOpenai.includes(expected)) fail(`Maintainer openai.yaml is missing: ${expected}`);
}
for (const [label, openai] of [
  ['Maintainer', maintainerOpenai],
  ['Developer', developerOpenai],
]) {
  const shortDescription = openai.match(/short_description:\s*"([^"]+)"/)?.[1] ?? '';
  if (shortDescription.length < 25 || shortDescription.length > 64) {
    fail(`${label} short_description must contain 25-64 characters.`);
  }
}

const unfinishedPattern = new RegExp(
  ['\\bTO', 'DO\\b|\\[TO', 'DO|PLACE', 'HOLDER CONTENT'].join(''),
  'i',
);
for (const [base, files] of [
  [skillDirectory, maintainerFiles],
  [developerDirectory, developerFiles],
]) {
  for (const filePath of files.filter((file) => /\.(?:md|json|mjs|ts|html|yaml)$/.test(file))) {
    const content = await readText(filePath);
    if (unfinishedPattern.test(content)) {
      fail(`${path.relative(base, filePath)} contains an unfinished marker.`);
    }
  }
  await validateLinks(base, files);
}

if (maintainerSkill.split(/\r?\n/).length > 500) {
  fail('Maintainer SKILL.md exceeds the 500-line progressive-disclosure limit.');
}
for (const reference of [
  'architecture.md', 'subsystems.md', 'maintenance-workflow.md', 'application-skill.md',
  'public-api-plugins.md', 'lifecycle-resources.md', 'parity-release.md',
]) {
  if (!await exists(path.join(skillDirectory, 'references', reference))) {
    fail(`Missing maintainer reference: ${reference}`);
  }
  if (!maintainerSkill.includes(`references/${reference}`)) {
    fail(`Maintainer SKILL.md does not directly link ${reference}.`);
  }
}

const allMaintainerMarkdown = (await Promise.all(
  maintainerFiles.filter((file) => file.endsWith('.md')).map(readText),
)).join('\n');
requireTerms('Maintainer workflow', allMaintainerMarkdown, [
  'application-authoring error', 'intentional difference', 'unsupported behavior',
  'plugin opportunity', 'stale application guidance', 'public API defect', 'core defect',
  'HTML/CSS', 'SiteData', 'failing', 'general', 'surface isolation', 'SSR',
  'settlement', 'cleanup', 'capabilities.json', 'translation', 'consumer:check',
  'parity:check', 'git diff --check',
  'ASTYLAR_PLUGIN_API_VERSION', 'EnvironmentInjector', 'AbortSignal',
  'minimumMedianSsim', 'fresh packed installation',
]);
requireTerms('Maintainer safeguards', allMaintainerMarkdown, [
  'Never weaken a threshold', 'fixture-name', 'source-tree or package deep imports',
  'Do not move mutable renderer state to root providers',
]);

requireTerms('Developer handoff', developerSkill, [
  'astylarui-maintainer', 'smallest public', 'equivalent HTML/CSS',
  'expected versus actual', 'compatibility catalog',
]);
requireTerms('Application-skill cooperation', allMaintainerMarkdown, [
  'skill:developer:references:sync', 'canonical', 'regenerate', 'both skills',
  'package-root', 'ordinary application request',
]);

const packageJson = JSON.parse(await readText(path.join(repositoryRoot, 'package.json')));
for (const scriptName of [
  'test', 'build:lib', 'build', 'consumer:check', 'capabilities:check', 'examples:check',
  'parity:check', 'skill:developer:references:sync',
  'skill:developer:references:check', 'skill:developer:check',
  'skill:maintainer:check', 'skill:check',
]) {
  if (!packageJson.scripts?.[scriptName]) fail(`Missing package script: ${scriptName}`);
}

for (const relativePath of [
  'src/lib/index.ts', 'src/lib/astylar.ts', 'src/lib/astylar-surface-providers.ts',
  'src/lib/astylar-render-session.ts', 'src/lib/astylar-scene-resources.ts',
  'src/lib/astylar-plugin.ts', 'src/lib/astylar-plugin-host.ts',
  'src/lib/astylar-visual-reconciler.ts',
  'src/app/services/dom/renderer.service.ts',
  'src/app/services/dom/style.service.ts',
  'src/app/services/dom/elements/element-dimension.service.ts',
  'src/app/services/dom/elements/flex.service.ts',
  'src/app/services/dom/elements/grid.service.ts',
  'src/app/services/text/text-rendering.service.ts',
  'src/parity/parity.types.ts', 'src/parity/fixtures/index.ts',
  'public/parity/fixtures.json', 'tests/parity/run-parity.mjs',
  'docs/compatibility/html-css.md', 'docs/compatibility/capabilities.json',
  'docs/compatibility/examples/manifest.json', 'docs/plugins.md',
  'docs/reconciliation.md', 'examples/angular-consumer/src/app/app.ts',
  '.agents/skills/astylarui-developer/scripts/sync-references.mjs',
  '.agents/skills/astylarui-developer/scripts/validate-skill.mjs',
]) {
  if (!await exists(path.join(repositoryRoot, relativePath))) {
    fail(`Missing referenced repository path: ${relativePath}`);
  }
}

for (const filePath of developerFiles.filter((file) => /\.(?:ts|md|html)$/.test(file))) {
  const content = await readText(filePath);
  if (/from\s+['"]astylarui\//.test(content)) {
    fail(`Developer application evidence uses a forbidden deep import: ${path.relative(developerDirectory, filePath)}`);
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `AstylarUI maintainer skill is valid: ${maintainerSkill.split(/\r?\n/).length} SKILL.md lines, ` +
    `${maintainerFiles.filter((file) => file.endsWith('.md')).length - 1} references, ` +
    'developer handoff and repository paths verified.',
  );
}
