import * as vscode from "vscode";

import StoriesTreeDataProvider from "./storiesTreeDataProvider";
import HomeStoriesTreeDataProvider from "./homeStoriesTreeDataProvider";
import MainStoriesTreeDataProvider from "./mainStoryTreeDataProvider";
import MdbTreeDataProvider from "./mdbTreeDataProvider";
import LyricsTreeDataProvider from "./lyricsTreeDataProvider";

export function refreshStoriesView() {
    StoriesTreeDataProvider.instance?.refresh();
}

export function refreshAllViews() {
    StoriesTreeDataProvider.instance?.refresh();
    HomeStoriesTreeDataProvider.instance?.refresh();
    MainStoriesTreeDataProvider.instance?.refresh();
    LyricsTreeDataProvider.instance?.refresh();
}

export function registerViews(context: vscode.ExtensionContext): vscode.Disposable[] {
    return [
        StoriesTreeDataProvider.register(context),
        HomeStoriesTreeDataProvider.register(context),
        MainStoriesTreeDataProvider.register(context),
        MdbTreeDataProvider.register(context),
        LyricsTreeDataProvider.register(context)
    ];
}