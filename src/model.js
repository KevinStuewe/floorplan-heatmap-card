/* ------------------------------------------------------------------ *
 * model.js — Datenmodell, Defaults und Ableitungen aus dem Grundriss.
 *
 * Der Grundriss besteht aus vier Objektarten:
 *
 *   rooms     Polygone. Ihre Kanten SIND Wände — man zeichnet keine
 *             Außenlinie doppelt. Ob eine Kante Außen- oder Innenwand
 *             ist, wird automatisch bestimmt (siehe buildWalls).
 *   walls     Freistehende Wandsegmente für Teilungen, die keinen Raum
 *             begrenzen (Raumteiler, Nische, Schrankwand).
 *   openings  Türen, Durchgänge und Fenster. Bewusst EIGENSTÄNDIGE
 *             Geometrie (Mittelpunkt + Winkel + Breite) statt an eine
 *             bestimmte Wand gehängt: liegen zwei Raumkanten aufeinander,
 *             öffnet eine Tür so automatisch beide.
 *   sensors   Messpunkte mit HA-Entity.
 *
 * Koordinaten sind abstrakte "Grundriss-Pixel". px_per_meter übersetzt
 * sie in Meter — nur für Beschriftungen und Sensor-Radien relevant, das
 * Feld selbst ist maßstabsfrei.
 * ------------------------------------------------------------------ */

import { pointInPolygon, polygonArea, bboxOfPoints } from './geometry.js';

export const DEFAULTS = {
  title: '',
  unit: '°C',
  min: 18,
  max: 26,
  auto_range: false,
  palette: 'coolwarm',
  opacity: 0.85,
  cell_size: 8,
  sensor_radius: 0.4,
  show_isotherms: true,
  isotherm_step: 0.5,
  show_room_labels: true,
  show_values: true,
  show_legend: true,
  show_walls: true,
  px_per_meter: 50,
  background: '',
  background_opacity: 0.25,
  aspect_ratio: '',

  // 2,5D-Ansicht
  view_mode: 'flat',   // 'flat' = Draufsicht, 'tilted' = aufgestellte Wände
  yaw: -22,            // Grad, Drehung um die Hochachse
  pitch: 58,           // Grad Höhenwinkel; 90 = senkrecht von oben
  wall_height: 2.5,    // Meter
};

export const VIEW_MODES = ['flat', 'tilted'];

/** Durchlässigkeit 0…1 pro Bauteil. 1 = freie Luft, 0 = perfekte Dämmung. */
export const DEFAULT_TRANSMITTANCE = {
  exterior: 0.02,
  interior: 0.12,
  door: 0.5,
  passage: 1.0,
  window: 0.08,
};

export const OPENING_TYPES = ['passage', 'door', 'window'];
export const WALL_TYPES = ['interior', 'exterior'];

let uidCounter = 0;
export function uid(prefix = 'id') {
  uidCounter += 1;
  return `${prefix}${Date.now().toString(36).slice(-4)}${uidCounter.toString(36)}`;
}

export function emptyFloorplan() {
  return { rooms: [], walls: [], openings: [], sensors: [] };
}

/** Füllt fehlende Felder auf und repariert alte/unvollständige Configs. */
export function normalizeConfig(raw) {
  const config = { ...DEFAULTS, ...(raw || {}) };
  const fp = { ...emptyFloorplan(), ...(raw && raw.floorplan ? raw.floorplan : {}) };

  fp.rooms = (fp.rooms || [])
    .map((r) => ({
      id: r.id || uid('r'),
      name: r.name || 'Raum',
      points: (r.points || []).map((p) => [Number(p[0]) || 0, Number(p[1]) || 0]),
    }))
    .filter((r) => r.points.length >= 3);

  fp.walls = (fp.walls || []).map((w) => ({
    id: w.id || uid('w'),
    x1: Number(w.x1) || 0,
    y1: Number(w.y1) || 0,
    x2: Number(w.x2) || 0,
    y2: Number(w.y2) || 0,
    type: WALL_TYPES.includes(w.type) ? w.type : 'interior',
  }));

  fp.openings = (fp.openings || []).map((o) => ({
    id: o.id || uid('o'),
    x: Number(o.x) || 0,
    y: Number(o.y) || 0,
    angle: Number(o.angle) || 0,
    width: Math.max(4, Number(o.width) || 45),
    type: OPENING_TYPES.includes(o.type) ? o.type : 'door',
  }));

  fp.sensors = (fp.sensors || []).map((s) => ({
    id: s.id || uid('s'),
    x: Number(s.x) || 0,
    y: Number(s.y) || 0,
    entity: s.entity || s.entity_id || '',
    name: s.name || s.label || '',
  }));

  config.floorplan = fp;
  config.transmittance = { ...DEFAULT_TRANSMITTANCE, ...(raw && raw.transmittance ? raw.transmittance : {}) };
  config.cell_size = Math.max(2, Number(config.cell_size) || DEFAULTS.cell_size);
  config.px_per_meter = Math.max(1, Number(config.px_per_meter) || DEFAULTS.px_per_meter);

  const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  config.view_mode = VIEW_MODES.includes(config.view_mode) ? config.view_mode : DEFAULTS.view_mode;
  config.yaw = num(config.yaw, DEFAULTS.yaw);
  // Unter ~12° wird die Bodenebene so flach, dass ihre Matrix nicht mehr
  // umkehrbar ist — dann ließe sich kein Hover-Wert mehr zuordnen.
  config.pitch = Math.min(90, Math.max(12, num(config.pitch, DEFAULTS.pitch)));
  config.wall_height = Math.min(8, Math.max(0.5, num(config.wall_height, DEFAULTS.wall_height)));
  return config;
}

/** Alle Punkte des Grundrisses — für Bounding-Box und Auto-Fit. */
export function floorplanPoints(fp) {
  const pts = [];
  for (const room of fp.rooms) pts.push(...room.points);
  for (const wall of fp.walls) pts.push([wall.x1, wall.y1], [wall.x2, wall.y2]);
  for (const s of fp.sensors) pts.push([s.x, s.y]);
  return pts;
}

export function floorplanBounds(fp, pad = 20) {
  return bboxOfPoints(floorplanPoints(fp), pad);
}

export function isEmptyFloorplan(fp) {
  return !fp || (!fp.rooms.length && !fp.walls.length);
}

/**
 * Baut die effektive Wandliste: jede Raumkante plus jede freistehende Wand.
 *
 * Raumkanten werden automatisch klassifiziert: liegt der Punkt knapp
 * außerhalb der Kante (entlang der Außennormalen) in einem anderen Raum,
 * ist es eine Innenwand — sonst eine Außenwand. Dadurch muss man beim
 * Zeichnen nicht über Wandtypen nachdenken.
 *
 * Deckungsgleiche Kanten (zwei Räume, exakt dieselbe Wand) werden
 * dedupliziert, damit dieselbe Wand nicht doppelt dämpft.
 */
export function buildWalls(fp) {
  const walls = [];
  const seen = new Set();
  const key = (x1, y1, x2, y2) => {
    const a = `${Math.round(x1)},${Math.round(y1)}`;
    const b = `${Math.round(x2)},${Math.round(y2)}`;
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  };

  for (const room of fp.rooms) {
    const pts = room.points;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      const k = key(x1, y1, x2, y2);
      if (seen.has(k)) continue;
      seen.add(k);

      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const probe = 6;
      const nx = (dy / len) * probe;
      const ny = (-dx / len) * probe;
      // Beide Seiten der Kante abtasten statt sich auf die Umlaufrichtung
      // des Polygons zu verlassen: Räume überlappen sich nicht, also kann
      // nur die Außenseite in einem anderen Raum landen — und das
      // funktioniert unabhängig davon, wie herum gezeichnet wurde.
      const neighbouring = fp.rooms.some(
        (other) =>
          other.id !== room.id &&
          (pointInPolygon(mx + nx, my + ny, other.points) ||
            pointInPolygon(mx - nx, my - ny, other.points))
      );

      walls.push({
        id: `${room.id}:${i}`,
        x1, y1, x2, y2,
        type: neighbouring ? 'interior' : 'exterior',
        roomId: room.id,
        edge: i,
      });
    }
  }

  for (const w of fp.walls) {
    const k = key(w.x1, w.y1, w.x2, w.y2);
    if (seen.has(k)) continue;
    seen.add(k);
    walls.push({ id: w.id, x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, type: w.type, free: true });
  }

  return walls;
}

/** Endpunkte für das Einrasten beim Zeichnen. */
export function snapCandidates(fp) {
  const pts = [];
  for (const room of fp.rooms) for (const p of room.points) pts.push({ x: p[0], y: p[1] });
  for (const w of fp.walls) pts.push({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
  return pts;
}

export function roomAreaSqm(room, pxPerMeter) {
  return Math.abs(polygonArea(room.points)) / (pxPerMeter * pxPerMeter);
}

/** Außenmaße eines Raums (umschließendes Rechteck) in Metern. */
export function roomSizeMeters(room, pxPerMeter) {
  const b = bboxOfPoints(room.points);
  return {
    width: (b.maxX - b.minX) / pxPerMeter,
    height: (b.maxY - b.minY) / pxPerMeter,
  };
}

/**
 * Streckt ein Raumpolygon auf die gewünschten Außenmaße in Grundriss-Pixeln.
 *
 * Die linke obere Ecke bleibt stehen — so wandert der Raum beim Tippen
 * einer neuen Länge nicht unter dem Blick weg, und ein an dieser Ecke
 * anschließender Nachbarraum bleibt bündig. Bei nicht rechteckigen Räumen
 * wird das ganze Polygon proportional mitgezogen. Achsen ohne Ausdehnung
 * (entartetes Polygon) bleiben unverändert: aus 0 lässt sich nichts
 * skalieren.
 */
export function resizeRoomPoints(points, widthPx, heightPx) {
  const b = bboxOfPoints(points);
  const spanX = b.maxX - b.minX;
  const spanY = b.maxY - b.minY;
  const sx = widthPx > 0 && spanX > 1e-6 ? widthPx / spanX : 1;
  const sy = heightPx > 0 && spanY > 1e-6 ? heightPx / spanY : 1;
  return points.map(([x, y]) => [b.minX + (x - b.minX) * sx, b.minY + (y - b.minY) * sy]);
}
