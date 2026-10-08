// Read-only replay of the three application component stylesheet outputs.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const workspace = path.resolve('examples/material-showcase');
const browser = path.join(workspace, 'dist/material-showcase/browser');
const build = path.join(workspace, 'node_modules/@angular/build/src');
const ts = require(path.join(workspace, 'node_modules/typescript'));
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync('artifacts/material-parity/current-full-20261005/checkpoint/manifest.json'));
function authenticated(file) {
  const bytes = fs.readFileSync(path.join(browser, file));
  const receipt = manifest.provenance.browserFiles.find(row => row.file === file || row.file.endsWith('/' + file));
  if (!receipt || receipt.sha256 !== hash(bytes)) throw Error('Checkpoint mismatch: ' + file);
  return bytes;
}
async function main() {
  const targets = require(build + '/tools/esbuild/utils').transformSupportedBrowsersToTargets(
    require(build + '/utils/supported-browsers').getSupportedBrowsers(workspace, { warn() {} }));
  const { ComponentStylesheetBundler } = require(build + '/tools/esbuild/angular/component-stylesheets');
  const bundler = new ComponentStylesheetBundler({ workspaceRoot: workspace, optimization: false,
    inlineFonts: false, sourcemap: true, sourcesContent: true, target: targets,
    outputNames: { bundles: '[name]', media: 'media/[name]' },
    cacheOptions: { enabled: false, path: workspace, basePath: workspace } }, 'scss', false);
  const { encapsulateStyle } = await import(pathToFileURL(workspace + '/node_modules/@angular/compiler/fesm2022/compiler.mjs').href);
  try {
    for (const [key, name] of [['astylar', 'AstylarShowcaseComponent'], ['comparison', 'ComparisonComponent'], ['reference', 'ReferenceComponent']]) {
      const filename = path.join(workspace, 'src/app/' + key + '.component.ts');
      const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
      const authored = [];
      function visitSource(node) {
        if (ts.isCallExpression(node) && node.expression.getText(source) === 'Component' && ts.isObjectLiteralExpression(node.arguments[0])) {
          const styles = node.arguments[0].properties.find(property => property.name?.getText(source) === 'styles');
          if (styles && ts.isArrayLiteralExpression(styles.initializer)) authored.push(...styles.initializer.elements.map(value => value.text));
        }
        ts.forEachChild(node, visitSource);
      }
      visitSource(source);
      const map = JSON.parse(authenticated(key + '.component.css.map'));
      if (authored.length !== 1 || map.sourcesContent.length !== 1 || authored[0] !== map.sourcesContent[0]) throw Error('Authored mismatch: ' + key);
      const captured = [];
      for (const file of fs.readdirSync(browser).filter(file => file.endsWith('.js'))) {
        if (!fs.readFileSync(path.join(browser, file), 'utf8').includes('type: _' + name)) continue;
        const ast = ts.createSourceFile(file, authenticated(file).toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
        function visit(node) {
          if (ts.isCallExpression(node) && node.expression.getText(ast).endsWith('defineComponent') && node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
            const properties = node.arguments[0].properties;
            const type = properties.find(property => property.name?.getText(ast) === 'type');
            const styles = properties.find(property => property.name?.getText(ast) === 'styles');
            if (type?.initializer.getText(ast) === '_' + name && styles && ts.isArrayLiteralExpression(styles.initializer)) captured.push(...styles.initializer.elements.map(value => value.text));
          }
          ts.forEachChild(node, visit);
        }
        visit(ast);
      }
      if (captured.length !== 1) throw Error('Captured multiplicity: ' + key);
      const result = await bundler.bundleInline(authored[0], filename);
      if (result.errors) throw Error(JSON.stringify(result.errors));
      const output = encapsulateStyle(result.contents);
      console.log(JSON.stringify({ key, authoredSha256: hash(authored[0]), compiledLength: output.length,
        capturedLength: captured[0].length, compiledSha256: hash(output), capturedSha256: hash(captured[0]), equal: output === captured[0], warnings: result.warnings?.length || 0 }));
      if (output !== captured[0]) process.exitCode = 1;
    }
  } finally {
    await bundler.dispose();
    await require(build + '/tools/esbuild/stylesheets/sass-language').shutdownSassWorkerPool();
    require(workspace + '/node_modules/esbuild').stop();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
