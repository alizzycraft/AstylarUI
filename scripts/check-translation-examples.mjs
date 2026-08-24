import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const examples = JSON.parse(fs.readFileSync(
  path.join(root, 'docs', 'compatibility', 'examples', 'manifest.json'),
  'utf8',
));
const catalog = JSON.parse(fs.readFileSync(
  path.join(root, 'docs', 'compatibility', 'capabilities.json'),
  'utf8',
));
const failures = [];
const supportedElements = new Set(catalog.elements.groups.flatMap((group) => group.names));
const supportedFields = new Set(catalog.domFields.groups.flatMap((group) => group.names));
const supportedStyles = new Set(catalog.styleProperties.groups.flatMap((group) => group.names));
const classifications = new Set(Object.keys(catalog.classifications));
const parityManifestIds = new Set(JSON.parse(fs.readFileSync(
  path.join(root, 'public', 'parity', 'fixtures.json'),
  'utf8',
)).map((fixture) => fixture.id));
const parityIndex = fs.readFileSync(
  path.join(root, 'src', 'parity', 'fixtures', 'index.ts'),
  'utf8',
);
const requiredTopics = new Set([
  'semantic-structure', 'box-model', 'responsive-layout', 'typography',
  'forms', 'modal-stacking', 'async-images', 'three-dimensional-output',
  'unsupported-web-feature', 'plugin-capability', 'loaded-global-css',
]);

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function verifySiteData(example, siteData) {
  if (!siteData || !Array.isArray(siteData.styles) || !Array.isArray(siteData.root?.children)) {
    failures.push(`${example.id}: inline Astylar source must contain styles and root.children arrays.`);
    return;
  }
  const pluginIds = new Set((siteData.plugins ?? []).map((requirement) => requirement.id));
  const visit = (element, location) => {
    const namespaced = typeof element.type === 'string' && element.type.includes(':');
    const pluginId = namespaced ? element.type.split(':', 1)[0] : undefined;
    if (!supportedElements.has(element.type) && !(pluginId && pluginIds.has(pluginId))) {
      failures.push(`${example.id}: unsupported inline element ${element.type} at ${location}.`);
    }
    for (const key of Object.keys(element)) {
      if (!supportedFields.has(key)) failures.push(`${example.id}: unknown DOMElement field ${key} at ${location}.`);
    }
    (element.children ?? []).forEach((child, index) => visit(child, `${location}.children[${index}]`));
  };
  siteData.root.children.forEach((element, index) => visit(element, `root.children[${index}]`));
  siteData.styles.forEach((style, index) => {
    for (const key of Object.keys(style)) {
      if (!supportedStyles.has(key)) failures.push(`${example.id}: unknown StyleRule field ${key} at styles[${index}].`);
    }
    for (const extensionId of Object.keys(style.extensions ?? {})) {
      const pluginId = extensionId.split(':', 1)[0];
      if (!pluginIds.has(pluginId)) {
        failures.push(`${example.id}: extension ${extensionId} lacks a persisted plugin requirement.`);
      }
    }
  });
}

if (examples.schema !== 'astylarui-translation-examples' || examples.version !== 1) {
  failures.push('Translation manifest must use astylarui-translation-examples v1.');
}
if (!Array.isArray(examples.examples) || examples.examples.length < 6 || examples.examples.length > 12) {
  failures.push('Translation manifest must contain six to twelve examples.');
}

const ids = new Set();
const topics = new Set();
for (const example of examples.examples ?? []) {
  if (ids.has(example.id)) failures.push(`Duplicate example id ${example.id}.`);
  ids.add(example.id);
  topics.add(example.topic);
  if (!classifications.has(example.classification)) {
    failures.push(`${example.id}: invalid classification ${example.classification}.`);
  }
  if (!Array.isArray(example.directMappings) || example.directMappings.length === 0) {
    failures.push(`${example.id}: directMappings must explain at least one transfer.`);
  }
  if (!Array.isArray(example.importantDifferences) || example.importantDifferences.length === 0) {
    failures.push(`${example.id}: importantDifferences must record at least one boundary.`);
  }
  if (!Array.isArray(example.evidence) || example.evidence.length === 0) {
    failures.push(`${example.id}: evidence is required.`);
  }

  if (example.fixtureSource) {
    if (!exists(example.fixtureSource)) {
      failures.push(`${example.id}: missing fixture source ${example.fixtureSource}.`);
    } else {
      const source = fs.readFileSync(path.join(root, example.fixtureSource), 'utf8');
      for (const pattern of [
        /\breference\s*:\s*{/, /\bhtml\s*:/, /\bcss\s*:/, /\bsiteData\s*:/,
      ]) {
        if (!pattern.test(source)) failures.push(`${example.id}: fixture lacks ${pattern}.`);
      }
      if (!new RegExp(`\\bid\\s*:\\s*['\"]${example.fixtureId}['\"]`).test(source)) {
        failures.push(`${example.id}: fixture id/source mismatch.`);
      }
      const importStem = path.basename(example.fixtureSource, '.ts');
      if (!parityIndex.includes(`'./${importStem}'`)) {
        failures.push(`${example.id}: fixture source is not registered in the executable fixture index.`);
      }
      if (!parityManifestIds.has(example.fixtureId)) {
        failures.push(`${example.id}: fixture id is not registered in the browser parity manifest.`);
      }
    }
  } else {
    if (!example.web?.html?.trim() || !example.web?.css?.trim()) {
      failures.push(`${example.id}: inline web source requires HTML and CSS.`);
    }
    verifySiteData(example, example.astylar?.siteData);
  }

  for (const evidence of example.evidence ?? []) {
    const relativePath = evidence.startsWith('file:') ? evidence.slice(5) : undefined;
    if (!relativePath || !exists(relativePath)) failures.push(`${example.id}: missing evidence ${evidence}.`);
  }
}

for (const topic of requiredTopics) {
  if (!topics.has(topic)) failures.push(`Missing required translation topic ${topic}.`);
}
for (const topic of topics) {
  if (!requiredTopics.has(topic)) failures.push(`Unknown translation topic ${topic}.`);
}

const unsupported = examples.examples?.find((example) => example.topic === 'unsupported-web-feature');
if (unsupported?.classification !== 'unsupported' || !unsupported.unsupportedWebCapabilities?.length) {
  failures.push('Unsupported example must identify unsupported web capabilities and classification.');
}
const plugin = examples.examples?.find((example) => example.topic === 'plugin-capability');
if (plugin?.classification !== 'plugin' || !plugin.astylar?.siteData?.plugins?.length) {
  failures.push('Plugin example must be classified plugin and persist its requirement.');
}

if (failures.length) {
  console.error('AstylarUI translation examples are stale or invalid:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  const fixtureCount = examples.examples.filter((example) => example.fixtureSource).length;
  console.log(
    `Translation examples are current: ${examples.examples.length} pairs ` +
    `(${fixtureCount} parity-backed, ${examples.examples.length - fixtureCount} focused inline).`,
  );
}
