import * as vscode from 'vscode';
import fs from 'fs/promises';
import vm from 'vm';
import automationContext from './automationContext';
import path from 'path';
import { logger } from '../logger';

const RUN_ALL = vscode.l10n.t('Run All');
const CANCEL = vscode.l10n.t('Cancel');

/**
 * Automation scripts come from the workspace, so they are as untrusted as the
 * repo they were cloned with. A `vm` context is not a security boundary — it
 * stops accidents, not code that is actively trying to escape — so refuse to
 * run anything until the user has trusted this workspace and confirmed.
 *
 * Returns true when the script may run.
 */
async function confirmExecution(what: string): Promise<boolean> {
    if (!vscode.workspace.isTrusted) {
        logger.warn(`Blocked automation (${what}): workspace is not trusted.`);
        const trust = await vscode.window.showWarningMessage(
            vscode.l10n.t(
                'This workspace is not trusted. Automation scripts run with your user\'s permissions — only trust this folder if you wrote or reviewed them yourself.'
            ),
            vscode.l10n.t('Manage Workspace Trust'),
            CANCEL
        );
        if (trust === vscode.l10n.t('Manage Workspace Trust')) {
            await vscode.commands.executeCommand('workbench.trust.manage');
        }
        return false;
    }

    const res = await vscode.window.showWarningMessage(
        vscode.l10n.t(
            'Automation scripts in .vscode/zk_auto run with your user\'s permissions and can modify files on disk. Run {0}?',
            { 0: what }
        ),
        { modal: true },
        RUN_ALL,
        CANCEL
    );
    return res === RUN_ALL;
}

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

/**
 * `.vscode/zk_auto` is optional and usually absent, so a missing directory
 * means "no scripts" rather than an error worth surfacing as ENOENT.
 */
async function listScripts(scriptsDir: string): Promise<string[]> {
    try {
        return (await fs.readdir(scriptsDir)).filter(filename => filename.endsWith('.js'));
    }
    catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
            return [];
        }
        throw e;
    }
}

async function run(filename: string) {
    if (!await confirmExecution(vscode.l10n.t('"{0}"', { 0: filename }))) {
        return;
    }
    const scriptPath = path.join(getScriptDir(), filename);
    return runFile(scriptPath);
}

async function runAll() {
    const scriptsDir = getScriptDir();
    const scripts = await listScripts(scriptsDir);
    if (!scripts.length) {
        noScripts(scriptsDir);
        return;
    }
    if (!await confirmExecution(
        vscode.l10n.t('{0} script(s) from "{1}"', { 0: scripts.length, 1: scriptsDir })
    )) {
        return;
    }
    for (const filename of scripts) {
        const scriptPath = path.join(scriptsDir, filename);
        await runFile(scriptPath);
    }
}

async function getScripts() {
    return listScripts(getScriptDir());
}

function noScripts(scriptsDir: string) {
    vscode.window.showInformationMessage(
        vscode.l10n.t('No automation scripts found in "{0}".', { 0: scriptsDir })
    );
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
    getScriptDir,
    noScripts
}
