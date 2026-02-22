<script lang="ts">
  import TextSlot from "../lib/TextSlot.svelte";
  import { currentPath, currentTextSlots } from "../stores";
  import { translatedSlotProps } from "../utils";
  import StoryTextFrameContent from "./StoryTextFrameContent.svelte";
  import StoryTextFrameName from "./StoryTextFrameName.svelte";

  export let translated: boolean = false;
</script>

<div class="text-frame">
  {#if $currentTextSlots.length >= 2}
    {#if translated}
      <TextSlot
        inner={StoryTextFrameName}
        {...translatedSlotProps($currentTextSlots[0])}
        index={0}
        entryPath={$currentPath}
      />
      <TextSlot
        inner={StoryTextFrameContent}
        {...translatedSlotProps($currentTextSlots[1])}
        index={1}
        entryPath={$currentPath}
      />
    {:else}
      <TextSlot inner={StoryTextFrameName} readonly {...$currentTextSlots[0]} />
      <TextSlot
        inner={StoryTextFrameContent}
        readonly
        {...$currentTextSlots[1]}
      />
    {/if}
  {/if}
</div>

<style>
  /* name font size 44 */
  /* content font size 41 */
  /* content rel pos x 0.5 y 0.61261261261 */
  /* name box width 44.8895% */
  .text-frame {
    margin: 2.22%;
    margin-top: 2%;
    position: relative;
    aspect-ratio: 1448/222;
    container-type: size;
  }
</style>
