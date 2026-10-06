import * as vscode from 'vscode';

import SQLite from '../sqlite';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { PathLike } from 'fs';
import { spawn } from 'child_process';
import config from '../config';
import { logger } from '../logger';
import { LocalizedDataManager } from './localizedDataManager';

export enum EntryStatus {
    Missing,
    Ghost,
    Translated
}

export function addIndent(source: string, indent: string, addAtStart = false): string {
    if (indent.length) {
        let res = addAtStart ? indent : "";
        for (const c of source) {
            res += c;
            if (c === "\n") {
                res += indent;
            }
        }
        return res;
    }
    else {
        return source;
    }
}

let _translatedTextDataCache: any = undefined;

export function invalidateTranslatedTextDataCache() {
    _translatedTextDataCache = undefined;
}

export async function getTranslatedTextData(): Promise<any> {
    if (_translatedTextDataCache === undefined) {
         const ldManager = await LocalizedDataManager.instancePromise;
         const uri = await ldManager.getPathUri("text_data_dict");
         if (uri && await uriExists(uri)) {
             try {
                 const data = await vscode.workspace.fs.readFile(uri);
                 const str = Buffer.from(data).toString('utf8');
                 _translatedTextDataCache = JSON.parse(str);
             } catch (e) {
                 logger.error(`${e}`);
                 _translatedTextDataCache = null;
             }
         } else {
             _translatedTextDataCache = null;
         }
    }
    return _translatedTextDataCache;
}

export async function getTextDataCategory(category: number) {
    const dict: {[key: number]: string} = {};
    try {
        const mdbQueryRes = await SQLite.instance.queryMdb(`SELECT "index", "text" FROM text_data WHERE "category" = ${category}`);
        for (const row of mdbQueryRes[0].rows) {
            const [ index, text ] = row;
            dict[+index] = text;
        }
    }
    catch {}

    return dict;
}

const textDataCache: {[key: number]: {[key: number]: string}} = {};

/**
 * Drops the cached master.mdb text_data categories. Needed whenever the game
 * data changes underneath us (a game update, or switching game data dir),
 * otherwise character/scenario names stay stale for the rest of the session.
 */
export function invalidateTextDataCache() {
    for (const key of Object.keys(textDataCache)) {
        delete textDataCache[+key];
    }
    invalidateTranslatedTextDataCache();
}

export async function getTextDataCategoryCached(category: number) {
    let cache = textDataCache[category];
    if (!cache) {
        cache = await getTextDataCategory(category);
        textDataCache[category] = cache;
    }
    return cache;
}

export async function uriExists(uri: vscode.Uri): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    }
    catch {
        return false;
    }
}

export async function pathExists(path: PathLike): Promise<boolean> {
    try {
        await fs.stat(path);
        return true;
    }
    catch {
        return false;
    }
}

// mtime+size-based cache so tree view refreshes don't re-parse every JSON file.
interface StatusCacheEntry {
    status: EntryStatus;
    mtime: number;
    size: number;
}
const statusCache = new Map<string, StatusCacheEntry>();

export function invalidateStatusCache(uri?: vscode.Uri) {
    if (uri) {
        statusCache.delete(uri.toString());
    } else {
        statusCache.clear();
    }
}

/**
 * Check the translation status of a file.
 * Returns EntryStatus.Missing if file doesn't exist.
 * Returns EntryStatus.Ghost if file exists but has no translated content.
 * Returns EntryStatus.Translated if file has actual translated content.
 * 
 * Uses an mtime/size cache to skip re-parsing unchanged files.
 */
export async function getEntryStatus(uri: vscode.Uri | undefined): Promise<EntryStatus> {
    if (!uri) {
        return EntryStatus.Missing;
    }

    let stat: vscode.FileStat;
    try {
        stat = await vscode.workspace.fs.stat(uri);
    } catch {
        // File doesn't exist — remove any stale cache entry
        statusCache.delete(uri.toString());
        return EntryStatus.Missing;
    }

    const key = uri.toString();
    const cached = statusCache.get(key);
    if (cached && cached.mtime === stat.mtime && cached.size === stat.size) {
        return cached.status;
    }

    // File changed or not yet cached — full parse
    let status: EntryStatus;
    try {
        const data = await vscode.workspace.fs.readFile(uri);
        const content = Buffer.from(data).toString('utf8');
        const json = JSON.parse(content);

        if (!json) {
            status = EntryStatus.Ghost;
        } else {
            status = checkJsonForTranslations(json);
        }
    }
    catch {
        status = EntryStatus.Ghost;
    }

    statusCache.set(key, { status, mtime: stat.mtime, size: stat.size });
    return status;
}

function checkJsonForTranslations(json: any): EntryStatus {
    function hasString(obj: any): boolean {
        if (typeof obj === 'string') {
            return obj.trim().length > 0;
        }
        if (Array.isArray(obj)) {
            return obj.some(hasString);
        }
        if (obj && typeof obj === 'object') {
            return Object.values(obj).some(hasString);
        }
        return false;
    }

    // Specific check for Story/Race/Lyrics structures
    if (json.text_block_list && Array.isArray(json.text_block_list)) {
        for (const block of json.text_block_list) {
            if (block.text && typeof block.text === 'string' && block.text.trim().length > 0) {
                return EntryStatus.Translated;
            }
        }
    } else if (Array.isArray(json)) {
        if (json.some(hasString)) {
            return EntryStatus.Translated;
        }
    } else if (typeof json === 'object') {
        if (Object.values(json).some(hasString)) {
            return EntryStatus.Translated;
        }
    }

    return EntryStatus.Ghost;
}

export function makeStatusLabel(label: string, status: EntryStatus) {
    switch (status) {
        case EntryStatus.Translated:
            return "[●] " + label;
        case EntryStatus.Ghost:
            return "[○] " + label;
        case EntryStatus.Missing:
        default:
            return "[   ] " + label;
    }
}

export function normalizeStoryId(id: string | number): string {
    id = id.toString();
    if (id.length < 9) {
        const count = 9 - id.length;
        id = "0".repeat(count) + id;
    }
    return id;
}

export function getStoryIdComponents(id: string | number): [string, string, string] {
    id = normalizeStoryId(id);
    return [id.slice(0, 2), id.slice(2, 6), id.slice(6)];
}
async function queryRegistry(key: string, value: string): Promise<string | undefined> {
    return new Promise((resolve) => {
        try {
            const reg = spawn('reg', ['query', key, '/v', value]);
            let output = '';

            reg.stdout.on('data', (data) => {
                output += data.toString();
            });

            reg.on('close', (code) => {
                if (code !== 0) {
                    return resolve(undefined);
                }
                const match = output.match(new RegExp(`^\\s*${value}\\s+REG_SZ\\s+(.*)$`, 'im'));
                if (match && match[1]) {
                    const resolvedPath = expandEnvironmentVariables(match[1].trim());
                    resolve(resolvedPath);
                } else {
                    resolve(undefined);
                }
            });

            reg.on('error', () => resolve(undefined));
        } catch {
            resolve(undefined);
        }
    });
}

const DMM5_CONFIG_PATH = path.join(os.homedir(), "AppData", "Roaming", "dmmgameplayer5", "dmmgame.cnf");
const EDGE_STEAM_APP_ID_JP = "3564400";
const EDGE_STEAM_APP_ID_GLOBAL = "3224770";

const STEAM_APP_FOLDER: { [appId: string]: string } = {
    [EDGE_STEAM_APP_ID_JP]: "UmamusumePrettyDerby_Jpn",
    [EDGE_STEAM_APP_ID_GLOBAL]: "UmamusumePrettyDerby",
};

const KOMOE_UNINSTALL_KEY = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\komoemumamusume`;
const APPDATA_LOCALLOW = path.join(os.homedir(), "AppData", "LocalLow");

async function getSteamRegistryPath(): Promise<string | undefined> {
    if (os.platform() !== 'win32') {
        return undefined;
    }
    return queryRegistry(`HKCU\\Software\\Valve\\Steam`, 'SteamPath');
}

function parseSteamLibraryFolders(vdf: string): string[] {
    const libraryPaths: string[] = [];
    const pathPattern = /^\s*"path"\s+"(.+)"\s*$/gim;
    let match: RegExpExecArray | null;

    while ((match = pathPattern.exec(vdf)) !== null) {
        libraryPaths.push(match[1].replace(/\\\\/g, '\\'));
    }

    return libraryPaths;
}

function getDataDirCandidates(installDir: string): string[] {
    return [
        path.join(installDir, "umamusume_data", "persistent"),
        path.join(installDir, "UmamusumePrettyDerby_Data", "persistent"),
        path.join(APPDATA_LOCALLOW, "Cygames", "Umamusume"),
        path.join(APPDATA_LOCALLOW, "Cygames", "umamusume"),
        path.join(installDir, "komoemumamusume Game"),
    ];
}

export async function getAllGameInstallPaths(): Promise<string[]> {
    const paths: string[] = [];

    try {
        const dmmConfig = JSON.parse(await fs.readFile(DMM5_CONFIG_PATH, { encoding: "utf8" }));
        for (const entry of dmmConfig.contents) {
            if (entry.productId === "umamusume" && entry.detail.path) {
                paths.push(entry.detail.path);
            }
        }
    }
    catch {}

    if (os.platform() === 'win32') {
        const steamAppIds = [EDGE_STEAM_APP_ID_JP, EDGE_STEAM_APP_ID_GLOBAL];

        for (const appId of steamAppIds) {
            const steamKey = `HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App ${appId}`;
            const gamePath = await queryRegistry(steamKey, 'InstallLocation');

            if (gamePath && await pathExists(gamePath)) {
                if (!paths.includes(gamePath)) {
                    paths.push(gamePath);
                }
            }
        }

        try {
            const steamPath = await getSteamRegistryPath();
            if (steamPath) {
                const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
                const vdfContent = await fs.readFile(vdfPath, { encoding: 'utf8' });
                const libraryRoots = parseSteamLibraryFolders(vdfContent);
                const results = new Set<string>([steamPath, ...libraryRoots]);

                for (const libRoot of results) {
                    for (const appId of steamAppIds) {
                        const folderName = STEAM_APP_FOLDER[appId];
                        if (!folderName) { continue; }
                        const candidate = path.join(libRoot, 'steamapps', 'common', folderName);
                        if (await pathExists(candidate) && !paths.includes(candidate)) {
                            paths.push(candidate);
                        }
                    }
                }
            }
        }
        catch {}

        try {
            const komoeExe = await queryRegistry(KOMOE_UNINSTALL_KEY, 'DisplayIcon');
            if (komoeExe) {
                const komoeInstallDir = path.dirname(komoeExe);
                if (await pathExists(komoeInstallDir) && !paths.includes(komoeInstallDir)) {
                    paths.push(komoeInstallDir);
                }
            }
        }
        catch {}
    }

    return paths;
}

export async function getAllGameDataDirs(): Promise<string[]> {
    const installPaths = await getAllGameInstallPaths();
    const seen = new Set<string>();
    const candidates: string[] = [];

    for (const installDir of installPaths) {
        for (const candidate of getDataDirCandidates(installDir)) {
            if (!seen.has(candidate)) {
                seen.add(candidate);
                candidates.push(candidate);
            }
        }
    }

    for (const appDataCandidate of [
        path.join(APPDATA_LOCALLOW, "Cygames", "Umamusume"),
        path.join(APPDATA_LOCALLOW, "Cygames", "umamusume"),
    ]) {
        if (!seen.has(appDataCandidate)) {
            seen.add(appDataCandidate);
            candidates.push(appDataCandidate);
        }
    }

    const result: string[] = [];
    for (const candidate of candidates) {
        if (await pathExists(candidate)) {
            result.push(candidate);
        }
    }

    return result;
}

let cachedInstallPath: string | undefined;
export async function getGameInstallPath(): Promise<string | undefined> {
    if (cachedInstallPath) {
        return cachedInstallPath;
    }

    const allPaths = await getAllGameInstallPaths();
    if (allPaths.length > 0) {
        cachedInstallPath = allPaths[0];
        return cachedInstallPath;
    }

    return undefined;
}

export async function updateHachimiConfig(callback: (config: any) => any) {
    const dumpPath = config().get<string>("localizeDictDump");

    if (!dumpPath) {
        throw new Error("Cannot update Hachimi config: The 'Localize Dict Dump' path is not configured. Please run the setup or set it manually in Settings.");
    }

    const hachimiDir = path.dirname(dumpPath);
    const configPath = path.join(hachimiDir, "config.json");

    try {
        const data = JSON.parse(await fs.readFile(configPath, { encoding: "utf8" }));
        const res = await callback(data);
        if (res) {
            await fs.writeFile(configPath, JSON.stringify(res, null, 2), { encoding: "utf8" });
        }
        return res;
    } catch (e: any) {
        if (e.code === 'ENOENT') {
            logger.warn(`hachimi/config.json not found at ${configPath}. Skipping update.`);
            return;
        }

        throw new Error(`Failed to read or update hachimi config at ${configPath}. Error: ${e}`);
    }
}

export type GameRegion = "jp" | "eng" | "tw";

export function getGameRegion(): GameRegion {
    const gameVersion = config().get<string>("gameVersion") || "Auto";
    const gameDataDir = config().get<string>("gameDataDir") || "";

    if (gameVersion === "JP") {
        return "jp";
    }
    if (gameVersion === "EN/Global") {
        return "eng";
    }
    if (gameVersion === "TW/Komoe") {
        return "tw";
    }

    const normalized = gameDataDir.replace(/\\/g, "/");
    const lowerDir = normalized.toLowerCase();

    if (lowerDir.includes("komoemumamusume")) {
        return "tw";
    }

    // Steam JP / ENG
    if (
        lowerDir.includes("steamapps/common") &&
        lowerDir.includes("persistent")
    ) {
        if (lowerDir.includes("jpn")) {
            return "jp";
        }
        return "eng";
    }

    // AppData "Umamusume" (uppercase) -> EN/Global, "umamusume" (lowercase) -> JP
    if (
        normalized.includes("AppData") &&
        normalized.includes("Cygames")
    ) {
        if (normalized.includes("/Umamusume") || normalized.includes("\\Umamusume")) {
            return "eng";
        }
        return "jp";
    }

    // DMM JP / ENG alternate
    if (lowerDir.includes("persistent")) {
        if (lowerDir.includes("umamusumeprettyderby") || lowerDir.includes("umamusume_data") === false) {
            return "eng";
        }
        return "jp";
    }

    return "jp";
}

export function expandEnvironmentVariables(pathString: string): string {
    if (!pathString) {
        return pathString;
    }

    const platform = os.platform();

    if (platform === 'win32') {
        return pathString.replace(/%(.*?)%/g, (match, varName) => {
            return process.env[varName] || match;
        });
    } else {
        let expandedPath = pathString.replace(/^~(?=$|\/|\\)/, os.homedir());

        expandedPath = expandedPath.replace(/\$(?:(\w+)|\{([^}]+)\})/g, (match, varName, varNameInBraces) => {
            const actualVarName = varName || varNameInBraces;
            return process.env[actualVarName] || match;
        });

        return expandedPath;
    }
}