// Bundles the cat script (src/browser and src/world) with esbuild, two ways:
// - for VS Code's window: browser/main.ts and what it imports, as one plain script wrapped in a function
//   so nothing leaks into VS Code's page. The build (npm run compile) writes it to
//   out/pixel-cat.js; the tests' smoke run bundles it in memory with the same options.
// - for Node (the simulation tests): the World and what drives it, as a module.
'use strict';

const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src'); // src/browser and src/world; the tests may pass a copy
const OUT = path.join(ROOT, 'out', 'pixel-cat.js');
const COMMON = { bundle: true, target: 'es2022', charset: 'utf8', logLevel: 'warning' };

const scriptOptions = (srcDir) => ({ ...COMMON, entryPoints: [path.join(srcDir, 'browser', 'main.ts')], format: 'iife' });

/** The script for VS Code's window, as text. */
async function bundle(srcDir = SRC) {
  const result = await esbuild.build({ ...scriptOptions(srcDir), write: false });
  return result.outputFiles[0].text;
}

// What the simulation tests use of the cat script.
const WORLD_API = `
export { World } from './world';
export { Driver, POLL_MS } from './driver';
export { Random } from './random';
export { layoutFromRects, PARTS } from './layout';
export { storageCatStore } from '../browser/cat-store';
export { Collection, FIRST_CATS } from './collection';
export * as config from './config';
`;

/** The World and what drives it, from `srcDir` (src or a copy), loaded as a module. */
async function loadWorld(srcDir = SRC) {
  const result = await esbuild.build({
    ...COMMON,
    stdin: { contents: WORLD_API, resolveDir: path.join(srcDir, 'world'), loader: 'ts', sourcefile: 'world-api.ts' },
    format: 'cjs',
    platform: 'node',
    write: false,
  });
  const module = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports);
  return module.exports;
}

module.exports = { bundle, loadWorld, SRC };

if (require.main === module) {
  esbuild.build({ ...scriptOptions(SRC), outfile: OUT }).catch(() => process.exit(1));
}
