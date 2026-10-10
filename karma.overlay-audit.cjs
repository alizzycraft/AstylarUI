// Diagnostic loading only: keep the installed Babylon module graph unbundled.
const path = require('node:path');
module.exports = config => {
  const core = path.join(__dirname, 'node_modules/@babylonjs/core').replaceAll('\\', '/');
  function nativeModules(files) {
    files.push({ pattern: `${core}/**/*.js`, included: false, served: true, watched: false });
  }
  nativeModules.$inject = ['config.files'];
  config.set({
    frameworks: ['jasmine', 'overlay-native-modules'],
    plugins: [require('karma-jasmine'), require('karma-chrome-launcher'), {
      'framework:overlay-native-modules': ['factory', nativeModules],
    }],
    proxies: { '/overlay-babylon/': `/absolute${core}/` },
    customContextFile: path.join(__dirname, 'tests/material-parity/overlay-audit-context.html'),
    browserNoActivityTimeout: 120000,
  });
};
