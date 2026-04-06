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

<div class="name" {title} role="button" tabindex="0" on:focus on:blur on:keydown={(e) => (e.key === "Enter" || e.key === " ") && e.currentTarget.click()} on:keydown on:mousemove on:click>{value ?? ""}</div>
<div class="name-bg"></div>

<style>
    .name {
        font-family: "CustomFont", var(--vscode-font-family);
        width: 44.8895%;
        font-size: 19.8198cqh;
        text-align: center;
        position: absolute;
        top: 4.054%;
        left: 0;
        line-height: 1;
        overflow: visible;
        color: #fff;
    }
    .name-bg {
        position: absolute;
        top: 22.5225%;
        left: 3.3149%;
        width: 38.3287%;
        height: 3.6036%;
        background-image: linear-gradient(to right,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.6) 20%,
            rgba(255, 255, 255, 0.6) 80%,
            rgba(255, 255, 255, 0.1)
        );
    }
</style>