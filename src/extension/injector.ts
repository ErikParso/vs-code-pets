import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Extensions can't draw outside their own webviews, so the cat gets into VS Code's window
// by adding one <script> tag to the workbench page. The script file sits next to the page,
// which keeps it inside the page's own origin and CSP.

const PAGES = [
  'vs/code/electron-browser/workbench/workbench.html',
  'vs/code/electron-sandbox/workbench/workbench.html',
];
const SCRIPT_FILE = 'pixel-cat.js';
// The ?v= part changes with every script, so a reloaded window never runs a cached copy.
const tagFor = (script: string) => {
  const v = crypto.createHash('sha256').update(script).digest('hex').slice(0, 12);
  return `<!-- pixel-cat --><script src="./${SCRIPT_FILE}?v=${v}"></script>\n`;
};
const ANY_TAG = /<!-- pixel-cat -->[^\n]*\n/g;

// The workbench page of the VS Code installed at `appRoot`.
function locate(appRoot: string): string {
  for (const rel of PAGES) {
    const file = path.join(appRoot, 'out', rel);
    if (fs.existsSync(file)) return file;
  }
  throw new Error(`Couldn't find VS Code's workbench.html under ${appRoot}`);
}

/** Puts the cat into VS Code. Returns true if anything changed (a reload is needed). */
export function install(appRoot: string, script: string): boolean {
  const page = locate(appRoot);
  const scriptFile = path.join(path.dirname(page), SCRIPT_FILE);
  let changed = false;

  if (!fs.existsSync(scriptFile) || fs.readFileSync(scriptFile, 'utf8') !== script) {
    fs.writeFileSync(scriptFile, script);
    changed = true;
  }

  const tag = tagFor(script);
  const html = fs.readFileSync(page, 'utf8');
  if (!html.includes(tag)) {
    const clean = html.replace(ANY_TAG, '');
    const patched = clean.includes('</html>') ? clean.replace('</html>', `${tag}</html>`) : clean + tag;
    fs.writeFileSync(page, patched);
    changed = true;
  }

  return changed;
}

/** Takes the cat back out, restoring the page byte for byte. Returns true if anything changed. */
export function uninstall(appRoot: string): boolean {
  const page = locate(appRoot);
  const scriptFile = path.join(path.dirname(page), SCRIPT_FILE);
  let changed = false;

  const html = fs.readFileSync(page, 'utf8');
  const clean = html.replace(ANY_TAG, '');
  if (clean !== html) {
    fs.writeFileSync(page, clean);
    changed = true;
  }
  if (fs.existsSync(scriptFile)) {
    fs.unlinkSync(scriptFile);
    changed = true;
  }
  return changed;
}
