import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PALETTE_NAMES,
  normalizePaletteStops,
  paletteLUT,
  paletteGradientCss,
} from '../src/palette.js';

test('custom is available alongside the built-in palettes', () => {
  assert.deepEqual(PALETTE_NAMES, [
    'coolwarm',
    'thermal',
    'viridis',
    'inferno',
    'turbo',
    'custom',
  ]);
});

test('custom palette stops accept hex colours and are sorted', () => {
  const stops = normalizePaletteStops([
    [1, '#ff0000'],
    [0, '#0000ff'],
    [0.5, '#00ff00'],
  ]);

  assert.deepEqual(stops, [
    [0, [0, 0, 255]],
    [0.5, [0, 255, 0]],
    [1, [255, 0, 0]],
  ]);
});

test('short hex and RGB-array colours are supported', () => {
  const stops = normalizePaletteStops([
    [0, '#00f'],
    [0.5, [0, 255, 0]],
    [1, '#f00'],
  ]);

  assert.deepEqual(stops, [
    [0, [0, 0, 255]],
    [0.5, [0, 255, 0]],
    [1, [255, 0, 0]],
  ]);
});

test('missing endpoints extend the nearest supplied colour', () => {
  const stops = normalizePaletteStops([
    [0.25, '#112233'],
    [0.75, '#aabbcc'],
  ]);

  assert.deepEqual(stops, [
    [0, [17, 34, 51]],
    [0.25, [17, 34, 51]],
    [0.75, [170, 187, 204]],
    [1, [170, 187, 204]],
  ]);
});

test('invalid stops are ignored and fewer than two valid stops are rejected', () => {
  assert.equal(
    normalizePaletteStops([
      ['bad', '#ffffff'],
      [0.5, 'not-a-colour'],
    ]),
    null
  );

  assert.equal(
    normalizePaletteStops([
      [0.5, '#ffffff'],
    ]),
    null
  );
});

test('custom palette LUT uses the supplied endpoint colours', () => {
  const lut = paletteLUT('custom', [
    [0, '#0000ff'],
    [1, '#ff0000'],
  ]);

  assert.deepEqual(Array.from(lut.slice(0, 4)), [0, 0, 255, 255]);
  assert.deepEqual(Array.from(lut.slice(-4)), [255, 0, 0, 255]);
});

test('invalid custom palette falls back to coolwarm', () => {
  const custom = paletteLUT('custom', []);
  const fallback = paletteLUT('coolwarm');

  assert.deepEqual(Array.from(custom), Array.from(fallback));
});

test('custom palette produces the expected legend gradient', () => {
  const gradient = paletteGradientCss(
    'custom',
    '90deg',
    [
      [0, '#0000ff'],
      [0.5, '#00ff00'],
      [1, '#ff0000'],
    ]
  );

  assert.equal(
    gradient,
    'linear-gradient(90deg, rgb(0,0,255) 0%, rgb(0,255,0) 50%, rgb(255,0,0) 100%)'
  );
});