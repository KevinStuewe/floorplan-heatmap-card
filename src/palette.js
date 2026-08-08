/* ------------------------------------------------------------------ *
 * palette.js — Farbskalen für das Temperaturfeld.
 *
 * "coolwarm" ist die Voreinstellung: eine divergierende Blau→Grau→Rot-
 * Skala (Moreland), deren Helligkeit zu beiden Enden hin gleichmäßig
 * abfällt. Sie liest sich sofort als kalt/warm und hat — anders als eine
 * Regenbogenskala — keine falschen Kanten in der Mitte.
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
  // Kalt→warm ohne hellen Mittelpunkt; kräftiger auf dunklen Grundrissen.
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

export const PALETTE_NAMES = Object.keys(STOPS);

const lutCache = new Map();

/** 256×4 Lookup-Tabelle (RGBA, Alpha immer 255) für eine Palette. */
export function paletteLUT(name) {
  const key = STOPS[name] ? name : 'coolwarm';
  if (lutCache.has(key)) return lutCache.get(key);
  const stops = STOPS[key];
  const lut = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i++) {
    const ratio = i / 255;
    let lo = stops[0], hi = stops[stops.length - 1];
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
  lutCache.set(key, lut);
  return lut;
}

/** CSS-Gradient für die Legende. */
export function paletteGradientCss(name, direction = '90deg') {
  const stops = STOPS[STOPS[name] ? name : 'coolwarm'];
  const parts = stops.map(([pos, [r, g, b]]) => `rgb(${r},${g},${b}) ${(pos * 100).toFixed(0)}%`);
  return `linear-gradient(${direction}, ${parts.join(', ')})`;
}

export function paletteColorCss(name, ratio) {
  const lut = paletteLUT(name);
  const i = Math.round(clamp(ratio, 0, 1) * 255) * 4;
  return `rgb(${lut[i]}, ${lut[i + 1]}, ${lut[i + 2]})`;
}

/** Schwarz oder Weiß — je nachdem, was auf der Palettenfarbe besser lesbar ist. */
export function readableTextOn(name, ratio) {
  const lut = paletteLUT(name);
  const i = Math.round(clamp(ratio, 0, 1) * 255) * 4;
  const luminance = (0.2126 * lut[i] + 0.7152 * lut[i + 1] + 0.0722 * lut[i + 2]) / 255;
  return luminance > 0.55 ? '#11151c' : '#ffffff';
}
