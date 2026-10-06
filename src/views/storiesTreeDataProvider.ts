import * as vscode from 'vscode';
import { logger } from '../logger';
import SQLite from '../sqlite';
import { LocalizedDataManager, utils } from '../core';
import RefreshableTreeDataProviderBase from './refreshableTreeDataProviderBase';
import { whenReady } from '../extensionContext';
import config from '../config';

function queryCategories() {
    return SQLite.instance.queryMeta(
        "SELECT DISTINCT SUBSTR(n, 12, 2) FROM a WHERE n LIKE 'story/data/__/____/storytimeline\\__________' ESCAPE '\\'"
    );
}

function queryGroups(categoryId: string) {
    return SQLite.instance.queryMeta(
        `SELECT DISTINCT SUBSTR(n, 15, 4)
        FROM a WHERE n LIKE 'story/data/${categoryId}/____/storytimeline\\__________' ESCAPE '\\'`
    );
}

function queryStories(categoryId: string, groupId: string) {
    return SQLite.instance.queryMeta(
        `SELECT SUBSTR(n, 34, 9)
        FROM a WHERE n LIKE 'story/data/${categoryId}/${groupId}/storytimeline\\__________' ESCAPE '\\'`
    );
}

enum TreeLevel {
    None,
    Category,
    Group,
    Story
}

const categoryNames: {[key: string]: string} = {
    "00": vscode.l10n.t("> Short Episodes"),
    "01": vscode.l10n.t("> Tutorials"),
    "02": vscode.l10n.t("> Main Story"),
    "04": vscode.l10n.t("> Umamusume Stories"),
    "08": vscode.l10n.t("> Scenario Intros"),
    "09": vscode.l10n.t("> Story Events"),
    "10": vscode.l10n.t("> Anniv. Stories"),
    "11": vscode.l10n.t("> Valentine Episodes"),
    "12": vscode.l10n.t("> New Year Short Episodes"),
    "13": vscode.l10n.t("> Kirari Magic Show"),
    "14": vscode.l10n.t("> The White Era"),
    "40": vscode.l10n.t("> Scenario Career Events"),
    "50": vscode.l10n.t("> Umamusume Career Events"),
    "80": vscode.l10n.t("> Support Card Events (R)"),
    "82": vscode.l10n.t("> Support Card Events (SR)"),
    "83": vscode.l10n.t("> Support Card Events (SSR)")
};

let extraStoryMapPromise: Promise<Map<string, number>> | undefined;
let eventStoryMapPromise: Promise<Map<string, number>> | undefined;
let mainStoryMapPromise: Promise<Map<string, number>> | undefined;
let singleModeMapPromise: Promise<Map<string, number>> | undefined;
let campaignStoryMapPromise: Promise<Map<string, number>> | undefined;

async function getExtraStoryMapping(): Promise<Map<string, number>> {
    if (!extraStoryMapPromise) {
        extraStoryMapPromise = (async () => {
            const map = new Map<string, number>();
            try {
                const res = await SQLite.instance.queryMdb(
                    `SELECT story_extra_id, story_id_1, story_id_2, story_id_3, story_id_4, story_id_5 FROM story_extra_story_data`
                );
                if (res && res[0] && res[0].rows) {
                    for (const row of res[0].rows) {
                        const exRowId = Number(row[0]);
                        for (let i = 1; i < row.length; i++) {
                            const stId = row[i];
                            if (stId) {
                                const stStr = String(stId);
                                map.set(stStr, exRowId);
                                if (stStr.startsWith("10") && stStr.length >= 9) {
                                    map.set(stStr.slice(2, 6), exRowId);
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                logger.error(`Failed to query story_extra_story_data: ${e}`);
            }
            return map;
        })();
    }
    return extraStoryMapPromise;
}

async function getEventStoryMapping(): Promise<Map<string, number>> {
    if (!eventStoryMapPromise) {
        eventStoryMapPromise = (async () => {
            const map = new Map<string, number>();
            try {
                const res = await SQLite.instance.queryMdb(
                    `SELECT story_event_id, story_id_1, story_id_2, story_id_3, story_id_4, story_id_5 FROM story_event_story_data`
                );
                if (res && res[0] && res[0].rows) {
                    for (const row of res[0].rows) {
                        const evRowId = Number(row[0]);
                        for (let i = 1; i < row.length; i++) {
                            const stId = row[i];
                            if (stId) {
                                const stStr = String(stId);
                                map.set(stStr, evRowId);
                                if (stStr.startsWith("9") && stStr.length >= 9) {
                                    map.set(stStr.slice(2, 6), evRowId);
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                logger.error(`Failed to query story_event_story_data: ${e}`);
            }
            return map;
        })();
    }
    return eventStoryMapPromise;
}

async function getMainStoryMapping(): Promise<Map<string, number>> {
    if (!mainStoryMapPromise) {
        mainStoryMapPromise = (async () => {
            const map = new Map<string, number>();
            try {
                const res = await SQLite.instance.queryMdb(
                    `SELECT id, story_id_1, story_id_2, story_id_3, story_id_4, story_id_5 FROM main_story_data`
                );
                if (res && res[0] && res[0].rows) {
                    for (const row of res[0].rows) {
                        const msId = Number(row[0]);
                        for (let i = 1; i < row.length; i++) {
                            const stId = row[i];
                            if (stId) {
                                const stStr = String(stId);
                                if (stStr.startsWith("20") && stStr.length >= 8) {
                                    map.set("020" + stStr.slice(2), msId);
                                }
                                map.set(stStr, msId);
                            }
                        }
                    }
                }
            } catch (e) {
                logger.error(`Failed to query main_story_data: ${e}`);
            }
            return map;
        })();
    }
    return mainStoryMapPromise;
}

async function getSingleModeMapping(): Promise<Map<string, number>> {
    if (!singleModeMapPromise) {
        singleModeMapPromise = (async () => {
            const map = new Map<string, number>();
            try {
                const res = await SQLite.instance.queryMdb(
                    `SELECT short_story_id, story_id FROM single_mode_story_data WHERE short_story_id > 0`
                );
                if (res && res[0] && res[0].rows) {
                    for (const row of res[0].rows) {
                        map.set(String(row[0]), Number(row[1]));
                    }
                }
            } catch (e) {
                logger.error(`Failed to query single_mode_story_data: ${e}`);
            }
            return map;
        })();
    }
    return singleModeMapPromise;
}

async function getCampaignStoryMapping(): Promise<Map<string, number>> {
    if (!campaignStoryMapPromise) {
        campaignStoryMapPromise = (async () => {
            const map = new Map<string, number>();
            try {
                const res = await SQLite.instance.queryMdb(
                    `SELECT id, story_id FROM campaign_story_data`
                );
                if (res && res[0] && res[0].rows) {
                    for (const row of res[0].rows) {
                        map.set(String(row[0]), Number(row[1]));
                    }
                }
            } catch (e) {
                logger.error(`Failed to query campaign_story_data: ${e}`);
            }
            return map;
        })();
    }
    return campaignStoryMapPromise;
}

export default class StoriesTreeDataProvider extends RefreshableTreeDataProviderBase implements vscode.TreeDataProvider<vscode.TreeItem> {
    private static _instance?: StoriesTreeDataProvider;
    static get instance(): StoriesTreeDataProvider | undefined { return this._instance; }

    override refresh() {
        utils.invalidateTranslatedTextDataCache();
        super.refresh();
    }

    private async getGroupName(categoryId: string, groupId: string): Promise<string | undefined> {
        switch (+categoryId) {
            case 2:
                return (await utils.getTextDataCategoryCached(112))[+groupId];
            case 4:
            case 11:
            case 12:
            case 50:
            case 80: {
                if (config().get<boolean>("showTranslatedCharacterNames")) {
                    const translatedData = await utils.getTranslatedTextData();
                    if (translatedData && translatedData["6"]) {
                        const translatedName = translatedData["6"][groupId];
                        if (translatedName) {
                            return translatedName;
                        }
                    }
                }

                const characterNames = await utils.getTextDataCategoryCached(6);
                return characterNames[+groupId];
            }
            case 8:
            case 40:
                return (await utils.getTextDataCategoryCached(119))[+groupId]?.replaceAll("\\n", " ");
            case 9: {
                const map = await getEventStoryMapping();
                const eventId = map.get(groupId);
                if (eventId) {
                    return (await utils.getTextDataCategoryCached(189))[eventId];
                }
                break;
            }
            case 10: {
                const map = await getExtraStoryMapping();
                const extraId = map.get(groupId);
                if (extraId) {
                    return (await utils.getTextDataCategoryCached(221))[extraId];
                }
                break;
            }
            case 82:
            case 83: {
                const offset = +categoryId === 82 ? 20000 : 30000;
                return (await utils.getTextDataCategoryCached(76))[offset + (+groupId)];
            }
        }
    }

    private async getStoryName(categoryId: string, storyId: string) {
        switch (+categoryId) {
            case 2: {
                const map = await getMainStoryMapping();
                const msId = map.get(storyId);
                if (msId) {
                    const title = (await utils.getTextDataCategoryCached(94))[msId];
                    if (title) { return title; }
                }
                break;
            }
            case 4: {
                const title = (await utils.getTextDataCategoryCached(92))[+storyId];
                if (title) { return title; }
                break;
            }
            case 8: {
                const title = (await utils.getTextDataCategoryCached(119))[+storyId % 1000];
                if (title) { return title.replaceAll("\\n", " "); }
                break;
            }
            case 9: {
                const map = await getEventStoryMapping();
                const evRowId = map.get(storyId);
                if (evRowId) {
                    const title = (await utils.getTextDataCategoryCached(191))[evRowId];
                    if (title) { return title; }
                }
                break;
            }
            case 10: {
                const map = await getExtraStoryMapping();
                const exRowId = map.get(storyId);
                if (exRowId) {
                    const title = (await utils.getTextDataCategoryCached(222))[exRowId];
                    if (title) { return title; }
                }
                break;
            }
            case 11:
            case 12: {
                const map = await getCampaignStoryMapping();
                const targetStoryId = map.get(storyId) ?? +storyId;
                const title = (await utils.getTextDataCategoryCached(181))[targetStoryId];
                if (title) { return title; }
                break;
            }
            case 40: {
                const title = (await utils.getTextDataCategoryCached(119))[+storyId];
                if (title) { return title.replaceAll("\\n", " "); }
                break;
            }
        }
    
        const singleModeMap = await getSingleModeMapping();
        const mappedStoryId = singleModeMap.get(storyId) ?? +storyId;
        return (await utils.getTextDataCategoryCached(181))[mappedStoryId];
    }

    static register(_context: vscode.ExtensionContext): vscode.Disposable {
        const treeDataProvider = new StoriesTreeDataProvider;
        StoriesTreeDataProvider._instance = treeDataProvider;

        const treeView = vscode.window.createTreeView('stories', {
            treeDataProvider
        });

        treeDataProvider.initRefreshWatcher(treeView, async () => {
            const dir = await LocalizedDataManager.instancePromise
                .then(m => m.getPathUri("assets_dir", undefined, "story", "data"));
            if (!dir) { return; }
            return new vscode.RelativePattern(dir, "**/*.json");
        });

        return treeView;
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        await whenReady;

        const items: vscode.TreeItem[] = [];
        if (!element) {
            const result = await queryCategories();
            for (const [ id ] of result[0].rows) {
                let label = id;
                const name = categoryNames[id];
                if (name) {
                    label += ` ${name}`;
                }
                items.push({
                    id,
                    tooltip: id,
                    label,
                    collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
                });
            }
        }
        else {
            const components = element.id!.split("/");
            const level = components.length as TreeLevel;
            const [ categoryId, groupId ] = components;

            switch (level) {
                case TreeLevel.Category: {
                    const result = await queryGroups(categoryId);
                    for (const [ groupId ] of result[0].rows) {
                        const itemId = `${categoryId}/${groupId}`;
                        let label = groupId;
                        const name = await this.getGroupName(categoryId, groupId);
                        if (name) {
                            label += ` ${name}`;
                        }
                        items.push({
                            id: itemId,
                            tooltip: itemId,
                            label,
                            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
                        });
                    }
                    break;
                }
                case TreeLevel.Group: {
                    const ldManager = LocalizedDataManager.instance!;
                    const result = await queryStories(categoryId, groupId);
                    for (const [ storyId ] of result[0].rows) {
                        const itemId = `${categoryId}/${groupId}/${storyId}`;
                        let label = storyId.slice(6);
                        const name = await this.getStoryName(categoryId, storyId);
                        if (name) {
                            label += ` ${name}`;
                        }

                        const dictPath = await ldManager.getPathUri("assets_dir", undefined,
                            "story", "data", categoryId, groupId, `storytimeline_${storyId}.json`);
                        const status = await utils.getEntryStatus(dictPath);

                        items.push({
                            id: itemId,
                            tooltip: itemId,
                            label: utils.makeStatusLabel(label, status),
                            command: {
                                title: vscode.l10n.t("Open Story Editor"),
                                command: "zokuzoku.openStoryEditor",
                                arguments: [ "story", storyId ]
                            }
                        });
                    }
                    break;
                }
            }
        }

        return items;
    }
}
