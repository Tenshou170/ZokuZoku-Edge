import { wrapText } from "hachimi_lib";
import type { ControllerMessage, IEntryTreeNode, ITextSlot, ITreeNode, StoryEditorConfig, TreeNodeId } from "./sharedTypes";
import { currentNav, currentPath, currentTextSlots, selectedNodes } from "./stores";
import { vscode } from "./vscode";

export function findNodeByPath(path: TreeNodeId[], nodes: ITreeNode[]): [ITreeNode, ITreeNode[]] | null {
    if (!path.length) return null;

    for (const node of nodes) {
        if (node.id == path[0]) {
            if (path.length == 1) {
                return [ node, nodes ];
            }
            else if (node.type == "category") {
                return findNodeByPath(path.slice(1), node.children)
            }
            else {
                return null;
            }
        }
    }

    return null;
}

export function getNodeTlContent(entryPath: TreeNodeId[], contentCount: number): Promise<(string | null)[]> {
    return new Promise(resolve => {
        const res: (string | null)[] = [];
        const setIndexes = new Set<number>();
        const onMessage = (e: MessageEvent) => {
            const message: ControllerMessage = e.data;
            if (message.type == "setTextSlotContent" &&
                message.entryPath.join("/") == entryPath.join("/"))
            {
                res[message.index] = message.content;
                setIndexes.add(message.index);
                if (setIndexes.size == contentCount) {
                    resolve(res);
                    window.removeEventListener("message", onMessage);
                }
            }
        };
        window.addEventListener("message", onMessage);
        for (let i = 0; i < contentCount; ++i) {
            vscode.postMessage({
                type: "getTextSlotContent",
                entryPath,
                index: i
            });
        }
    });
}

export function gotoNode(node: ITreeNode, path: TreeNodeId[]) {
    if (node.type != "entry") return;
    selectedNodes.update(() => ({ [path.join("/")]: node.content.length }));
    currentPath.update(() => path);
    currentTextSlots.update(() => node.content);
    currentNav.update(() => ({
        next: node.next,
        prev: node.prev
    }));
}

export function translatedSlotProps(slot: ITextSlot) {
    return {
        ...slot,
        content: null,
        postContent: true
    }
}

export function makeContentDisplayValue(
    value: string | null, lineWidth: number, config: StoryEditorConfig | null, readonly: boolean
) {
    const val = value?.replace(/\\n/g, "\n").replace(/<n>/gi, " ") ?? "";
    return config?.noWrap === false && config.lineWidthMultiplier ?
        wrapText(val, lineWidth, config.lineWidthMultiplier).join("\n") :
        val;
}

export function highlightTags(text: string | null): string {
    if (!text) return "";
    const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // highlight game tags and line-break markers
    return escaped.replace(
        /(&lt;\/?[a-zA-Z_][\w]*(?:\s*=\s*[^&<>]*)?\&gt;|\\n|\\\\n)/g,
        '<span class="tag-highlight">$1</span>',
    );
}

export function isNodeFullyFilled(
    node: IEntryTreeNode,
    translations: string[] | undefined,
): boolean {
    if (!translations || !node.content || node.content.length === 0) {
        return false;
    }
    for (let i = 0; i < node.content.length; i++) {
        const slot = node.content[i];
        const original = slot?.content;
        if (original && original.trim().length > 0) {
            const tl = translations[i];
            if (!tl || tl.trim().length === 0) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Percentage of translatable slots that have a non-empty translation.
 * Only slots whose original text is non-empty count towards the total.
 */
export function computeProgress(
    nodes: ITreeNode[],
    translationMap: { [pathStr: string]: string[] },
    excludeIds?: Set<string>,
): number {
    const entryList: { node: IEntryTreeNode, pathStr: string }[] = [];
    function collect(list: ITreeNode[], parentPath: string[] = []) {
        for (const n of list) {
            const currentPath = [...parentPath, String(n.id)];
            if (n.type === "entry") {
                if (!excludeIds || !excludeIds.has(String(n.id))) {
                    entryList.push({ node: n, pathStr: currentPath.join("/") });
                }
            } else if (n.type === "category") {
                collect(n.children, currentPath);
            }
        }
    }
    collect(nodes);

    if (entryList.length === 0) {
        return 0;
    }

    let totalSlots = 0;
    let filledSlots = 0;

    for (const { node, pathStr } of entryList) {
        const translations = translationMap[pathStr] || translationMap[node.id.toString()];
        if (!node.content) continue;

        for (let i = 0; i < node.content.length; i++) {
            const slot = node.content[i];
            const original = slot?.content;
            if (original && original.trim().length > 0) {
                totalSlots++;
                const tl = translations?.[i];
                if (tl && tl.trim().length > 0) {
                    filledSlots++;
                }
            }
        }
    }

    if (totalSlots === 0) {
        return 0;
    }

    return Math.round((filledSlots / totalSlots) * 100);
}

/**
 * Snapshots the currently focused editor's input values into the translation
 * map so progress stays accurate for text typed but not yet round-tripped
 * through the extension host.
 */
export function updateTranslationsFromDOM(
    path: TreeNodeId[] | undefined,
    translationMap: { [pathStr: string]: string[] },
): boolean {
    if (!path || path.length === 0) return false;
    const pathStr = path.join("/");
    const elements = document.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement
    >("input:not([readonly]), textarea:not([readonly])");
    if (elements.length > 0) {
        if (!translationMap[pathStr]) {
            translationMap[pathStr] = [];
        }
        elements.forEach((el, idx) => {
            translationMap[pathStr][idx] = el.value;
        });
        return true;
    }
    return false;
}