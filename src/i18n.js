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
export function t(lang, key, vars) {
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

export function roomNameSuggestions(lang) {
  return ROOM_NAME_SUGGESTIONS[lang] || ROOM_NAME_SUGGESTIONS.en;
}

/**
 * Sprache ohne hass-Objekt raten — für Stellen, die vor dem ersten
 * hass-Update laufen (Registrierung in index.js, statische Stub-Config).
 */
export function detectLanguageFallback() {
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
export function detectLanguage(hass) {
  return normalizeLanguage((hass && hass.language) || detectLanguageFallback());
}

/** Nur Deutsch und Englisch werden unterstützt; alles andere landet auf Englisch. */
function normalizeLanguage(raw) {
  return String(raw || '').toLowerCase().startsWith('de') ? 'de' : 'en';
}
