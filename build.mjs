#!/usr/bin/env node
/**
 * build.mjs — bündelt src/*.js zu dist/floorplan-heatmap-card.js.
 *
 * Bewusst ohne npm-Abhängigkeiten: die Module werden in fester
 * Reihenfolge aneinandergehängt, `import`-Zeilen entfernt und `export `
 * abgestreift. Das reicht, weil alle Module denselben Namensraum teilen
 * und keine Namenskollisionen haben — geprüft wird das unten.
 *
 *   node build.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

// Reihenfolge = Abhängigkeitsreihenfolge.
const MODULES = [
  'geometry.js',
  'palette.js',
  'model.js',
  'solver.js',
  'isotherms.js',
  'renderer.js',
  'projection.js',
  'scene3d.js',
  'plan-editor.js',
  'editor.js',
  'card.js',
  'index.js',
];

const IMPORT_RE = /^\s*import\s[\s\S]*?;\s*$/;
const EXPORT_DECL_RE = /^(\s*)export\s+(const|let|var|function|class|async)\b/;
const EXPORT_LIST_RE = /^\s*export\s*\{[^}]*\}\s*;?\s*$/;

/** Sammelt Top-Level-Bindungsnamen, um Kollisionen früh zu erkennen. */
function topLevelNames(source) {
  const names = [];
  const re = /^(?:export\s+)?(?:const|let|var|function|class|async function)\s+([A-Za-z_$][\w$]*)/gm;
  let match;
  while ((match = re.exec(source))) names.push(match[1]);
  return names;
}

const seen = new Map();
const chunks = [];

for (const file of MODULES) {
  const raw = await readFile(join(root, 'src', file), 'utf8');

  for (const name of topLevelNames(raw)) {
    if (seen.has(name)) {
      console.error(`Namenskollision: "${name}" steht in ${seen.get(name)} und in ${file}.`);
      process.exit(1);
    }
    seen.set(name, file);
  }

  const body = raw
    .split(/\r?\n/)
    .reduce((acc, line) => {
      if (acc.skipping) {
        if (/;\s*$/.test(line)) acc.skipping = false;
        return acc;
      }
      if (IMPORT_RE.test(line)) return acc;
      if (/^\s*import\s/.test(line)) { acc.skipping = true; return acc; }
      if (EXPORT_LIST_RE.test(line)) return acc;
      acc.lines.push(line.replace(EXPORT_DECL_RE, '$1$2'));
      return acc;
    }, { lines: [], skipping: false })
    .lines.join('\n')
    .trim();

  chunks.push(`/* ===== src/${file} ===== */\n${body}`);
}

const bundle = `/**
 * floorplan-heatmap-card
 * Temperatur-Heatmap über einen Grundriss für Home Assistant.
 *
 * ERZEUGTE DATEI — nicht direkt bearbeiten.
 * Quellen liegen in src/, neu bauen mit: node build.mjs
 */
(function () {
'use strict';

${chunks.join('\n\n')}

})();
`;

await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(join(root, 'dist', 'floorplan-heatmap-card.js'), bundle, 'utf8');

const kb = (bundle.length / 1024).toFixed(1);
console.log(`dist/floorplan-heatmap-card.js geschrieben — ${MODULES.length} Module, ${kb} kB`);
