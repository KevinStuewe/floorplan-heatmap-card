/* ------------------------------------------------------------------ *
 * plan-editor.js — Vollbild-Editor für Grundriss und Sensoren.
 *
 * Läuft als eigenes Overlay über der Lovelace-Oberfläche, weil der
 * Konfigurationsdialog viel zu schmal zum Zeichnen ist. Gerendert wird
 * in SVG: das Hit-Testing (welches Objekt liegt unter der Maus?)
 * übernimmt damit der Browser, statt dass wir es von Hand rechnen.
 *
 * Alle Striche nutzen vector-effect="non-scaling-stroke", d.h. die
 * Strichstärken sind Bildschirm-Pixel und bleiben beim Zoomen gleich.
 * ------------------------------------------------------------------ */

import {
  buildWalls, uid, OPENING_TYPES, WALL_TYPES,
  roomAreaSqm, roomSizeMeters, resizeRoomPoints,
} from './model.js';
import { wallGaps, wallCovers } from './renderer.js';
import { axisSnap, closestPointOnSegment, distToSegment, pointInPolygon, polygonCentroid, bboxOfPoints, clamp } from './geometry.js';
import { t, detectLanguage, roomNameSuggestions } from './i18n.js';

const OPENING_LABEL_KEYS = { passage: 'label.passage', door: 'label.door', window: 'label.window' };
const WALL_LABEL_KEYS = { interior: 'label.interior', exterior: 'label.exterior' };

const ICONS = {
  select: '<polygon points="5,2 5,19 9.2,14.8 12,21 14.6,19.9 11.8,13.9 18,13.9"/>',
  room: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>',
  wall: '<rect x="3" y="10" width="18" height="4" rx="1"/>',
  opening: '<path d="M6 20V4h6a8 8 0 0 1 8 8v8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20h4" stroke="currentColor" stroke-width="2"/>',
  sensor: '<path d="M12 21.5s6.8-6.6 6.8-11.3a6.8 6.8 0 1 0-13.6 0C5.2 14.9 12 21.5 12 21.5z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10.2" r="2.4"/>',
  erase: '<path d="M6.5 7.5h11l-1 12.5h-9l-1-12.5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 7.5V4.5h5v3M4.5 7.5h15" fill="none" stroke="currentColor" stroke-width="2"/>',
  measure: '<rect x="2.5" y="8.5" width="19" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 8.5v3.5M12 8.5v4.5M17 8.5v3.5" stroke="currentColor" stroke-width="2"/>',
  undo: '<path d="M8 8H15a5 5 0 0 1 0 10H9" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="11,4.5 7,8 11,11.5" fill="none" stroke="currentColor" stroke-width="2"/>',
  redo: '<path d="M16 8H9a5 5 0 0 0 0 10h6" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="13,4.5 17,8 13,11.5" fill="none" stroke="currentColor" stroke-width="2"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2"/>',
};

const TOOLS = [
  { id: 'select', key: 'V' },
  { id: 'room', key: 'R' },
  { id: 'wall', key: 'W' },
  { id: 'opening', key: 'D' },
  { id: 'sensor', key: 'S' },
  { id: 'erase', key: 'X' },
  { id: 'measure', key: 'M' },
];

const PLAN_STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  .backdrop {
    position: fixed; inset: 0; z-index: 999999;
    background: #0d1017; color: #e7eaf0;
    display: grid;
    grid-template-rows: auto 1fr;
    grid-template-columns: 1fr 300px;
    grid-template-areas: "bar bar" "stage side";
  }
  .bar {
    grid-area: bar;
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px;
    background: #141924;
    border-bottom: 1px solid #232b3a;
    flex-wrap: wrap;
  }
  .bar h1 { font-size: 14px; font-weight: 600; margin: 0 12px 0 0; letter-spacing: .01em; }
  .group { display: flex; gap: 4px; background: #0f131c; padding: 3px; border-radius: 9px; border: 1px solid #232b3a; }
  .spacer { flex: 1; }
  button {
    display: inline-flex; align-items: center; gap: 6px;
    background: transparent; border: 1px solid transparent; color: #b9c2d1;
    padding: 6px 10px; border-radius: 7px; cursor: pointer;
    font-size: 12.5px; font-weight: 500; line-height: 1;
    transition: background 120ms ease, color 120ms ease;
  }
  button:hover:not(:disabled) { background: #1e2635; color: #e7eaf0; }
  button:disabled { opacity: .35; cursor: default; }
  button.active { background: #3b6df3; color: #fff; }
  button.primary { background: #3b6df3; color: #fff; padding: 7px 16px; }
  button.primary:hover { background: #4d7bf7; }
  button.ghost { border-color: #2b3446; }
  button svg { width: 16px; height: 16px; fill: currentColor; flex: none; }
  .toggle {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; color: #97a1b3; cursor: pointer; user-select: none;
    padding: 5px 8px; border-radius: 7px;
  }
  .toggle:hover { background: #1a2130; }
  .toggle input { accent-color: #3b6df3; margin: 0; }

  .stage { grid-area: stage; position: relative; overflow: hidden; background: #0b0e14; }
  svg.plan { width: 100%; height: 100%; display: block; touch-action: none; }
  svg.plan.tool-select { cursor: default; }
  svg.plan.tool-room, svg.plan.tool-wall, svg.plan.tool-sensor, svg.plan.tool-opening, svg.plan.tool-measure { cursor: crosshair; }
  svg.plan.tool-erase { cursor: not-allowed; }
  svg.plan.panning { cursor: grabbing; }

  .hint {
    position: absolute; left: 14px; bottom: 14px; right: 14px;
    background: rgba(16,20,29,.92); border: 1px solid #232b3a;
    border-radius: 9px; padding: 8px 12px; font-size: 12px; color: #97a1b3;
    pointer-events: none; line-height: 1.5;
  }
  .hint b { color: #dfe5ef; font-weight: 600; }
  .readout {
    position: absolute; right: 14px; top: 14px;
    background: rgba(16,20,29,.92); border: 1px solid #232b3a;
    border-radius: 8px; padding: 6px 10px; font-size: 12px;
    font-variant-numeric: tabular-nums; color: #dfe5ef; pointer-events: none;
  }
  .readout:empty { display: none; }

  .side {
    grid-area: side; background: #141924; border-left: 1px solid #232b3a;
    overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 16px;
  }
  .side h2 {
    font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em;
    color: #6f7b8f; margin: 0 0 8px; font-weight: 600;
  }
  .panel { background: #0f131c; border: 1px solid #232b3a; border-radius: 10px; padding: 12px; }
  .field { margin-bottom: 10px; }
  .field:last-child { margin-bottom: 0; }
  .field label { display: block; font-size: 11px; color: #8b95a8; margin-bottom: 4px; }
  input[type=text], input[type=number], select {
    width: 100%; background: #080b11; border: 1px solid #2b3446; color: #e7eaf0;
    padding: 7px 9px; border-radius: 7px; font-size: 12.5px; outline: none;
  }
  input:focus, select:focus { border-color: #3b6df3; }
  input[type=range] { width: 100%; accent-color: #3b6df3; }
  .row { display: flex; gap: 8px; align-items: flex-end; }
  .row > * { flex: 1; }
  .seg { display: flex; gap: 3px; background: #080b11; border: 1px solid #2b3446; border-radius: 7px; padding: 3px; }
  .seg button { flex: 1; justify-content: center; padding: 5px 4px; font-size: 11.5px; }
  .seg button.active { background: #3b6df3; color: #fff; }
  .list { display: flex; flex-direction: column; gap: 5px; max-height: 220px; overflow-y: auto; }
  .item {
    display: flex; align-items: center; gap: 8px; padding: 7px 9px;
    background: #0f131c; border: 1px solid #232b3a; border-radius: 8px;
    font-size: 12px; cursor: pointer;
  }
  .item:hover { border-color: #3b6df3; }
  .item.selected { border-color: #3b6df3; background: #16203a; }
  .item .grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item .sub { color: #6f7b8f; font-size: 11px; }
  .empty-note { font-size: 12px; color: #6f7b8f; line-height: 1.5; }
  .danger { color: #ff7b7b; }
  .danger:hover { background: #2a1a1e !important; color: #ff9d9d; }

  .combo { position: relative; }
  .combo .options {
    position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 5;
    background: #0b0e14; border: 1px solid #2b3446; border-radius: 8px;
    max-height: 240px; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,.5);
  }
  .combo .options[hidden] { display: none; }
  .combo .opt { padding: 7px 9px; font-size: 12px; cursor: pointer; }
  .combo .opt:hover, .combo .opt.active { background: #1c2740; }
  .combo .opt .sub { color: #6f7b8f; font-size: 11px; }
`;

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/**
 * Öffnet den Editor. Löst mit { floorplan, px_per_meter, background,
 * background_opacity } auf — oder mit null, wenn abgebrochen wurde.
 */
export function openPlanEditor(options) {
  return new Promise((resolve) => {
    const editor = new PlanEditor(options, resolve);
    editor.mount();
  });
}

class PlanEditor {
  constructor(options, resolve) {
    this.resolve = resolve;
    this.hass = options.hass;
    this.lang = detectLanguage(this.hass);
    this.state = JSON.parse(JSON.stringify(options.floorplan));
    this.pxPerMeter = options.pxPerMeter || 50;
    this.background = options.background || '';
    this.backgroundOpacity = options.backgroundOpacity != null ? options.backgroundOpacity : 0.25;

    this.tool = 'select';
    this.selection = null;      // { kind, id, vertex? }
    this.draft = null;          // laufende Zeichnung
    this.pointer = null;        // Weltkoordinate des Zeigers
    this.drag = null;
    this.panning = null;
    this.snapGrid = true;
    this.snapPoints = true;
    this.snapAxisOn = true;
    this.showGrid = true;
    this.undoStack = [];
    this.redoStack = [];
    this.view = { cx: 0, cy: 0, zoom: 1 };
  }

  /* ------------------------------ Montage ------------------------- */

  mount() {
    // Der Konfigurationsdialog von Home Assistant ist ein natives <dialog>
    // im Top Layer. Dorthin reicht kein z-index, und alles außerhalb ist
    // solange `inert`. Ein gewöhnliches Overlay an document.body läge also
    // unerreichbar dahinter — Klicks träfen den Scrim des HA-Dialogs, der
    // sich daraufhin schließt und unser Editor-Element abhängt; ein danach
    // gefeuertes `config-changed` käme nirgends mehr an.
    //
    // Deshalb sind wir selbst ein modales <dialog>: showModal() legt uns
    // über den HA-Dialog (Top Layer stapelt in Aufrufreihenfolge) und hebt
    // das inert für unseren Teilbaum auf.
    this.dialog = document.createElement('dialog');
    this.dialog.style.cssText = [
      'position:fixed', 'inset:0',
      'width:100vw', 'height:100vh', 'max-width:100vw', 'max-height:100vh',
      'margin:0', 'padding:0', 'border:0', 'outline:none',
      'background:transparent', 'overflow:hidden',
    ].join(';');

    // <dialog> kann keinen Shadow Root tragen — ein <div> darin schon.
    this.host = document.createElement('div');
    this.host.style.cssText = 'width:100%;height:100%;';
    this.root = this.host.attachShadow({ mode: 'open' });
    this.root.innerHTML = `<style>${PLAN_STYLES}</style>
      <div class="backdrop">
        <div class="bar"></div>
        <div class="stage">
          <svg class="plan" xmlns="http://www.w3.org/2000/svg"></svg>
          <div class="readout"></div>
          <div class="hint"></div>
        </div>
        <div class="side"></div>
      </div>`;
    this.dialog.appendChild(this.host);
    document.body.appendChild(this.dialog);

    // Escape geht durch unsere eigene Behandlung (verwirft erst Entwurf
    // bzw. Auswahl). Der native Schließweg würde das Fenster wegnehmen,
    // ohne dass jemand die Promise auflöst.
    this._onCancel = (event) => {
      event.preventDefault();
      this._escape();
    };
    this.dialog.addEventListener('cancel', this._onCancel);
    this.dialog.showModal();

    this.svg = this.root.querySelector('svg.plan');
    this.bar = this.root.querySelector('.bar');
    this.side = this.root.querySelector('.side');
    this.hintEl = this.root.querySelector('.hint');
    this.readoutEl = this.root.querySelector('.readout');

    this._bindEvents();
    this._buildBar();
    this.zoomToFit();
    this.render();
    this.renderSide();
  }

  close(result) {
    if (this._closed) return;
    this._closed = true;
    document.removeEventListener('keydown', this._onKeyDown, true);
    document.removeEventListener('keyup', this._onKeyUp, true);
    if (this._resizeObserver) this._resizeObserver.disconnect();
    this.dialog.removeEventListener('cancel', this._onCancel);
    if (this.dialog.open) this.dialog.close();
    this.dialog.remove();
    this.resolve(result);
  }

  _bindEvents() {
    this.svg.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.svg.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this.svg.addEventListener('pointerup', (e) => this._onPointerUp(e));
    this.svg.addEventListener('dblclick', (e) => this._onDoubleClick(e));
    this.svg.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    this.svg.addEventListener('contextmenu', (e) => e.preventDefault());

    this._onKeyDown = (e) => this._handleKey(e);
    this._onKeyUp = (e) => { if (e.key === ' ') this._spaceDown = false; };
    document.addEventListener('keydown', this._onKeyDown, true);
    document.addEventListener('keyup', this._onKeyUp, true);

    this._resizeObserver = new ResizeObserver(() => {
      // Beim ersten Aufruf hatte das SVG noch keine Größe, das Einpassen
      // ging also ins Leere. Sobald echte Maße vorliegen, nachholen.
      if (!this._didInitialFit && this.svg.getBoundingClientRect().width > 1) {
        this._didInitialFit = true;
        this.zoomToFit();
      }
      this.render();
    });
    this._resizeObserver.observe(this.svg);
  }

  /* --------------------------- Koordinaten ------------------------ */

  get viewBox() {
    const rect = this.svg.getBoundingClientRect();
    const w = Math.max(1, rect.width) / this.view.zoom;
    const h = Math.max(1, rect.height) / this.view.zoom;
    return { x: this.view.cx - w / 2, y: this.view.cy - h / 2, w, h };
  }

  toWorld(event) {
    const rect = this.svg.getBoundingClientRect();
    const vb = this.viewBox;
    return {
      x: vb.x + ((event.clientX - rect.left) / Math.max(1, rect.width)) * vb.w,
      y: vb.y + ((event.clientY - rect.top) / Math.max(1, rect.height)) * vb.h,
    };
  }

  /** Bildschirm-Pixel in Weltkoordinaten — für zoom-unabhängige Toleranzen. */
  px(n) { return n / this.view.zoom; }

  zoomToFit() {
    const pts = [];
    for (const r of this.state.rooms) pts.push(...r.points);
    for (const w of this.state.walls) pts.push([w.x1, w.y1], [w.x2, w.y2]);
    for (const s of this.state.sensors) pts.push([s.x, s.y]);
    const rect = this.svg.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);

    if (!pts.length) {
      this.view = { cx: 400, cy: 260, zoom: 1 };
      return;
    }
    const b = bboxOfPoints(pts, 60);
    this.view = {
      cx: (b.minX + b.maxX) / 2,
      cy: (b.minY + b.maxY) / 2,
      zoom: clamp(Math.min(width / b.w, height / b.h), 0.05, 8),
    };
  }

  /* ----------------------------- Historie ------------------------- */

  snapshot() {
    this.undoStack.push(JSON.stringify(this.state));
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(JSON.stringify(this.state));
    this.state = JSON.parse(this.undoStack.pop());
    this.selection = null;
    this.render();
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(JSON.stringify(this.state));
    this.state = JSON.parse(this.redoStack.pop());
    this.selection = null;
    this.render();
  }

  /* ------------------------------ Snapping ------------------------ */

  get gridStep() { return this.pxPerMeter * 0.25; }

  snap(point, { ignore } = {}) {
    if (this.snapPoints) {
      const tol = this.px(11);
      let best = null, bestDist = tol;
      const consider = (x, y, key) => {
        if (ignore && ignore === key) return;
        const d = Math.hypot(x - point.x, y - point.y);
        if (d < bestDist) { bestDist = d; best = { x, y }; }
      };
      for (const room of this.state.rooms) {
        room.points.forEach((p, i) => consider(p[0], p[1], `${room.id}:${i}`));
      }
      for (const w of this.state.walls) {
        consider(w.x1, w.y1, `${w.id}:0`);
        consider(w.x2, w.y2, `${w.id}:1`);
      }
      if (best) return { ...best, snapped: 'point' };
    }
    if (this.snapGrid) {
      const g = this.gridStep;
      return { x: Math.round(point.x / g) * g, y: Math.round(point.y / g) * g, snapped: 'grid' };
    }
    return { x: point.x, y: point.y, snapped: null };
  }

  /**
   * Sammelt Kanten (achsparallel) und Eckpunkte aller Räume/Wände außer
   * dem übergebenen Raum — die "Fanglinien", an denen ein verschobener
   * Raum einrasten kann.
   */
  _collectSnapTargets(excludeRoomId) {
    const vLines = []; // { x, y0, y1 } — senkrechte Kante bei konstantem x
    const hLines = []; // { y, x0, x1 } — waagrechte Kante bei konstantem y
    const points = [];

    const addEdge = (x1, y1, x2, y2) => {
      if (Math.abs(x2 - x1) < 1e-6 && Math.abs(y2 - y1) > 1e-6) {
        vLines.push({ x: x1, y0: Math.min(y1, y2), y1: Math.max(y1, y2) });
      } else if (Math.abs(y2 - y1) < 1e-6 && Math.abs(x2 - x1) > 1e-6) {
        hLines.push({ y: y1, x0: Math.min(x1, x2), x1: Math.max(x1, x2) });
      }
    };

    for (const room of this.state.rooms) {
      if (room.id === excludeRoomId) continue;
      const pts = room.points;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        addEdge(x1, y1, x2, y2);
        points.push([x1, y1]);
      }
    }
    for (const w of this.state.walls) {
      addEdge(w.x1, w.y1, w.x2, w.y2);
      points.push([w.x1, w.y1], [w.x2, w.y2]);
    }
    return { vLines, hLines, points };
  }

  /**
   * Ermittelt für eine Raumverschiebung um (dx, dy) den nächstgelegenen
   * Einrast-Versatz — Kante-auf-Kante hat Vorrang, Ecke-auf-Ecke wird
   * zusätzlich geprüft, falls kein passendes Kantenpaar in Reichweite ist.
   * x und y werden unabhängig voneinander behandelt, sodass eine Kante
   * einrasten kann, auch wenn die andere Achse frei bleibt.
   */
  _snapRoomMove(beforePoints, dx, dy, roomId) {
    const tol = this.px(11);
    const targets = this._collectSnapTargets(roomId);
    let bestDx = dx, bestDxDist = tol;
    let bestDy = dy, bestDyDist = tol;

    const n = beforePoints.length;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = beforePoints[i];
      const [x2, y2] = beforePoints[(i + 1) % n];
      const mx1 = x1 + dx, my1 = y1 + dy, mx2 = x2 + dx, my2 = y2 + dy;

      if (Math.abs(x2 - x1) < 1e-6 && Math.abs(y2 - y1) > 1e-6) {
        const yLo = Math.min(my1, my2), yHi = Math.max(my1, my2);
        for (const g of targets.vLines) {
          if (yHi < g.y0 - tol || yLo > g.y1 + tol) continue; // Kanten liegen nicht auf gleicher Höhe
          const delta = g.x - mx1;
          if (Math.abs(delta) < bestDxDist) { bestDxDist = Math.abs(delta); bestDx = dx + delta; }
        }
      }
      if (Math.abs(y2 - y1) < 1e-6 && Math.abs(x2 - x1) > 1e-6) {
        const xLo = Math.min(mx1, mx2), xHi = Math.max(mx1, mx2);
        for (const g of targets.hLines) {
          if (xHi < g.x0 - tol || xLo > g.x1 + tol) continue;
          const delta = g.y - my1;
          if (Math.abs(delta) < bestDyDist) { bestDyDist = Math.abs(delta); bestDy = dy + delta; }
        }
      }
    }

    for (const [x0, y0] of beforePoints) {
      const mx = x0 + dx, my = y0 + dy;
      for (const [tx, ty] of targets.points) {
        const ddx = tx - mx;
        if (Math.abs(ddx) < bestDxDist) { bestDxDist = Math.abs(ddx); bestDx = dx + ddx; }
        const ddy = ty - my;
        if (Math.abs(ddy) < bestDyDist) { bestDyDist = Math.abs(ddy); bestDy = dy + ddy; }
      }
    }

    return { dx: bestDx, dy: bestDy };
  }

  /** Nächstgelegene Wand samt Projektionspunkt — für das Platzieren von Öffnungen. */
  nearestWall(point, maxDist) {
    const walls = buildWalls(this.state);
    let best = null, bestDist = maxDist != null ? maxDist : this.px(18);
    for (const w of walls) {
      const d = distToSegment(point.x, point.y, w.x1, w.y1, w.x2, w.y2);
      if (d < bestDist) {
        const proj = closestPointOnSegment(point.x, point.y, w.x1, w.y1, w.x2, w.y2);
        bestDist = d;
        best = { wall: w, x: proj.x, y: proj.y, angle: Math.atan2(w.y2 - w.y1, w.x2 - w.x1) };
      }
    }
    return best;
  }

  /* --------------------------- Zeigereingabe ---------------------- */

  _onWheel(event) {
    event.preventDefault();
    const before = this.toWorld(event);
    const factor = Math.exp(-event.deltaY * 0.0015);
    this.view.zoom = clamp(this.view.zoom * factor, 0.05, 12);
    const after = this.toWorld(event);
    this.view.cx += before.x - after.x;
    this.view.cy += before.y - after.y;
    this.render();
  }

  _onPointerDown(event) {
    this.svg.setPointerCapture(event.pointerId);
    const world = this.toWorld(event);

    // Mittlere Maustaste, Leertaste oder rechte Taste: schieben.
    if (event.button === 1 || event.button === 2 || this._spaceDown) {
      this.panning = { startX: event.clientX, startY: event.clientY, cx: this.view.cx, cy: this.view.cy };
      this.svg.classList.add('panning');
      return;
    }
    if (event.button !== 0) return;

    switch (this.tool) {
      case 'select': this._selectAt(event, world); break;
      case 'room': this._roomDown(world); break;
      case 'wall': this._wallDown(world); break;
      case 'opening': this._openingDown(world); break;
      case 'sensor': this._sensorDown(world); break;
      case 'erase': this._eraseAt(event, world); break;
      case 'measure': this._measureDown(world); break;
      default: break;
    }
  }

  _onPointerMove(event) {
    const world = this.toWorld(event);
    this.pointer = world;

    if (this.panning) {
      const rect = this.svg.getBoundingClientRect();
      const vb = this.viewBox;
      this.view.cx = this.panning.cx - ((event.clientX - this.panning.startX) / rect.width) * vb.w;
      this.view.cy = this.panning.cy - ((event.clientY - this.panning.startY) / rect.height) * vb.h;
      this.render();
      return;
    }

    if (this.drag) { this._dragMove(world); return; }

    if (this.draft) {
      this.draft.cursor = this._draftCursor(world);
      this.render();
      // Nur das Anzeigefeld nachziehen statt die Seitenleiste neu zu
      // bauen — sonst verliert das Längen-Eingabefeld den Fokus.
      const readout = this.side.querySelector('[data-out="draftLength"]');
      if (readout) {
        const end = this.draft.cursor;
        const len = Math.hypot(end.x - this.draft.start.x, end.y - this.draft.start.y);
        const angle = Math.round((Math.atan2(end.y - this.draft.start.y, end.x - this.draft.start.x) * 180) / Math.PI);
        readout.value = `${(len / this.pxPerMeter).toFixed(2)} m · ${angle}°`;
      }
      return;
    }

    if (this.tool === 'opening') {
      const hit = this.nearestWall(world);
      const changed = JSON.stringify(hit && [hit.x, hit.y]) !== JSON.stringify(this._openingHover && [this._openingHover.x, this._openingHover.y]);
      this._openingHover = hit;
      if (changed) this.render();
      return;
    }
    this._updateReadout();
  }

  _onPointerUp(event) {
    if (this.svg.hasPointerCapture(event.pointerId)) this.svg.releasePointerCapture(event.pointerId);
    if (this.panning) { this.panning = null; this.svg.classList.remove('panning'); return; }
    if (!this.drag) return;

    const kind = this.drag.kind;
    this.drag = null;
    if (kind === 'rect') this._finishRect();
    else { this.render(); this.renderSide(); }
  }

  _onDoubleClick(event) {
    if (this.tool === 'room' && this.draft && this.draft.kind === 'polygon') {
      event.preventDefault();
      this._closePolygon();
    }
  }

  /* ----------------------------- Werkzeuge ------------------------ */

  _draftCursor(world) {
    if (this.draft && (this.draft.kind === 'wall' || this.draft.kind === 'measure') && this.snapAxisOn) {
      const start = this.draft.start;
      const snapped = this.snap(world);
      if (snapped.snapped === 'point') return snapped;
      const axis = axisSnap(start.x, start.y, snapped.x, snapped.y);
      return { x: axis.x, y: axis.y, snapped: axis.snapped ? 'axis' : snapped.snapped };
    }
    return this.snap(world);
  }

  _selectAt(event, world) {
    const target = event.target.closest('[data-kind]');
    if (!target) {
      this.selection = null;
      this.render();
      this.renderSide();
      return;
    }
    const kind = target.dataset.kind;
    const id = target.dataset.id;

    // Der Schnappschuss für die Historie entsteht erst beim ersten
    // tatsächlichen Ziehen — bloßes Anklicken soll den Undo-Stapel
    // nicht mit Nichts-Änderungen zumüllen.
    if (kind === 'handle') {
      this.selection = { kind: target.dataset.owner, id, vertex: Number(target.dataset.vertex) };
      this.drag = { kind: 'vertex', owner: target.dataset.owner, id, vertex: Number(target.dataset.vertex), pending: true };
      this.render();
      return;
    }

    this.selection = { kind, id };
    this.drag = {
      kind: 'move', target: kind, id, origin: world,
      before: this._captureGeometry(kind, id),
      openings: kind === 'room' ? this._openingsOnRoom(id) : null,
      pending: true,
    };
    this.render();
    this.renderSide();
  }

  /**
   * Türen und Fenster, die aktuell auf einer Kante des Raums sitzen — sie
   * kennen ihre Wand nicht (siehe model.js), werden also rein geometrisch
   * über die Kanten des Raums gefunden, bevor der Zug beginnt.
   */
  _openingsOnRoom(roomId) {
    const room = this.state.rooms.find((r) => r.id === roomId);
    if (!room) return [];
    const ids = new Set();
    const pts = room.points;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      for (const cover of wallCovers({ x1, y1, x2, y2 }, this.state.openings)) {
        ids.add(cover.opening.id);
      }
    }
    return Array.from(ids, (id) => {
      const o = this.state.openings.find((x) => x.id === id);
      return { id, before: { x: o.x, y: o.y } };
    });
  }

  _captureGeometry(kind, id) {
    if (kind === 'room') {
      const room = this.state.rooms.find((r) => r.id === id);
      return room ? JSON.parse(JSON.stringify(room.points)) : null;
    }
    if (kind === 'wall') {
      const w = this.state.walls.find((x) => x.id === id);
      return w ? { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 } : null;
    }
    if (kind === 'sensor') {
      const s = this.state.sensors.find((x) => x.id === id);
      return s ? { x: s.x, y: s.y } : null;
    }
    if (kind === 'opening') {
      const o = this.state.openings.find((x) => x.id === id);
      return o ? { x: o.x, y: o.y } : null;
    }
    return null;
  }

  _dragMove(world) {
    const d = this.drag;
    if (d.pending) { d.pending = false; this.snapshot(); this._updateBarState(); }

    if (d.kind === 'rect') {
      this.draft.end = this.snap(world);
      this.render();
      return;
    }

    if (d.kind === 'vertex') {
      const snapped = this.snap(world, { ignore: `${d.id}:${d.vertex}` });
      if (d.owner === 'room') {
        const room = this.state.rooms.find((r) => r.id === d.id);
        if (room) room.points[d.vertex] = [snapped.x, snapped.y];
      } else if (d.owner === 'wall') {
        const w = this.state.walls.find((x) => x.id === d.id);
        if (w) {
          if (d.vertex === 0) { w.x1 = snapped.x; w.y1 = snapped.y; }
          else { w.x2 = snapped.x; w.y2 = snapped.y; }
        }
      }
      this.render();
      return;
    }

    if (d.kind === 'move') {
      const dx = world.x - d.origin.x;
      const dy = world.y - d.origin.y;
      if (d.target === 'room') {
        const room = this.state.rooms.find((r) => r.id === d.id);
        if (room && d.before) {
          const snapped = this.snapPoints
            ? this._snapRoomMove(d.before, dx, dy, d.id)
            : { dx, dy };
          room.points = d.before.map(([x, y]) => [x + snapped.dx, y + snapped.dy]);
          if (d.openings) {
            for (const entry of d.openings) {
              const o = this.state.openings.find((x) => x.id === entry.id);
              if (o) { o.x = entry.before.x + snapped.dx; o.y = entry.before.y + snapped.dy; }
            }
          }
        }
      } else if (d.target === 'wall') {
        const w = this.state.walls.find((x) => x.id === d.id);
        if (w && d.before) {
          w.x1 = d.before.x1 + dx; w.y1 = d.before.y1 + dy;
          w.x2 = d.before.x2 + dx; w.y2 = d.before.y2 + dy;
        }
      } else if (d.target === 'sensor') {
        const s = this.state.sensors.find((x) => x.id === d.id);
        if (s && d.before) {
          const snapped = this.snap({ x: d.before.x + dx, y: d.before.y + dy });
          s.x = snapped.x; s.y = snapped.y;
        }
      } else if (d.target === 'opening') {
        // Öffnungen gleiten entlang ihrer Wand statt frei zu wandern.
        const o = this.state.openings.find((x) => x.id === d.id);
        if (o && d.before) {
          const target = { x: d.before.x + dx, y: d.before.y + dy };
          const hit = this.nearestWall(target, this.px(40));
          if (hit) { o.x = hit.x; o.y = hit.y; o.angle = hit.angle; }
          else { o.x = target.x; o.y = target.y; }
        }
      }
      this.render();
      return;
    }
  }

  _roomDown(world) {
    const point = this.snap(world);
    if (!this.draft) {
      this.draft = { kind: 'rect', start: point, end: point, cursor: point };
      this.drag = { kind: 'rect' };
      return;
    }
    if (this.draft.kind === 'polygon') {
      const first = this.draft.points[0];
      if (this.draft.points.length >= 3 && Math.hypot(point.x - first[0], point.y - first[1]) < this.px(12)) {
        this._closePolygon();
        return;
      }
      this.draft.points.push([point.x, point.y]);
      this.render();
    }
  }

  /** Kurzer Klick statt Ziehen ⇒ der Nutzer will ein Polygon, kein Rechteck. */
  _finishRect() {
    const d = this.draft;
    if (!d) return;
    const w = Math.abs(d.end.x - d.start.x);
    const h = Math.abs(d.end.y - d.start.y);
    if (w < this.px(8) || h < this.px(8)) {
      this.draft = { kind: 'polygon', points: [[d.start.x, d.start.y]], cursor: d.start };
      this.render();
      return;
    }
    const x1 = Math.min(d.start.x, d.end.x), x2 = Math.max(d.start.x, d.end.x);
    const y1 = Math.min(d.start.y, d.end.y), y2 = Math.max(d.start.y, d.end.y);
    this.snapshot();
    const room = {
      id: uid('r'),
      name: this._nextRoomName(),
      points: [[x1, y1], [x2, y1], [x2, y2], [x1, y2]],
    };
    this.state.rooms.push(room);
    this.draft = null;
    this.selection = { kind: 'room', id: room.id };
    this.render();
    this.renderSide();
  }

  _closePolygon() {
    const d = this.draft;
    if (!d || d.points.length < 3) { this.draft = null; this.render(); return; }
    this.snapshot();
    const room = { id: uid('r'), name: this._nextRoomName(), points: d.points.map(([x, y]) => [x, y]) };
    this.state.rooms.push(room);
    this.draft = null;
    this.selection = { kind: 'room', id: room.id };
    this.render();
    this.renderSide();
  }

  _nextRoomName() {
    const used = new Set(this.state.rooms.map((r) => r.name));
    for (const s of roomNameSuggestions(this.lang)) if (!used.has(s)) return s;
    return t(this.lang, 'planEditor.roomFallback', { n: this.state.rooms.length + 1 });
  }

  _wallDown(world) {
    const point = this._draftCursor(world);
    if (!this.draft) {
      this.draft = { kind: 'wall', start: this.snap(world), cursor: point };
      this.renderSide();
      this.render();
      return;
    }
    this._commitWall(point);
  }

  _commitWall(end) {
    const start = this.draft.start;
    if (Math.hypot(end.x - start.x, end.y - start.y) < this.px(4)) return;
    this.snapshot();
    const wall = { id: uid('w'), x1: start.x, y1: start.y, x2: end.x, y2: end.y, type: 'interior' };
    this.state.walls.push(wall);
    // Fortlaufend zeichnen: das Ende wird zum nächsten Anfang.
    this.draft = { kind: 'wall', start: { x: end.x, y: end.y }, cursor: { x: end.x, y: end.y } };
    this.render();
    this.renderSide();
  }

  _openingDown(world) {
    const hit = this.nearestWall(world, this.px(30));
    if (!hit) return;
    this.snapshot();
    const opening = {
      id: uid('o'),
      x: hit.x,
      y: hit.y,
      angle: hit.angle,
      width: this.pxPerMeter * 0.9,
      type: 'door',
    };
    this.state.openings.push(opening);
    this.selection = { kind: 'opening', id: opening.id };
    this.render();
    this.renderSide();
  }

  _sensorDown(world) {
    const point = this.snap(world);
    this.snapshot();
    const sensor = { id: uid('s'), x: point.x, y: point.y, entity: '', name: this._roomNameAt(point) };
    this.state.sensors.push(sensor);
    this.selection = { kind: 'sensor', id: sensor.id };
    this.render();
    this.renderSide();
    requestAnimationFrame(() => {
      const input = this.side.querySelector('.combo input');
      if (input) input.focus();
    });
  }

  _roomNameAt(point) {
    const room = this.state.rooms.find((r) => pointInPolygon(point.x, point.y, r.points));
    return room ? room.name : '';
  }

  _eraseAt(event, world) {
    const target = event.target.closest('[data-kind]');
    if (!target) return;
    const { kind, id } = target.dataset;
    if (!['room', 'wall', 'sensor', 'opening'].includes(kind)) return;
    this.snapshot();
    this._deleteObject(kind, id);
    this.render();
    this.renderSide();
  }

  _deleteObject(kind, id) {
    const key = { room: 'rooms', wall: 'walls', sensor: 'sensors', opening: 'openings' }[kind];
    if (!key) return;
    const idx = this.state[key].findIndex((o) => o.id === id);
    if (idx >= 0) this.state[key].splice(idx, 1);
    if (this.selection && this.selection.id === id) this.selection = null;
  }

  _measureDown(world) {
    const point = this._draftCursor(world);
    if (!this.draft || this.draft.end) {
      // Dritter Klick startet eine neue Messung.
      this.draft = { kind: 'measure', start: this.snap(world), cursor: point };
    } else {
      this.draft.end = point;
    }
    this.render();
    this.renderSide();
  }

  /* ---------------------------- Tastatur -------------------------- */

  /** Escape schält von innen nach außen ab: Entwurf, Auswahl, Fenster. */
  _escape() {
    if (this.draft) { this.draft = null; this.render(); this.renderSide(); }
    else if (this.selection) { this.selection = null; this.render(); this.renderSide(); }
    else this.close(null);
  }

  _handleKey(event) {
    const inField = event.composedPath().some((n) => n.tagName === 'INPUT' || n.tagName === 'SELECT' || n.tagName === 'TEXTAREA');

    if (event.key === ' ' && !inField) { this._spaceDown = true; }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this._escape();
      return;
    }
    if (inField) return;

    const meta = event.metaKey || event.ctrlKey;
    if (meta && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) this.redo(); else this.undo();
      this.renderSide();
      return;
    }
    if (meta && event.key.toLowerCase() === 'y') { event.preventDefault(); this.redo(); this.renderSide(); return; }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.draft && this.draft.kind === 'polygon') this._closePolygon();
      return;
    }
    if (event.key === 'Backspace' && this.draft && this.draft.kind === 'polygon') {
      event.preventDefault();
      this.draft.points.pop();
      if (!this.draft.points.length) this.draft = null;
      this.render();
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selection) {
      event.preventDefault();
      this.snapshot();
      this._deleteObject(this.selection.kind, this.selection.id);
      this.render();
      this.renderSide();
      return;
    }
    const tool = TOOLS.find((entry) => entry.key.toLowerCase() === event.key.toLowerCase());
    if (tool) { event.preventDefault(); this.setTool(tool.id); }
  }

  setTool(id) {
    this.tool = id;
    this.draft = null;
    this.drag = null;
    this._openingHover = null;
    if (id !== 'select') this.selection = null;
    this._buildBar();
    this.render();
    this.renderSide();
  }

  /* ----------------------------- Rendern -------------------------- */

  _buildBar() {
    const lang = this.lang;
    const toolButtons = TOOLS.map((entry) => {
      const label = t(lang, `tools.${entry.id}.label`);
      return `<button data-tool="${entry.id}" class="${this.tool === entry.id ? 'active' : ''}" title="${esc(label)} (${entry.key})">${icon(entry.id)}<span>${esc(label)}</span></button>`;
    }).join('');

    this.bar.innerHTML = `
      <h1>${esc(t(lang, 'planEditor.title'))}</h1>
      <div class="group">${toolButtons}</div>
      <div class="group">
        <button data-act="undo" title="${esc(t(lang, 'planEditor.undoTitle'))}" ${this.undoStack.length ? '' : 'disabled'}>${icon('undo')}</button>
        <button data-act="redo" title="${esc(t(lang, 'planEditor.redoTitle'))}" ${this.redoStack.length ? '' : 'disabled'}>${icon('redo')}</button>
        <button data-act="fit" title="${esc(t(lang, 'planEditor.fitTitle'))}">${icon('fit')}</button>
      </div>
      <label class="toggle"><input type="checkbox" data-flag="showGrid" ${this.showGrid ? 'checked' : ''}> ${t(lang, 'planEditor.toggleGrid')}</label>
      <label class="toggle"><input type="checkbox" data-flag="snapGrid" ${this.snapGrid ? 'checked' : ''}> ${t(lang, 'planEditor.toggleSnapGrid')}</label>
      <label class="toggle"><input type="checkbox" data-flag="snapPoints" ${this.snapPoints ? 'checked' : ''}> ${t(lang, 'planEditor.toggleSnapPoints')}</label>
      <label class="toggle"><input type="checkbox" data-flag="snapAxisOn" ${this.snapAxisOn ? 'checked' : ''}> ${t(lang, 'planEditor.toggleAxisSnap')}</label>
      <div class="spacer"></div>
      <button class="ghost" data-act="cancel">${t(lang, 'planEditor.cancel')}</button>
      <button class="primary" data-act="save">${t(lang, 'planEditor.save')}</button>
    `;

    this.bar.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.onclick = () => this.setTool(btn.dataset.tool);
    });
    this.bar.querySelectorAll('[data-flag]').forEach((input) => {
      input.onchange = () => { this[input.dataset.flag] = input.checked; this.render(); };
    });
    this.bar.querySelector('[data-act="undo"]').onclick = () => { this.undo(); this._buildBar(); this.renderSide(); };
    this.bar.querySelector('[data-act="redo"]').onclick = () => { this.redo(); this._buildBar(); this.renderSide(); };
    this.bar.querySelector('[data-act="fit"]').onclick = () => { this.zoomToFit(); this.render(); };
    this.bar.querySelector('[data-act="cancel"]').onclick = () => this.close(null);
    this.bar.querySelector('[data-act="save"]').onclick = () => this.close({
      floorplan: this.state,
      px_per_meter: this.pxPerMeter,
      background: this.background,
      background_opacity: this.backgroundOpacity,
    });
  }

  render() {
    const vb = this.viewBox;
    this.svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    this.svg.setAttribute('preserveAspectRatio', 'none');
    this.svg.setAttribute('class', `plan tool-${this.tool}`);

    const parts = [];
    parts.push(this._defs(vb));
    if (this.background) {
      parts.push(`<image href="${esc(this.background)}" x="0" y="0" opacity="${this.backgroundOpacity}" preserveAspectRatio="xMinYMin meet" style="pointer-events:none"/>`);
    }
    if (this.showGrid) parts.push(`<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="url(#grid)" style="pointer-events:none"/>`);

    parts.push(this._renderRooms());
    parts.push(this._renderWalls());
    parts.push(this._renderOpenings());
    parts.push(this._renderSensors());
    parts.push(this._renderDraft());
    parts.push(this._renderHandles());

    this.svg.innerHTML = parts.join('');
    this._updateHint();
    this._updateReadout();
    this._updateBarState();
  }

  /** Nur die Zustände in der Leiste nachziehen — ein kompletter Neuaufbau
   *  bei jeder Mausbewegung würde den Fokus aus den Eingaben reißen. */
  _updateBarState() {
    const undoBtn = this.bar.querySelector('[data-act="undo"]');
    const redoBtn = this.bar.querySelector('[data-act="redo"]');
    if (undoBtn) undoBtn.disabled = !this.undoStack.length;
    if (redoBtn) redoBtn.disabled = !this.redoStack.length;
  }

  _defs(vb) {
    const g = this.gridStep;
    const major = g * 4;
    return `<defs>
      <pattern id="grid" width="${major}" height="${major}" patternUnits="userSpaceOnUse">
        <rect width="${major}" height="${major}" fill="none"/>
        <path d="M ${major} 0 L 0 0 0 ${major}" fill="none" stroke="#1b2230" stroke-width="1" vector-effect="non-scaling-stroke"/>
        <path d="M ${g} 0 V ${major} M ${g * 2} 0 V ${major} M ${g * 3} 0 V ${major} M 0 ${g} H ${major} M 0 ${g * 2} H ${major} M 0 ${g * 3} H ${major}"
              fill="none" stroke="#141a26" stroke-width="1" vector-effect="non-scaling-stroke"/>
      </pattern>
    </defs>`;
  }

  _isSelected(kind, id) {
    return this.selection && this.selection.kind === kind && this.selection.id === id;
  }

  _renderRooms() {
    const fontSize = this.px(13);
    return this.state.rooms.map((room) => {
      const pts = room.points.map((p) => `${p[0]},${p[1]}`).join(' ');
      const selected = this._isSelected('room', room.id);
      const [cx, cy] = polygonCentroid(room.points);
      const area = roomAreaSqm(room, this.pxPerMeter);
      return `<g>
        <polygon points="${pts}" data-kind="room" data-id="${room.id}"
          fill="${selected ? 'rgba(59,109,243,0.20)' : 'rgba(126,150,190,0.10)'}"
          stroke="${selected ? '#3b6df3' : 'rgba(126,150,190,0.35)'}" stroke-width="1.5"
          vector-effect="non-scaling-stroke"/>
        <text x="${cx}" y="${cy}" text-anchor="middle" font-size="${fontSize}" fill="#c7d0de"
          style="pointer-events:none" font-weight="600">${esc(room.name)}</text>
        <text x="${cx}" y="${cy + fontSize * 1.15}" text-anchor="middle" font-size="${fontSize * 0.8}"
          fill="#6f7b8f" style="pointer-events:none">${area.toFixed(1)} m²</text>
      </g>`;
    }).join('');
  }

  _renderWalls() {
    const walls = buildWalls(this.state);
    const openings = this.state.openings;
    const out = [];

    for (const wall of walls) {
      const dx = wall.x2 - wall.x1, dy = wall.y2 - wall.y1;
      const width = wall.type === 'exterior' ? 7 : 4.5;
      const selected = wall.free && this._isSelected('wall', wall.id);
      for (const [t0, t1] of wallGaps(wall, openings, Math.max(6, this.px(8)))) {
        out.push(`<line x1="${wall.x1 + dx * t0}" y1="${wall.y1 + dy * t0}" x2="${wall.x1 + dx * t1}" y2="${wall.y1 + dy * t1}"
          stroke="${selected ? '#3b6df3' : '#8e9bb1'}" stroke-width="${width}" stroke-linecap="butt"
          vector-effect="non-scaling-stroke" style="pointer-events:none"/>`);
      }
      if (wall.free) {
        out.push(`<line x1="${wall.x1}" y1="${wall.y1}" x2="${wall.x2}" y2="${wall.y2}"
          stroke="transparent" stroke-width="16" vector-effect="non-scaling-stroke"
          data-kind="wall" data-id="${wall.id}"/>`);
      }
    }
    return out.join('');
  }

  _renderOpenings() {
    const out = [];
    for (const o of this.state.openings) {
      const hx = (Math.cos(o.angle) * o.width) / 2;
      const hy = (Math.sin(o.angle) * o.width) / 2;
      const selected = this._isSelected('opening', o.id);
      const color = selected ? '#3b6df3' : o.type === 'window' ? '#6aa9ff' : '#9aa6ba';

      if (o.type === 'window') {
        out.push(`<line x1="${o.x - hx}" y1="${o.y - hy}" x2="${o.x + hx}" y2="${o.y + hy}"
          stroke="${color}" stroke-width="3" vector-effect="non-scaling-stroke" style="pointer-events:none"/>`);
      } else if (o.type === 'door') {
        const r = o.width;
        const sweepX = o.x - hx + Math.cos(o.angle - Math.PI / 2) * r;
        const sweepY = o.y - hy + Math.sin(o.angle - Math.PI / 2) * r;
        out.push(`<path d="M ${o.x - hx} ${o.y - hy} L ${o.x + hx} ${o.y + hy} M ${o.x + hx} ${o.y + hy} A ${r} ${r} 0 0 0 ${sweepX} ${sweepY}"
          fill="none" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke"
          stroke-dasharray="${selected ? '' : ''}" style="pointer-events:none"/>`);
      } else {
        out.push(`<line x1="${o.x - hx}" y1="${o.y - hy}" x2="${o.x + hx}" y2="${o.y + hy}"
          stroke="${color}" stroke-width="2" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" style="pointer-events:none"/>`);
      }
      out.push(`<line x1="${o.x - hx}" y1="${o.y - hy}" x2="${o.x + hx}" y2="${o.y + hy}"
        stroke="transparent" stroke-width="18" vector-effect="non-scaling-stroke"
        data-kind="opening" data-id="${o.id}"/>`);
    }

    if (this.tool === 'opening' && this._openingHover) {
      const h = this._openingHover;
      const w = this.pxPerMeter * 0.9;
      const hx = (Math.cos(h.angle) * w) / 2, hy = (Math.sin(h.angle) * w) / 2;
      out.push(`<line x1="${h.x - hx}" y1="${h.y - hy}" x2="${h.x + hx}" y2="${h.y + hy}"
        stroke="#3b6df3" stroke-width="6" stroke-linecap="round" opacity="0.6"
        vector-effect="non-scaling-stroke" style="pointer-events:none"/>`);
    }
    return out.join('');
  }

  _renderSensors() {
    const r = this.px(7);
    return this.state.sensors.map((s) => {
      const selected = this._isSelected('sensor', s.id);
      const value = this._entityValue(s.entity);
      const label = [s.name || s.entity || t(this.lang, 'planEditor.sensorFallback'), value].filter(Boolean).join(' · ');
      return `<g>
        <circle cx="${s.x}" cy="${s.y}" r="${r}" fill="${selected ? '#3b6df3' : '#ff6b6b'}"
          stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"
          data-kind="sensor" data-id="${s.id}"/>
        <text x="${s.x}" y="${s.y - r * 1.6}" text-anchor="middle" font-size="${this.px(12)}"
          fill="#e7eaf0" style="pointer-events:none" paint-order="stroke"
          stroke="rgba(11,14,20,0.85)" stroke-width="${this.px(3)}">${esc(label)}</text>
      </g>`;
    }).join('');
  }

  _entityValue(entityId) {
    if (!entityId || !this.hass || !this.hass.states[entityId]) return '';
    const state = this.hass.states[entityId];
    const unit = (state.attributes && state.attributes.unit_of_measurement) || '';
    return `${state.state} ${unit}`.trim();
  }

  _renderDraft() {
    const d = this.draft;
    if (!d) return '';
    const out = [];

    if (d.kind === 'rect' && d.end) {
      const x = Math.min(d.start.x, d.end.x), y = Math.min(d.start.y, d.end.y);
      const w = Math.abs(d.end.x - d.start.x), h = Math.abs(d.end.y - d.start.y);
      out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(59,109,243,0.18)"
        stroke="#3b6df3" stroke-width="1.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" style="pointer-events:none"/>`);
      out.push(this._dimensionLabel(x + w / 2, y - this.px(8), `${(w / this.pxPerMeter).toFixed(2)} × ${(h / this.pxPerMeter).toFixed(2)} m`));
    }

    if (d.kind === 'polygon') {
      const pts = d.points.map((p) => `${p[0]},${p[1]}`);
      if (d.cursor) pts.push(`${d.cursor.x},${d.cursor.y}`);
      out.push(`<polyline points="${pts.join(' ')}" fill="rgba(59,109,243,0.12)" stroke="#3b6df3"
        stroke-width="1.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" style="pointer-events:none"/>`);
      for (const p of d.points) {
        out.push(`<circle cx="${p[0]}" cy="${p[1]}" r="${this.px(4)}" fill="#3b6df3" style="pointer-events:none"/>`);
      }
    }

    if ((d.kind === 'wall' || d.kind === 'measure') && d.cursor) {
      const end = d.kind === 'measure' && d.end ? d.end : d.cursor;
      const color = d.kind === 'measure' ? '#eab308' : d.cursor.snapped === 'point' ? '#33c17c' : '#3b6df3';
      out.push(`<line x1="${d.start.x}" y1="${d.start.y}" x2="${end.x}" y2="${end.y}"
        stroke="${color}" stroke-width="3" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" style="pointer-events:none"/>`);
      out.push(`<circle cx="${d.start.x}" cy="${d.start.y}" r="${this.px(4)}" fill="${color}" style="pointer-events:none"/>`);
      out.push(`<circle cx="${end.x}" cy="${end.y}" r="${this.px(4)}" fill="${color}" style="pointer-events:none"/>`);
      const len = Math.hypot(end.x - d.start.x, end.y - d.start.y);
      out.push(this._dimensionLabel((d.start.x + end.x) / 2, (d.start.y + end.y) / 2 - this.px(10),
        `${(len / this.pxPerMeter).toFixed(2)} m`));
    }
    return out.join('');
  }

  _dimensionLabel(x, y, text) {
    return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${this.px(12)}" fill="#fff"
      paint-order="stroke" stroke="rgba(11,14,20,0.85)" stroke-width="${this.px(3)}"
      style="pointer-events:none" font-weight="600">${esc(text)}</text>`;
  }

  _renderHandles() {
    if (this.tool !== 'select' || !this.selection) return '';
    const r = this.px(5);
    const handle = (x, y, owner, id, vertex) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#3b6df3" stroke-width="2"
        vector-effect="non-scaling-stroke" style="cursor:grab"
        data-kind="handle" data-owner="${owner}" data-id="${id}" data-vertex="${vertex}"/>`;

    if (this.selection.kind === 'room') {
      const room = this.state.rooms.find((x) => x.id === this.selection.id);
      if (!room) return '';
      return room.points.map((p, i) => handle(p[0], p[1], 'room', room.id, i)).join('');
    }
    if (this.selection.kind === 'wall') {
      const w = this.state.walls.find((x) => x.id === this.selection.id);
      if (!w) return '';
      return handle(w.x1, w.y1, 'wall', w.id, 0) + handle(w.x2, w.y2, 'wall', w.id, 1);
    }
    return '';
  }

  _updateHint() {
    const lang = this.lang;
    const tool = TOOLS.find((entry) => entry.id === this.tool);
    const base = tool
      ? `<b>${esc(t(lang, `tools.${tool.id}.label`))}</b> — ${esc(t(lang, `tools.${tool.id}.hint`))}`
      : '';
    this.hintEl.innerHTML = `${base} &nbsp;·&nbsp; ${esc(t(lang, 'planEditor.hintSuffix'))}`;
  }

  _updateReadout() {
    if (!this.pointer) { this.readoutEl.textContent = ''; return; }
    const m = (v) => (v / this.pxPerMeter).toFixed(2);
    this.readoutEl.textContent = `x ${m(this.pointer.x)} m · y ${m(this.pointer.y)} m · ${Math.round(this.view.zoom * 100)} %`;
  }

  /* -------------------------- Seitenleiste ------------------------ */

  renderSide() {
    this.side.innerHTML = '';
    if (this.draft && this.draft.kind === 'wall') this.side.appendChild(this._panelWallDraft());
    else if (this.tool === 'measure') this.side.appendChild(this._panelMeasure());
    else if (this.selection) this.side.appendChild(this._panelSelection());
    else this.side.appendChild(this._panelGeneral());
    this.side.appendChild(this._panelLists());
  }

  _panel(title, innerHtml) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<h2>${esc(title)}</h2><div class="panel">${innerHtml}</div>`;
    return wrap;
  }

  _panelGeneral() {
    const lang = this.lang;
    const panel = this._panel(t(lang, 'planEditor.panelGeneral'), `
      <div class="field">
        <label>${t(lang, 'planEditor.scaleLabel')}</label>
        <input type="number" data-f="pxPerMeter" value="${this.pxPerMeter}" step="0.1" min="1">
      </div>
      <div class="field">
        <label>${t(lang, 'planEditor.backgroundLabel')}</label>
        <input type="text" data-f="background" value="${esc(this.background)}" placeholder="${t(lang, 'planEditor.backgroundPlaceholder')}">
      </div>
      <div class="field">
        <label>${t(lang, 'planEditor.backgroundOpacityLabel')} <span data-out="bgOpacity">${Math.round(this.backgroundOpacity * 100)} %</span></label>
        <input type="range" data-f="backgroundOpacity" min="0" max="1" step="0.05" value="${this.backgroundOpacity}">
      </div>
      <div class="empty-note">${t(lang, 'planEditor.scaleNote')}</div>
    `);

    panel.querySelector('[data-f="pxPerMeter"]').oninput = (e) => {
      const v = parseFloat(e.target.value);
      if (v > 0) { this.pxPerMeter = v; this.render(); }
    };
    panel.querySelector('[data-f="background"]').oninput = (e) => { this.background = e.target.value; this.render(); };
    panel.querySelector('[data-f="backgroundOpacity"]').oninput = (e) => {
      this.backgroundOpacity = parseFloat(e.target.value);
      panel.querySelector('[data-out="bgOpacity"]').textContent = `${Math.round(this.backgroundOpacity * 100)} %`;
      this.render();
    };
    return panel;
  }

  _panelWallDraft() {
    const lang = this.lang;
    const end = this.draft.cursor || this.draft.start;
    const len = Math.hypot(end.x - this.draft.start.x, end.y - this.draft.start.y);
    const angle = Math.round((Math.atan2(end.y - this.draft.start.y, end.x - this.draft.start.x) * 180) / Math.PI);
    const panel = this._panel(t(lang, 'planEditor.panelWallDraft'), `
      <div class="field">
        <label>${t(lang, 'planEditor.currentLength')}</label>
        <input type="text" data-out="draftLength" value="${(len / this.pxPerMeter).toFixed(2)} m · ${angle}°" readonly>
      </div>
      <div class="field">
        <label>${t(lang, 'planEditor.exactLengthLabel')}</label>
        <input type="number" data-f="len" step="0.01" placeholder="${t(lang, 'planEditor.examplePlaceholder')}" autofocus>
      </div>
      <button class="ghost" data-act="cancel" style="width:100%;justify-content:center">${t(lang, 'planEditor.finishDrawing')}</button>
    `);

    const input = panel.querySelector('[data-f="len"]');
    input.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const meters = parseFloat(input.value);
      if (!(meters > 0)) return;
      const dir = Math.atan2(end.y - this.draft.start.y, end.x - this.draft.start.x);
      const lengthPx = meters * this.pxPerMeter;
      this._commitWall({
        x: this.draft.start.x + Math.cos(dir) * lengthPx,
        y: this.draft.start.y + Math.sin(dir) * lengthPx,
      });
    };
    panel.querySelector('[data-act="cancel"]').onclick = () => { this.draft = null; this.render(); this.renderSide(); };
    return panel;
  }

  _panelMeasure() {
    const lang = this.lang;
    const d = this.draft;
    const hasBoth = d && d.end;
    const pxDist = hasBoth ? Math.hypot(d.end.x - d.start.x, d.end.y - d.start.y) : 0;
    const panel = this._panel(t(lang, 'planEditor.panelMeasure'), `
      <div class="empty-note" style="margin-bottom:10px">${t(lang, 'planEditor.measureNote')}</div>
      <div class="field">
        <label>${t(lang, 'planEditor.measuredDistance')}</label>
        <input type="text" value="${hasBoth ? Math.round(pxDist) + ' px' : t(lang, 'planEditor.notMeasuredYet')}" readonly>
      </div>
      <div class="field">
        <label>${t(lang, 'planEditor.realLengthLabel')}</label>
        <input type="number" data-f="meters" step="0.01" placeholder="${t(lang, 'planEditor.examplePlaceholder')}" ${hasBoth ? '' : 'disabled'}>
      </div>
      <div class="field"><label>${t(lang, 'planEditor.current')}</label><input type="text" value="${this.pxPerMeter.toFixed(2)} px / m" readonly></div>
    `);

    const input = panel.querySelector('[data-f="meters"]');
    if (input) {
      input.onkeydown = (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const meters = parseFloat(input.value);
        if (meters > 0 && pxDist > 0) {
          this.pxPerMeter = pxDist / meters;
          this.draft = null;
          this.setTool('select');
        }
      };
      if (hasBoth) requestAnimationFrame(() => input.focus());
    }
    return panel;
  }

  _panelSelection() {
    const { kind, id } = this.selection;
    if (kind === 'room') return this._panelRoom(id);
    if (kind === 'sensor') return this._panelSensor(id);
    if (kind === 'opening') return this._panelOpening(id);
    if (kind === 'wall') return this._panelWall(id);
    return this._panelGeneral();
  }

  _withDelete(panel, kind, id) {
    const btn = document.createElement('button');
    btn.className = 'danger';
    btn.style.cssText = 'width:100%;justify-content:center;margin-top:10px';
    btn.innerHTML = `${icon('erase')}<span>${esc(t(this.lang, 'planEditor.deleteButton'))}</span>`;
    btn.onclick = () => {
      this.snapshot();
      this._deleteObject(kind, id);
      this.render();
      this.renderSide();
    };
    panel.querySelector('.panel').appendChild(btn);
    return panel;
  }

  _panelRoom(id) {
    const lang = this.lang;
    const room = this.state.rooms.find((r) => r.id === id);
    if (!room) return this._panelGeneral();
    const size = roomSizeMeters(room, this.pxPerMeter);
    const panel = this._panel(t(lang, 'planEditor.panelRoom'), `
      <div class="field"><label>${t(lang, 'planEditor.name')}</label><input type="text" data-f="name" value="${esc(room.name)}"></div>
      <div class="row">
        <div class="field"><label>${t(lang, 'planEditor.width')}</label>
          <input type="number" data-f="width" value="${size.width.toFixed(2)}" step="0.05" min="0.1"></div>
        <div class="field"><label>${t(lang, 'planEditor.length')}</label>
          <input type="number" data-f="height" value="${size.height.toFixed(2)}" step="0.05" min="0.1"></div>
      </div>
      <div class="row">
        <div class="field"><label>${t(lang, 'planEditor.area')}</label>
          <input type="text" data-out="area" value="${roomAreaSqm(room, this.pxPerMeter).toFixed(2)} m²" readonly></div>
        <div class="field"><label>${t(lang, 'planEditor.corners')}</label><input type="text" value="${room.points.length}" readonly></div>
      </div>
      <div class="empty-note">${t(lang, 'planEditor.roomSizeNote')}</div>
    `);

    panel.querySelector('[data-f="name"]').oninput = (e) => {
      room.name = e.target.value;
      this.render();
      this._refreshRoomListEntry(room);
    };

    const widthInput = panel.querySelector('[data-f="width"]');
    const heightInput = panel.querySelector('[data-f="height"]');
    const areaOut = panel.querySelector('[data-out="area"]');
    // Bewusst ohne renderSide(): ein Neuaufbau der Seitenleiste würde den
    // Fokus aus dem gerade bearbeiteten Feld reißen. Die abhängigen
    // Anzeigen ziehen wir stattdessen von Hand nach.
    const applySize = () => {
      const current = roomSizeMeters(room, this.pxPerMeter);
      const width = parseFloat(widthInput.value);
      const height = parseFloat(heightInput.value);
      const targetW = width > 0 ? width : current.width;
      const targetH = height > 0 ? height : current.height;
      widthInput.value = targetW.toFixed(2);
      heightInput.value = targetH.toFixed(2);
      if (Math.abs(targetW - current.width) < 1e-4 && Math.abs(targetH - current.height) < 1e-4) return;
      this.snapshot();
      room.points = resizeRoomPoints(room.points, targetW * this.pxPerMeter, targetH * this.pxPerMeter);
      areaOut.value = `${roomAreaSqm(room, this.pxPerMeter).toFixed(2)} m²`;
      this.render();
      this._refreshRoomListEntry(room);
    };
    widthInput.onchange = applySize;
    heightInput.onchange = applySize;

    return this._withDelete(panel, 'room', id);
  }

  _roomSubLabel(room) {
    const size = roomSizeMeters(room, this.pxPerMeter);
    return `${size.width.toFixed(2)} × ${size.height.toFixed(2)} m · ${roomAreaSqm(room, this.pxPerMeter).toFixed(1)} m²`;
  }

  /** Aktualisiert einen Listeneintrag, ohne die Seitenleiste neu zu bauen. */
  _refreshRoomListEntry(room) {
    const item = this.side.querySelector(`.item[data-kind="room"][data-id="${room.id}"]`);
    if (!item) return;
    const [title, sub] = item.querySelectorAll('.grow > div');
    if (title) title.textContent = room.name;
    if (sub) sub.textContent = this._roomSubLabel(room);
  }

  _panelWall(id) {
    const lang = this.lang;
    const wall = this.state.walls.find((w) => w.id === id);
    if (!wall) return this._panelGeneral();
    const len = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1) / this.pxPerMeter;
    const panel = this._panel(t(lang, 'planEditor.panelWall'), `
      <div class="field"><label>${t(lang, 'planEditor.type')}</label>
        <div class="seg">${WALL_TYPES.map((type) => `<button data-type="${type}" class="${wall.type === type ? 'active' : ''}">${t(lang, WALL_LABEL_KEYS[type])}</button>`).join('')}</div>
      </div>
      <div class="field"><label>${t(lang, 'planEditor.wallLength')}</label><input type="number" data-f="len" value="${len.toFixed(2)}" step="0.01" min="0.05"></div>
      <div class="empty-note">${t(lang, 'planEditor.wallTypeNote')}</div>
    `);
    panel.querySelectorAll('[data-type]').forEach((btn) => {
      btn.onclick = () => { this.snapshot(); wall.type = btn.dataset.type; this.render(); this.renderSide(); };
    });
    panel.querySelector('[data-f="len"]').onchange = (e) => {
      const meters = parseFloat(e.target.value);
      if (!(meters > 0)) return;
      this.snapshot();
      const dir = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
      wall.x2 = wall.x1 + Math.cos(dir) * meters * this.pxPerMeter;
      wall.y2 = wall.y1 + Math.sin(dir) * meters * this.pxPerMeter;
      this.render();
    };
    return this._withDelete(panel, 'wall', id);
  }

  _panelOpening(id) {
    const lang = this.lang;
    const o = this.state.openings.find((x) => x.id === id);
    if (!o) return this._panelGeneral();
    const panel = this._panel(t(lang, 'planEditor.panelOpening'), `
      <div class="field"><label>${t(lang, 'planEditor.kind')}</label>
        <div class="seg">${OPENING_TYPES.map((type) => `<button data-type="${type}" class="${o.type === type ? 'active' : ''}">${t(lang, OPENING_LABEL_KEYS[type])}</button>`).join('')}</div>
      </div>
      <div class="field">
        <label>${t(lang, 'planEditor.openingWidthLabel')} <span data-out="w">${(o.width / this.pxPerMeter).toFixed(2)} m</span></label>
        <input type="range" data-f="width" min="${this.pxPerMeter * 0.3}" max="${this.pxPerMeter * 4}" step="1" value="${o.width}">
      </div>
      <div class="empty-note">${t(lang, 'planEditor.openingNote')}</div>
    `);
    panel.querySelectorAll('[data-type]').forEach((btn) => {
      btn.onclick = () => { this.snapshot(); o.type = btn.dataset.type; this.render(); this.renderSide(); };
    });
    panel.querySelector('[data-f="width"]').oninput = (e) => {
      o.width = parseFloat(e.target.value);
      panel.querySelector('[data-out="w"]').textContent = `${(o.width / this.pxPerMeter).toFixed(2)} m`;
      this.render();
    };
    return this._withDelete(panel, 'opening', id);
  }

  _panelSensor(id) {
    const lang = this.lang;
    const sensor = this.state.sensors.find((s) => s.id === id);
    if (!sensor) return this._panelGeneral();
    const panel = this._panel(t(lang, 'planEditor.panelSensor'), `
      <div class="field"><label>Entity</label><div class="combo"></div></div>
      <div class="field"><label>${t(lang, 'planEditor.displayNameLabel')}</label>
        <input type="text" data-f="name" value="${esc(sensor.name)}" placeholder="${t(lang, 'planEditor.exampleRoomPlaceholder')}"></div>
      <div class="field"><label>${t(lang, 'planEditor.currentValue')}</label>
        <input type="text" value="${esc(this._entityValue(sensor.entity) || t(lang, 'planEditor.notAvailable'))}" readonly></div>
    `);
    panel.querySelector('[data-f="name"]').oninput = (e) => { sensor.name = e.target.value; this.render(); };
    panel.querySelector('.combo').replaceWith(this._entityCombo(sensor));
    return this._withDelete(panel, 'sensor', id);
  }

  /** Schlanke Entity-Auswahl — filtert auf Entities mit numerischem Zustand. */
  _entityCombo(sensor) {
    const wrap = document.createElement('div');
    wrap.className = 'combo';
    wrap.innerHTML = `<input type="text" placeholder="${t(this.lang, 'planEditor.entityPlaceholder')}" value="${esc(sensor.entity)}">
      <div class="options" hidden></div>`;
    const input = wrap.querySelector('input');
    const list = wrap.querySelector('.options');

    const candidates = () => {
      if (!this.hass) return [];
      return Object.keys(this.hass.states)
        .filter((id) => {
          const s = this.hass.states[id];
          if (!Number.isFinite(parseFloat(s.state))) return false;
          const dc = s.attributes && s.attributes.device_class;
          return id.startsWith('sensor.') || dc === 'temperature' || dc === 'humidity';
        })
        .sort((a, b) => {
          const rank = (id) => {
            const dc = this.hass.states[id].attributes.device_class;
            return dc === 'temperature' ? 0 : dc === 'humidity' ? 1 : 2;
          };
          return rank(a) - rank(b) || a.localeCompare(b);
        });
    };

    const refresh = () => {
      const query = input.value.toLowerCase().trim();
      const items = candidates()
        .filter((id) => {
          if (!query) return true;
          const name = (this.hass.states[id].attributes.friendly_name || '').toLowerCase();
          return id.toLowerCase().includes(query) || name.includes(query);
        })
        .slice(0, 60);
      if (!items.length) { list.hidden = true; return; }
      list.innerHTML = items.map((id) => {
        const s = this.hass.states[id];
        const unit = (s.attributes && s.attributes.unit_of_measurement) || '';
        return `<div class="opt" data-id="${esc(id)}">
          <div>${esc(s.attributes.friendly_name || id)}</div>
          <div class="sub">${esc(id)} · ${esc(s.state)} ${esc(unit)}</div>
        </div>`;
      }).join('');
      list.hidden = false;
      list.querySelectorAll('.opt').forEach((opt) => {
        opt.onmousedown = (e) => {
          e.preventDefault();
          sensor.entity = opt.dataset.id;
          if (!sensor.name) {
            const friendly = this.hass.states[sensor.entity].attributes.friendly_name;
            if (friendly) sensor.name = friendly;
          }
          input.value = sensor.entity;
          list.hidden = true;
          this.render();
          this.renderSide();
        };
      });
    };

    input.oninput = () => { sensor.entity = input.value.trim(); refresh(); this.render(); };
    input.onfocus = refresh;
    input.onblur = () => setTimeout(() => { list.hidden = true; }, 120);
    return wrap;
  }

  _panelLists() {
    const lang = this.lang;
    const wrap = document.createElement('div');
    const sensorItems = this.state.sensors.map((s) => `
      <div class="item ${this._isSelected('sensor', s.id) ? 'selected' : ''}" data-kind="sensor" data-id="${s.id}">
        <div class="grow">
          <div>${esc(s.name || s.entity || t(lang, 'planEditor.noEntity'))}</div>
          <div class="sub">${esc(s.entity ? this._entityValue(s.entity) || s.entity : t(lang, 'planEditor.noEntityAssigned'))}</div>
        </div>
      </div>`).join('') || `<div class="empty-note">${t(lang, 'planEditor.noSensorsYet')}</div>`;

    const roomItems = this.state.rooms.map((r) => `
      <div class="item ${this._isSelected('room', r.id) ? 'selected' : ''}" data-kind="room" data-id="${r.id}">
        <div class="grow"><div>${esc(r.name)}</div>
        <div class="sub">${esc(this._roomSubLabel(r))}</div></div>
      </div>`).join('') || `<div class="empty-note">${t(lang, 'planEditor.noRoomsYet')}</div>`;

    wrap.innerHTML = `
      <h2>${t(lang, 'planEditor.sensorsHeader', { n: this.state.sensors.length })}</h2>
      <div class="list">${sensorItems}</div>
      <h2 style="margin-top:16px">${t(lang, 'planEditor.roomsHeader', { n: this.state.rooms.length })}</h2>
      <div class="list">${roomItems}</div>
      <h2 style="margin-top:16px">${t(lang, 'planEditor.overview')}</h2>
      <div class="panel">
        <div class="empty-note">
          ${t(lang, 'planEditor.summaryLine', {
            rooms: this.state.rooms.length, walls: this.state.walls.length,
            openings: this.state.openings.length, sensors: this.state.sensors.length,
          })}
        </div>
      </div>`;

    wrap.querySelectorAll('.item').forEach((item) => {
      item.onclick = () => {
        this.selection = { kind: item.dataset.kind, id: item.dataset.id };
        this.tool = 'select';
        this.render();
        this.renderSide();
      };
    });
    return wrap;
  }
}
