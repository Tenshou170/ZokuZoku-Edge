<script lang="ts">
    import type { IPanelAction } from "../types";
    import * as l10n from "@vscode/l10n";

    export let label = l10n.t("Panel");
    export let actions: (IPanelAction | null)[] = [];
    export let charCount: number | undefined = undefined;
    export let tlProgress: number | undefined = undefined;
</script>

<div class="title">
    <div class="title-label" title={label}>
        {label}
    </div>
    {#if tlProgress !== undefined}
        <span class="tl-progress" title={l10n.t("Translation progress")}>{tlProgress}%</span>
    {/if}
    {#if charCount !== undefined}
        <span class="char-count" title={l10n.t("Character count")}>{charCount}</span>
    {/if}
    <div class="actions-container">
        {#each actions as action}
            {#if action == null}
                <div class="separator"></div>
            {:else}
                <button type="button" title={action.tooltip}
                    class="codicon codicon-{action.icon}" on:click={action.onClick}>
                </button>
            {/if}
        {/each}
    </div>
</div>

<style>
    .title {
        box-sizing: border-box;
        padding: 0 8px;
        height: 35px;
        display: flex;
        align-items: center;
        color: var(--vscode-foreground);
        user-select: none;
        flex-shrink: 0;
    }

    .title-label {
        padding-left: 12px;
        padding-right: 4px;
        font-size: 11px;
        font-weight: 400;
        text-transform: uppercase;
        flex-grow: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .tl-progress,
    .char-count {
        font-size: 11px;
        color: var(--vscode-descriptionForeground, rgba(204, 204, 204, 0.7));
        margin-right: 8px;
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
    }

    .actions-container {
        display: flex;
    }

    .actions-container button {
        margin-right: 4px;
        padding: 3px;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        overflow: visible;
        text-align: center;
        cursor: pointer;
        border: none;
        background: transparent;
        color: inherit;
    }
    
    .actions-container button:hover {
        background-color: rgba(90, 93, 94, 0.31);
        border-radius: 5px;
    }

    .separator {
        width: 0;
        height: 22px;
        border-left: 1px dashed var(--vscode-foreground);
        margin: 0 12px 0 8px;
        flex: 0 0 auto;
    }
</style>