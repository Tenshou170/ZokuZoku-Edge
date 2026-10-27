<script lang="ts">
    import { tick } from "svelte";
    import type { TreeNodeId } from "../sharedTypes";
    import { highlightTags } from "../utils";

    export let readonly: boolean;
    export let multiline: boolean;
    export let link: TreeNodeId | null;
    export let active: boolean;
    export let value: string | null;
    export let placeholder: string;
    export let title: string | null;
    export let userData: any = undefined;
    export let noWrap = false;
    export let autoFocus: boolean = false;

    let textareaEl: HTMLTextAreaElement | null = null;

    $: if (autoFocus && textareaEl) {
        tick().then(() => {
            if (textareaEl) {
                textareaEl.focus();
                const len = textareaEl.value.length;
                textareaEl.setSelectionRange(len, len);
            }
        });
    }

    // unused
    const _ = userData;

    const slotId = `text-slot-${Math.random().toString(36).slice(2, 9)}`;

    $: label = title
        ? title.replace(" (Ctrl + Click to follow link...)", "").trim()
        : "";
    $: isDialogue = label === "DIALOGUE" || userData?.type === 1;
    $: ariaLabel = label || placeholder || "Text slot";
</script>

<div class="slot-wrapper" class:multiline class:dialogue={isDialogue}>
    {#if label}
        <div class="slot-label" id="{slotId}-label">
            {label}
        </div>
    {/if}
    {#if readonly}
        <div
            class="text-slot formatted-slot"
            class:link
            class:active
            class:multiline
            {title}
            role="textbox"
            aria-readonly="true"
            aria-label={ariaLabel}
            tabindex="-1"
            data-slot-type={userData?.type}
            on:focus
            on:blur
            on:keydown
            on:mousemove
            on:click
        >
            {@html highlightTags(value)}
        </div>
    {:else if multiline}
        <textarea
            bind:this={textareaEl}
            class="text-slot"
            class:link
            class:active
            class:no-wrap={noWrap}
            bind:value
            {placeholder}
            {title}
            aria-label={ariaLabel}
            data-slot-type={userData?.type}
            on:focus
            on:blur
            on:keydown
            on:mousemove
            on:click
        ></textarea>
    {:else}
        <input
            type="text"
            class="text-slot"
            class:link
            class:active
            bind:value
            {placeholder}
            {title}
            aria-label={ariaLabel}
            data-slot-type={userData?.type}
            on:focus
            on:blur
            on:keydown
            on:mousemove
            on:click
        />
    {/if}
</div>

<style>
    .slot-wrapper {
        display: flex;
        flex-direction: column;
        border-top: 1px solid var(--vscode-tree-inactiveIndentGuidesStroke);
    }
    .slot-wrapper.multiline {
        flex-grow: 1;
    }
    .slot-label {
        font-family: var(--vscode-font-family);
        font-size: 11px;
        font-weight: 400;
        text-transform: uppercase;
        padding: 6px 20px 0px 20px;
        color: var(--vscode-foreground);
        user-select: none;
    }
    .text-slot {
        font-family: unset;
        font-size: 20px;
        line-height: 1.5;
        padding: 6px 20px 16px 20px;
        min-height: 28px;
        border: none;
        appearance: none;
        outline: none;
        background-color: unset;
        color: unset;
        resize: none;
        box-sizing: border-box;
    }
    .slot-label + .text-slot {
        padding-top: 2px;
    }
    .slot-wrapper.dialogue .text-slot {
        min-height: 160px;
    }
    div.formatted-slot {
        white-space: pre-wrap;
        word-break: break-word;
        user-select: text;
        cursor: text;
    }
    div.formatted-slot.multiline {
        flex-grow: 1;
    }
    :global(.tag-highlight) {
        color: #ce9178;
        font-weight: 600;
    }
    textarea.text-slot {
        flex-grow: 1;
        white-space: pre-wrap;
    }
    textarea.text-slot.no-wrap {
        white-space: pre;
    }
    .text-slot.link:read-only:hover {
        text-decoration: underline;
    }
    .text-slot.link.active:hover {
        cursor: pointer;
        text-decoration: underline;
        color: var(--vscode-editorLink-activeForeground);
    }
</style>
