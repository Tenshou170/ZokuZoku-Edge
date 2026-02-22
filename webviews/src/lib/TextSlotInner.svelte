<script lang="ts">
  import type { TreeNodeId } from "../sharedTypes";

  export let readonly: boolean;
  export let multiline: boolean;
  export let link: TreeNodeId | null;
  export let active: boolean;
  export let value: string | null;
  export let placeholder: string;
  export let title: string | null;
  export let userData: any = undefined;
  export let noWrap = false;

  // unused
  const _ = userData;
</script>

{#if multiline}
  <textarea
    class="text-slot"
    {readonly}
    class:link
    class:active
    class:no-wrap={noWrap}
    bind:value
    {placeholder}
    {title}
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
    {readonly}
    class:link
    class:active
    bind:value
    {placeholder}
    {title}
    on:focus
    on:blur
    on:keydown
    on:mousemove
    on:click
  />
{/if}

<style>
  .text-slot {
    font-family: unset;
    font-size: 20px;
    padding: 10px 20px;
    min-height: 28px;
    border: none;
    border-top: 1px solid var(--vscode-tree-inactiveIndentGuidesStroke);
    appearance: none;
    outline: none;
    background-color: unset;
    color: unset;
    resize: none;
  }
  textarea.text-slot {
    flex-grow: 1;
    white-space: pre-wrap;
    min-height: 120px;
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
