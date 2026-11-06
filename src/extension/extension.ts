import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { install, uninstall } from './injector';
import { rememberAppRoot } from './state';

// The cat itself runs inside VS Code's window (see src/browser/app.ts and src/world/world.ts). This side installs
// it, and owns the status bar item the cat watches (the 🐈‍⬛): while the item is shown the
// cats are out, and its label says which ones.

interface CatDef {
  name: string;
}

// The cats (names, coats, personalities) live in inject/cats.json, shared
// with the cat script.
function readCats(extensionPath: string): CatDef[] {
  return JSON.parse(fs.readFileSync(path.join(extensionPath, 'inject', 'cats.json'), 'utf8'));
}

function buildScript(context: vscode.ExtensionContext): string {
  const scale = vscode.workspace.getConfiguration('pixelCat').get<number>('scale', 2);
  const version: string = context.extension.packageJSON.version;
  const cats = readCats(context.extensionPath);
  // The cat script, bundled from src/browser and src/world by esbuild (npm run compile).
  const bundle = fs.readFileSync(path.join(context.extensionPath, 'out', 'pixel-cat.js'), 'utf8');
  // The version stamp makes every release a new script, so each update reloads once. Strict
  // mode has to be the script's first statement, before the config.
  return `// Pixel Cat ${version}\n'use strict';\nwindow.PixelCatConfig = ${JSON.stringify({ scale, cats })};\n${bundle}`;
}

// The page only picks up the cat when the window loads, and the extension starts after
// that. So each new version of the cat script reloads the window once, by itself.
// Keying on the script's contents means a broken install can never cause a reload loop.
function reloadOnce(context: vscode.ExtensionContext, script: string): void {
  // Per VS Code install too: an update moves VS Code to a new folder that needs the cat again.
  const version = crypto.createHash('sha256').update(vscode.env.appRoot).update(script).digest('hex');
  if (context.globalState.get('reloadedFor') === version) {
    promptReload('Pixel Cat is ready. Reload the window to let it out.');
    return;
  }
  void context.globalState.update('reloadedFor', version).then(() =>
    vscode.commands.executeCommand('workbench.action.reloadWindow')
  );
}

function promptReload(message: string): void {
  void vscode.window.showInformationMessage(message, 'Reload Window').then((choice) => {
    if (choice) void vscode.commands.executeCommand('workbench.action.reloadWindow');
  });
}

export function activate(context: vscode.ExtensionContext): void {
  const appRoot = vscode.env.appRoot;
  const CATS = readCats(context.extensionPath);

  const ensureInstalled = (): void => {
    if (context.globalState.get('removed', false)) return;
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
  // reads which cats are out (and debug mode) from its accessibility label, which VS Code
  // puts on the item as its aria-label; no item means no cats.
  const fish = vscode.window.createStatusBarItem('pixelCat.fish', vscode.StatusBarAlignment.Right, -1001);
  fish.name = 'Pixel Cat';
  fish.text = '🐈‍⬛';
  fish.tooltip = 'Your cats: feed them, see them in their boxes';
  fish.command = 'pixelCat.fish';
  const render = (): void => {
    const out = CATS.map((c) => c.name);
    const debug = context.globalState.get('debug', false);
    fish.accessibilityInformation = { label: `Pixel Cat: throw a fish to ${out.join(', ')}${debug ? ' (debug)' : ''}` };
    const visible = !context.globalState.get('removed', false) && context.globalState.get('consented', false);
    if (visible) fish.show();
    else fish.hide();
  };

  render();

  // Nothing in VS Code is changed until the user agrees, once. "Not now" counts as
  // removing the cats; "Pixel Cat: Let the Cat Back In" brings them (and asks no more).
  const askConsent = async (): Promise<void> => {
    const choice = await vscode.window.showInformationMessage(
      'Let the Pixel Cats roam your whole VS Code window?',
      {
        modal: true,
        detail:
          "Extensions can't draw outside their own panels, so Pixel Cat adds a small script to " +
          "VS Code's own files. VS Code will then warn that its installation appears to be " +
          'corrupt; that warning is about this change, and you can dismiss it.\n\n' +
          'Undo it any time with "Pixel Cat: Remove from VS Code". Uninstalling the extension ' +
          'also restores the files.',
      },
      'Let the Cats In'
    );
    if (choice) {
      await context.globalState.update('consented', true);
      ensureInstalled();
    } else {
      await context.globalState.update('removed', true);
    }
    render();
  };

  context.subscriptions.push(
    fish,
    vscode.commands.registerCommand('pixelCat.fish', () => undefined),
    vscode.commands.registerCommand('pixelCat.debug', async () => {
      await context.globalState.update('debug', !context.globalState.get('debug', false));
      render();
    }),
    vscode.commands.registerCommand('pixelCat.remove', async () => {
      await context.globalState.update('removed', true);
      render();
      try {
        uninstall(appRoot);
        promptReload('Pixel Cat has left VS Code. Reload the window to finish.');
      } catch (err) {
        void vscode.window.showErrorMessage(`Pixel Cat couldn't be removed: ${(err as Error).message}`);
      }
    }),
    vscode.commands.registerCommand('pixelCat.install', async () => {
      // Asked for by name: that is consent.
      await context.globalState.update('removed', false);
      await context.globalState.update('consented', true);
      render();
      ensureInstalled();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('pixelCat.scale')) ensureInstalled();
    })
  );

  ensureInstalled();
}

export function deactivate(): void {}
