<script lang="ts">
  import { makeContentDisplayValue } from "./utils";
  import type { TreeNodeId } from "../sharedTypes";
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

  $: fontSize = 13.78 * ($config?.fontSizeMultiplier ?? 1);
  $: lineWidth = Math.round(21 / ($config?.fontSizeMultiplier ?? 1));
  $: lineHeight = 1.5 * ($config?.lineSpacingMultiplier ?? 1);

  $: displayValue = makeContentDisplayValue(
    value,
    lineWidth,
    $config,
    readonly,
  );
</script>

<div
  class="content"
  {title}
  on:focus
  on:blur
  on:keydown
  on:mousemove
  on:click
  style="font-size: {fontSize}cqh; line-height: {lineHeight};"
>
  <ColorText content={displayValue} translated={!readonly} />
</div>

<style>
  .content {
    font-family: "CustomFont", var(--vscode-font-family);
    background-color: rgba(255, 255, 255, 0.9);
    aspect-ratio: 43/13;
    border: 1.282cqh solid #68d25d;
    box-sizing: border-box;
    border-radius: 14.34%/50%;
    overflow: visible;
    white-space: pre;
    /*font-size: 13.78cqh;*/
    padding: 22.7564cqh 7.1705cqw;
    color: #794016;
    /*line-height: 20.51cqh;*/
    letter-spacing: -0.01515152em;
    min-height: 0;
  }
</style>
