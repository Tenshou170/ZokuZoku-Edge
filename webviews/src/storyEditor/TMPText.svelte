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

    while (i < content.length) {
      if (content.startsWith("<size=", i)) {
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
        const end = content.indexOf(">", i);
        if (end !== -1) {
          size = +content.substring(i + 6, end) * sizeMultiplier;
          i = end + 1;
        } else {
          current += content[i];
          i++;
        }
      } else if (content.startsWith("</size>", i)) {
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
        size = undefined;
        i += 7;
      } else if (content.startsWith("<color=", i)) {
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
        const end = content.indexOf(">", i);
        if (end !== -1) {
          activeColors.push(content.substring(i + 7, end));
          i = end + 1;
        } else {
          current += content[i];
          i++;
        }
      } else if (content.startsWith("</color>", i)) {
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
        activeColors.pop();
        i += 8;
      } else if (content.startsWith("<b>", i)) {
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
        boldCount++;
        i += 3;
      } else if (content.startsWith("</b>", i)) {
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
        boldCount = Math.max(0, boldCount - 1);
        i += 4;
      } else if (content.startsWith("<i>", i)) {
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
        italicCount++;
        i += 3;
      } else if (content.startsWith("</i>", i)) {
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
        italicCount = Math.max(0, italicCount - 1);
        i += 4;
      } else {
        current += content[i];
        i++;
      }
    }

    if (current) {
      res.push({
        chunk: current,
        size,
        color: activeColors[activeColors.length - 1],
        bold: boldCount > 0,
        italic: italicCount > 0,
      });
    }

    return res;
  }
</script>

{#each display as { chunk, size, color, bold, italic }}
  <span
    style:font-size={size != null ? `${size}cqh` : undefined}
    style:color
    style:font-weight={bold ? "800" : undefined}
    style:text-shadow={bold ? "0.4px 0px 0px currentColor" : undefined}
    style:font-style={italic ? "italic" : undefined}>{chunk}</span
  >
{/each}
