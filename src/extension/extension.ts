import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { install } from './injector';
import { rememberAppRoot } from './state';

// The cat itself runs inside VS Code's window (see src/browser/app.ts and src/world/world.ts). This side installs
// it, and owns the status bar item the cat watches (the 🐈‍⬛): while the item is shown the
// cats are out. Which cats there are is the cat script's own business (src/world/collection.ts).

// Debug mode, for developing Pixel Cat: floors, walls and meters drawn, the Cat Care panel shown.
// Must be false in a release.
const DEBUG = true;

function buildScript(context: vscode.ExtensionContext): string {
  const version: string = context.extension.packageJSON.version;
  // The cat script, bundled from src/browser and src/world by esbuild (npm run compile).
  const bundle = fs.readFileSync(path.join(context.extensionPath, 'out', 'pixel-cat.js'), 'utf8');
  // The version stamp makes every release a new script, so each update reloads once. Strict
  // mode has to be the script's first statement.
  return `// Pixel Cat ${version}\n'use strict';\n${bundle}`;
}

// The page only picks up the cat when the window loads, and the extension starts after
// that. So each new version of the cat script reloads the window once, by itself.
// Keying on the script's contents means a broken install can never cause a reload loop.
function reloadOnce(context: vscode.ExtensionContext, script: string): void {
  // Per VS Code install too: an update moves VS Code to a new folder that needs the cat again.
  const version = crypto.createHash('sha256').update(vscode.env.appRoot).update(script).digest('hex');
  const reload = () => vscode.commands.executeCommand('workbench.action.reloadWindow');
  if (context.globalState.get('reloadedFor') !== version) {
    void context.globalState.update('reloadedFor', version).then(reload);
    return;
  }
  void vscode.window
    .showInformationMessage('Pixel Cat is ready. Reload the window to let it out.', 'Reload Window')
    .then((choice) => choice && reload());
}

export function activate(context: vscode.ExtensionContext): void {
  const appRoot = vscode.env.appRoot;

  const ensureInstalled = (): void => {
    if (!context.globalState.get('consented', false)) return void askConsent();
    try {
      rememberAppRoot(context.extensionPath, appRoot);
      const script = buildScript(context);
      if (install(appRoot, script)) reloadOnce(context, script);
    } catch (err) {
      void vscode.window.showErrorMessage(
        `Pixel Cat couldn't get into VS Code: ${(err as Error).message}. ` +
          'If VS Code is installed for all users, run it once as administrator so the cat can be installed.'
      );
    }
  };

  // The fish button: the one status bar item. The cats' page catches the click itself (it
  // knows where the button is, and opens its menu there: a fish to feed them, a box to see
  // them), so the command only makes the item clickable. The page also
  // reads whether the cats are out (and debug mode) from its accessibility label, which VS Code
  // puts on the item as its aria-label; no item means no cats. Which cats there are is the
  // page's to know (its collection).
  const fish = vscode.window.createStatusBarItem('pixelCat.fish', vscode.StatusBarAlignment.Right, -1001);
  fish.name = 'Pixel Cat';
  fish.text = '🐈‍⬛';
  fish.tooltip = 'Your cats: feed them, see them in their boxes';
  fish.command = 'pixelCat.fish';
  const render = (): void => {
    fish.accessibilityInformation = { label: `Pixel Cat: throw a fish to your cats${DEBUG ? ' (debug)' : ''}` };
    if (context.globalState.get('consented', false)) fish.show();
    else fish.hide();
  };

  render();

  // Nothing in VS Code is changed until the user agrees, once. "Not now" means not now: the
  // question comes back the next time VS Code starts. Uninstalling restores VS Code's files.
  const askConsent = async (): Promise<void> => {
    const choice = await vscode.window.showInformationMessage(
      'Let the Pixel Cats roam your whole VS Code window?',
      {
        modal: true,
        detail:
          "Extensions can't draw outside their own panels, so Pixel Cat adds a small script to " +
          "VS Code's own files. VS Code will then warn that its installation appears to be " +
          'corrupt; that warning is about this change, and you can dismiss it.\n\n' +
          'Uninstalling the extension restores the files.',
      },
      'Let the Cats In'
    );
    if (!choice) return;
    await context.globalState.update('consented', true);
    ensureInstalled();
    render();
  };

  context.subscriptions.push(
    fish,
    vscode.commands.registerCommand('pixelCat.fish', () => undefined)
  );

  ensureInstalled();
}

export function deactivate(): void {}
