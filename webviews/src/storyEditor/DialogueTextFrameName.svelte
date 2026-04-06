<script lang="ts">
    import type { TreeNodeId } from "../sharedTypes";

    export let readonly: boolean;
    export let multiline: boolean;
    export let link: TreeNodeId | null;
    export let active: boolean;
    export let value: string | null;
    export let placeholder: string;
    export let title: string | null;
    export const userData: any = undefined;

    // unused
    const _ = { readonly, multiline, link, active, placeholder };
</script>

<div class="name-outer" {title} role="button" tabindex="0" on:focus on:blur on:keydown={(e) => (e.key === "Enter" || e.key === " ") && e.currentTarget.click()} on:keydown on:mousemove on:click>
    <div class="name">{value ?? ""}</div>
</div>
<div class="name-bg"></div>

<style>
    .name-outer {
        background-color: #66d713;
        width: 43.24%;
        aspect-ratio: 467/70;
        position: absolute;
        top: -0.8654%;
        left: 6.2037%;
        z-index: 2;
        border-radius: 6.42%/50%;
        overflow: visible;
        color: #fff;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .name {
        font-family: "CustomFont", var(--vscode-font-family);
        white-space: nowrap;
        min-height: 0;
        font-size: 13.782cqh;
        line-height: 22.4359cqh;
    }
    .name-bg {
        background-color: #25c4a4;
        width: 43.24%;
        aspect-ratio: 467/70;
        position: absolute;
        top: -0.8654%;
        left: 6.2037%;
        z-index: 1;
        border-radius: 6.42%/50%;
        rotate: -3deg;
        min-height: 0;
    }
</style>