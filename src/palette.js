/* ------------------------------------------------------------------ *
 * palette.js — Color scales for the temperature field.
 *
 * "coolwarm" is the default: a diverging blue→gray→red scale
 * (Moreland) whose brightness falls off evenly toward both ends.
 * It reads instantly as cold/warm and — unlike a rainbow scale — has
 * no false edges in the middle.
 * ------------------------------------------------------------------ */

import { clamp } from './geometry.js';

const STOPS = {
  coolwarm: [
    [0.00, [59, 76, 192]],
    [0.25, [110, 143, 231]],
    [0.50, [221, 221, 221]],
    [0.75, [230, 126, 100]],
    [1.00, [180, 4, 38]],
  ],
  // Cold→warm without a bright midpoint; more vivid on dark floor plans.
  thermal: [
    [0.00, [16, 48, 120]],
    [0.22, [22, 130, 168]],
    [0.45, [60, 168, 130]],
    [0.68, [232, 186, 62]],
    [0.85, [226, 118, 44]],
    [1.00, [176, 32, 36]],
  ],
  viridis: [
    [0.00, [68, 1, 84]],
    [0.20, [65, 68, 135]],
    [0.40, [42, 120, 142]],
    [0.60, [34, 168, 132]],
    [0.80, [122, 209, 81]],
    [1.00, [253, 231, 37]],
  ],
  inferno: [
    [0.00, [0, 0, 4]],
    [0.20, [51, 10, 94]],
    [0.40, [120, 28, 109]],
    [0.60, [190, 55, 82]],
    [0.80, [237, 121, 33]],
    [1.00, [252, 255, 164]],
  ],
  turbo: [
    [0.00, [48, 18, 59]],
    [0.13, [65, 105, 225]],
    [0.25, [30, 174, 220]],
    [0.38, [40, 217, 165]],
    [0.50, [126, 240, 90]],
    [0.63, [205, 231, 48]],
    [0.75, [250, 178, 36]],
    [0.88, [237, 96, 22]],
    [1.00, [122, 4, 3]],
  ],
};

export const PALETTE_NAMES = [...Object.keys(STOPS), 'custom'];

const lutCache = new Map();

/** Converts a supported colour value to [r, g, b]. */
function parseColor(value) {
  if (Array.isArray(value) && value.length >= 3) {
    const rgb = value.slice(0, 3).map(Number);
    if (rgb.every(Number.isFinite)) {
      return rgb.map((v) => Math.round(clamp(v, 0, 255)));
    }
    return null;
  }

  if (typeof value !== 'string') return null;

  const hex = value.trim();

  const short = /^#([0-9a-f]{3})$/i.exec(hex);
  if (short) {
    return short[1].split('').map((c) => parseInt(c + c, 16));
  }

  const full = /^#([0-9a-f]{6})$/i.exec(hex);
  if (full) {
    const n = parseInt(full[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  return null;
}

/**
 * Converts user-defined palette stops to the internal format.
 *
 * Input:
 *   [
 *     [0.0, "#482382"],
 *     [0.5, "#2db464"],
 *     [1.0, "#b91923"]
 *   ]
 *
 * Invalid stops are ignored. Stops are sorted by position.
 * Missing 0/1 endpoints inherit the nearest supplied colour.
 */
export function normalizePaletteStops(stops) {
  if (!Array.isArray(stops)) return null;

  const byPosition = new Map();

  for (const stop of stops) {
    if (!Array.isArray(stop) || stop.length < 2) continue;

    const position = Number(stop[0]);
    const color = parseColor(stop[1]);

    if (!Number.isFinite(position) || position < 0 || position > 1 || !color) continue;

    // If a position is supplied more than once, the last one wins.
    byPosition.set(position, [position, color]);
  }

  const result = [...byPosition.values()].sort((a, b) => a[0] - b[0]);

  if (result.length < 2) return null;

  if (result[0][0] > 0) {
    result.unshift([0, [...result[0][1]]]);
  }

  const last = result[result.length - 1];
  if (last[0] < 1) {
    result.push([1, [...last[1]]]);
  }

  return result;
}

function resolvePalette(name, customStops) {
  if (name === 'custom') {
    const stops = normalizePaletteStops(customStops);

    if (stops) {
      return {
        key: `custom:${JSON.stringify(stops)}`,
        stops,
      };
    }
  }

  const key = STOPS[name] ? name : 'coolwarm';

  return {
    key,
    stops: STOPS[key],
  };
}

/** 256×4 lookup table (RGBA, alpha always 255) for a palette. */
export function paletteLUT(name, customStops) {
  const palette = resolvePalette(name, customStops);

  if (lutCache.has(palette.key)) return lutCache.get(palette.key);

  const stops = palette.stops;
  const lut = new Uint8ClampedArray(256 * 4);

  for (let i = 0; i < 256; i++) {
    const ratio = i / 255;

    let lo = stops[0];
    let hi = stops[stops.length - 1];

    for (let s = 0; s < stops.length - 1; s++) {
      if (ratio >= stops[s][0] && ratio <= stops[s + 1][0]) {
        lo = stops[s];
        hi = stops[s + 1];
        break;
      }
    }

    const span = hi[0] - lo[0] || 1;
    const f = (ratio - lo[0]) / span;

    lut[i * 4 + 0] = Math.round(lo[1][0] + f * (hi[1][0] - lo[1][0]));
    lut[i * 4 + 1] = Math.round(lo[1][1] + f * (hi[1][1] - lo[1][1]));
    lut[i * 4 + 2] = Math.round(lo[1][2] + f * (hi[1][2] - lo[1][2]));
    lut[i * 4 + 3] = 255;
  }

  lutCache.set(palette.key, lut);
  return lut;
}

/** CSS gradient for the legend. */
export function paletteGradientCss(name, direction = '90deg', customStops) {
  const { stops } = resolvePalette(name, customStops);

  const parts = stops.map(
    ([pos, [r, g, b]]) =>
      `rgb(${r},${g},${b}) ${(pos * 100).toFixed(0)}%`
  );

  return `linear-gradient(${direction}, ${parts.join(', ')})`;
}

export function paletteColorCss(name, ratio, customStops) {
  const lut = paletteLUT(name, customStops);
  const i = Math.round(clamp(ratio, 0, 1) * 255) * 4;

  return `rgb(${lut[i]}, ${lut[i + 1]}, ${lut[i + 2]})`;
}

/** Black or white — whichever reads better on top of the palette color. */
export function readableTextOn(name, ratio, customStops) {
  const lut = paletteLUT(name, customStops);
  const i = Math.round(clamp(ratio, 0, 1) * 255) * 4;

  const luminance =
    (0.2126 * lut[i] +
      0.7152 * lut[i + 1] +
      0.0722 * lut[i + 2]) /
    255;

  return luminance > 0.55 ? '#11151c' : '#ffffff';
}
