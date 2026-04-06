<script lang="ts">
    import { makeContentDisplayValue } from "../utils";
    import { config } from "./stores";
    import ColorText from "./ColorText.svelte";

    export let readonly: boolean;
    export let multiline: boolean;
    export let link: TreeNodeId | null;
    export let active: boolean;
    export let value: string | null;
    export let placeholder: string;
    export let title: string | null;
    export const userData: any = undefined;

    // unused
    const _ = { multiline, link, active, placeholder };

    $: fontSize = 18.4685 * ($config?.fontSizeMultiplier ?? 1);
    $: lineWidth = Math.round(32 / ($config?.fontSizeMultiplier ?? 1));
    $: lineHeight = 1.5 * ($config?.lineSpacingMultiplier ?? 1);

    $: displayValue = makeContentDisplayValue(value, lineWidth, $config, readonly);
</script>

<div class="content-outer">
    <div class="content" {title} on:focus on:blur on:keydown on:mousemove on:click
        style="font-size: {fontSize}cqh; line-height: {lineHeight};">
        <ColorText content={displayValue} translated={!readonly} />
    </div>
</div>

<style>
    .content-outer {
        display: flex;
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
        position: absolute;
        top: 11.2613%;
    }
    .content {
        font-family: "CustomFont", var(--vscode-font-family);
        color: #fff;
        min-width: 0;
        flex: 0 0 auto;
        white-space: pre;
        letter-spacing: -0.01515152em;
    }
</style>