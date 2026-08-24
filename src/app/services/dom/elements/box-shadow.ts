import { BoxShadowLayer } from "../interfaces/render.types";

function splitLayers(value: string): string[] {
  const layers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);
    if (character === "," && depth === 0) {
      layers.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  layers.push(value.slice(start).trim());
  return layers.filter(Boolean);
}

export function parseBoxShadow(value: string | undefined): BoxShadowLayer[] {
  if (!value || value.trim().toLowerCase() === "none") return [];

  return splitLayers(value).flatMap((layer): BoxShadowLayer[] => {
    if (/\binset\b/i.test(layer)) return [];
    const explicitColor = layer.match(/rgba?\([^)]*\)|hsla?\([^)]*\)|#[\da-f]{3,8}/i);
    const namedColor = explicitColor ? null : layer.match(/(?:^|\s)([a-z]+)\s*$/i);
    const colorMatch = explicitColor ?? namedColor;
    const color = explicitColor?.[0] ?? namedColor?.[1] ?? "rgba(0,0,0,1)";
    const colorStart = colorMatch?.index ?? layer.length;
    const colorEnd = colorMatch ? colorStart + colorMatch[0].length : layer.length;
    const lengths = `${layer.slice(0, colorStart)} ${layer.slice(colorEnd)}`
      .match(/[+-]?(?:\d*\.)?\d+(?:px)?/gi)
      ?.map((part) => Number.parseFloat(part)) ?? [];
    if (lengths.length < 2 || lengths.length > 4 || lengths.some(Number.isNaN)) {
      return [];
    }
    return [{
      offsetX: lengths[0],
      offsetY: lengths[1],
      blur: Math.max(0, lengths[2] ?? 0),
      spread: lengths[3] ?? 0,
      color,
    }];
  });
}
