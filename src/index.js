/* ------------------------------------------------------------------ *
 * index.js — Registrierung der Custom Elements.
 * ------------------------------------------------------------------ */

import { FloorplanHeatmapCard } from './card.js';
import { FloorplanHeatmapCardEditor } from './editor.js';

const VERSION = '1.0.1';

if (!customElements.get('floorplan-heatmap-card')) {
  customElements.define('floorplan-heatmap-card', FloorplanHeatmapCard);
}
if (!customElements.get('floorplan-heatmap-card-editor')) {
  customElements.define('floorplan-heatmap-card-editor', FloorplanHeatmapCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'floorplan-heatmap-card')) {
  window.customCards.push({
    type: 'floorplan-heatmap-card',
    name: 'Grundriss-Heatmap',
    description: 'Temperaturverteilung über einen Grundriss — mit Wänden, Türen und Fenstern als Wärmewiderstand.',
    preview: true,
    documentationURL: 'https://github.com/kevinst/floorplan-heatmap-card',
  });
}

console.info(
  `%c FLOORPLAN-HEATMAP-CARD %c ${VERSION} `,
  'background:#3b6df3;color:#fff;font-weight:600;border-radius:3px 0 0 3px;padding:2px 6px',
  'background:#141924;color:#e7eaf0;border-radius:0 3px 3px 0;padding:2px 6px'
);
