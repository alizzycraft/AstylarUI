import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const skillDirectory = path.resolve(scriptDirectory, '..');
const repositoryRoot = path.resolve(skillDirectory, '..', '..', '..');
const referencesDirectory = path.join(skillDirectory, 'references');

const sources = Object.freeze([
  {
    source: 'docs/compatibility/html-css.md',
    destination: 'html-css.md',
    transform: 'portable-html-css-links',
  },
  {
    source: 'docs/compatibility/capabilities.json',
    destination: 'capabilities.json',
  },
  {
    source: 'docs/compatibility/examples/manifest.json',
    destination: 'translation-examples.json',
  },
  {
    source: 'docs/plugins.md',
    destination: 'plugins.md',
    transform: 'portable-plugin-links',
  },
  {
    source: 'docs/reconciliation.md',
    destination: 'reconciliation.md',
  },
  {
    source: 'examples/angular-consumer/src/app/app.config.ts',
    destination: 'consumer-app.config.ts',
  },
  {
    source: 'examples/angular-consumer/src/app/app.ts',
    destination: 'consumer-app.ts',
  },
  {
    source: 'examples/angular-consumer/src/app/app.html',
    destination: 'consumer-app.html',
  },
  {
    source: 'examples/angular-consumer/src/app/consumer-badge.plugin.ts',
    destination: 'consumer-badge.plugin.ts',
  },
  {
    source: 'examples/angular-consumer/src/app/app.browser.spec.ts',
    destination: 'consumer-app.browser.spec.ts',
  },
  {
    source: 'src/lib/index.ts',
    destination: 'public-api.json',
    transform: 'public-root-exports',
  },
]);

function publicRootExports(content, { astylarVersion }) {
  const symbols = new Map();
  const exportBlocks = /export\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+["'][^"']+["'];/g;
  for (const match of content.matchAll(exportBlocks)) {
    const blockKind = match[1] ? 'type' : 'runtime';
    const declarations = match[2]
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .split(',');
    for (const declaration of declarations) {
      const cleaned = declaration.trim().replace(/^type\s+/, '');
      if (!cleaned) continue;
      const parts = cleaned.split(/\s+as\s+/);
      const name = parts.at(-1)?.trim();
      if (!name) continue;
      const kind = /^type\s+/.test(declaration.trim()) ? 'type' : blockKind;
      if (symbols.get(name) !== 'runtime') symbols.set(name, kind);
    }
  }

  for (const match of content.matchAll(/export\s+(?:declare\s+)?(const|class|function)\s+([A-Za-z_$][\w$]*)/g)) {
    symbols.set(match[2], 'runtime');
  }

  return `${JSON.stringify({
    schema: 'astylarui-public-root-exports',
    version: 1,
    astylarVersion,
    packageRoot: 'astylarui',
    symbols: [...symbols]
      .map(([name, kind]) => ({ name, kind }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  }, null, 2)}\n`;
}

const transforms = Object.freeze({
  'portable-html-css-links': (content) => content
    .replace('(examples/README.md)', '(translation-examples.json)')
    .replace('(../reconciliation.md)', '(reconciliation.md)')
    .replace('(../plugins.md)', '(plugins.md)'),
  'portable-plugin-links': (content) => content.replace(
    '(../examples/angular-consumer/src/app/consumer-badge.plugin.ts)',
    '(consumer-badge.plugin.ts)',
  ),
  'public-root-exports': publicRootExports,
});

function normalize(content) {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function digest(content) {
  return createHash('sha256').update(normalize(content), 'utf8').digest('hex');
}

async function readText(filePath) {
  return normalize(await readFile(filePath, 'utf8'));
}

async function buildExpectedState() {
  const packageJson = JSON.parse(
    await readText(path.join(repositoryRoot, 'package.json')),
  );
  const catalog = JSON.parse(
    await readText(path.join(repositoryRoot, 'docs/compatibility/capabilities.json')),
  );

  if (packageJson.version !== catalog.astylarVersion) {
    throw new Error(
      `Package version ${packageJson.version} does not match capability catalog version ${catalog.astylarVersion}.`,
    );
  }

  const entries = [];
  for (const mapping of sources) {
    const sourcePath = path.join(repositoryRoot, mapping.source);
    const sourceContent = await readText(sourcePath);
    const transform = mapping.transform ? transforms[mapping.transform] : undefined;
    if (mapping.transform && !transform) {
      throw new Error(`Unknown reference transform: ${mapping.transform}`);
    }
    const content = transform
      ? transform(sourceContent, { astylarVersion: packageJson.version })
      : sourceContent;
    entries.push({
      ...mapping,
      content,
      sourceSha256: digest(sourceContent),
      bundledSha256: digest(content),
    });
  }

  const manifest = {
    schema: 'astylarui-skill-reference-sources',
    version: 1,
    astylarVersion: packageJson.version,
    sources: entries.map(({ source, destination, transform, sourceSha256, bundledSha256 }) => ({
      source,
      destination,
      ...(transform ? { transform } : {}),
      sourceSha256,
      bundledSha256,
    })),
  };

  return { entries, manifest: `${JSON.stringify(manifest, null, 2)}\n` };
}

async function writeReferences(expected) {
  await mkdir(referencesDirectory, { recursive: true });
  for (const entry of expected.entries) {
    await writeFile(
      path.join(referencesDirectory, entry.destination),
      entry.content,
      'utf8',
    );
  }
  await writeFile(
    path.join(referencesDirectory, 'source-manifest.json'),
    expected.manifest,
    'utf8',
  );
  console.log(
    `Synchronized ${expected.entries.length} AstylarUI ${expected.manifest ? JSON.parse(expected.manifest).astylarVersion : ''} skill references.`,
  );
}

async function checkReferences(expected) {
  const failures = [];
  for (const entry of expected.entries) {
    const destinationPath = path.join(referencesDirectory, entry.destination);
    let actual;
    try {
      actual = await readText(destinationPath);
    } catch {
      failures.push(`Missing bundled reference: ${entry.destination}`);
      continue;
    }
    if (actual !== entry.content) {
      failures.push(
        `Stale bundled reference: ${entry.destination} (expected ${entry.bundledSha256}, received ${digest(actual)})`,
      );
    }
  }

  const manifestPath = path.join(referencesDirectory, 'source-manifest.json');
  try {
    const actualManifest = await readText(manifestPath);
    if (actualManifest !== expected.manifest) {
      failures.push('Stale bundled reference manifest: source-manifest.json');
    }
  } catch {
    failures.push('Missing bundled reference manifest: source-manifest.json');
  }

  if (failures.length > 0) {
    throw new Error(
      `${failures.join('\n')}\nRun npm run skill:references:sync to refresh the checked copies.`,
    );
  }

  console.log(
    `Skill references are current: ${expected.entries.length} sources for AstylarUI ${JSON.parse(expected.manifest).astylarVersion}.`,
  );
}

const command = process.argv[2] ?? '--check';
if (!['--check', '--write'].includes(command)) {
  throw new Error('Usage: node sync-references.mjs [--check|--write]');
}

const expected = await buildExpectedState();
if (command === '--write') {
  await writeReferences(expected);
} else {
  await checkReferences(expected);
}
