<script lang="ts">
  export let content: string;
  export let sizeMultiplier: number;
  $: display = makeDisplay(content.replace(/\\n/g, "\n"));

  interface Section {
    chunk: string;
    size?: number;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    isTemplate?: boolean;
    isLayoutFilter?: boolean;
  }

  interface TagState {
    type: "size" | "color" | "b" | "i";
    value?: any;
  }

  function makeDisplay(content: string) {
    const res: Section[] = [];
    let current = "";
    let size: number | undefined;
    let activeColors: string[] = [];
    let boldCount = 0;
    let italicCount = 0;
    let i = 0;

    const pushCurrent = () => {
      if (current) {
        res.push({
          chunk: current,
          size,
          color: activeColors[activeColors.length - 1],
          bold: boldCount > 0,
          italic: italicCount > 0,
        });
        current = "";
      }
    };

    while (i < content.length) {
      // Handle Template Expressions
      if (content.startsWith("$(", i)) {
        pushCurrent();
        const end = content.indexOf(")", i);
        if (end !== -1) {
          const expr = content.substring(i, end + 1);
          const filterName = content.substring(i + 2, end).trim().split(" ")[0];
          const isLayoutFilter = ["nb", "anchor", "scale", "ho", "vo", "ls", "ub", "bf", "bestfit", "min", "max", "oob"].includes(filterName);
          res.push({
            chunk: expr,
            size,
            color: activeColors[activeColors.length - 1],
            bold: boldCount > 0,
            italic: italicCount > 0,
            isTemplate: true,
            isLayoutFilter
          });
          i = end + 1;
          continue;
        }
      }

      if (content.startsWith("<size=", i)) {
        pushCurrent();
        const end = content.indexOf(">", i);
        if (end !== -1) {
          size = +content.substring(i + 6, end) * sizeMultiplier;
          i = end + 1;
        } else {
          current += content[i];
          i++;
        }
      } else if (content.startsWith("</size>", i)) {
        pushCurrent();
        size = undefined;
        i += 7;
      } else if (content.startsWith("<color=", i)) {
        pushCurrent();
        const end = content.indexOf(">", i);
        if (end !== -1) {
          activeColors.push(content.substring(i + 7, end));
          i = end + 1;
        } else {
          current += content[i];
          i++;
        }
      } else if (content.startsWith("</color>", i)) {
        pushCurrent();
        activeColors.pop();
        i += 8;
      } else if (content.startsWith("<b>", i)) {
        pushCurrent();
        boldCount++;
        i += 3;
      } else if (content.startsWith("</b>", i)) {
        pushCurrent();
        boldCount = Math.max(0, boldCount - 1);
        i += 4;
      } else if (content.startsWith("<i>", i)) {
        pushCurrent();
        italicCount++;
        i += 3;
      } else if (content.startsWith("</i>", i)) {
        pushCurrent();
        italicCount = Math.max(0, italicCount - 1);
        i += 4;
      } else {
        current += content[i];
        i++;
      }
    }

    pushCurrent();
    return res;
  }
</script>

{#each display as { chunk, size, color, bold, italic, isTemplate, isLayoutFilter }}
  {#if isTemplate}
    {#if !isLayoutFilter}
      <span
        class="template-var"
        style:font-size={size != null ? `${size}cqh` : undefined}
        style:color
        style:font-weight={bold ? "800" : undefined}
        style:text-shadow={bold ? "0.4px 0px 0px currentColor" : undefined}
        style:font-style={italic ? "italic" : undefined}>{chunk}</span
      >
    {/if}
  {:else}
    <span
      style:font-size={size != null ? `${size}cqh` : undefined}
      style:color
      style:font-weight={bold ? "800" : undefined}
      style:text-shadow={bold ? "0.4px 0px 0px currentColor" : undefined}
      style:font-style={italic ? "italic" : undefined}>{chunk}</span
    >
  {/if}
{/each}

<style>
  .template-var {
    color: #4fc3f7;
    background: rgba(79, 195, 247, 0.15);
    border-radius: 3px;
    padding: 0 3px;
    font-weight: 500;
  }
</style>
