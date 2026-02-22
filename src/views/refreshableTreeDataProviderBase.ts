import * as vscode from 'vscode';

export default class RefreshableTreeDataProviderBase {
    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire(null);
    }

    protected initRefreshWatcher(
        treeView: vscode.TreeView<any>,
        getPattern: () => vscode.GlobPattern | undefined | Promise<vscode.GlobPattern | undefined>
    ) {
        let watcher:  vscode.FileSystemWatcher | null = null;
        treeView.onDidChangeVisibility(async e => {
            if (e.visible) {
                 this.refresh();
                 const pattern = await getPattern();
                if (!pattern) { return; }
                watcher = vscode.workspace.createFileSystemWatcher(pattern);
                watcher.onDidCreate(() => this.refresh());
                watcher.onDidDelete(() => this.refresh());
            }
            else {
                watcher?.dispose();
            }
        });
    }
}