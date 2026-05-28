<script lang="ts">
  import {
    StoryTextSlotType,
    type ControllerMessage,
    type IStoryTextSlot,
  } from "../sharedTypes";
  import { currentPath, currentTextSlots } from "../stores";
  import { vscode } from "../vscode";

  export let content: string;
  export let translated: boolean = false;
  export let sizeMultiplier: number = 1;

  $: ({ colorTextList, startSlot } = updateColorText($currentTextSlots));
  $: display = makeDisplay(content, colorTextList);

  function updateColorText(textSlots: IStoryTextSlot[]) {
    let colorTextList: string[] = [];
    let startSlot = textSlots.length;

    for (let i = 2; i < textSlots.length; ++i) {
      const slot = textSlots[i];
      if (slot.userData?.type == StoryTextSlotType.ColorText) {
        if (startSlot == textSlots.length) startSlot = i;
        if (translated) {
          colorTextList.push("");
          vscode.postMessage({
            type: "getTextSlotContent",
            entryPath: $currentPath,
            index: i,
          });
        } else {
          colorTextList.push(slot.content);
        }
      }
    }

    return { colorTextList, startSlot };
  }

  interface Section {
    chunk: string;
    isColorText: boolean;
    size?: number;
    color?: string;
    italic?: boolean;
    bold?: boolean;
    isTemplate?: boolean;
    isLayoutFilter?: boolean;
  }

  function makeDisplay(content: string, colorTextList: string[]) {
    const res: Section[] = [];
    let current = "";
    let size: number | undefined;
    let activeColors: string[] = [];
    let bold = false;
    let italic = false;
    let i = 0;

    const pushCurrent = (isColorText: boolean = false) => {
      if (current) {
        res.push({
          chunk: current,
          isColorText,
          size,
          color: activeColors[activeColors.length - 1],
          italic,
          bold,
        });
        current = "";
      }
    };

    while (i < content.length) {
      // 1. Check for ColorText slots first
      let matchedColorText = "";
      for (const text of colorTextList) {
        if (text && content.startsWith(text, i)) {
          // If multiple matches, take the longest one (best effort)
          if (text.length > matchedColorText.length) {
            matchedColorText = text;
          }
        }
      }

      if (matchedColorText) {
        pushCurrent(false);
        current = matchedColorText;
        pushCurrent(true);
        i += matchedColorText.length;
        continue;
      }

      // 2. Handle Template Expressions
      if (content.startsWith("$(", i)) {
        pushCurrent(false);
        const end = content.indexOf(")", i);
        if (end !== -1) {
          const expr = content.substring(i, end + 1);
          const filterName = content.substring(i + 2, end).trim().split(" ")[0];
          const isLayoutFilter = ["nb", "anchor", "scale", "ho", "vo", "ls", "ub", "bf", "bestfit", "min", "max", "oob"].includes(filterName);
          res.push({
            chunk: expr,
            isColorText: false,
            size,
            color: activeColors[activeColors.length - 1],
            italic,
            bold,
            isTemplate: true,
            isLayoutFilter
          });
          i = end + 1;
          continue;
        }
      }

      // 3. Handle Tags
      if (content.startsWith("<size=", i)) {
        pushCurrent(false);
        const end = content.indexOf(">", i);
        if (end !== -1) {
          size = +content.substring(i + 6, end) * sizeMultiplier;
          i = end + 1;
        } else {
          current += content[i];
          i++;
        }
      } else if (content.startsWith("</size>", i)) {
        pushCurrent(false);
        size = undefined;
        i += 7;
      } else if (content.startsWith("<color=", i)) {
        pushCurrent(false);
        const end = content.indexOf(">", i);
        if (end !== -1) {
          activeColors.push(content.substring(i + 7, end));
          i = end + 1;
        } else {
          current += content[i];
          i++;
        }
      } else if (content.startsWith("</color>", i)) {
        pushCurrent(false);
        activeColors.pop();
        i += 8;
      } else if (content.startsWith("<b>", i)) {
        pushCurrent(false);
        bold = true;
        i += 3;
      } else if (content.startsWith("</b>", i)) {
        pushCurrent(false);
        bold = false;
        i += 4;
      } else if (content.startsWith("<i>", i)) {
        pushCurrent(false);
        italic = true;
        i += 3;
      } else if (content.startsWith("</i>", i)) {
        pushCurrent(false);
        italic = false;
        i += 4;
      } else {
        current += content[i];
        i++;
      }
    }

    pushCurrent(false);
    return res;
  }

  let onMessage: ((e: MessageEvent<ControllerMessage>) => void) | undefined;
  if (translated) {
    onMessage = (e) => {
      const message = e.data;
      if (message.type == "setTextSlotContent") {
        if (
          message.entryPath.join("/") == $currentPath.join("/") &&
          message.index >= startSlot
        ) {
          colorTextList[message.index - startSlot] = message.content ?? "";
        }
      }
    };
  }
</script>

<svelte:window on:message={onMessage} />

{#each display as { chunk, isColorText, size, color, italic, bold, isTemplate, isLayoutFilter }}
  {#if isTemplate}
    {#if !isLayoutFilter}
      <span
        class="template-var"
        style:font-size={size != null ? `${size}cqh` : undefined}
        style:font-style={italic ? "italic" : undefined}
        style:color={color ? color : undefined}
        style:font-weight={bold ? "800" : undefined}
        style:text-shadow={bold ? "0.4px 0px 0px currentColor" : undefined}
        >{chunk}</span
      >
    {/if}
  {:else}
    <span
      class:color-text={isColorText && !color}
      style:font-size={size != null ? `${size}cqh` : undefined}
      style:font-style={italic ? "italic" : undefined}
      style:color={color ? color : undefined}
      style:font-weight={bold ? "800" : undefined}
      style:text-shadow={bold ? "0.4px 0px 0px currentColor" : undefined}
      >{chunk}</span
    >
  {/if}
{/each}

<style>
  .color-text {
    color: #ff911c;
  }
  .template-var {
    color: #4fc3f7;
    background: rgba(79, 195, 247, 0.15);
    border-radius: 3px;
    padding: 0 3px;
    font-weight: 500;
  }
</style>
