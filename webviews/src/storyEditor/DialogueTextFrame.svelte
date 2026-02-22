<script lang="ts">
  import TextSlot from "../lib/TextSlot.svelte";
  import { currentPath, currentTextSlots } from "../stores";
  import { translatedSlotProps } from "../utils";
  import DialogueTextFrameContent from "./DialogueTextFrameContent.svelte";
  import DialogueTextFrameName from "./DialogueTextFrameName.svelte";

  export let translated: boolean = false;
</script>

<div class="text-frame">
  {#if $currentTextSlots.length >= 2}
    {#if translated}
      <TextSlot
        inner={DialogueTextFrameName}
        {...translatedSlotProps($currentTextSlots[0])}
        index={0}
        entryPath={$currentPath}
      />
      <TextSlot
        inner={DialogueTextFrameContent}
        {...translatedSlotProps($currentTextSlots[1])}
        index={1}
        entryPath={$currentPath}
      />
    {:else}
      <TextSlot
        inner={DialogueTextFrameName}
        readonly
        {...$currentTextSlots[0]}
      />
      <TextSlot
        inner={DialogueTextFrameContent}
        readonly
        {...$currentTextSlots[1]}
      />
    {/if}
  {/if}
</div>

<style>
  .text-frame {
    padding: 2.22%;
    margin-top: 2%;
    position: relative;
    aspect-ratio: 43/13;
    container-type: size;
  }
</style>
