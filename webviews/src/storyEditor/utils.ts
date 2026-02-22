import { wrapText } from "hachimi_lib";
import type { StoryEditorConfig } from "../sharedTypes";

export function makeContentDisplayValue(
    value: string | null, lineWidth: number, config: StoryEditorConfig | null, readonly: boolean
) {
    const val = value?.replace(/\\n/g, "\n") ?? "";
    return config?.noWrap === false && config.lineWidthMultiplier ?
        wrapText(val, lineWidth, config.lineWidthMultiplier).join("\n") :
        val;
}