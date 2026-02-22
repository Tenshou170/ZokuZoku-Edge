<script lang="ts">
  import OriginalView from "./OriginalView.svelte";
  import TranslatedView from "./TranslatedView.svelte";
</script>

<div class="editor">
  <OriginalView />
  <TranslatedView />
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
