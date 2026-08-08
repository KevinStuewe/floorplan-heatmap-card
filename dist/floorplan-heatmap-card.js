/**
 * floorplan-heatmap-card
 * Temperatur-Heatmap über einen Grundriss für Home Assistant.
 *
 * ERZEUGTE DATEI — nicht direkt bearbeiten.
 * Quellen liegen in src/, neu bauen mit: node build.mjs
 */
(function () {
'use strict';

/* ===== src/i18n.js ===== */
/* ------------------------------------------------------------------ *
 * i18n.js — Übersetzungstabelle und Spracherkennung.
 *
 * Unterstützt Deutsch und Englisch. Die Sprache wird automatisch aus
 * hass.language übernommen (Home Assistants eigene Spracheinstellung),
 * es gibt bewusst keine Karten-eigene Sprachoption. Vor dem ersten
 * hass-Objekt (z. B. beim Registrieren der Karte in index.js) greift
 * detectLanguageFallback() auf localStorage/navigator zurück.
 * ------------------------------------------------------------------ */

const TRANSLATIONS = {
  en: {
    'customCards.name': 'Floorplan Heatmap',
    'customCards.description':
      'Temperature distribution over a floor plan — with walls, doors, and windows as thermal resistance.',

    'card.defaultTitle': 'Temperature Distribution',
    'card.resetViewTitle': 'Reset view angle',
    'card.resetViewLabel': 'View',
    'card.emptyLine1': 'No floor plan yet.',
    'card.emptyLine2': 'Edit card → open {button} and draw rooms.',
    'card.spreadTooltip': 'Spread between warmest and coldest sensor',

    'planEditor.title': 'Floor Plan & Sensors',

    'editor.openPlanButton': 'Edit Floor Plan & Sensors',
    'editor.counts': '{rooms} rooms · {sensors} sensors · {openings} openings',
    'editor.sectionDisplay': 'Display',
    'editor.sectionView': 'View',
    'editor.sectionShow': 'Show',
    'editor.sectionModel': 'Model & Accuracy',
    'editor.sectionTransmittance': 'Thermal transmittance',
    'editor.fieldTitle': 'Title',
    'editor.fieldUnit': 'Unit',
    'editor.fieldPalette': 'Color scale',
    'editor.autoRange': 'Automatically fit scale to sensor readings',
    'editor.fieldMin': 'Minimum',
    'editor.fieldMax': 'Maximum',
    'editor.fieldOpacity': 'Field opacity',
    'editor.viewFlat': 'Top-down',
    'editor.viewTilted': '2.5D — walls raised',
    'editor.fieldYaw': 'Rotation',
    'editor.fieldPitch': 'Tilt angle',
    'editor.fieldWallHeight': 'Wall height',
    'editor.viewAngleNote':
      "These angles are just the starting point. In the card itself, you can rotate the model with the mouse at any time — that's purely a viewing choice and won't overwrite the default set here.",
    'editor.showWalls': 'Walls, doors, and windows',
    'editor.showRoomLabels': 'Room names',
    'editor.showValues': 'Values at sensors',
    'editor.showLegend': 'Color legend',
    'editor.showIsotherms': 'Isotherms (lines of equal temperature)',
    'editor.isothermStep': 'Isotherm spacing',
    'editor.cellSize': 'Grid resolution',
    'editor.cellSizeNote':
      'Smaller = finer and more accurate, but more compute-intensive. 6–10 px is a good compromise for apartments.',
    'editor.sensorRadius': 'Sensor radius',
    'editor.sensorRadiusNote':
      "How large the area around a sensor point is that's held exactly at its value.",
    'editor.transmittanceNote':
      '0% = perfect insulation, 100% = like free air. These values determine how strongly heat is exchanged between adjacent areas.',
    'editor.dialogClosedWarning':
      'floorplan-heatmap-card: The configuration dialog was closed while the floor plan editor was open. The changes could not be applied.',
    'editor.paletteCoolwarm': 'Cool–Warm (recommended)',
    'editor.paletteThermal': 'Thermal',
    'editor.paletteViridis': 'Viridis',
    'editor.paletteInferno': 'Inferno',
    'editor.paletteTurbo': 'Turbo',

    'label.exterior': 'Exterior wall',
    'label.interior': 'Interior wall',
    'label.door': 'Door',
    'label.window': 'Window',
    'label.passage': 'Passage',

    'tools.select.label': 'Select',
    'tools.select.hint':
      'Click to select · drag to move · drag corner handles · type room dimensions on the right · Del removes',
    'tools.room.label': 'Room',
    'tools.room.hint':
      'Drag for a rectangle · click repeatedly for a polygon (Enter or double-click closes it, Backspace undoes the last point)',
    'tools.wall.label': 'Wall',
    'tools.wall.hint':
      'Click to set the start, click again for the end · type a length on the right and press Enter for an exact size',
    'tools.opening.label': 'Door / Window',
    'tools.opening.hint':
      'Click on a wall — the opening snaps onto it and affects both adjoining rooms',
    'tools.sensor.label': 'Sensor',
    'tools.sensor.hint': 'Click to place a measurement point · assign the entity on the right',
    'tools.erase.label': 'Delete',
    'tools.erase.hint': 'Click an element to remove it',
    'tools.measure.label': 'Scale',
    'tools.measure.hint':
      'Click a stretch of known length and enter its real length in meters',

    'planEditor.undoTitle': 'Undo (Cmd/Ctrl+Z)',
    'planEditor.redoTitle': 'Redo (Cmd/Ctrl+Shift+Z)',
    'planEditor.fitTitle': 'Fit all',
    'planEditor.toggleGrid': 'Grid',
    'planEditor.toggleSnapGrid': 'Snap to grid',
    'planEditor.toggleSnapPoints': 'Snap to corners',
    'planEditor.toggleAxisSnap': '0°/90°',
    'planEditor.cancel': 'Cancel',
    'planEditor.save': 'Apply',
    'planEditor.hintSuffix': 'Scroll wheel zooms, middle button or spacebar pans.',
    'planEditor.roomFallback': 'Room {n}',
    'planEditor.sensorFallback': 'Sensor',
    'planEditor.panelGeneral': 'General Settings',
    'planEditor.panelWallDraft': 'Draw Wall',
    'planEditor.panelMeasure': 'Calibrate Scale',
    'planEditor.panelRoom': 'Room',
    'planEditor.panelWall': 'Freestanding Wall',
    'planEditor.panelOpening': 'Opening',
    'planEditor.panelSensor': 'Sensor',
    'planEditor.scaleLabel': 'Scale — pixels per meter',
    'planEditor.backgroundLabel': 'Background image (path under /local/…)',
    'planEditor.backgroundPlaceholder': '/local/floorplan.png',
    'planEditor.backgroundOpacityLabel': 'Background opacity —',
    'planEditor.scaleNote':
      'The scale only affects labels and the sensor radius — the temperature field itself is scale-free.',
    'planEditor.currentLength': 'Current length',
    'planEditor.exactLengthLabel': 'Set exact length (meters) — Enter confirms',
    'planEditor.examplePlaceholder': 'e.g. 3.20',
    'planEditor.finishDrawing': 'Finish drawing (Esc)',
    'planEditor.measureNote':
      'Click a stretch whose real length you know — a room wall, for example. Then enter the length in meters.',
    'planEditor.measuredDistance': 'Measured distance',
    'planEditor.notMeasuredYet': 'nothing measured yet',
    'planEditor.realLengthLabel': 'Real length (meters) — Enter applies',
    'planEditor.current': 'Current',
    'planEditor.name': 'Name',
    'planEditor.width': 'Width (m)',
    'planEditor.length': 'Length (m)',
    'planEditor.area': 'Area',
    'planEditor.corners': 'Corners',
    'planEditor.roomSizeNote':
      "Dimensions are the outer edges — Enter or clicking elsewhere applies them. The top-left corner stays fixed; doors and windows don't move with it. Corner points can still be dragged at the white handles.",
    'planEditor.type': 'Type',
    'planEditor.wallLength': 'Length',
    'planEditor.wallTypeNote':
      'Room edges are automatically detected as exterior or interior walls; this type only applies to freestanding walls.',
    'planEditor.kind': 'Kind',
    'planEditor.openingWidthLabel': 'Width —',
    'planEditor.openingNote':
      'Passage = open, door = clearly damped, window = almost sealed. The opening affects every wall at this spot — so both rooms, if two adjoin here.',
    'planEditor.displayNameLabel': 'Display name (empty = entity name)',
    'planEditor.exampleRoomPlaceholder': 'e.g. Living Room',
    'planEditor.currentValue': 'Current value',
    'planEditor.notAvailable': 'not available',
    'planEditor.entityPlaceholder': 'sensor.living_room_temperature',
    'planEditor.deleteButton': 'Delete (Del)',
    'planEditor.noEntity': 'No entity',
    'planEditor.noEntityAssigned': 'no entity assigned',
    'planEditor.noSensorsYet': 'No sensors placed yet.',
    'planEditor.noRoomsYet': 'No rooms drawn yet.',
    'planEditor.sensorsHeader': 'Sensors ({n})',
    'planEditor.roomsHeader': 'Rooms ({n})',
    'planEditor.overview': 'Overview',
    'planEditor.summaryLine':
      '{rooms} rooms · {walls} freestanding walls · {openings} openings · {sensors} sensors',
  },

  de: {
    'customCards.name': 'Grundriss-Heatmap',
    'customCards.description':
      'Temperaturverteilung über einen Grundriss — mit Wänden, Türen und Fenstern als Wärmewiderstand.',

    'card.defaultTitle': 'Temperaturverteilung',
    'card.resetViewTitle': 'Blickwinkel zurücksetzen',
    'card.resetViewLabel': 'Ansicht',
    'card.emptyLine1': 'Noch kein Grundriss angelegt.',
    'card.emptyLine2': 'Karte bearbeiten → {button} öffnen und Räume zeichnen.',
    'card.spreadTooltip': 'Spreizung zwischen wärmstem und kältestem Sensor',

    'planEditor.title': 'Grundriss & Sensoren',

    'editor.openPlanButton': 'Grundriss & Sensoren bearbeiten',
    'editor.counts': '{rooms} Räume · {sensors} Sensoren · {openings} Öffnungen',
    'editor.sectionDisplay': 'Darstellung',
    'editor.sectionView': 'Ansicht',
    'editor.sectionShow': 'Anzeigen',
    'editor.sectionModel': 'Modell & Genauigkeit',
    'editor.sectionTransmittance': 'Wärmedurchlässigkeit',
    'editor.fieldTitle': 'Titel',
    'editor.fieldUnit': 'Einheit',
    'editor.fieldPalette': 'Farbskala',
    'editor.autoRange': 'Skala automatisch an die Messwerte anpassen',
    'editor.fieldMin': 'Minimum',
    'editor.fieldMax': 'Maximum',
    'editor.fieldOpacity': 'Deckkraft der Fläche',
    'editor.viewFlat': 'Draufsicht',
    'editor.viewTilted': '2,5D — Wände aufgestellt',
    'editor.fieldYaw': 'Drehung',
    'editor.fieldPitch': 'Höhenwinkel',
    'editor.fieldWallHeight': 'Wandhöhe',
    'editor.viewAngleNote':
      'Diese Winkel sind der Ausgangspunkt. In der Karte selbst lässt sich das Modell jederzeit mit der Maus drehen — das bleibt aber eine reine Ansichtssache und überschreibt die Voreinstellung hier nicht.',
    'editor.showWalls': 'Wände, Türen und Fenster',
    'editor.showRoomLabels': 'Raumnamen',
    'editor.showValues': 'Messwerte an den Sensoren',
    'editor.showLegend': 'Farblegende',
    'editor.showIsotherms': 'Isothermen (Linien gleicher Temperatur)',
    'editor.isothermStep': 'Abstand der Isothermen',
    'editor.cellSize': 'Gitterauflösung',
    'editor.cellSizeNote':
      'Kleiner = feiner und genauer, aber rechenintensiver. 6–10 px ist für Wohnungen ein guter Kompromiss.',
    'editor.sensorRadius': 'Sensorradius',
    'editor.sensorRadiusNote':
      'Wie groß die Fläche um einen Messpunkt ist, die exakt auf dessen Wert festgehalten wird.',
    'editor.transmittanceNote':
      '0 % = perfekte Dämmung, 100 % = wie freie Luft. Diese Werte bestimmen, wie stark Wärme zwischen benachbarten Bereichen ausgetauscht wird.',
    'editor.dialogClosedWarning':
      'floorplan-heatmap-card: Der Konfigurationsdialog wurde geschlossen, während der Grundriss-Editor offen war. Die Änderungen konnten nicht übernommen werden.',
    'editor.paletteCoolwarm': 'Kalt–Warm (empfohlen)',
    'editor.paletteThermal': 'Thermal',
    'editor.paletteViridis': 'Viridis',
    'editor.paletteInferno': 'Inferno',
    'editor.paletteTurbo': 'Turbo',

    'label.exterior': 'Außenwand',
    'label.interior': 'Innenwand',
    'label.door': 'Tür',
    'label.window': 'Fenster',
    'label.passage': 'Durchgang',

    'tools.select.label': 'Auswählen',
    'tools.select.hint':
      'Klicken zum Auswählen · ziehen zum Verschieben · Eckpunkte an den Griffen ziehen · Raummaße rechts eintippen · Entf löscht',
    'tools.room.label': 'Raum',
    'tools.room.hint':
      'Ziehen ergibt ein Rechteck · einzelne Klicks ergeben ein Polygon (Enter oder Doppelklick schließt, Rücktaste nimmt zurück)',
    'tools.wall.label': 'Wand',
    'tools.wall.hint':
      'Klick setzt den Anfang, zweiter Klick das Ende · Länge rechts eintippen und Enter für ein exaktes Maß',
    'tools.opening.label': 'Tür / Fenster',
    'tools.opening.hint':
      'Auf eine Wand klicken — die Öffnung rastet darauf ein und wirkt auf beide angrenzenden Räume',
    'tools.sensor.label': 'Sensor',
    'tools.sensor.hint': 'Klick setzt einen Messpunkt · rechts die Entity zuweisen',
    'tools.erase.label': 'Löschen',
    'tools.erase.hint': 'Auf ein Element klicken, um es zu entfernen',
    'tools.measure.label': 'Maßstab',
    'tools.measure.hint':
      'Eine Strecke bekannter Länge abklicken und die echte Länge in Metern eintragen',

    'planEditor.undoTitle': 'Rückgängig (Cmd/Ctrl+Z)',
    'planEditor.redoTitle': 'Wiederholen (Cmd/Ctrl+Shift+Z)',
    'planEditor.fitTitle': 'Alles einpassen',
    'planEditor.toggleGrid': 'Raster',
    'planEditor.toggleSnapGrid': 'Am Raster',
    'planEditor.toggleSnapPoints': 'An Ecken',
    'planEditor.toggleAxisSnap': '0°/90°',
    'planEditor.cancel': 'Abbrechen',
    'planEditor.save': 'Übernehmen',
    'planEditor.hintSuffix': 'Mausrad zoomt, mittlere Taste oder Leertaste schiebt.',
    'planEditor.roomFallback': 'Raum {n}',
    'planEditor.sensorFallback': 'Sensor',
    'planEditor.panelGeneral': 'Grundeinstellungen',
    'planEditor.panelWallDraft': 'Wand zeichnen',
    'planEditor.panelMeasure': 'Maßstab kalibrieren',
    'planEditor.panelRoom': 'Raum',
    'planEditor.panelWall': 'Freistehende Wand',
    'planEditor.panelOpening': 'Öffnung',
    'planEditor.panelSensor': 'Sensor',
    'planEditor.scaleLabel': 'Maßstab — Pixel pro Meter',
    'planEditor.backgroundLabel': 'Hintergrundbild (Pfad unter /local/…)',
    'planEditor.backgroundPlaceholder': '/local/grundriss.png',
    'planEditor.backgroundOpacityLabel': 'Deckkraft Hintergrund —',
    'planEditor.scaleNote':
      'Der Maßstab wirkt sich nur auf Beschriftungen und den Sensorradius aus — das Temperaturfeld selbst ist maßstabsfrei.',
    'planEditor.currentLength': 'Aktuelle Länge',
    'planEditor.exactLengthLabel': 'Länge exakt setzen (Meter) — Enter bestätigt',
    'planEditor.examplePlaceholder': 'z. B. 3.20',
    'planEditor.finishDrawing': 'Zeichnen beenden (Esc)',
    'planEditor.measureNote':
      'Eine Strecke abklicken, deren echte Länge du kennst — etwa eine Zimmerwand. Danach die Länge in Metern eintragen.',
    'planEditor.measuredDistance': 'Gemessene Strecke',
    'planEditor.notMeasuredYet': 'noch nichts gemessen',
    'planEditor.realLengthLabel': 'Echte Länge (Meter) — Enter übernimmt',
    'planEditor.current': 'Aktuell',
    'planEditor.name': 'Name',
    'planEditor.width': 'Breite (m)',
    'planEditor.length': 'Länge (m)',
    'planEditor.area': 'Fläche',
    'planEditor.corners': 'Ecken',
    'planEditor.roomSizeNote':
      'Maße sind die Außenkanten — Enter oder ein Klick daneben übernimmt. Die linke obere Ecke bleibt dabei stehen, Türen und Fenster wandern nicht mit. Eckpunkte lassen sich weiterhin an den weißen Griffen ziehen.',
    'planEditor.type': 'Typ',
    'planEditor.wallLength': 'Länge',
    'planEditor.wallTypeNote':
      'Raumkanten werden automatisch als Außen- oder Innenwand erkannt; dieser Typ gilt nur für freistehende Wände.',
    'planEditor.kind': 'Art',
    'planEditor.openingWidthLabel': 'Breite —',
    'planEditor.openingNote':
      'Durchgang = offen, Tür = deutlich gedämpft, Fenster = fast dicht. Die Öffnung wirkt auf jede Wand an dieser Stelle — bei zwei aneinandergrenzenden Räumen also auf beide.',
    'planEditor.displayNameLabel': 'Anzeigename (leer = Entity-Name)',
    'planEditor.exampleRoomPlaceholder': 'z. B. Wohnzimmer',
    'planEditor.currentValue': 'Aktueller Wert',
    'planEditor.notAvailable': 'nicht verfügbar',
    'planEditor.entityPlaceholder': 'sensor.wohnzimmer_temperatur',
    'planEditor.deleteButton': 'Löschen (Entf)',
    'planEditor.noEntity': 'Ohne Entity',
    'planEditor.noEntityAssigned': 'keine Entity zugewiesen',
    'planEditor.noSensorsYet': 'Noch keine Sensoren gesetzt.',
    'planEditor.noRoomsYet': 'Noch keine Räume gezeichnet.',
    'planEditor.sensorsHeader': 'Sensoren ({n})',
    'planEditor.roomsHeader': 'Räume ({n})',
    'planEditor.overview': 'Übersicht',
    'planEditor.summaryLine':
      '{rooms} Räume · {walls} freie Wände · {openings} Öffnungen · {sensors} Sensoren',
  },
};

const ROOM_NAME_SUGGESTIONS = {
  en: ['Living Room', 'Kitchen', 'Bedroom', 'Bathroom', 'Hallway', 'Office', 'Kids Room', 'Guest WC'],
  de: ['Wohnzimmer', 'Küche', 'Schlafzimmer', 'Bad', 'Flur', 'Büro', 'Kinderzimmer', 'Gäste-WC'],
};

/** Übersetzt `key` in `lang`, fällt auf Englisch und dann auf den Key selbst zurück. */
function t(lang, key, vars) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  let str = dict[key] != null ? dict[key] : TRANSLATIONS.en[key];
  if (str == null) return key;
  if (vars) {
    for (const name of Object.keys(vars)) {
      str = str.replace(new RegExp(`\\{${name}\\}`, 'g'), vars[name]);
    }
  }
  return str;
}

function roomNameSuggestions(lang) {
  return ROOM_NAME_SUGGESTIONS[lang] || ROOM_NAME_SUGGESTIONS.en;
}

/**
 * Sprache ohne hass-Objekt raten — für Stellen, die vor dem ersten
 * hass-Update laufen (Registrierung in index.js, statische Stub-Config).
 */
function detectLanguageFallback() {
  let stored = '';
  try {
    stored = (typeof localStorage !== 'undefined' && localStorage.getItem('selectedLanguage')) || '';
  } catch (e) {
    stored = '';
  }
  const raw = stored.replace(/^"|"$/g, '') || (typeof navigator !== 'undefined' && navigator.language) || 'en';
  return normalizeLanguage(raw);
}

/** Liest hass.language aus, sonst Fallback über detectLanguageFallback(). */
function detectLanguage(hass) {
  return normalizeLanguage((hass && hass.language) || detectLanguageFallback());
}

/** Nur Deutsch und Englisch werden unterstützt; alles andere landet auf Englisch. */
function normalizeLanguage(raw) {
  return String(raw || '').toLowerCase().startsWith('de') ? 'de' : 'en';
}

/* ===== src/geometry.js ===== */
/* ------------------------------------------------------------------ *
 * geometry.js — kleine Vektor-/Polygon-Helfer.
 * Alle Koordinaten sind "Grundriss-Pixel" (siehe model.js).
 * ------------------------------------------------------------------ */

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;

function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Vorzeichenbehaftete Fläche; > 0 = gegen den Uhrzeigersinn (bei y-nach-unten: im Uhrzeigersinn). */
function polygonArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  }
  return a / 2;
}

function polygonCentroid(pts) {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const cross = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    a += cross;
    cx += (pts[j][0] + pts[i][0]) * cross;
    cy += (pts[j][1] + pts[i][1]) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-9) {
    // Entartetes Polygon: einfacher Mittelwert.
    const n = pts.length || 1;
    return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
  }
  return [cx / (6 * a), cy / (6 * a)];
}

/**
 * Schnittparameter zweier Strecken A→B und C→D.
 * Liefert { t, u, x, y } mit P = A + t·(B−A) = C + u·(D−C), sonst null.
 * Parallele Strecken gelten als schnittfrei.
 *
 * `eps` weitet den zulässigen Bereich beidseitig auf [−eps, 1+eps]. Der
 * Solver braucht das, um Treffer exakt am Streckenende noch zu sehen und
 * sie dann selbst eindeutig einer Seite zuzuordnen.
 */
function segIntersectParams(ax, ay, bx, by, cx, cy, dx, dy, eps = 0) {
  const r1x = bx - ax, r1y = by - ay;
  const r2x = dx - cx, r2y = dy - cy;
  const denom = r1x * r2y - r1y * r2x;
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((cx - ax) * r2y - (cy - ay) * r2x) / denom;
  const u = ((cx - ax) * r1y - (cy - ay) * r1x) / denom;
  if (t < -eps || t > 1 + eps || u < -eps || u > 1 + eps) return null;
  return { t, u, x: ax + t * r1x, y: ay + t * r1y };
}

function segIntersects(ax, ay, bx, by, cx, cy, dx, dy) {
  return segIntersectParams(ax, ay, bx, by, cx, cy, dx, dy) !== null;
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const cx = x2 - x1, cy = y2 - y1;
  const lenSq = cx * cx + cy * cy;
  let t = lenSq > 0 ? ((px - x1) * cx + (py - y1) * cy) / lenSq : 0;
  t = clamp(t, 0, 1);
  return { x: x1 + t * cx, y: y1 + t * cy, t };
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const c = closestPointOnSegment(px, py, x1, y1, x2, y2);
  return Math.hypot(px - c.x, py - c.y);
}

function bboxOfPoints(points, pad = 0) {
  if (!points.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1, w: 1, h: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    const x = Array.isArray(p) ? p[0] : p.x;
    const y = Array.isArray(p) ? p[1] : p.y;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  return { minX, minY, maxX, maxY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

/** Rastet einen Winkel auf 0°/90°/180°/270° ein, wenn er nah genug dran liegt. */
function axisSnap(x1, y1, x2, y2, toleranceDeg = 6) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: x2, y: y2, snapped: false };
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  for (const target of [0, 90, -90, 180, -180]) {
    let diff = Math.abs(angle - target);
    if (diff > 180) diff = 360 - diff;
    if (diff <= toleranceDeg) {
      const rad = (target * Math.PI) / 180;
      return { x: x1 + Math.cos(rad) * len, y: y1 + Math.sin(rad) * len, snapped: true };
    }
  }
  return { x: x2, y: y2, snapped: false };
}

/* ===== src/palette.js ===== */
/* ------------------------------------------------------------------ *
 * palette.js — Farbskalen für das Temperaturfeld.
 *
 * "coolwarm" ist die Voreinstellung: eine divergierende Blau→Grau→Rot-
 * Skala (Moreland), deren Helligkeit zu beiden Enden hin gleichmäßig
 * abfällt. Sie liest sich sofort als kalt/warm und hat — anders als eine
 * Regenbogenskala — keine falschen Kanten in der Mitte.
 * ------------------------------------------------------------------ */


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

const PALETTE_NAMES = Object.keys(STOPS);

const lutCache = new Map();

/** 256×4 Lookup-Tabelle (RGBA, Alpha immer 255) für eine Palette. */
function paletteLUT(name) {
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
function paletteGradientCss(name, direction = '90deg') {
  const stops = STOPS[STOPS[name] ? name : 'coolwarm'];
  const parts = stops.map(([pos, [r, g, b]]) => `rgb(${r},${g},${b}) ${(pos * 100).toFixed(0)}%`);
  return `linear-gradient(${direction}, ${parts.join(', ')})`;
}

function paletteColorCss(name, ratio) {
  const lut = paletteLUT(name);
  const i = Math.round(clamp(ratio, 0, 1) * 255) * 4;
  return `rgb(${lut[i]}, ${lut[i + 1]}, ${lut[i + 2]})`;
}

/** Schwarz oder Weiß — je nachdem, was auf der Palettenfarbe besser lesbar ist. */
function readableTextOn(name, ratio) {
  const lut = paletteLUT(name);
  const i = Math.round(clamp(ratio, 0, 1) * 255) * 4;
  const luminance = (0.2126 * lut[i] + 0.7152 * lut[i + 1] + 0.0722 * lut[i + 2]) / 255;
  return luminance > 0.55 ? '#11151c' : '#ffffff';
}

/* ===== src/model.js ===== */
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


const DEFAULTS = {
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

const VIEW_MODES = ['flat', 'tilted'];

/** Durchlässigkeit 0…1 pro Bauteil. 1 = freie Luft, 0 = perfekte Dämmung. */
const DEFAULT_TRANSMITTANCE = {
  exterior: 0.02,
  interior: 0.12,
  door: 0.5,
  passage: 1.0,
  window: 0.08,
};

const OPENING_TYPES = ['passage', 'door', 'window'];
const WALL_TYPES = ['interior', 'exterior'];

let uidCounter = 0;
function uid(prefix = 'id') {
  uidCounter += 1;
  return `${prefix}${Date.now().toString(36).slice(-4)}${uidCounter.toString(36)}`;
}

function emptyFloorplan() {
  return { rooms: [], walls: [], openings: [], sensors: [] };
}

/** Füllt fehlende Felder auf und repariert alte/unvollständige Configs. */
function normalizeConfig(raw) {
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
function floorplanPoints(fp) {
  const pts = [];
  for (const room of fp.rooms) pts.push(...room.points);
  for (const wall of fp.walls) pts.push([wall.x1, wall.y1], [wall.x2, wall.y2]);
  for (const s of fp.sensors) pts.push([s.x, s.y]);
  return pts;
}

function floorplanBounds(fp, pad = 20) {
  return bboxOfPoints(floorplanPoints(fp), pad);
}

function isEmptyFloorplan(fp) {
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
function buildWalls(fp) {
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
function snapCandidates(fp) {
  const pts = [];
  for (const room of fp.rooms) for (const p of room.points) pts.push({ x: p[0], y: p[1] });
  for (const w of fp.walls) pts.push({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
  return pts;
}

function roomAreaSqm(room, pxPerMeter) {
  return Math.abs(polygonArea(room.points)) / (pxPerMeter * pxPerMeter);
}

/** Außenmaße eines Raums (umschließendes Rechteck) in Metern. */
function roomSizeMeters(room, pxPerMeter) {
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
function resizeRoomPoints(points, widthPx, heightPx) {
  const b = bboxOfPoints(points);
  const spanX = b.maxX - b.minX;
  const spanY = b.maxY - b.minY;
  const sx = widthPx > 0 && spanX > 1e-6 ? widthPx / spanX : 1;
  const sy = heightPx > 0 && spanY > 1e-6 ? heightPx / spanY : 1;
  return points.map(([x, y]) => [b.minX + (x - b.minX) * sx, b.minY + (y - b.minY) * sy]);
}

/* ===== src/solver.js ===== */
/* ------------------------------------------------------------------ *
 * solver.js — stationäre Wärmediffusion über den Grundriss.
 *
 * Modell: ∇·(k∇T) = 0 auf einem regelmäßigen Gitter. Die Sensoren sind
 * Dirichlet-Randbedingungen (feste Werte auf einer kleinen Scheibe um
 * den Messpunkt), jede Gitterkante zwischen zwei Zellen bekommt eine
 * Leitfähigkeit k: 1 für freie Luft, weniger, wenn die Kante eine Wand
 * kreuzt — je nach Bauteil (Außenwand, Innenwand, Tür, Fenster).
 *
 * Dadurch fällt die Temperatur nicht mit der Luftlinie ab, sondern
 * "fließt" um Wände herum durch die Öffnungen — und ein Nachbarraum
 * hinter einer geschlossenen Tür bleibt spürbar entkoppelt, statt
 * einfach nur weit weg zu sein.
 *
 * Gelöst wird mit SOR (Gauß-Seidel mit Überrelaxation). Weil das Feld
 * zwischen zwei Sensor-Updates fast gleich bleibt, startet jeder Lauf
 * warm vom vorigen Ergebnis und braucht dann nur noch wenige Iterationen.
 * ------------------------------------------------------------------ */


const MIN_CONDUCTANCE = 1e-4;

/**
 * Wie viele Meter freie Luft ein Bauteil mit Durchlässigkeit t ersetzt:
 *   Luft-Äquivalent = (1/t − 1) · WALL_AIR_EQUIVALENT_M
 *
 * Ohne diese Umrechnung hinge die Wirkung einer Wand an der
 * Gitterauflösung: eine Wand belegt immer genau eine Gitterkante, aber
 * ein Raum besteht bei feinem Gitter aus mehr Zellen — die Luft im Raum
 * bekäme also immer mehr Widerstand, die Wand aber nicht. Über den
 * Umweg "entspricht so und so vielen Metern Luft" bleibt das Verhältnis
 * konstant, egal wie fein gerechnet wird.
 *
 * Der Faktor 5 sorgt dafür, dass bei den Voreinstellungen rund vier
 * Fünftel des Temperaturunterschieds an der Wand abfallen und nicht im
 * Raum davor — reale Räume durchmischen sich durch Konvektion viel
 * stärker, als eine reine Wärmeleitungsrechnung es täte.
 */
const WALL_AIR_EQUIVALENT_M = 5;

/** Toleranz für die Zuordnung eines Wandtreffers zu genau einer Gitterkante. */
const FACE_EPS = 1e-6;

class HeatField {
  constructor(floorplan, options = {}) {
    this.fp = floorplan;
    this.opts = {
      cellSize: 8,
      pxPerMeter: 50,
      sensorRadius: 0.4,
      transmittance: DEFAULT_TRANSMITTANCE,
      ...options,
    };
    this.T = null;
    this._warm = false;
    this.stats = null;
    this._build();
  }

  /** Signatur, mit der die Karte erkennt, ob das Gitter neu gebaut werden muss. */
  static signature(floorplan, options) {
    return JSON.stringify([floorplan, options.cellSize, options.sensorRadius, options.transmittance, options.pxPerMeter]);
  }

  _build() {
    const { cellSize } = this.opts;
    const bounds = floorplanBounds(this.fp, cellSize * 2);
    const cols = Math.max(2, Math.ceil(bounds.w / cellSize));
    const rows = Math.max(2, Math.ceil(bounds.h / cellSize));

    this.bounds = bounds;
    this.cols = cols;
    this.rows = rows;
    this.n = cols * rows;

    this._buildInside();
    this._buildConductance();
  }

  cellCenterX(c) { return this.bounds.minX + (c + 0.5) * this.opts.cellSize; }
  cellCenterY(r) { return this.bounds.minY + (r + 0.5) * this.opts.cellSize; }

  _buildInside() {
    const { cols, rows, n } = this;
    const inside = new Uint8Array(n);
    const rooms = this.fp.rooms || [];

    if (!rooms.length) {
      // Nur Wände gezeichnet, keine Räume: die gesamte Bounding-Box zählt
      // als Fläche, damit auch dieser Workflow ein Feld ergibt.
      inside.fill(1);
      this.inside = inside;
      this.roomOfCell = null;
      return;
    }

    const roomOfCell = new Int16Array(n).fill(-1);
    for (let r = 0; r < rows; r++) {
      const y = this.cellCenterY(r);
      for (let c = 0; c < cols; c++) {
        const x = this.cellCenterX(c);
        for (let i = 0; i < rooms.length; i++) {
          if (pointInPolygon(x, y, rooms[i].points)) {
            inside[r * cols + c] = 1;
            roomOfCell[r * cols + c] = i;
            break;
          }
        }
      }
    }
    this.inside = inside;
    this.roomOfCell = roomOfCell;
  }

  /**
   * Sortiert jede Wand in die Gitterzellen ein, die sie berührt (plus
   * 8er-Nachbarschaft). Für eine Gitterkante müssen dann nur noch die
   * Wände aus dem Bucket ihrer Zelle geprüft werden statt alle.
   */
  _bucketWalls(walls) {
    const { cols, rows, n } = this;
    const cs = this.opts.cellSize;
    const buckets = new Array(n);
    const mark = new Int32Array(n).fill(-1);

    const add = (c, r, wi) => {
      if (c < 0 || c >= cols || r < 0 || r >= rows) return;
      const idx = r * cols + c;
      if (mark[idx] === wi) return;
      mark[idx] = wi;
      (buckets[idx] || (buckets[idx] = [])).push(wi);
    };

    for (let wi = 0; wi < walls.length; wi++) {
      const w = walls[wi];
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      const steps = Math.max(1, Math.ceil((len / cs) * 2));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = w.x1 + (w.x2 - w.x1) * t;
        const y = w.y1 + (w.y2 - w.y1) * t;
        const c = Math.floor((x - this.bounds.minX) / cs);
        const r = Math.floor((y - this.bounds.minY) / cs);
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) add(c + dc, r + dr, wi);
      }
    }
    return buckets;
  }

  /**
   * Durchlässigkeit an einem Wanddurchstoßpunkt. Öffnungen sind eigene
   * Geometrie und gewinnen gegen die Wand — die durchlässigste Öffnung
   * an der Stelle bestimmt den Wert.
   */
  _transmittanceAt(wall, px, py) {
    const trans = this.opts.transmittance;
    let value = trans[wall.type] != null ? trans[wall.type] : trans.interior;
    const tol = Math.max(5, this.opts.cellSize * 0.9);

    for (const o of this.fp.openings || []) {
      const dx = px - o.x, dy = py - o.y;
      const cos = Math.cos(o.angle), sin = Math.sin(o.angle);
      const along = dx * cos + dy * sin;
      const perp = -dx * sin + dy * cos;
      if (Math.abs(along) <= o.width / 2 && Math.abs(perp) <= tol) {
        const t = trans[o.type] != null ? trans[o.type] : trans.door;
        if (t > value) value = t;
      }
    }
    return value;
  }

  /** Durchlässigkeit 0…1 → Leitfähigkeit einer Gitterkante (freie Luft = 1). */
  _conductance(t) {
    if (t >= 1) return 1;
    if (t <= 0) return 0;
    const airMeters = (1 / t - 1) * WALL_AIR_EQUIVALENT_M;
    const extraResistance = (airMeters * this.opts.pxPerMeter) / this.opts.cellSize;
    return 1 / (1 + extraResistance);
  }

  _buildConductance() {
    const { cols, rows, n, inside } = this;
    const walls = buildWalls(this.fp);
    const buckets = this._bucketWalls(walls);

    const condX = new Float32Array(n); // Kante (c,r) → (c+1,r)
    const condY = new Float32Array(n); // Kante (c,r) → (c,r+1)

    const faceConductance = (ax, ay, bx, by, candidates) => {
      let t = 1;
      if (candidates) {
        for (let i = 0; i < candidates.length; i++) {
          const w = walls[candidates[i]];
          const hit = segIntersectParams(ax, ay, bx, by, w.x1, w.y1, w.x2, w.y2, FACE_EPS);
          if (!hit) continue;
          // Halboffenes Intervall [0, 1): trifft eine Wand genau einen
          // Zellmittelpunkt, sähen sie sonst BEIDE angrenzenden Kanten
          // und die Wand dämpfte doppelt — sichtbar als sprunghaft
          // stärkere Dämmung, sobald das Gitter zufällig passend liegt.
          if (hit.t >= 1 - FACE_EPS) continue;
          // Mehrere gekreuzte Wände: die dichteste bestimmt den Durchlass.
          // (Kein Produkt — sonst dämpfen zwei deckungsgleiche Raumkanten
          // dieselbe physische Wand doppelt.)
          const value = this._transmittanceAt(w, hit.x, hit.y);
          if (value < t) t = value;
        }
      }
      return this._conductance(t);
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (!inside[idx]) continue;
        const ax = this.cellCenterX(c), ay = this.cellCenterY(r);
        const cand = buckets[idx];

        if (c + 1 < cols && inside[idx + 1]) {
          condX[idx] = faceConductance(ax, ay, this.cellCenterX(c + 1), ay, cand);
        }
        if (r + 1 < rows && inside[idx + cols]) {
          condY[idx] = faceConductance(ax, ay, ax, this.cellCenterY(r + 1), cand);
        }
      }
    }

    this.condX = condX;
    this.condY = condY;
    this.walls = walls;
  }

  /** Zellen, deren Mittelpunkt im Sensorradius liegt → feste Werte. */
  _buildDirichlet(sensorValues) {
    const { cols, rows, n, inside } = this;
    const cs = this.opts.cellSize;
    const radiusPx = Math.max(cs * 0.75, this.opts.sensorRadius * this.opts.pxPerMeter);
    const fixed = new Uint8Array(n);
    const sum = new Float32Array(n);
    const count = new Uint16Array(n);
    let any = false;
    let vMin = Infinity, vMax = -Infinity, vSum = 0, vCount = 0;

    const sensors = this.fp.sensors || [];
    for (let si = 0; si < sensors.length; si++) {
      const value = sensorValues[si];
      if (!Number.isFinite(value)) continue;
      const s = sensors[si];
      const c0 = Math.floor((s.x - radiusPx - this.bounds.minX) / cs);
      const c1 = Math.ceil((s.x + radiusPx - this.bounds.minX) / cs);
      const r0 = Math.floor((s.y - radiusPx - this.bounds.minY) / cs);
      const r1 = Math.ceil((s.y + radiusPx - this.bounds.minY) / cs);
      let hits = 0;

      for (let r = Math.max(0, r0); r <= Math.min(rows - 1, r1); r++) {
        for (let c = Math.max(0, c0); c <= Math.min(cols - 1, c1); c++) {
          const idx = r * cols + c;
          if (!inside[idx]) continue;
          if (Math.hypot(this.cellCenterX(c) - s.x, this.cellCenterY(r) - s.y) > radiusPx) continue;
          fixed[idx] = 1;
          sum[idx] += value;
          count[idx] += 1;
          hits += 1;
        }
      }

      if (!hits) {
        // Sensor außerhalb der Räume platziert: nächstgelegene Fläche nehmen.
        const idx = this._nearestInsideCell(s.x, s.y);
        if (idx >= 0) {
          fixed[idx] = 1;
          sum[idx] += value;
          count[idx] += 1;
          hits = 1;
        }
      }
      if (hits) {
        any = true;
        vMin = Math.min(vMin, value);
        vMax = Math.max(vMax, value);
        vSum += value;
        vCount += 1;
      }
    }

    if (!any) return null;
    const values = new Float32Array(n);
    for (let i = 0; i < n; i++) if (fixed[i]) values[i] = sum[i] / count[i];
    return { fixed, values, min: vMin, max: vMax, mean: vSum / vCount };
  }

  _nearestInsideCell(x, y) {
    const { cols, rows, inside } = this;
    let best = -1, bestDist = Infinity;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (!inside[idx]) continue;
        const d = Math.hypot(this.cellCenterX(c) - x, this.cellCenterY(r) - y);
        if (d < bestDist) { bestDist = d; best = idx; }
      }
    }
    return best;
  }

  /** Zellen, die über leitende Kanten überhaupt einen Sensor "sehen". */
  _reachability(fixed) {
    const { cols, rows, n, condX, condY } = this;
    const reach = new Uint8Array(n);
    const queue = new Int32Array(n);
    let head = 0, tail = 0;
    for (let i = 0; i < n; i++) if (fixed[i]) { reach[i] = 1; queue[tail++] = i; }

    while (head < tail) {
      const idx = queue[head++];
      const c = idx % cols, r = (idx / cols) | 0;
      if (c > 0 && condX[idx - 1] > MIN_CONDUCTANCE && !reach[idx - 1]) { reach[idx - 1] = 1; queue[tail++] = idx - 1; }
      if (c + 1 < cols && condX[idx] > MIN_CONDUCTANCE && !reach[idx + 1]) { reach[idx + 1] = 1; queue[tail++] = idx + 1; }
      if (r > 0 && condY[idx - cols] > MIN_CONDUCTANCE && !reach[idx - cols]) { reach[idx - cols] = 1; queue[tail++] = idx - cols; }
      if (r + 1 < rows && condY[idx] > MIN_CONDUCTANCE && !reach[idx + cols]) { reach[idx + cols] = 1; queue[tail++] = idx + cols; }
    }
    return reach;
  }

  /**
   * @param {number[]} sensorValues Werte in der Reihenfolge von fp.sensors (NaN = unbekannt)
   * @returns {boolean} true, wenn ein Feld vorliegt
   */
  solve(sensorValues) {
    const started = (typeof performance !== 'undefined' ? performance : Date).now();
    const dirichlet = this._buildDirichlet(sensorValues);
    if (!dirichlet) {
      this.T = null;
      this.stats = null;
      return false;
    }

    const { cols, rows, n, inside, condX, condY } = this;
    const { fixed, values } = dirichlet;
    this.reach = this._reachability(fixed);

    let T = this.T;
    if (!T || T.length !== n || !this._warm) {
      T = new Float32Array(n).fill(dirichlet.mean);
    }
    for (let i = 0; i < n; i++) if (fixed[i]) T[i] = values[i];

    const span = Math.max(0.05, dirichlet.max - dirichlet.min);
    const tol = span * 1e-4;
    // Gauß-Seidel braucht grob so viele Durchläufe, wie das Gitter breit
    // ist — die Grenze muss also mit der Auflösung mitwachsen, sonst
    // liefern feine Gitter unfertige Felder.
    const maxIter = this._warm ? 200 : clamp(6 * Math.max(cols, rows), 400, 4000);
    const omega = 1.85;
    let iter = 0;

    for (; iter < maxIter; iter++) {
      let maxDelta = 0;
      for (let r = 0; r < rows; r++) {
        const rowBase = r * cols;
        for (let c = 0; c < cols; c++) {
          const idx = rowBase + c;
          if (!inside[idx] || fixed[idx]) continue;

          let num = 0, den = 0;
          if (c > 0) { const k = condX[idx - 1]; if (k > 0) { num += k * T[idx - 1]; den += k; } }
          if (c + 1 < cols) { const k = condX[idx]; if (k > 0) { num += k * T[idx + 1]; den += k; } }
          if (r > 0) { const k = condY[idx - cols]; if (k > 0) { num += k * T[idx - cols]; den += k; } }
          if (r + 1 < rows) { const k = condY[idx]; if (k > 0) { num += k * T[idx + cols]; den += k; } }
          if (den === 0) continue;

          const target = num / den;
          const delta = omega * (target - T[idx]);
          T[idx] += delta;
          const ad = delta < 0 ? -delta : delta;
          if (ad > maxDelta) maxDelta = ad;
        }
      }
      if (maxDelta < tol) { iter++; break; }
    }

    this.T = T;
    this._warm = true;

    let fMin = Infinity, fMax = -Infinity;
    for (let i = 0; i < n; i++) {
      if (!inside[i] || !this.reach[i]) continue;
      if (T[i] < fMin) fMin = T[i];
      if (T[i] > fMax) fMax = T[i];
    }

    this.stats = {
      min: Number.isFinite(fMin) ? fMin : dirichlet.min,
      max: Number.isFinite(fMax) ? fMax : dirichlet.max,
      sensorMin: dirichlet.min,
      sensorMax: dirichlet.max,
      sensorMean: dirichlet.mean,
      iterations: iter,
      ms: (typeof performance !== 'undefined' ? performance : Date).now() - started,
    };
    return true;
  }

  /** Bilinear interpolierter Feldwert an einer Grundriss-Koordinate, sonst NaN. */
  sample(x, y) {
    if (!this.T) return NaN;
    const { cols, rows, inside, T } = this;
    const cs = this.opts.cellSize;
    const fx = (x - this.bounds.minX) / cs - 0.5;
    const fy = (y - this.bounds.minY) / cs - 0.5;
    const c0 = Math.floor(fx), r0 = Math.floor(fy);
    const tx = fx - c0, ty = fy - r0;

    let num = 0, den = 0;
    for (let dr = 0; dr <= 1; dr++) {
      for (let dc = 0; dc <= 1; dc++) {
        const c = clamp(c0 + dc, 0, cols - 1);
        const r = clamp(r0 + dr, 0, rows - 1);
        const idx = r * cols + c;
        if (!inside[idx] || (this.reach && !this.reach[idx])) continue;
        const w = (dc ? tx : 1 - tx) * (dr ? ty : 1 - ty);
        num += w * T[idx];
        den += w;
      }
    }
    return den > 0.05 ? num / den : NaN;
  }
}

/* ===== src/isotherms.js ===== */
/* ------------------------------------------------------------------ *
 * isotherms.js — Marching Squares über das gelöste Feld.
 *
 * Liefert Liniensegmente gleicher Temperatur. Die machen den Verlauf
 * ablesbar, ohne dass man Farben schätzen muss — besonders dort, wo die
 * Palette flach wird.
 * ------------------------------------------------------------------ */

/**
 * @param {HeatField} field
 * @param {number} step Abstand der Isothermen in Messeinheiten (z.B. 0.5 °C)
 * @returns {{level:number, segments:number[][]}[]} Segmente als [x1,y1,x2,y2] in Grundriss-Koordinaten
 */
function computeIsotherms(field, step, maxLevels = 40) {
  if (!field || !field.T || !field.stats || !(step > 0)) return [];
  const { cols, rows, inside, T, reach } = field;
  const cs = field.opts.cellSize;
  const { minX, minY } = field.bounds;

  const first = Math.ceil(field.stats.min / step) * step;
  const last = Math.floor(field.stats.max / step) * step;
  if (!(last >= first)) return [];
  if ((last - first) / step > maxLevels) return [];

  const valid = (idx) => inside[idx] && (!reach || reach[idx]);
  const cx = (c) => minX + (c + 0.5) * cs;
  const cy = (r) => minY + (r + 0.5) * cs;

  const out = [];
  for (let level = first; level <= last + 1e-9; level += step) {
    const segments = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const i00 = r * cols + c;
        const i10 = i00 + 1;
        const i01 = i00 + cols;
        const i11 = i01 + 1;
        if (!valid(i00) || !valid(i10) || !valid(i01) || !valid(i11)) continue;

        const v00 = T[i00], v10 = T[i10], v01 = T[i01], v11 = T[i11];
        const code =
          (v00 > level ? 1 : 0) | (v10 > level ? 2 : 0) | (v11 > level ? 4 : 0) | (v01 > level ? 8 : 0);
        if (code === 0 || code === 15) continue;

        const x0 = cx(c), x1 = cx(c + 1), y0 = cy(r), y1 = cy(r + 1);
        const interp = (a, b) => (level - a) / (b - a || 1e-9);
        // Kantenmittelpunkte der Zelle: oben, rechts, unten, links
        const top = [x0 + (x1 - x0) * interp(v00, v10), y0];
        const right = [x1, y0 + (y1 - y0) * interp(v10, v11)];
        const bottom = [x0 + (x1 - x0) * interp(v01, v11), y1];
        const left = [x0, y0 + (y1 - y0) * interp(v00, v01)];

        const push = (a, b) => segments.push([a[0], a[1], b[0], b[1]]);
        switch (code) {
          case 1: case 14: push(left, top); break;
          case 2: case 13: push(top, right); break;
          case 3: case 12: push(left, right); break;
          case 4: case 11: push(right, bottom); break;
          case 6: case 9: push(top, bottom); break;
          case 7: case 8: push(left, bottom); break;
          case 5: push(left, top); push(right, bottom); break;
          case 10: push(top, right); push(left, bottom); break;
          default: break;
        }
      }
    }
    if (segments.length) out.push({ level: Math.round(level * 100) / 100, segments });
  }
  return out;
}

/* ===== src/renderer.js ===== */
/* ------------------------------------------------------------------ *
 * renderer.js — zeichnet Feld und Grundriss auf ein Canvas.
 *
 * Das Feld wird in Gitterauflösung in eine ImageData geschrieben und
 * dann hochskaliert — aber vorher auf die Raumpolygone geclippt. Ohne
 * dieses Clipping "blutet" die Heatmap über die Außenwände hinaus, was
 * im alten Demo-Stand der auffälligste Makel war.
 * ------------------------------------------------------------------ */


/** Abbildung Grundriss-Koordinaten → Canvas-Koordinaten (einpassend, seitenverhältnistreu). */
function computeView(bounds, width, height, padding = 8) {
  const availW = Math.max(1, width - padding * 2);
  const availH = Math.max(1, height - padding * 2);
  const scale = Math.min(availW / bounds.w, availH / bounds.h);
  const offsetX = padding + (availW - bounds.w * scale) / 2 - bounds.minX * scale;
  const offsetY = padding + (availH - bounds.h * scale) / 2 - bounds.minY * scale;
  return {
    scale,
    offsetX,
    offsetY,
    toX: (x) => x * scale + offsetX,
    toY: (y) => y * scale + offsetY,
    fromX: (px) => (px - offsetX) / scale,
    fromY: (py) => (py - offsetY) / scale,
  };
}

function roomsPath(rooms, view) {
  const path = new Path2D();
  for (const room of rooms) {
    const pts = room.points;
    if (pts.length < 3) continue;
    path.moveTo(view.toX(pts[0][0]), view.toY(pts[0][1]));
    for (let i = 1; i < pts.length; i++) path.lineTo(view.toX(pts[i][0]), view.toY(pts[i][1]));
    path.closePath();
  }
  return path;
}

/**
 * Färbt das gelöste Feld in ein Canvas in Gitterauflösung.
 *
 * Eigene Funktion, damit die Karte das Ergebnis zwischenspeichern kann:
 * beim Drehen der 2,5D-Ansicht ändert sich nur die Projektion, nicht das
 * Feld — dann wäre es Verschwendung, die Farben jedes Mal neu zu rechnen.
 */
function heatmapBuffer(doc, field, opts) {
  const { cols, rows, inside, T, reach } = field;
  const lut = paletteLUT(opts.palette);
  const min = opts.min;
  const span = Math.max(1e-6, opts.max - opts.min);

  const buffer = doc.createElement('canvas');
  buffer.width = cols;
  buffer.height = rows;
  const bctx = buffer.getContext('2d');
  const img = bctx.createImageData(cols, rows);
  const data = img.data;

  for (let i = 0; i < cols * rows; i++) {
    const p = i * 4;
    if (!inside[i] || (reach && !reach[i])) { data[p + 3] = 0; continue; }
    const ratio = clamp((T[i] - min) / span, 0, 1);
    const l = (ratio * 255) | 0;
    data[p] = lut[l * 4];
    data[p + 1] = lut[l * 4 + 1];
    data[p + 2] = lut[l * 4 + 2];
    data[p + 3] = 255;
  }
  bctx.putImageData(img, 0, 0);
  return buffer;
}

/** Feld als Farbfläche in der flachen Draufsicht. */
function renderField(ctx, field, view, opts) {
  const { cols, rows } = field;
  const buffer = opts.buffer || heatmapBuffer(ctx.canvas.ownerDocument, field, opts);
  const cs = field.opts.cellSize;
  // Die ImageData-Pixel sind Zellmittelpunkte; das halbe Zellmaß Versatz
  // sorgt dafür, dass die Interpolation nicht um eine halbe Zelle wandert.
  const dx = view.toX(field.bounds.minX + cs * 0.5);
  const dy = view.toY(field.bounds.minY + cs * 0.5);
  const dw = cols * cs * view.scale;
  const dh = rows * cs * view.scale;

  ctx.save();
  if (opts.clipPath) ctx.clip(opts.clipPath);
  ctx.globalAlpha = opts.opacity;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(buffer, dx, dy, dw, dh);
  ctx.restore();
}

function renderIsotherms(ctx, isotherms, view, opts) {
  if (!isotherms.length) return;
  ctx.save();
  if (opts.clipPath) ctx.clip(opts.clipPath);
  ctx.lineWidth = 1;
  ctx.strokeStyle = opts.color || 'rgba(255,255,255,0.35)';
  const path = new Path2D();
  for (const band of isotherms) {
    for (const [x1, y1, x2, y2] of band.segments) {
      path.moveTo(view.toX(x1), view.toY(y1));
      path.lineTo(view.toX(x2), view.toY(y2));
    }
  }
  ctx.stroke(path);
  ctx.restore();
}

/**
 * Ordnet einer Wand die Öffnungen zu, die auf ihr liegen, und gibt deren
 * Abschnitte als Parameter t ∈ [0, 1] entlang der Wand zurück.
 *
 * Die Zuordnung ist rein geometrisch — Öffnungen kennen ihre Wand nicht.
 * Das ist Absicht: liegen zwei Raumkanten aufeinander, öffnet eine
 * einzelne Tür so beide, ohne dass sie doppelt gepflegt werden müsste.
 */
function wallCovers(wall, openings, tol = 8) {
  const dx = wall.x2 - wall.x1, dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return [];
  const wallAngle = Math.atan2(dy, dx);
  const covers = [];

  for (const o of openings || []) {
    let da = Math.abs(((o.angle - wallAngle) * 180) / Math.PI) % 180;
    if (da > 90) da = 180 - da;
    if (da > 15) continue;

    const near = closestPointOnSegment(o.x, o.y, wall.x1, wall.y1, wall.x2, wall.y2);
    if (Math.hypot(o.x - near.x, o.y - near.y) > tol) continue;

    const hx = (Math.cos(o.angle) * o.width) / 2;
    const hy = (Math.sin(o.angle) * o.width) / 2;
    const t1 = ((o.x - hx - wall.x1) * dx + (o.y - hy - wall.y1) * dy) / (len * len);
    const t2 = ((o.x + hx - wall.x1) * dx + (o.y + hy - wall.y1) * dy) / (len * len);
    const a = clamp(Math.min(t1, t2), 0, 1);
    const b = clamp(Math.max(t1, t2), 0, 1);
    if (b - a > 1e-4) covers.push({ t0: a, t1: b, opening: o });
  }

  covers.sort((p, q) => p.t0 - q.t0);
  return covers;
}

/** Die Abschnitte einer Wand, die KEINE Öffnung bedeckt. */
function wallGaps(wall, openings, tol = 8) {
  const covers = wallCovers(wall, openings, tol);
  if (!covers.length) {
    return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1) < 1e-6 ? [] : [[0, 1]];
  }
  const gaps = [];
  let cursor = 0;
  for (const { t0, t1 } of covers) {
    if (t0 > cursor) gaps.push([cursor, t0]);
    cursor = Math.max(cursor, t1);
  }
  if (cursor < 1) gaps.push([cursor, 1]);
  return gaps;
}

function renderFloorplan(ctx, fp, view, opts) {
  const walls = opts.walls || buildWalls(fp);
  const wallColor = opts.wallColor || '#2c3440';
  const openings = fp.openings || [];

  ctx.save();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = wallColor;

  for (const wall of walls) {
    ctx.lineWidth = Math.max(2, (wall.type === 'exterior' ? 7 : 4.5) * view.scale);
    const dxp = wall.x2 - wall.x1, dyp = wall.y2 - wall.y1;
    for (const [t0, t1] of wallGaps(wall, openings, Math.max(6, 8 / view.scale))) {
      ctx.beginPath();
      ctx.moveTo(view.toX(wall.x1 + dxp * t0), view.toY(wall.y1 + dyp * t0));
      ctx.lineTo(view.toX(wall.x1 + dxp * t1), view.toY(wall.y1 + dyp * t1));
      ctx.stroke();
    }
  }

  // Öffnungen: Fenster als dünne durchgehende Linie, Türen als Schwelle
  // mit angedeutetem Türblatt, Durchgänge bleiben leer.
  for (const o of openings) {
    const hx = (Math.cos(o.angle) * o.width) / 2;
    const hy = (Math.sin(o.angle) * o.width) / 2;
    const ax = view.toX(o.x - hx), ay = view.toY(o.y - hy);
    const bx = view.toX(o.x + hx), by = view.toY(o.y + hy);

    if (o.type === 'window') {
      ctx.lineWidth = Math.max(1.5, 2.5 * view.scale);
      ctx.strokeStyle = opts.windowColor || '#6aa9ff';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    } else if (o.type === 'door') {
      ctx.lineWidth = Math.max(1, 1.5 * view.scale);
      ctx.strokeStyle = opts.doorColor || 'rgba(140,150,165,0.9)';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      const radius = Math.hypot(bx - ax, by - ay);
      const start = Math.atan2(by - ay, bx - ax);
      ctx.arc(ax, ay, radius, start, start - Math.PI / 2, true);
      ctx.stroke();
    }
  }
  ctx.restore();

  if (opts.showRoomLabels) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.max(10, Math.min(15, 13 * view.scale))}px var(--fh-font, system-ui, sans-serif)`;
    for (const room of fp.rooms) {
      const [cx, cy] = polygonCentroid(room.points);
      const x = view.toX(cx), y = view.toY(cy);
      ctx.lineWidth = 3;
      ctx.strokeStyle = opts.labelHalo || 'rgba(0,0,0,0.45)';
      ctx.strokeText(room.name, x, y);
      ctx.fillStyle = opts.labelColor || '#ffffff';
      ctx.fillText(room.name, x, y);
    }
    ctx.restore();
  }
}

/* ===== src/projection.js ===== */
/* ------------------------------------------------------------------ *
 * projection.js — axonometrische 2,5D-Projektion.
 *
 * Zwei Winkel steuern die Ansicht:
 *   yaw    Drehung um die Hochachse — man läuft um das Modell herum
 *   pitch  Höhenwinkel: 90° = senkrecht von oben, kleiner = flacher
 *
 * Bewusst eine PARALLELE Projektion, keine perspektivische. Der Grund
 * ist nicht nur Geschmack: die Abbildung der Bodenebene (z = 0) ist
 * dadurch eine affine Transformation und lässt sich als 2×3-Matrix an
 * ctx.transform() übergeben. Die fertig gerechnete Heatmap kann also
 * unverändert als Bild auf den Boden gelegt werden. Eine perspektivische
 * Ansicht bräuchte eine Homographie, die Canvas 2D nicht beherrscht —
 * man müsste den Boden in Kacheln zerlegen und stückweise annähern.
 *
 * Bildschirmkoordinaten (y zeigt nach unten):
 *   rx =  (x−ox)·cos θ − (y−oy)·sin θ
 *   ry =  (x−ox)·sin θ + (y−oy)·cos θ
 *   sx =  rx
 *   sy =  ry·sin φ − z·cos φ
 *
 * Bei φ = 90° fällt der z-Term weg und es bleibt exakt die Draufsicht.
 * `ry` ist zugleich der Tiefenschlüssel: je größer, desto näher am
 * Betrachter — danach wird für den Maleralgorithmus sortiert.
 * ------------------------------------------------------------------ */


const DEG = Math.PI / 180;

/** Flacher als das wird die Bodenmatrix singulär und nicht mehr umkehrbar. */
const MIN_PITCH_DEG = 12;
const MAX_PITCH_DEG = 90;

function clampPitch(deg) {
  return Math.min(MAX_PITCH_DEG, Math.max(MIN_PITCH_DEG, deg));
}

function rawExtent({ floorplan, yaw, pitch, wallHeight }) {
  const points = floorplanPoints(floorplan);
  if (!points.length) points.push([0, 0], [100, 100]);

  let ox = 0, oy = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  ox = (minX + maxX) / 2;
  oy = (minY + maxY) / 2;

  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const sp = Math.sin(pitch), cp = Math.cos(pitch);

  let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
  // Ober- und Unterkante mitnehmen: die Wandkronen ragen nach oben aus
  // dem Grundriss heraus und gehören mit ins Bild.
  for (const [x, y] of points) {
    const rx = (x - ox) * cy - (y - oy) * sy;
    const ry = (x - ox) * sy + (y - oy) * cy;
    for (const z of [0, wallHeight]) {
      const py = ry * sp - z * cp;
      if (rx < pMinX) pMinX = rx;
      if (rx > pMaxX) pMaxX = rx;
      if (py < pMinY) pMinY = py;
      if (py > pMaxY) pMaxY = py;
    }
  }

  return {
    ox, oy, cy, sy, sp, cp,
    minX: pMinX, minY: pMinY,
    width: Math.max(1, pMaxX - pMinX),
    height: Math.max(1, pMaxY - pMinY),
  };
}

/** Seitenverhältnis der projizierten Szene — für die Höhe der Bühne. */
function projectedAspect(options) {
  const extent = rawExtent(options);
  return extent.width / extent.height;
}

/**
 * @param {object} options floorplan, yaw/pitch (Bogenmaß), wallHeight, width, height, padding
 */
function createProjection(options) {
  const { width, height, padding = 8 } = options;
  const e = rawExtent(options);

  const availW = Math.max(1, width - padding * 2);
  const availH = Math.max(1, height - padding * 2);
  const scale = Math.min(availW / e.width, availH / e.height);
  const tx = padding + (availW - e.width * scale) / 2 - e.minX * scale;
  const ty = padding + (availH - e.height * scale) / 2 - e.minY * scale;

  const { ox, oy, cy, sy, sp, cp } = e;

  const project = (x, y, z = 0) => {
    const rx = (x - ox) * cy - (y - oy) * sy;
    const ry = (x - ox) * sy + (y - oy) * cy;
    return {
      x: rx * scale + tx,
      y: (ry * sp - z * cp) * scale + ty,
      depth: ry,
    };
  };

  // Affine Matrix der Bodenebene für ctx.transform(a, b, c, d, e, f):
  //   sx = a·x + c·y + e     sy = b·x + d·y + f
  const a = cy * scale;
  const b = sy * sp * scale;
  const c = -sy * scale;
  const d = cy * sp * scale;
  const matE = tx - (ox * cy - oy * sy) * scale;
  const matF = ty - (ox * sy + oy * cy) * sp * scale;
  const det = a * d - b * c;

  return {
    scale,
    // Wie stark die Bodenebene gestaucht erscheint: 1 = Draufsicht,
    // gegen 0 = fast waagrechter Blick. Kreise auf dem Boden werden
    // damit zu Ellipsen.
    flatness: sp,
    project,
    depthOf: (x, y) => (x - ox) * sy + (y - oy) * cy,
    floorMatrix: [a, b, c, d, matE, matF],
    floorPoint: (x, y) => [a * x + c * y + matE, b * x + d * y + matF],
    /** Bildschirmpunkt zurück auf die Bodenebene — für den Hover-Wert. */
    unprojectFloor: (sx, sy2) => {
      if (Math.abs(det) < 1e-9) return null;
      const px = sx - matE, py = sy2 - matF;
      return { x: (d * px - c * py) / det, y: (-b * px + a * py) / det };
    },
  };
}

/* ===== src/scene3d.js ===== */
/* ------------------------------------------------------------------ *
 * scene3d.js — zeichnet die 2,5D-Ansicht.
 *
 * Reihenfolge und Verdeckung entstehen durch den Maleralgorithmus: alle
 * Wandflächen werden gesammelt, nach Tiefe sortiert und von hinten nach
 * vorn gezeichnet. Ein Z-Buffer ist nicht nötig, weil jedes Wandstück ein
 * konvexer Quader ist — dessen Rückseiten werden zwangsläufig von seinen
 * eigenen Vorderseiten überdeckt, ganz ohne Backface-Culling.
 *
 * Türen und Fenster sind keine aufgemalten Symbole, sondern fehlende
 * Geometrie: eine Tür lässt den Wandquader dort weg und setzt nur einen
 * Sturz darüber, ein Fenster bekommt Brüstung, Sturz und eine
 * durchscheinende Scheibe dazwischen.
 * ------------------------------------------------------------------ */


/** Bauteilmaße in Metern. */
const GEOMETRY = {
  thicknessExterior: 0.24,
  thicknessInterior: 0.12,
  doorHeight: 2.0,
  windowSill: 0.9,
  windowHead: 2.1,
  sensorHeight: 1.3,
};

/** Richtung, aus der das Modell beleuchtet wird (oben links). */
const LIGHT = [-0.55, -0.835];

const shadeRgb = (rgb, factor) =>
  `rgb(${Math.round(rgb[0] * factor)}, ${Math.round(rgb[1] * factor)}, ${Math.round(rgb[2] * factor)})`;

/**
 * Die fünf sichtbaren Flächen eines Wandquaders (der Boden entfällt —
 * von oben schaut niemand darunter).
 */
function boxFaces(x1, y1, x2, y2, halfT, z0, z1) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return [];
  const ux = dx / len, uy = dy / len;
  const nx = uy * halfT, ny = -ux * halfT;

  const a1 = [x1 + nx, y1 + ny], a2 = [x2 + nx, y2 + ny];
  const b1 = [x1 - nx, y1 - ny], b2 = [x2 - nx, y2 - ny];
  const at = (p, z) => [p[0], p[1], z];

  return [
    { pts: [at(a1, z1), at(a2, z1), at(b2, z1), at(b1, z1)], top: true },
    { pts: [at(a1, z0), at(a2, z0), at(a2, z1), at(a1, z1)], normal: [uy, -ux] },
    { pts: [at(b2, z0), at(b1, z0), at(b1, z1), at(b2, z1)], normal: [-uy, ux] },
    { pts: [at(b1, z0), at(a1, z0), at(a1, z1), at(b1, z1)], normal: [-ux, -uy] },
    { pts: [at(a2, z0), at(b2, z0), at(b2, z1), at(a2, z1)], normal: [ux, uy] },
  ];
}

/**
 * Baut die Baukörper des Grundrisses: pro Wand die Quader, die nach Abzug
 * der Öffnungen übrig bleiben, plus die Glasscheiben der Fenster.
 *
 * Absichtlich frei von Zeichenkram und in Grundriss-Koordinaten — so ist
 * die eigentlich knifflige Logik (was bleibt von einer Wand mit Tür?)
 * ohne Canvas prüfbar.
 *
 * @returns {{x1,y1,x2,y2,z0,z1,halfT,exterior,glass}[]}
 */
function wallSolids(floorplan, opts) {
  const { pxPerMeter, wallHeight } = opts;
  const height = wallHeight * pxPerMeter;
  const doorHeight = GEOMETRY.doorHeight * pxPerMeter;
  const sill = Math.min(GEOMETRY.windowSill * pxPerMeter, height);
  const head = Math.min(GEOMETRY.windowHead * pxPerMeter, height);
  const tol = Math.max(6, pxPerMeter * 0.16);
  const openings = floorplan.openings || [];

  const solids = [];
  for (const wall of buildWalls(floorplan)) {
    const exterior = wall.type === 'exterior';
    const halfT = ((exterior ? GEOMETRY.thicknessExterior : GEOMETRY.thicknessInterior) * pxPerMeter) / 2;
    const dx = wall.x2 - wall.x1, dy = wall.y2 - wall.y1;

    const add = (t0, t1, z0, z1, glass = false) => {
      if (z1 - z0 < 1 || t1 - t0 < 1e-6) return;
      solids.push({
        x1: wall.x1 + dx * t0, y1: wall.y1 + dy * t0,
        x2: wall.x1 + dx * t1, y2: wall.y1 + dy * t1,
        z0, z1, halfT, exterior, glass,
      });
    };

    for (const [t0, t1] of wallGaps(wall, openings, tol)) add(t0, t1, 0, height);

    for (const { t0, t1, opening } of wallCovers(wall, openings, tol)) {
      if (opening.type === 'passage') continue;
      if (opening.type === 'door') {
        add(t0, t1, doorHeight, height); // nur der Sturz bleibt stehen
        continue;
      }
      add(t0, t1, 0, sill);        // Brüstung
      add(t0, t1, head, height);   // Sturz
      add(t0, t1, sill, head, true); // Scheibe
    }
  }
  return solids;
}

/**
 * @returns {{sensors: {x:number,y:number,floorX:number,floorY:number}[]}}
 *          Bildschirmpositionen der Sensoren, damit die Karte ihre Chips
 *          darüber legen kann.
 */
function renderScene(ctx, params) {
  const {
    floorplan, field, isotherms, projection, buffer,
    clipPath, opacity, pxPerMeter, wallHeight,
    showWalls, showRoomLabels, colors,
  } = params;

  const sensorZ = GEOMETRY.sensorHeight * pxPerMeter;

  /* --- Boden: Heatmap als affin transformiertes Bild ---------------- */
  if (field && buffer) {
    const cs = field.opts.cellSize;
    ctx.save();
    ctx.transform(...projection.floorMatrix);
    if (clipPath) ctx.clip(clipPath);
    ctx.globalAlpha = opacity;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      buffer,
      field.bounds.minX + cs * 0.5,
      field.bounds.minY + cs * 0.5,
      field.cols * cs,
      field.rows * cs
    );
    ctx.restore();
  }

  /* --- Isothermen: Punkte einzeln projizieren, damit die Strichstärke
         nicht mitverzerrt wird ----------------------------------------- */
  if (isotherms && isotherms.length) {
    ctx.save();
    ctx.beginPath();
    for (const band of isotherms) {
      for (const [x1, y1, x2, y2] of band.segments) {
        const p1 = projection.floorPoint(x1, y1);
        const p2 = projection.floorPoint(x2, y2);
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
      }
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.isotherm;
    ctx.stroke();
    ctx.restore();
  }

  /* --- Raumnamen liegen auf dem Boden und dürfen von nahen Wänden
         verdeckt werden, deshalb vor den Wänden ------------------------ */
  if (showRoomLabels) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.max(10, Math.min(15, 13 * projection.scale))}px system-ui, sans-serif`;
    for (const room of floorplan.rooms) {
      const [cx, cy] = polygonCentroid(room.points);
      const p = projection.floorPoint(cx, cy);
      ctx.lineWidth = 3;
      ctx.strokeStyle = colors.labelHalo;
      ctx.strokeText(room.name, p[0], p[1]);
      ctx.fillStyle = colors.label;
      ctx.fillText(room.name, p[0], p[1]);
    }
    ctx.restore();
  }

  /* --- Wände ------------------------------------------------------- */
  if (showWalls) {
    const faces = [];
    for (const s of wallSolids(floorplan, { pxPerMeter, wallHeight })) {
      const base = s.exterior ? colors.wallExterior : colors.wallInterior;
      if (s.glass) {
        faces.push({
          face: {
            pts: [
              [s.x1, s.y1, s.z0], [s.x2, s.y2, s.z0],
              [s.x2, s.y2, s.z1], [s.x1, s.y1, s.z1],
            ],
          },
          base,
          glass: true,
        });
        continue;
      }
      for (const face of boxFaces(s.x1, s.y1, s.x2, s.y2, s.halfT, s.z0, s.z1)) {
        faces.push({ face, base, glass: false });
      }
    }

    // Projizieren, Tiefe mitteln, von hinten nach vorn sortieren.
    const drawables = faces.map(({ face, base, glass }) => {
      let depth = 0;
      const points = face.pts.map(([x, y, z]) => {
        const p = projection.project(x, y, z);
        depth += p.depth;
        return p;
      });
      return { points, depth: depth / points.length, face, base, glass };
    });
    drawables.sort((a, b) => a.depth - b.depth);

    ctx.save();
    ctx.lineJoin = 'round';
    for (const item of drawables) {
      ctx.beginPath();
      ctx.moveTo(item.points[0].x, item.points[0].y);
      for (let i = 1; i < item.points.length; i++) ctx.lineTo(item.points[i].x, item.points[i].y);
      ctx.closePath();

      if (item.glass) {
        ctx.fillStyle = colors.glass;
        ctx.fill();
        ctx.strokeStyle = colors.glassEdge;
        ctx.lineWidth = 1;
        ctx.stroke();
        continue;
      }

      const f = item.face;
      let factor = 1;
      if (!f.top) {
        const dot = f.normal ? f.normal[0] * LIGHT[0] + f.normal[1] * LIGHT[1] : 0;
        factor = 0.6 + 0.32 * Math.max(0, dot);
      }
      ctx.fillStyle = shadeRgb(item.base, factor);
      ctx.fill();
      ctx.strokeStyle = shadeRgb(item.base, factor * 0.78);
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* --- Sensoren: Standfuß auf dem Boden, Mast bis auf Messhöhe.
         Bewusst zuletzt und ohne Tiefentest — die eigenen Messpunkte
         soll man immer sehen, auch hinter einer Wand. ------------------ */
  const sensorPoints = [];
  ctx.save();
  for (const s of floorplan.sensors) {
    const floor = projection.project(s.x, s.y, 0);
    const head = projection.project(s.x, s.y, sensorZ);
    sensorPoints.push({ x: head.x, y: head.y, floorX: floor.x, floorY: floor.y });

    if (Math.abs(head.y - floor.y) > 1.5) {
      ctx.beginPath();
      ctx.moveTo(floor.x, floor.y);
      ctx.lineTo(head.x, head.y);
      ctx.strokeStyle = colors.stem;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(floor.x, floor.y, 4.5, Math.max(1.2, 4.5 * projection.flatness), 0, 0, Math.PI * 2);
      ctx.strokeStyle = colors.stem;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();

  return { sensors: sensorPoints };
}

/* ===== src/plan-editor.js ===== */
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
function openPlanEditor(options) {
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

/* ===== src/editor.js ===== */
/* ------------------------------------------------------------------ *
 * editor.js — das Formular im Lovelace-Konfigurationsdialog.
 *
 * Bewusst schlank gehalten: alles Räumliche passiert im Vollbild-Editor
 * (plan-editor.js), hier stehen nur die Darstellungs- und Modellwerte.
 * ------------------------------------------------------------------ */


const PALETTE_LABEL_KEYS = {
  coolwarm: 'editor.paletteCoolwarm',
  thermal: 'editor.paletteThermal',
  viridis: 'editor.paletteViridis',
  inferno: 'editor.paletteInferno',
  turbo: 'editor.paletteTurbo',
};

const TRANSMITTANCE_LABEL_KEYS = {
  exterior: 'label.exterior',
  interior: 'label.interior',
  door: 'label.door',
  window: 'label.window',
  passage: 'label.passage',
};

const FORM_STYLES = `
  :host { display: block; }
  .wrap { display: flex; flex-direction: column; gap: 16px; padding-bottom: 8px; }
  h3 {
    margin: 0 0 10px; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .07em;
    color: var(--secondary-text-color);
  }
  .card {
    border: 1px solid var(--divider-color, rgba(127,140,158,.25));
    border-radius: 12px; padding: 14px;
  }
  .field { margin-bottom: 12px; }
  .field:last-child { margin-bottom: 0; }
  .field > label {
    display: block; font-size: 12px; color: var(--secondary-text-color); margin-bottom: 5px;
  }
  .row { display: flex; gap: 10px; }
  .row > * { flex: 1; min-width: 0; }
  input[type=text], input[type=number], select {
    width: 100%; box-sizing: border-box;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color);
    border: 1px solid var(--divider-color, rgba(127,140,158,.35));
    border-radius: 8px; padding: 8px 10px; font-size: 14px; font-family: inherit;
  }
  input:focus, select:focus { outline: none; border-color: var(--primary-color); }
  input[type=range] { width: 100%; accent-color: var(--primary-color); }
  input:disabled { opacity: .5; }
  .check {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--primary-text-color);
    cursor: pointer; padding: 5px 0;
  }
  .check input { accent-color: var(--primary-color); width: 16px; height: 16px; margin: 0; }
  .value { float: right; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
  .plan-button {
    width: 100%; display: flex; align-items: center; gap: 12px;
    background: var(--primary-color); color: var(--text-primary-color, #fff);
    border: none; border-radius: 12px; padding: 14px 16px;
    font-size: 14px; font-weight: 600; font-family: inherit;
    cursor: pointer; text-align: left;
  }
  .plan-button:hover { filter: brightness(1.08); }
  .plan-button svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; flex: none; }
  .plan-button .sub { display: block; font-weight: 400; font-size: 12px; opacity: .85; margin-top: 2px; }
  .swatch { height: 10px; border-radius: 999px; margin-top: 8px; }
  .seg {
    display: flex; gap: 4px; padding: 4px;
    border: 1px solid var(--divider-color, rgba(127,140,158,.35)); border-radius: 10px;
  }
  .seg button {
    flex: 1; background: transparent; border: none; border-radius: 7px;
    color: var(--primary-text-color); font-family: inherit; font-size: 12.5px;
    padding: 8px 6px; cursor: pointer;
  }
  .seg button:hover { background: var(--divider-color, rgba(127,140,158,.2)); }
  .seg button.active { background: var(--primary-color); color: var(--text-primary-color, #fff); font-weight: 600; }
  [hidden] { display: none; }
  details summary {
    cursor: pointer; font-size: 11px; font-weight: 600; letter-spacing: .07em;
    text-transform: uppercase; color: var(--secondary-text-color); padding: 4px 0;
  }
  details[open] summary { margin-bottom: 10px; }
  .note { font-size: 12px; color: var(--secondary-text-color); line-height: 1.5; margin-top: 8px; }
`;

class FloorplanHeatmapCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    // Home Assistant spiegelt jede von uns gemeldete Änderung sofort
    // wieder herein. Würden wir darauf neu rendern, wäre der gerade
    // gezogene Regler mitten in der Bewegung durch ein frisches Element
    // ersetzt — das Ziehen bräche nach dem ersten Schritt ab.
    const serialized = JSON.stringify(config);
    if (serialized === this._configJson) return;
    this._configJson = serialized;
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    // Ein Neurendern bei jedem hass-Update würde Regler mitten in der
    // Bewegung ersetzen (siehe setConfig) — deshalb nur bei tatsächlichem
    // Sprachwechsel (typischerweise: erstes hass-Update nach dem Erzeugen).
    const prevLang = this._hass ? this._lang() : null;
    this._hass = hass;
    if (this._config && this._lang() !== prevLang) this._render();
  }

  _lang() {
    return detectLanguage(this._hass);
  }

  _emit(patch, rerender = true) {
    this._config = { ...this._config, ...patch };
    this._configJson = JSON.stringify(this._config);
    this.dispatchEvent(
      new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true })
    );
    if (rerender) this._render();
  }

  _render() {
    const cfg = normalizeConfig(this._config);
    const fp = cfg.floorplan;
    const lang = this._lang();
    const tr = (key, vars) => t(lang, key, vars);
    const counts = tr('editor.counts', {
      rooms: fp.rooms.length, sensors: fp.sensors.length, openings: fp.openings.length,
    });

    this.shadowRoot.innerHTML = `
      <style>${FORM_STYLES}</style>
      <div class="wrap">
        <button class="plan-button" id="openPlan">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h8M11 4v16"/></svg>
          <span>${tr('editor.openPlanButton')}
            <span class="sub">${counts}</span>
          </span>
        </button>

        <div class="card">
          <h3>${tr('editor.sectionDisplay')}</h3>
          <div class="field">
            <label>${tr('editor.fieldTitle')}</label>
            <input type="text" data-key="title" value="${escapeAttr(cfg.title)}" placeholder="${tr('card.defaultTitle')}">
          </div>
          <div class="row">
            <div class="field">
              <label>${tr('editor.fieldUnit')}</label>
              <input type="text" data-key="unit" value="${escapeAttr(cfg.unit)}" placeholder="°C">
            </div>
            <div class="field">
              <label>${tr('editor.fieldPalette')}</label>
              <select data-key="palette">
                ${PALETTE_NAMES.map((p) => `<option value="${p}" ${cfg.palette === p ? 'selected' : ''}>${tr(PALETTE_LABEL_KEYS[p]) || p}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="swatch" style="background:${paletteGradientCss(cfg.palette)}"></div>

          <div class="field" style="margin-top:12px">
            <label class="check"><input type="checkbox" data-key="auto_range" ${cfg.auto_range ? 'checked' : ''}>
              ${tr('editor.autoRange')}</label>
          </div>
          <div class="row">
            <div class="field">
              <label>${tr('editor.fieldMin')}</label>
              <input type="number" data-key="min" step="0.5" value="${cfg.min}" ${cfg.auto_range ? 'disabled' : ''}>
            </div>
            <div class="field">
              <label>${tr('editor.fieldMax')}</label>
              <input type="number" data-key="max" step="0.5" value="${cfg.max}" ${cfg.auto_range ? 'disabled' : ''}>
            </div>
          </div>
          <div class="field">
            <label>${tr('editor.fieldOpacity')} <span class="value" data-out="opacity">${Math.round(cfg.opacity * 100)} %</span></label>
            <input type="range" data-key="opacity" min="0.2" max="1" step="0.05" value="${cfg.opacity}">
          </div>
        </div>

        <div class="card">
          <h3>${tr('editor.sectionView')}</h3>
          <div class="field">
            <div class="seg">
              <button data-view="flat" class="${cfg.view_mode === 'flat' ? 'active' : ''}">${tr('editor.viewFlat')}</button>
              <button data-view="tilted" class="${cfg.view_mode === 'tilted' ? 'active' : ''}">${tr('editor.viewTilted')}</button>
            </div>
          </div>
          <div ${cfg.view_mode === 'tilted' ? '' : 'hidden'}>
            <div class="field">
              <label>${tr('editor.fieldYaw')} <span class="value" data-out="yaw">${Math.round(cfg.yaw)}°</span></label>
              <input type="range" data-key="yaw" min="-180" max="180" step="1" value="${cfg.yaw}">
            </div>
            <div class="field">
              <label>${tr('editor.fieldPitch')} <span class="value" data-out="pitch">${Math.round(cfg.pitch)}°</span></label>
              <input type="range" data-key="pitch" min="12" max="90" step="1" value="${cfg.pitch}">
            </div>
            <div class="field">
              <label>${tr('editor.fieldWallHeight')} <span class="value" data-out="wall_height">${cfg.wall_height.toFixed(2)} m</span></label>
              <input type="range" data-key="wall_height" min="1" max="4" step="0.05" value="${cfg.wall_height}">
            </div>
            <div class="note">${tr('editor.viewAngleNote')}</div>
          </div>
        </div>

        <div class="card">
          <h3>${tr('editor.sectionShow')}</h3>
          <label class="check"><input type="checkbox" data-key="show_walls" ${cfg.show_walls ? 'checked' : ''}> ${tr('editor.showWalls')}</label>
          <label class="check"><input type="checkbox" data-key="show_room_labels" ${cfg.show_room_labels ? 'checked' : ''}> ${tr('editor.showRoomLabels')}</label>
          <label class="check"><input type="checkbox" data-key="show_values" ${cfg.show_values ? 'checked' : ''}> ${tr('editor.showValues')}</label>
          <label class="check"><input type="checkbox" data-key="show_legend" ${cfg.show_legend ? 'checked' : ''}> ${tr('editor.showLegend')}</label>
          <label class="check"><input type="checkbox" data-key="show_isotherms" ${cfg.show_isotherms ? 'checked' : ''}> ${tr('editor.showIsotherms')}</label>
          <div class="field" style="margin-top:8px">
            <label>${tr('editor.isothermStep')} <span class="value" data-out="isotherm_step">${cfg.isotherm_step} ${cfg.unit}</span></label>
            <input type="range" data-key="isotherm_step" min="0.1" max="2" step="0.1" value="${cfg.isotherm_step}" ${cfg.show_isotherms ? '' : 'disabled'}>
          </div>
        </div>

        <div class="card">
          <details>
            <summary>${tr('editor.sectionModel')}</summary>
            <div class="field">
              <label>${tr('editor.cellSize')} <span class="value" data-out="cell_size">${cfg.cell_size} px</span></label>
              <input type="range" data-key="cell_size" min="3" max="20" step="1" value="${cfg.cell_size}">
              <div class="note">${tr('editor.cellSizeNote')}</div>
            </div>
            <div class="field">
              <label>${tr('editor.sensorRadius')} <span class="value" data-out="sensor_radius">${cfg.sensor_radius.toFixed(2)} m</span></label>
              <input type="range" data-key="sensor_radius" min="0.1" max="1.5" step="0.05" value="${cfg.sensor_radius}">
              <div class="note">${tr('editor.sensorRadiusNote')}</div>
            </div>

            <h3 style="margin-top:16px">${tr('editor.sectionTransmittance')}</h3>
            ${Object.keys(DEFAULT_TRANSMITTANCE).map((key) => `
              <div class="field">
                <label>${tr(TRANSMITTANCE_LABEL_KEYS[key]) || key} <span class="value" data-out="trans:${key}">${Math.round(cfg.transmittance[key] * 100)} %</span></label>
                <input type="range" data-trans="${key}" min="0" max="1" step="0.01" value="${cfg.transmittance[key]}">
              </div>`).join('')}
            <div class="note">${tr('editor.transmittanceNote')}</div>
          </details>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById('openPlan').onclick = () => this._openPlanEditor();

    this.shadowRoot.querySelectorAll('[data-view]').forEach((btn) => {
      btn.onclick = () => this._emit({ view_mode: btn.dataset.view });
    });

    this.shadowRoot.querySelectorAll('[data-key]').forEach((input) => {
      const key = input.dataset.key;
      const handler = () => {
        let value;
        if (input.type === 'checkbox') value = input.checked;
        else if (input.type === 'number' || input.type === 'range') value = parseFloat(input.value);
        else value = input.value;
        if (typeof value === 'number' && !Number.isFinite(value)) return;

        // Schieberegler dürfen kein Neurendern auslösen — sonst wird das
        // Element beim Ziehen ersetzt. Stattdessen nur die Zahl daneben
        // nachziehen; das übrige Formular hängt nicht an diesen Werten.
        if (input.type === 'range') {
          this._setReadout(key, value, cfg.unit);
          this._emit({ [key]: value }, false);
          return;
        }
        this._emit({ [key]: value });
      };
      // Textfelder erst beim Verlassen übernehmen, damit der Fokus nicht
      // nach jedem Tastendruck verloren geht.
      if (input.type === 'text') input.onchange = handler;
      else input.oninput = handler;
    });

    this.shadowRoot.querySelectorAll('[data-trans]').forEach((input) => {
      input.oninput = () => {
        const key = input.dataset.trans;
        const value = parseFloat(input.value);
        const readout = this.shadowRoot.querySelector(`[data-out="trans:${key}"]`);
        if (readout) readout.textContent = `${Math.round(value * 100)} %`;
        this._emit({ transmittance: { ...this._readTransmittance() } }, false);
      };
    });
  }

  /** Liest alle Durchlässigkeits-Regler aus dem Formular. */
  _readTransmittance() {
    const out = { ...DEFAULT_TRANSMITTANCE, ...(this._config.transmittance || {}) };
    this.shadowRoot.querySelectorAll('[data-trans]').forEach((input) => {
      const value = parseFloat(input.value);
      if (Number.isFinite(value)) out[input.dataset.trans] = value;
    });
    return out;
  }

  _setReadout(key, value, unit) {
    const el = this.shadowRoot.querySelector(`[data-out="${key}"]`);
    if (!el) return;
    const format = {
      opacity: (v) => `${Math.round(v * 100)} %`,
      isotherm_step: (v) => `${v} ${unit}`,
      cell_size: (v) => `${v} px`,
      sensor_radius: (v) => `${v.toFixed(2)} m`,
      yaw: (v) => `${Math.round(v)}°`,
      pitch: (v) => `${Math.round(v)}°`,
      wall_height: (v) => `${v.toFixed(2)} m`,
    }[key];
    if (format) el.textContent = format(value);
  }

  async _openPlanEditor() {
    const cfg = normalizeConfig(this._config);
    const result = await openPlanEditor({
      floorplan: cfg.floorplan,
      pxPerMeter: cfg.px_per_meter,
      background: cfg.background,
      backgroundOpacity: cfg.background_opacity,
      hass: this._hass,
    });
    if (!result) return;
    // `config-changed` verpufft, wenn Home Assistant den Dialog samt
    // Formular in der Zwischenzeit abgeräumt hat — dann wäre die ganze
    // Zeichenarbeit lautlos verloren. Lieber sichtbar melden.
    if (!this.isConnected) {
      console.warn(t(this._lang(), 'editor.dialogClosedWarning'));
      return;
    }
    this._emit({
      floorplan: result.floorplan,
      px_per_meter: result.px_per_meter,
      background: result.background,
      background_opacity: result.background_opacity,
    });
  }
}

function escapeAttr(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ===== src/card.js ===== */
/* ------------------------------------------------------------------ *
 * card.js — die Lovelace-Karte selbst.
 *
 * Ebenen von unten nach oben:
 *   1. optionales Hintergrundbild (Referenz-Grundriss, gedimmt)
 *   2. Temperaturfeld, auf die Raumpolygone geclippt
 *   3. Isothermen
 *   4. Wände, Türen, Fenster, Raumnamen
 *   5. Sensor-Chips als echtes DOM — dadurch lesbar, hover- und
 *      klickbar (öffnet den more-info-Dialog der Entity)
 * ------------------------------------------------------------------ */


const CARD_STYLES = `
  :host { display: block; }
  ha-card {
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 16px 8px;
  }
  .header .title {
    font-size: var(--ha-card-header-font-size, 20px);
    font-weight: 400;
    color: var(--ha-card-header-color, var(--primary-text-color));
    line-height: 1.2;
  }
  .header .summary {
    font-size: 12px;
    color: var(--secondary-text-color);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .header .summary b { color: var(--primary-text-color); font-weight: 600; }
  .stage {
    position: relative;
    margin: 0 12px;
    border-radius: 12px;
    overflow: hidden;
    background: var(--fh-stage-bg, rgba(127,140,158,0.10));
  }
  .stage canvas { display: block; width: 100%; height: 100%; }
  .stage.tilted { cursor: grab; touch-action: none; }
  .stage.tilted.turning { cursor: grabbing; }
  .stage .reset {
    position: absolute; right: 8px; top: 8px;
    display: none; align-items: center; gap: 5px;
    padding: 4px 9px; border-radius: 999px; border: none;
    background: rgba(20,24,32,.72); color: #fff;
    font-size: 11px; font-weight: 600; font-family: inherit;
    cursor: pointer; backdrop-filter: blur(3px);
  }
  .stage.tilted.moved .reset { display: inline-flex; }
  .stage .reset:hover { background: rgba(20,24,32,.9); }
  .chips { position: absolute; inset: 0; pointer-events: none; }
  .chip {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: auto;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .chip .pill {
    display: flex;
    align-items: baseline;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 11px;
    line-height: 1.35;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: 0 1px 4px rgba(0,0,0,0.28);
    backdrop-filter: blur(2px);
    transition: transform 120ms ease;
  }
  .chip .pill .name { font-weight: 500; opacity: 0.75; }
  .chip .pill .value { font-variant-numeric: tabular-nums; }
  .chip:hover .pill { transform: translateY(-1px) scale(1.04); }
  .chip .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.9);
    box-shadow: 0 0 0 1px rgba(0,0,0,0.35);
  }
  .chip.unavailable .pill { opacity: 0.55; font-style: italic; }
  .tooltip {
    position: absolute;
    pointer-events: none;
    transform: translate(-50%, calc(-100% - 10px));
    padding: 3px 7px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    background: var(--fh-tooltip-bg, rgba(20,24,32,0.92));
    color: #fff;
    opacity: 0;
    transition: opacity 100ms ease;
    white-space: nowrap;
  }
  .tooltip.show { opacity: 1; }
  .legend {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px 16px;
    font-size: 11px;
    color: var(--secondary-text-color);
    font-variant-numeric: tabular-nums;
  }
  .legend .bar {
    flex: 1;
    height: 8px;
    border-radius: 999px;
    position: relative;
    box-shadow: inset 0 0 0 1px rgba(127,140,158,0.25);
  }
  .legend .bar .tick {
    position: absolute;
    top: -3px;
    width: 2px;
    height: 14px;
    border-radius: 1px;
    background: var(--primary-text-color);
    opacity: 0.65;
    transform: translateX(-1px);
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 42px 20px;
    text-align: center;
    color: var(--secondary-text-color);
    font-size: 13px;
    line-height: 1.5;
  }
  .empty .big { font-size: 26px; opacity: 0.65; }
`;

/** Lässt Pfade in Grundriss-Koordinaten stehen — für die 2,5D-Bodenebene. */
const IDENTITY_VIEW = { toX: (x) => x, toY: (y) => y, scale: 1 };

class FloorplanHeatmapCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('floorplan-heatmap-card-editor');
  }

  static getStubConfig() {
    return {
      type: 'custom:floorplan-heatmap-card',
      title: t(detectLanguageFallback(), 'card.defaultTitle'),
      ...DEFAULTS,
      floorplan: { rooms: [], walls: [], openings: [], sensors: [] },
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._field = null;
    this._fieldSignature = '';
    this._lastValues = null;
    this._isotherms = [];
    this._rafHandle = 0;
  }

  setConfig(config) {
    this._rawConfig = config;
    this._config = normalizeConfig(config);
    this._field = null;
    this._fieldSignature = '';
    this._lastValues = null;
    this._buffer = null;
    // Der Blickwinkel aus der Konfiguration ist der Ausgangspunkt.
    // Dreht der Betrachter danach am Modell, bleibt das eine reine
    // Ansichtssache und wird bewusst nicht in die Config zurückgeschrieben.
    this._angles = { yaw: this._config.yaw, pitch: clampPitch(this._config.pitch) };
    this._anglesTouched = false;
    this._build();
    this._update(true);
  }

  set hass(hass) {
    this._hass = hass;
    this._applyStaticText();
    this._update(false);
  }

  /** Sprache aus hass.language — vor dem ersten hass-Update Browser-Fallback. */
  _lang() {
    return detectLanguage(this._hass);
  }

  getCardSize() {
    return this._config && !isEmptyFloorplan(this._config.floorplan) ? 8 : 3;
  }

  connectedCallback() {
    if (!this._resizeObserver && this._stage) {
      this._resizeObserver = new ResizeObserver(() => this._scheduleRender());
      this._resizeObserver.observe(this._stage);
    }
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  /* ---------------------------------------------------------------- */

  _build() {
    const cfg = this._config;
    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLES}</style>
      <ha-card>
        <div class="header" part="header">
          <div class="title"></div>
          <div class="summary"></div>
        </div>
        <div class="stage">
          <canvas></canvas>
          <div class="chips"></div>
          <div class="tooltip"></div>
          <button class="reset"></button>
        </div>
        <div class="legend">
          <span class="lo"></span>
          <div class="bar"></div>
          <span class="hi"></span>
        </div>
        <div class="empty" hidden>
          <div class="big">🏠</div>
          <div class="empty-text"></div>
        </div>
      </ha-card>
    `;

    this._card = this.shadowRoot.querySelector('ha-card');
    this._titleEl = this.shadowRoot.querySelector('.title');
    this._summaryEl = this.shadowRoot.querySelector('.summary');
    this._stage = this.shadowRoot.querySelector('.stage');
    this._canvas = this.shadowRoot.querySelector('canvas');
    this._chips = this.shadowRoot.querySelector('.chips');
    this._tooltip = this.shadowRoot.querySelector('.tooltip');
    this._legend = this.shadowRoot.querySelector('.legend');
    this._empty = this.shadowRoot.querySelector('.empty');
    this._emptyText = this.shadowRoot.querySelector('.empty-text');
    this._resetBtn = this.shadowRoot.querySelector('.reset');

    const header = this.shadowRoot.querySelector('.header');
    header.hidden = !cfg.title;
    this._titleEl.textContent = cfg.title || '';
    this._legend.hidden = !cfg.show_legend;

    this._stage.classList.toggle('tilted', cfg.view_mode === 'tilted');
    this._stage.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this._stage.addEventListener('pointerleave', () => this._tooltip.classList.remove('show'));
    this._stage.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this._stage.addEventListener('pointerup', (e) => this._onPointerUp(e));
    this._stage.addEventListener('pointercancel', (e) => this._onPointerUp(e));
    this.shadowRoot.querySelector('.reset').addEventListener('click', () => {
      this._angles = { yaw: cfg.yaw, pitch: clampPitch(cfg.pitch) };
      this._anglesTouched = false;
      this._stage.classList.remove('moved');
      this._scheduleRender();
    });

    if (this._resizeObserver) this._resizeObserver.disconnect();
    this._resizeObserver = new ResizeObserver(() => this._scheduleRender());
    this._resizeObserver.observe(this._stage);

    if (cfg.background) {
      this._bgImage = new Image();
      this._bgImage.onload = () => this._scheduleRender();
      this._bgImage.onerror = () => { this._bgImage = null; };
      this._bgImage.src = cfg.background;
    } else {
      this._bgImage = null;
    }

    this._applyStaticText();
  }

  /** Zieht die sprachabhängigen, statisch aufgebauten Texte nach — auch
   *  aufgerufen, wenn hass erst nach _build() eintrifft. */
  _applyStaticText() {
    if (!this._resetBtn) return;
    const lang = this._lang();
    this._resetBtn.title = t(lang, 'card.resetViewTitle');
    this._resetBtn.textContent = `↺ ${t(lang, 'card.resetViewLabel')}`;
    this._emptyText.innerHTML =
      `${t(lang, 'card.emptyLine1')}<br>` +
      `${t(lang, 'card.emptyLine2', { button: `<b>${t(lang, 'planEditor.title')}</b>` })}`;
  }

  /** Aktuelle Messwerte in der Reihenfolge von floorplan.sensors. */
  _readValues() {
    const sensors = this._config.floorplan.sensors;
    const hass = this._hass;
    return sensors.map((s) => {
      if (!hass || !s.entity) return NaN;
      const state = hass.states[s.entity];
      if (!state) return NaN;
      const v = parseFloat(state.state);
      return Number.isFinite(v) ? v : NaN;
    });
  }

  _detectUnit() {
    if (this._rawConfig && this._rawConfig.unit) return this._rawConfig.unit;
    const hass = this._hass;
    if (!hass) return this._config.unit;
    for (const s of this._config.floorplan.sensors) {
      const state = s.entity && hass.states[s.entity];
      const unit = state && state.attributes && state.attributes.unit_of_measurement;
      if (unit) return unit;
    }
    return this._config.unit;
  }

  _update(force) {
    const cfg = this._config;
    if (!cfg) return;

    const empty = isEmptyFloorplan(cfg.floorplan) || !cfg.floorplan.sensors.length;
    this._empty.hidden = !empty;
    this._stage.hidden = empty;
    this._legend.hidden = empty || !cfg.show_legend;
    this._summaryEl.hidden = empty;
    if (empty) return;

    const values = this._readValues();
    const changed =
      force ||
      !this._lastValues ||
      values.length !== this._lastValues.length ||
      values.some((v, i) => !Object.is(v, this._lastValues[i]));
    if (!changed) return;
    this._lastValues = values;

    const signature = HeatField.signature(cfg.floorplan, {
      cellSize: cfg.cell_size,
      sensorRadius: cfg.sensor_radius,
      transmittance: cfg.transmittance,
      pxPerMeter: cfg.px_per_meter,
    });
    if (!this._field || signature !== this._fieldSignature) {
      this._field = new HeatField(cfg.floorplan, {
        cellSize: cfg.cell_size,
        sensorRadius: cfg.sensor_radius,
        transmittance: cfg.transmittance,
        pxPerMeter: cfg.px_per_meter,
      });
      this._fieldSignature = signature;
    }

    this._hasField = this._field.solve(values);
    this._range = this._computeRange();
    this._buffer = null; // Farbpuffer neu einfärben, sobald sich Werte ändern
    this._isotherms =
      this._hasField && cfg.show_isotherms ? computeIsotherms(this._field, cfg.isotherm_step) : [];
    this._scheduleRender();
  }

  _computeRange() {
    const cfg = this._config;
    if (!cfg.auto_range || !this._field || !this._field.stats) {
      return { min: cfg.min, max: cfg.max };
    }
    const { sensorMin, sensorMax } = this._field.stats;
    const pad = Math.max(0.5, (sensorMax - sensorMin) * 0.25);
    return {
      min: Math.floor((sensorMin - pad) * 2) / 2,
      max: Math.ceil((sensorMax + pad) * 2) / 2,
    };
  }

  _scheduleRender() {
    if (this._rafHandle) return;
    this._rafHandle = requestAnimationFrame(() => {
      this._rafHandle = 0;
      this._render();
    });
  }

  _render() {
    const cfg = this._config;
    if (!cfg || !this._canvas || this._stage.hidden) return;
    // Ein Resize kann uns vor dem ersten Lösungslauf erreichen.
    if (!this._range) this._range = { min: cfg.min, max: cfg.max };

    const tilted = cfg.view_mode === 'tilted';
    const wallHeightPx = cfg.wall_height * cfg.px_per_meter;

    if (cfg.aspect_ratio) {
      this._stage.style.aspectRatio = cfg.aspect_ratio;
    } else if (tilted) {
      this._stage.style.aspectRatio = String(
        projectedAspect({
          floorplan: cfg.floorplan,
          yaw: this._angles.yaw * DEG,
          pitch: this._angles.pitch * DEG,
          wallHeight: wallHeightPx,
        })
      );
    } else {
      const b = floorplanBounds(cfg.floorplan, 20);
      this._stage.style.aspectRatio = `${b.w} / ${b.h}`;
    }

    const rect = this._stage.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const cssW = rect.width, cssH = rect.height;
    this._canvas.width = Math.round(cssW * dpr);
    this._canvas.height = Math.round(cssH * dpr);

    const ctx = this._canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // Der eingefärbte Puffer hängt nur an Feld, Palette und Skala — beim
    // Drehen ändert sich davon nichts, deshalb wird er wiederverwendet.
    if (this._hasField && !this._buffer) {
      this._buffer = heatmapBuffer(document, this._field, {
        palette: cfg.palette,
        min: this._range.min,
        max: this._range.max,
      });
    }

    const chipPositions = tilted
      ? this._renderTilted(ctx, cssW, cssH, wallHeightPx)
      : this._renderFlat(ctx, cssW, cssH);

    this._renderChips(chipPositions);
    this._renderLegend();
    this._renderSummary();
  }

  /** Klassische Draufsicht. */
  _renderFlat(ctx, cssW, cssH) {
    const cfg = this._config;
    const bounds = floorplanBounds(cfg.floorplan, 20);
    const view = computeView(bounds, cssW, cssH, 6);
    this._view = view;
    this._sampleAt = (px, py) => ({ x: view.fromX(px), y: view.fromY(py) });

    const clipPath = cfg.floorplan.rooms.length ? roomsPath(cfg.floorplan.rooms, view) : null;

    if (this._bgImage && this._bgImage.complete && this._bgImage.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = clamp(cfg.background_opacity, 0, 1);
      ctx.drawImage(
        this._bgImage,
        view.toX(0), view.toY(0),
        this._bgImage.naturalWidth * view.scale,
        this._bgImage.naturalHeight * view.scale
      );
      ctx.restore();
    }

    if (this._hasField) {
      renderField(ctx, this._field, view, {
        palette: cfg.palette,
        min: this._range.min,
        max: this._range.max,
        opacity: clamp(cfg.opacity, 0, 1),
        clipPath,
        buffer: this._buffer,
      });
      if (this._isotherms.length) {
        renderIsotherms(ctx, this._isotherms, view, { clipPath, color: 'rgba(255,255,255,0.28)' });
      }
    }

    if (cfg.show_walls) {
      renderFloorplan(ctx, cfg.floorplan, view, {
        showRoomLabels: cfg.show_room_labels,
        wallColor: this._cssVar('--fh-wall-color', 'rgba(28,34,44,0.92)'),
        labelColor: 'rgba(255,255,255,0.92)',
        labelHalo: 'rgba(0,0,0,0.5)',
      });
    }

    return cfg.floorplan.sensors.map((s) => ({ x: view.toX(s.x), y: view.toY(s.y) }));
  }

  /** 2,5D-Ansicht mit aufgestellten Wänden. */
  _renderTilted(ctx, cssW, cssH, wallHeightPx) {
    const cfg = this._config;
    const projection = createProjection({
      floorplan: cfg.floorplan,
      yaw: this._angles.yaw * DEG,
      pitch: this._angles.pitch * DEG,
      wallHeight: wallHeightPx,
      width: cssW,
      height: cssH,
      padding: 10,
    });
    this._projection = projection;
    this._view = null;
    // Der Hover-Wert bezieht sich immer auf die Bodenebene — man liest
    // die Temperatur am Fußpunkt unter dem Zeiger ab, nicht an der Wand.
    this._sampleAt = (px, py) => projection.unprojectFloor(px, py);

    // Der Clip-Pfad wird hier in Grundriss-Koordinaten gebaut, weil die
    // Bodenmatrix ihn beim Zeichnen ohnehin transformiert.
    const clipPath = cfg.floorplan.rooms.length
      ? roomsPath(cfg.floorplan.rooms, IDENTITY_VIEW)
      : null;

    const result = renderScene(ctx, {
      floorplan: cfg.floorplan,
      field: this._hasField ? this._field : null,
      isotherms: this._isotherms,
      projection,
      buffer: this._buffer,
      clipPath,
      opacity: clamp(cfg.opacity, 0, 1),
      pxPerMeter: cfg.px_per_meter,
      wallHeight: cfg.wall_height,
      showWalls: cfg.show_walls,
      showRoomLabels: cfg.show_room_labels,
      colors: {
        wallExterior: [150, 160, 176],
        wallInterior: [186, 194, 206],
        glass: 'rgba(126, 186, 255, 0.26)',
        glassEdge: 'rgba(150, 200, 255, 0.55)',
        isotherm: 'rgba(255,255,255,0.28)',
        label: 'rgba(255,255,255,0.94)',
        labelHalo: 'rgba(0,0,0,0.55)',
        stem: 'rgba(255,255,255,0.5)',
      },
    });

    return result.sensors;
  }

  _cssVar(name, fallback) {
    const value = getComputedStyle(this).getPropertyValue(name);
    return value && value.trim() ? value.trim() : fallback;
  }

  _renderChips(positions) {
    const cfg = this._config;
    const sensors = cfg.floorplan.sensors;
    const values = this._lastValues || [];
    const unit = this._detectUnit();
    const span = Math.max(1e-6, this._range.max - this._range.min);

    while (this._chips.children.length > sensors.length) this._chips.lastChild.remove();
    while (this._chips.children.length < sensors.length) {
      const el = document.createElement('div');
      el.className = 'chip';
      el.innerHTML = '<div class="pill"><span class="name"></span><span class="value"></span></div><div class="dot"></div>';
      el.addEventListener('click', () => {
        // Bewusst über this._config gelesen: der Chip überlebt Config-
        // Änderungen, die Sensorliste von damals nicht.
        const idx = Array.prototype.indexOf.call(this._chips.children, el);
        const current = this._config.floorplan.sensors[idx];
        const entity = current && current.entity;
        if (!entity) return;
        this.dispatchEvent(
          new CustomEvent('hass-more-info', { detail: { entityId: entity }, bubbles: true, composed: true })
        );
      });
      this._chips.appendChild(el);
    }

    sensors.forEach((s, i) => {
      const el = this._chips.children[i];
      const value = values[i];
      const known = Number.isFinite(value);
      const ratio = known ? clamp((value - this._range.min) / span, 0, 1) : 0.5;
      const bg = known ? paletteColorCss(cfg.palette, ratio) : 'rgba(120,130,145,0.85)';
      const fg = known ? readableTextOn(cfg.palette, ratio) : '#fff';

      const pos = positions[i] || { x: 0, y: 0 };
      el.style.left = `${(pos.x / this._stage.clientWidth) * 100}%`;
      el.style.top = `${(pos.y / this._stage.clientHeight) * 100}%`;
      el.classList.toggle('unavailable', !known);
      el.title = s.entity || '';

      const pill = el.querySelector('.pill');
      pill.style.background = bg;
      pill.style.color = fg;
      el.querySelector('.dot').style.background = bg;

      const nameEl = el.querySelector('.name');
      const label = s.name || (s.entity ? s.entity.split('.').pop().replace(/_/g, ' ') : '');
      nameEl.textContent = label;
      nameEl.hidden = !label;
      const valueEl = el.querySelector('.value');
      valueEl.hidden = !cfg.show_values;
      valueEl.textContent = known ? `${value.toFixed(1)} ${unit}` : '—';
    });
  }

  _renderLegend() {
    const cfg = this._config;
    if (!cfg.show_legend) return;
    const unit = this._detectUnit();
    const bar = this._legend.querySelector('.bar');
    bar.style.background = paletteGradientCss(cfg.palette);
    this._legend.querySelector('.lo').textContent = `${this._range.min.toFixed(1)} ${unit}`;
    this._legend.querySelector('.hi').textContent = `${this._range.max.toFixed(1)} ${unit}`;

    // Markierungen für die tatsächlichen Messwerte auf der Skala.
    const span = Math.max(1e-6, this._range.max - this._range.min);
    const values = (this._lastValues || []).filter(Number.isFinite);
    bar.querySelectorAll('.tick').forEach((t) => t.remove());
    for (const v of values) {
      const tick = document.createElement('div');
      tick.className = 'tick';
      tick.style.left = `${clamp((v - this._range.min) / span, 0, 1) * 100}%`;
      bar.appendChild(tick);
    }
  }

  _renderSummary() {
    const stats = this._field && this._field.stats;
    if (!stats) { this._summaryEl.textContent = ''; return; }
    const unit = this._detectUnit();
    const spread = stats.sensorMax - stats.sensorMin;
    this._summaryEl.innerHTML =
      `Ø <b>${stats.sensorMean.toFixed(1)} ${unit}</b> · ` +
      `${stats.sensorMin.toFixed(1)}–${stats.sensorMax.toFixed(1)} ` +
      `<span title="${t(this._lang(), 'card.spreadTooltip')}">(Δ ${spread.toFixed(1)})</span>`;
  }

  _onPointerDown(event) {
    if (this._config.view_mode !== 'tilted' || event.button !== 0) return;
    // Chips sollen anklickbar bleiben und keine Drehung auslösen.
    if (event.target.closest && event.target.closest('.chip, .reset')) return;
    this._turn = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      yaw: this._angles.yaw,
      pitch: this._angles.pitch,
      moved: false,
    };
    this._stage.setPointerCapture(event.pointerId);
  }

  _onPointerUp(event) {
    if (!this._turn || this._turn.id !== event.pointerId) return;
    if (this._stage.hasPointerCapture(event.pointerId)) this._stage.releasePointerCapture(event.pointerId);
    this._turn = null;
    this._stage.classList.remove('turning');
  }

  _onPointerMove(event) {
    if (this._turn) {
      const dx = event.clientX - this._turn.x;
      const dy = event.clientY - this._turn.y;
      if (!this._turn.moved && Math.hypot(dx, dy) < 3) return;
      this._turn.moved = true;
      this._anglesTouched = true;
      this._stage.classList.add('turning', 'moved');
      this._tooltip.classList.remove('show');
      this._angles = {
        yaw: this._turn.yaw + dx * 0.4,
        pitch: clampPitch(this._turn.pitch - dy * 0.3),
      };
      this._scheduleRender();
      return;
    }

    if (!this._hasField || !this._sampleAt) return;
    const rect = this._stage.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const floor = this._sampleAt(px, py);
    if (!floor) { this._tooltip.classList.remove('show'); return; }
    const value = this._field.sample(floor.x, floor.y);

    if (!Number.isFinite(value)) {
      this._tooltip.classList.remove('show');
      return;
    }
    const span = Math.max(1e-6, this._range.max - this._range.min);
    const ratio = clamp((value - this._range.min) / span, 0, 1);
    const lut = paletteLUT(this._config.palette);
    const l = Math.round(ratio * 255) * 4;
    this._tooltip.style.left = `${px}px`;
    this._tooltip.style.top = `${py}px`;
    this._tooltip.style.background = `rgba(${lut[l]},${lut[l + 1]},${lut[l + 2]},0.95)`;
    this._tooltip.style.color = readableTextOn(this._config.palette, ratio);
    this._tooltip.textContent = `${value.toFixed(1)} ${this._detectUnit()}`;
    this._tooltip.classList.add('show');
  }
}

/* ===== src/index.js ===== */
/* ------------------------------------------------------------------ *
 * index.js — Registrierung der Custom Elements.
 * ------------------------------------------------------------------ */


const VERSION = '1.0.1';

if (!customElements.get('floorplan-heatmap-card')) {
  customElements.define('floorplan-heatmap-card', FloorplanHeatmapCard);
}
if (!customElements.get('floorplan-heatmap-card-editor')) {
  customElements.define('floorplan-heatmap-card-editor', FloorplanHeatmapCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'floorplan-heatmap-card')) {
  // Beim Registrieren gibt es noch kein hass-Objekt — die Sprache kommt
  // hier aus dem Browser/localStorage statt aus hass.language.
  const lang = detectLanguageFallback();
  window.customCards.push({
    type: 'floorplan-heatmap-card',
    name: t(lang, 'customCards.name'),
    description: t(lang, 'customCards.description'),
    preview: true,
    documentationURL: 'https://github.com/kevinst/floorplan-heatmap-card',
  });
}

console.info(
  `%c FLOORPLAN-HEATMAP-CARD %c ${VERSION} `,
  'background:#3b6df3;color:#fff;font-weight:600;border-radius:3px 0 0 3px;padding:2px 6px',
  'background:#141924;color:#e7eaf0;border-radius:0 3px 3px 0;padding:2px 6px'
);

})();
