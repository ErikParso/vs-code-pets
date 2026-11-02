import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { install, uninstall } from './injector';
import { rememberAppRoot } from './state';

// The cat itself runs inside VS Code's window (see inject/world.js). This side installs
// it, and owns the status bar item the cat watches: while the item exists the extension
// is enabled, and its text says whether the user has hidden the cat.

interface CatDef {
  name: string;
  marker: string; // shown in the status bar while the cat is out
}

// The cats (names, markers, coats, personalities, likes) live in inject/cats.json, shared
// with the cat script. Each needs a pixelCat.toggle<Name> command in package.json.
function readCats(extensionPath: string): CatDef[] {
  return JSON.parse(fs.readFileSync(path.join(extensionPath, 'inject', 'cats.json'), 'utf8'));
}

function buildScript(context: vscode.ExtensionContext): string {
  const scale = vscode.workspace.getConfiguration('pixelCat').get<number>('scale', 2);
  const version: string = context.extension.packageJSON.version;
  const read = (file: string) => fs.readFileSync(path.join(context.extensionPath, 'inject', file), 'utf8');
  const cats = JSON.parse(read('cats.json'));
  // The version stamp makes every release a new script, so each update reloads once.
  return `// Pixel Cat ${version}\nwindow.PixelCatConfig = ${JSON.stringify({ scale, cats })};\n` +
    `${read('sprites.js')}\n${read('world.js')}`;
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

  const status = vscode.window.createStatusBarItem('pixelCat.status', vscode.StatusBarAlignment.Right, -1000);
  status.name = 'Pixel Cat';
  status.command = 'pixelCat.toggle';
  // The page reads the markers to know which cats are out.
  const isOut = (name: string): boolean => context.globalState.get(`out.${name}`, true);
  const render = (): void => {
    const debug = context.globalState.get('debug', false);
    const markers = CATS.filter((c) => isOut(c.name)).map((c) => c.marker).join('');
    const hidden = context.globalState.get('hidden', false) || !markers;
    status.text = hidden ? '$(eye-closed)' : markers + (debug ? '🐞' : '');
    status.tooltip = hidden ? 'Pixel Cat: the cats are hiding. Click to call them back.' : 'Pixel Cat: click to hide the cats.';
    status.accessibilityInformation = { label: hidden ? 'Pixel Cat (hidden)' : 'Pixel Cat' };
  };
  render();
  if (!context.globalState.get('removed', false) && context.globalState.get('consented', false)) status.show();

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
      status.show();
      ensureInstalled();
    } else {
      await context.globalState.update('removed', true);
      status.hide();
    }
  };

  context.subscriptions.push(
    status,
    vscode.commands.registerCommand('pixelCat.toggle', async () => {
      if (!CATS.some((c) => isOut(c.name))) {
        // Both were sent away one by one: calling them back brings both.
        for (const c of CATS) await context.globalState.update(`out.${c.name}`, true);
        await context.globalState.update('hidden', false);
      } else {
        await context.globalState.update('hidden', !context.globalState.get('hidden', false));
      }
      render();
    }),
    ...CATS.map((c) =>
      vscode.commands.registerCommand(`pixelCat.toggle${c.name}`, async () => {
        await context.globalState.update(`out.${c.name}`, !isOut(c.name));
        render();
      })
    ),
    vscode.commands.registerCommand('pixelCat.debug', async () => {
      await context.globalState.update('debug', !context.globalState.get('debug', false));
      render();
    }),
    vscode.commands.registerCommand('pixelCat.remove', async () => {
      await context.globalState.update('removed', true);
      status.hide();
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
      status.show();
      ensureInstalled();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('pixelCat.scale')) ensureInstalled();
    })
  );

  ensureInstalled();
}

export function deactivate(): void {}
