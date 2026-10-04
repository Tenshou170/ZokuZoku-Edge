<script lang="ts">
    import { currentPath, tlProgress } from "../stores";
    import type { IPanelAction } from "../types";
    import { vscode } from "../vscode";
    import PanelTitle from "./PanelTitle.svelte";
    import TranslatedViewInner from "./TranslatedViewInner.svelte";
    import * as l10n from "@vscode/l10n";

    export let inner: any = TranslatedViewInner;

    let actions: (IPanelAction | null)[] | undefined;
    let charCount: number | undefined;

    function onActionsUpdate(event: CustomEvent<(IPanelAction | null)[] | undefined>) {
        actions = event.detail;
    }

    function onCharCountUpdate(event: CustomEvent<number | undefined>) {
        charCount = event.detail;
    }

    $: vscode.postMessage({
        type: "subscribePath",
        path: $currentPath
    });
</script>

<div class="translated-view">
    <PanelTitle label={l10n.t("Translated")} actions={actions} charCount={charCount} tlProgress={$tlProgress} />
    <svelte:component this={inner} on:updateActions={onActionsUpdate} on:updateCharCount={onCharCountUpdate} />
</div>

<style>
    .translated-view {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
    }
</style>