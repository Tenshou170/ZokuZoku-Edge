/*
    Originally a part of AlexCovizzi/vscode-sqlite
    Licensed under Apache License 2.0

    Modified for ZokuZoku
*/

import { window } from "vscode";
import { ResultSet } from "./common";
import { executeQuery, QueryExecutionOptions } from "./queryExecutor";
import { validateSqliteCommand } from "./sqliteCommandValidation";
import { join, resolve as resolvePath } from "path";
import config from "../config";
import { queryEncryptedDb } from '../pythonBridge';
import { META_KEY_GLOBAL, META_KEY_JP } from "../defines";
import { logger } from "../logger";

class SQLite {
    private extensionPath: string;
    private sqliteCommand!: string;
    private mdbPath?: string;
    private metaPath?: string;

    public static detectedGameVersion: "JP" | "GL" | "UNKNOWN" = "UNKNOWN";
    private static detectedMetaKey: string | undefined;

    constructor(extensionPath: string, sqliteCommand: string, mdbPath?: string, metaPath?: string) {
        this.extensionPath = extensionPath;
        this.setSqliteCommand(sqliteCommand);
        this.mdbPath = mdbPath;
        this.metaPath = metaPath;
    }

    private static _instance?: SQLite;

    static init(extensionPath: string) {
        const sqliteCommand = config().get<string>("sqlite3") ?? "sqlite3";
        const gameDataDir = config().get<string>("gameDataDir");
        const mdbPath = gameDataDir ? join(gameDataDir, "master", "master.mdb") : undefined;
        let metaPath = gameDataDir ? join(gameDataDir, "meta") : undefined;

        const manualMetaPath = config().get<string>("manualMetaPath")?.trim();
        if (manualMetaPath) {
            logger.log(`[SQLite] Overriding meta path with manual setting: ${manualMetaPath}`);
            metaPath = manualMetaPath;
        }

        this._instance = new SQLite(extensionPath, sqliteCommand, mdbPath, metaPath);
        this.detectedMetaKey = undefined;
        this.detectedGameVersion = "UNKNOWN";

        logger.log(`[SQLite] Initialized: mdbPath=${mdbPath ?? ""}, metaPath=${metaPath ?? ""}, gameDataDir=${gameDataDir ?? ""}`);
    }

    static get instance(): SQLite {
        if (!this._instance) {
            throw new Error("SQLite service has not been initialized.");
        }
        return this._instance!;
    }

    getMetaPath(): string | undefined {
        return this.metaPath;
    }

    public static async getMetaKey(): Promise<string> {
        if (this.detectedMetaKey) {
            return this.detectedMetaKey;
        }

        if (!this.instance.metaPath) {
            throw new Error("Cannot get meta key: game data directory is not set.");
        }
        const absoluteMetaPath = resolvePath(this.instance.metaPath);

        const configuredKey = config().get<string>("decryption.metaKey")?.trim();

        if (configuredKey) {
            this.detectedGameVersion = "UNKNOWN";
            this.detectedMetaKey = configuredKey;
            return this.detectedMetaKey;
        }

        const testQuery = "SELECT n FROM c LIMIT 1";

        try {
            await queryEncryptedDb(absoluteMetaPath, testQuery, META_KEY_JP);
            this.detectedGameVersion = "JP";
            this.detectedMetaKey = META_KEY_JP;
            return this.detectedMetaKey;
        } catch (e) {
            const err = e as Error;
            const isDecryptionError = err.message.includes("SQLITE_NOTADB") ||
                                      err.message.includes("database is encrypted") ||
                                      err.message.includes("file is not a database");

            if (isDecryptionError) {
                try {
                    await queryEncryptedDb(absoluteMetaPath, testQuery, META_KEY_GLOBAL);
                    this.detectedGameVersion = "GL";
                    this.detectedMetaKey = META_KEY_GLOBAL;
                    return this.detectedMetaKey;
                } catch (e2) {
                    const err2 = e2 as Error;
                    window.showErrorMessage(`Failed to decrypt meta DB. Tried JP and GL keys. Error: ${err2.message}`);
                    throw err2;
                }
            }
            window.showErrorMessage(`Failed to query encrypted meta DB: ${err.message}`);
            throw err;
        }
    }

    async query(dbPath: string, query: string, options?: QueryExecutionOptions): Promise<ResultSet> {
        if (!this.sqliteCommand) {
            throw new Error("Unable to execute query: provide a valid sqlite3 executable in the setting zokuzoku.sqlite3.");
        }

        logger.log(`[SQLite] query (unencrypted): ${query.substring(0, 120)}${query.length > 120 ? '...' : ''}`);
        const queryRes = await executeQuery(this.sqliteCommand, dbPath, query, options);
        if (queryRes.error) {
            logger.error(`[SQLite] query error: ${queryRes.error}`);
            throw queryRes.error;
        }
        return queryRes.resultSet!;
    }

    queryMdb(query: string, options?: QueryExecutionOptions): Promise<ResultSet> {
        if (!this.mdbPath) {
            throw new Error("Query cannot be performed because the game data directory is not set.");
        }
        return this.query(this.mdbPath, query, options);
    }

    async queryMeta(query: string, options?: QueryExecutionOptions): Promise<ResultSet> {
        if (!this.metaPath) {
            logger.error("[SQLite] CRITICAL: this.metaPath is not set! gameDataDir is missing.");
            throw new Error("Query cannot be performed because the game data directory is not set.");
        }

        const { isMetaEncrypted } = await import("../core/encryption.js");
        if (!isMetaEncrypted()) {
            logger.log(`[SQLite] queryMeta (unencrypted region): ${query.substring(0, 120)}${query.length > 120 ? '...' : ''}`);
            return this.query(this.metaPath, query, options);
        }

        const useDecryption = config().get<boolean>("decryption.enabled");
        if (!useDecryption) {
            logger.log(`[SQLite] decryption.disabled -> querying plaintext meta path: ${query.substring(0, 120)}${query.length > 120 ? '...' : ''}`);
            return this.query(this.metaPath, query, options);
        }

        try {
            logger.log(`[SQLite] queryMeta start: ${query.substring(0, 120)}${query.length > 120 ? '...' : ''}`);
            const key = await SQLite.getMetaKey();
            const absoluteMetaPath = resolvePath(this.metaPath);
            logger.log(`[SQLite] Executing encrypted query on ${absoluteMetaPath}...`);
            const result = await queryEncryptedDb(absoluteMetaPath, query, key);
            logger.log(`[SQLite] Encrypted query completed with ${result[0]?.rows.length ?? 0} rows.`);
            return result;
        } catch (e) {
            const err = e as Error;
            logger.error(`[SQLite] Failed to query encrypted meta DB: ${err.message}`);
            window.showErrorMessage(`Failed to query encrypted meta DB: ${err.message}`);
            throw err;
        }
    }

    setSqliteCommand(sqliteCommand: string) {
        try {
            this.sqliteCommand = validateSqliteCommand(sqliteCommand, this.extensionPath);
        } catch (e) {
            const message = (e as Error).message;
            logger.error(message);
            window.showErrorMessage(message);
            this.sqliteCommand = "";
        }
    }

    async loadMdbTable(tableName: MdbTableName) {
        const columns = MDB_TABLE_COLUMNS[tableName];
        const columnNames = columns.map(s => `"${s}"`).join(",");
        const orderByNames = columns.slice(0, -1).map(s => `"${s}"`).join(",");
        const queryRes = await SQLite.instance.queryMdb(
            `SELECT ${columnNames} FROM ${tableName} ORDER BY ${orderByNames}`
        );
        return queryRes[0].rows;
    }
}

export const MDB_TABLE_NAMES = ["text_data", "character_system_text", "race_jikkyo_comment", "race_jikkyo_message"] as const;
export type MdbTableName = (typeof MDB_TABLE_NAMES)[number];

export const MDB_TABLE_COLUMNS: {[K in MdbTableName]: string[]} = {
    "text_data": [ "category", "index", "text" ],
    "character_system_text": [ "character_id", "voice_id", "text" ],
    "race_jikkyo_comment": [ "id", "message" ],
    "race_jikkyo_message": [ "id", "message" ]
};

export interface QueryResult {resultSet?: ResultSet; error?: Error; }

export default SQLite;
