import * as fs from 'fs';
import * as path from 'path';

// The uninstall hook runs as a bare Node script without the VS Code API, so it can't ask
// where VS Code lives. Every install records its app root here for the hook to clean up.

const stateFile = (extensionPath: string) => path.join(extensionPath, 'installed-app-roots.json');

export function readAppRoots(extensionPath: string): string[] {
  try {
    return JSON.parse(fs.readFileSync(stateFile(extensionPath), 'utf8'));
  } catch {
    return [];
  }
}

export function rememberAppRoot(extensionPath: string, appRoot: string): void {
  const roots = readAppRoots(extensionPath);
  if (roots.includes(appRoot)) return;
  fs.writeFileSync(stateFile(extensionPath), JSON.stringify([...roots, appRoot]));
}
