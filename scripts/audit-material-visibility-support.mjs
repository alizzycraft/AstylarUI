import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const hash = value => createHash('sha256').update(value).digest('hex');
const parse = file => ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const sourceInterface = 'src/app/types/style-rule.ts';
const packedInterface = 'examples/material-showcase/node_modules/astylarui/dist/lib/app/types/style-rule.d.ts';
const interfaceNode = ast => ast.statements.find(n => ts.isInterfaceDeclaration(n) && n.name.text === 'StyleRule');
const canonicalInterface = file => {
  const ast = parse(file), node = interfaceNode(ast); assert.ok(node);
  return ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed }).printNode(ts.EmitHint.Unspecified, node, ast);
};
const declaration = (ast, name) => ast.statements.filter(ts.isVariableStatement)
  .flatMap(n => [...n.declarationList.declarations]).find(n => n.name.getText(ast) === name);

export function probePublicVisibilityProperty(property) {
  const file = path.resolve('examples/material-showcase/visibility-public-contract-probe.ts');
  const text = `import type { StyleRule } from 'astylarui';\nconst rule: StyleRule = { selector: '#probe', ${property}: 'hidden' };\nvoid rule;\n`;
  const options = { noEmit: true, strict: true, skipLibCheck: true,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler };
  const host = ts.createCompilerHost(options), original = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion, ...rest) => path.resolve(name) === file
    ? ts.createSourceFile(file, text, languageVersion, true) : original(name, languageVersion, ...rest);
  const program = ts.createProgram([file], options, host);
  const variable = program.getSourceFile(file).statements[1].declarationList.declarations[0];
  const type = program.getTypeChecker().getTypeAtLocation(variable.name);
  assert.equal(type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown), 0, 'package type did not resolve');
  const properties = type.getProperties().map(symbol => symbol.name);
  assert.ok(properties.includes('selector') && properties.includes('overflow') && properties.length > 60);
  return { source: text, resolvedStylePropertyCount: properties.length, diagnostics: ts.getPreEmitDiagnostics(program).map(d => ({
    code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
    file: d.file ? path.relative(process.cwd(), d.file.fileName).replaceAll('\\', '/') : null,
  })) };
}

export function collectVisibilitySupport() {
  // A stale installed package must not stand in for the current public contract.
  assert.equal(canonicalInterface(packedInterface), canonicalInterface(sourceInterface));
  const style = parse(sourceInterface), node = interfaceNode(style);
  assert.ok(!node.members.some(ts.isIndexSignatureDeclaration), 'open interface requires a different support test');
  const fields = node.members.map(n => n.name?.getText(style));
  assert.ok(!fields.includes('visibility'));
  const diagnosticsFile = 'src/lib/astylar-diagnostics.ts', diagnosticsAst = parse(diagnosticsFile);
  const supported = declaration(diagnosticsAst, 'styleProperties').initializer.arguments[0];
  assert.ok(ts.isArrayLiteralExpression(supported) && supported.elements.every(ts.isStringLiteral));
  assert.ok(!supported.elements.some(n => n.text === 'visibility'));
  const resolverFile = 'src/lib/astylar-document-style-resolver.ts', resolverAst = parse(resolverFile);
  const mappings = declaration(resolverAst, 'COMPUTED_TO_ASTYLAR').initializer.arguments[0];
  assert.ok(ts.isArrayLiteralExpression(mappings));
  assert.ok(mappings.elements.every(n => ts.isArrayLiteralExpression(n) && n.elements.every(ts.isStringLiteral)));
  assert.ok(!mappings.elements.some(n => n.elements.some(v => v.text === 'visibility')));
  const unsupported = probePublicVisibilityProperty('visibility'), control = probePublicVisibilityProperty('overflow');
  assert.equal(control.diagnostics.length, 0, 'supported-property control failed');
  assert.equal(unsupported.diagnostics.length, 1);
  assert.equal(unsupported.diagnostics[0].code, 2353);
  assert.match(unsupported.diagnostics[0].message, /visibility.*does not exist in type 'StyleRule'/);
  return { schemaVersion: 1, classification: 'documented-limitation',
    finding: 'CSS visibility is absent from the current typed core style contract, validation allow-list and loaded-CSS mapping.',
    owner: 'core style support, inheritance, paint and interaction semantics',
    sources: [sourceInterface, packedInterface, diagnosticsFile, resolverFile].map(file => ({ file,
      sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    publicPackageImport: 'astylarui', packedAndCurrentStyleInterfacesEqual: true,
    unsupported, control, canonicalAttributionChanged: false,
    renderingTested: false, missingSnackbarCauseProven: false,
    limitation: 'This proves a public input-support gap, not that omitted visible values cause a raster defect. State-owner substitutions and runtime behavior require separate proof.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const report = collectVisibilitySupport();
  writeFileSync('docs/material-visibility-support.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
