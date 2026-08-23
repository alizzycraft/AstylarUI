import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const root = process.cwd();
const catalogPath = path.join(root, 'docs', 'compatibility', 'capabilities.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const failures = [];

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const normalizedSource = (relativePath) => read(relativePath)
  .replace(/\r\n/g, '\n')
  .split('\n')
  .map((line) => line.replace(/[ \t]+$/, ''))
  .join('\n')
  .trimEnd() + '\n';
const fingerprint = (relativePath) => crypto
  .createHash('sha256')
  .update(normalizedSource(relativePath))
  .digest('hex');

function sourceFile(relativePath) {
  return ts.createSourceFile(
    relativePath,
    read(relativePath),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function interfaceProperties(relativePath, interfaceName) {
  const source = sourceFile(relativePath);
  const declaration = source.statements.find((statement) =>
    ts.isInterfaceDeclaration(statement) && statement.name.text === interfaceName);
  if (!declaration) throw new Error(`Missing interface ${interfaceName} in ${relativePath}.`);
  return declaration.members
    .filter(ts.isPropertySignature)
    .map((member) => member.name.getText(source).replace(/^['"]|['"]$/g, ''));
}

function stringLiteralsInVariable(relativePath, variableName) {
  const source = sourceFile(relativePath);
  let initializer;
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const declaration = statement.declarationList.declarations.find(
      (candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === variableName,
    );
    if (declaration) initializer = declaration.initializer;
  }
  if (!initializer) throw new Error(`Missing variable ${variableName} in ${relativePath}.`);
  const values = [];
  const visit = (node) => {
    if (ts.isStringLiteral(node)) values.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(initializer);
  return values;
}

function flatten(groups) {
  return groups.flatMap((group) => group.names);
}

function compareSet(label, expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = [...expectedSet].filter((value) => !actualSet.has(value));
  const extra = [...actualSet].filter((value) => !expectedSet.has(value));
  const duplicates = actual.filter((value, index) => actual.indexOf(value) !== index);
  if (missing.length || extra.length || duplicates.length) {
    failures.push(`${label}: missing=[${missing}] extra=[${extra}] duplicates=[${[...new Set(duplicates)]}]`);
  }
}

const classifications = new Set(['direct', 'compatible', 'different', 'unsupported', 'plugin']);
for (const [sectionName, groups] of [
  ['elements', catalog.elements.groups],
  ['domFields', catalog.domFields.groups],
  ['styleProperties', catalog.styleProperties.groups],
]) {
  for (const group of groups) {
    if (!classifications.has(group.classification)) {
      failures.push(`${sectionName}.${group.id} has invalid classification ${group.classification}.`);
    }
    if (!Array.isArray(group.names) || group.names.length === 0) {
      failures.push(`${sectionName}.${group.id} must contain names.`);
    }
    if (!Array.isArray(group.evidence) || group.evidence.length === 0) {
      failures.push(`${sectionName}.${group.id} must contain evidence.`);
    }
  }
}

compareSet(
  'core element registry',
  stringLiteralsInVariable('src/lib/astylar-core-capabilities.ts', 'ASTYLAR_CORE_ELEMENT_TYPES'),
  flatten(catalog.elements.groups),
);
compareSet(
  'DOMElement public fields',
  interfaceProperties('src/app/types/dom-element.ts', 'DOMElement'),
  flatten(catalog.domFields.groups),
);
compareSet(
  'StyleRule public fields',
  interfaceProperties('src/app/types/style-rule.ts', 'StyleRule'),
  flatten(catalog.styleProperties.groups),
);

for (const source of catalog.freshness.authoritativeSources) {
  if (!fs.existsSync(path.join(root, source.path))) {
    failures.push(`Authoritative source does not exist: ${source.path}.`);
    continue;
  }
  const actual = fingerprint(source.path);
  if (source.sha256 !== actual) {
    failures.push(`Stale source fingerprint for ${source.path}: expected ${source.sha256}, actual ${actual}.`);
  }
}

const fixtureIds = new Set();
for (const filename of fs.readdirSync(path.join(root, 'src', 'parity', 'fixtures'))) {
  if (!filename.endsWith('.fixture.ts')) continue;
  const contents = read(path.join('src', 'parity', 'fixtures', filename));
  for (const match of contents.matchAll(/\bid:\s*['"]([^'"]+)['"]/g)) fixtureIds.add(match[1]);
}

const evidence = new Set();
const collectEvidence = (value) => {
  if (Array.isArray(value)) {
    for (const item of value) collectEvidence(item);
  } else if (value && typeof value === 'object') {
    if (Array.isArray(value.evidence)) value.evidence.forEach((item) => evidence.add(item));
    Object.values(value).forEach(collectEvidence);
  }
};
collectEvidence(catalog);
for (const item of evidence) {
  if (item.startsWith('fixture:')) {
    const fixtureId = item.slice('fixture:'.length);
    if (!fixtureIds.has(fixtureId)) failures.push(`Unknown parity evidence: ${item}.`);
  } else if (item.startsWith('file:')) {
    const relativePath = item.slice('file:'.length);
    if (!fs.existsSync(path.join(root, relativePath))) failures.push(`Missing file evidence: ${item}.`);
  } else {
    failures.push(`Evidence must use fixture: or file: prefix: ${item}.`);
  }
}

if (catalog.version !== 1 || catalog.schema !== 'astylarui-capabilities') {
  failures.push('Catalog schema/version is not astylarui-capabilities v1.');
}
if (catalog.unsupported.elements.length === 0 || catalog.unsupported.css.length === 0) {
  failures.push('Catalog must explicitly record unsupported HTML and CSS capabilities.');
}

if (failures.length) {
  console.error('AstylarUI capability catalog is stale or invalid:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Capability catalog is current: ${flatten(catalog.elements.groups).length} elements, ` +
    `${flatten(catalog.styleProperties.groups).length} style fields, ` +
    `${flatten(catalog.domFields.groups).length} DOM fields, ${evidence.size} evidence references.`,
  );
}
