import * as vscode from 'vscode';
import fs from 'fs/promises';
import vm from 'vm';
import automationContext from './automationContext';
import path from 'path';

function runScript(code: string, filename?: string) {
    try {
        const context = automationContext.instantiate();
        return vm.runInContext(code, vm.createContext(context), { filename });
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(vscode.l10n.t('Failed to initialize automation context: {0}', { 0: message }));
        throw e;
    }
}

async function runFile(scriptPath: string) {
    return runScript(await fs.readFile(scriptPath, { encoding: "utf8" }), path.basename(scriptPath));
}

async function run(filename: string) {
    const scriptPath = path.join(getScriptDir(), filename);
    return runFile(scriptPath);
}

async function runAll() {
    const scriptsDir = getScriptDir();
    for (const filename of await fs.readdir(scriptsDir)) {
        if (filename.endsWith(".js")) {
            const scriptPath = path.join(scriptsDir, filename);
            await runFile(scriptPath);
        }
    }
}

async function getScripts() {
    const scriptsDir = getScriptDir();
    return (await fs.readdir(scriptsDir))
        .filter(filename => filename.endsWith(".js"));
}

function getScriptDir() {
    const folderUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!folderUri) {
        throw new Error(vscode.l10n.t('No workspace folder.'));
    }
    return vscode.Uri.joinPath(folderUri, ".vscode", "zk_auto").fsPath;
}

export default {
    runScript,
    runFile,
    run,
    runAll,
    getScripts,
    getScriptDir
}