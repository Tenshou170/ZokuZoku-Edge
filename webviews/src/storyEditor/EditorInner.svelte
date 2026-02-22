<script lang="ts">
  import OriginalView from "../lib/OriginalView.svelte";
  import TranslatedView from "../lib/TranslatedView.svelte";
  import OriginalViewInner from "./OriginalViewInner.svelte";
  import TranslatedViewInner from "./TranslatedViewInner.svelte";
</script>

<div class="editor">
  <OriginalView inner={OriginalViewInner} />
  <TranslatedView inner={TranslatedViewInner} />
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: auto;
    min-width: 200px;
  }
</style>
