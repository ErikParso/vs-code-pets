// Run by VS Code (`vscode:uninstall`) after the extension is uninstalled: take the cat back out.
import * as path from 'path';
import { uninstall } from './injector';
import { readAppRoots } from './state';

for (const appRoot of readAppRoots(path.join(__dirname, '..'))) {
  try {
    uninstall(appRoot);
  } catch {
    // That VS Code version is gone already (updated or removed); nothing to restore.
  }
}
