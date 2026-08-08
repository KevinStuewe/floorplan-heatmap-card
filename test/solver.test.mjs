/**
 * Prüft das Kernversprechen der Karte: Wände dämpfen, Öffnungen lassen
 * durch — und zwar messbar, nicht nur optisch.
 *
 *   node --test test/
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { HeatField } from '../src/solver.js';
import { normalizeConfig, buildWalls } from '../src/model.js';
import { computeIsotherms } from '../src/isotherms.js';

/**
 * Zwei gleich große Räume nebeneinander, die sich eine Wand bei x = 300
 * teilen. Links ein 24-°C-Sensor, rechts ein 18-°C-Sensor.
 *
 *   0        300        600
 *   ┌─────────┬─────────┐  0
 *   │  24 °C  │  18 °C  │
 *   └─────────┴─────────┘  400
 */
function twoRooms(openings = []) {
  return normalizeConfig({
    cell_size: 8,
    px_per_meter: 50,
    floorplan: {
      rooms: [
        { id: 'left', name: 'Links', points: [[0, 0], [300, 0], [300, 400], [0, 400]] },
        { id: 'right', name: 'Rechts', points: [[300, 0], [600, 0], [600, 400], [300, 400]] },
      ],
      walls: [],
      openings,
      sensors: [
        { id: 's1', x: 100, y: 200, entity: 'sensor.a', name: 'Links' },
        { id: 's2', x: 500, y: 200, entity: 'sensor.b', name: 'Rechts' },
      ],
    },
  });
}

function fieldFor(config) {
  const field = new HeatField(config.floorplan, {
    cellSize: config.cell_size,
    pxPerMeter: config.px_per_meter,
    sensorRadius: config.sensor_radius,
    transmittance: config.transmittance,
  });
  assert.equal(field.solve([24, 18]), true, 'Feld sollte lösbar sein');
  return field;
}

test('Raumkanten werden automatisch als Innen- bzw. Außenwand erkannt', () => {
  const walls = buildWalls(twoRooms().floorplan);
  const shared = walls.filter(
    (w) => Math.round(w.x1) === 300 && Math.round(w.x2) === 300
  );
  assert.ok(shared.length >= 1, 'die geteilte Wand bei x=300 muss existieren');
  assert.ok(
    shared.every((w) => w.type === 'interior'),
    'eine Wand zwischen zwei Räumen ist eine Innenwand'
  );

  const outer = walls.find((w) => Math.round(w.y1) === 0 && Math.round(w.y2) === 0 && w.x1 < 300);
  assert.equal(outer.type, 'exterior', 'die obere Kante grenzt an nichts → Außenwand');
});

test('deckungsgleiche Raumkanten werden nicht doppelt gezählt', () => {
  const walls = buildWalls(twoRooms().floorplan);
  const shared = walls.filter((w) => Math.round(w.x1) === 300 && Math.round(w.x2) === 300);
  assert.equal(shared.length, 1, 'die geteilte Wand darf nur einmal in der Liste stehen');
});

test('eine geschlossene Innenwand hält die Räume nahe an ihren Sensoren', () => {
  const field = fieldFor(twoRooms());
  // Direkt links und rechts der Trennwand gemessen.
  const left = field.sample(280, 200);
  const right = field.sample(320, 200);

  assert.ok(left > 23.0, `links an der Wand sollte warm bleiben, war ${left.toFixed(2)}`);
  assert.ok(right < 19.0, `rechts an der Wand sollte kühl bleiben, war ${right.toFixed(2)}`);
  assert.ok(left - right > 3.5, `über die Wand muss ein deutlicher Sprung liegen, war ${(left - right).toFixed(2)}`);
});

test('ein offener Durchgang koppelt die Räume spürbar', () => {
  const closed = fieldFor(twoRooms());
  const open = fieldFor(
    twoRooms([{ id: 'o1', x: 300, y: 200, angle: Math.PI / 2, width: 90, type: 'passage' }])
  );

  const jumpClosed = closed.sample(280, 200) - closed.sample(320, 200);
  const jumpOpen = open.sample(280, 200) - open.sample(320, 200);

  assert.ok(
    jumpOpen < jumpClosed * 0.5,
    `der Durchgang muss den Sprung mindestens halbieren: zu ${jumpOpen.toFixed(2)} statt ${jumpClosed.toFixed(2)}`
  );
});

test('eine Tür liegt zwischen offenem Durchgang und geschlossener Wand', () => {
  const at = (type) =>
    fieldFor(twoRooms([{ id: 'o1', x: 300, y: 200, angle: Math.PI / 2, width: 90, type }]));
  const jump = (f) => f.sample(280, 200) - f.sample(320, 200);

  const passage = jump(at('passage'));
  const door = jump(at('door'));
  const closed = jump(fieldFor(twoRooms()));

  assert.ok(passage < door, `Durchgang muss durchlässiger sein als Tür (${passage.toFixed(2)} < ${door.toFixed(2)})`);
  assert.ok(door < closed, `Tür muss durchlässiger sein als volle Wand (${door.toFixed(2)} < ${closed.toFixed(2)})`);
});

test('die Öffnung wirkt auch dann, wenn sie nur auf einer der beiden Raumkanten sitzt', () => {
  // Beide Räume haben an x=300 eine eigene Polygonkante. Weil Öffnungen
  // eigenständige Geometrie sind, muss eine einzelne Tür beide öffnen.
  const field = fieldFor(
    twoRooms([{ id: 'o1', x: 300, y: 200, angle: Math.PI / 2, width: 90, type: 'passage' }])
  );
  const jump = field.sample(280, 200) - field.sample(320, 200);
  assert.ok(jump < 1.5, `durch den Durchgang darf kaum noch ein Sprung bleiben, war ${jump.toFixed(2)}`);
});

test('das Feld bleibt zwischen den Sensorwerten — keine Über- oder Unterschwinger', () => {
  const field = fieldFor(twoRooms());
  for (let i = 0; i < field.n; i++) {
    if (!field.inside[i] || !field.reach[i]) continue;
    assert.ok(
      field.T[i] >= 18 - 1e-3 && field.T[i] <= 24 + 1e-3,
      `Zelle ${i} liegt mit ${field.T[i].toFixed(3)} außerhalb von [18, 24]`
    );
  }
});

test('am Sensor steht der Sensorwert', () => {
  const field = fieldFor(twoRooms());
  assert.ok(Math.abs(field.sample(100, 200) - 24) < 0.05);
  assert.ok(Math.abs(field.sample(500, 200) - 18) < 0.05);
});

test('Flächen außerhalb der Räume liefern keinen Wert', () => {
  const field = fieldFor(twoRooms());
  assert.ok(Number.isNaN(field.sample(-100, 200)), 'links außerhalb');
  assert.ok(Number.isNaN(field.sample(300, 600)), 'unterhalb');
});

test('ein einzelner Sensor füllt die Fläche mit seinem Wert', () => {
  const config = normalizeConfig({
    cell_size: 8,
    floorplan: {
      rooms: [{ id: 'r', name: 'Raum', points: [[0, 0], [200, 0], [200, 200], [0, 200]] }],
      sensors: [{ id: 's', x: 100, y: 100, entity: 'sensor.a' }],
    },
  });
  const field = new HeatField(config.floorplan, {
    cellSize: config.cell_size,
    transmittance: config.transmittance,
    pxPerMeter: config.px_per_meter,
    sensorRadius: config.sensor_radius,
  });
  assert.equal(field.solve([21.5]), true);
  assert.ok(Math.abs(field.sample(20, 20) - 21.5) < 0.01, 'auch in der Ecke');
});

test('ohne verwertbare Messwerte gibt es kein Feld', () => {
  const config = twoRooms();
  const field = new HeatField(config.floorplan, {
    cellSize: config.cell_size,
    transmittance: config.transmittance,
    pxPerMeter: config.px_per_meter,
    sensorRadius: config.sensor_radius,
  });
  assert.equal(field.solve([NaN, NaN]), false);
  assert.equal(field.T, null);
});

test('ein Raum ohne Sensor hinter einer dichten Wand bleibt unerreichbar', () => {
  const config = normalizeConfig({
    cell_size: 8,
    transmittance: { exterior: 0, interior: 0, door: 0, window: 0, passage: 1 },
    floorplan: {
      rooms: [
        { id: 'a', name: 'A', points: [[0, 0], [200, 0], [200, 200], [0, 200]] },
        { id: 'b', name: 'B', points: [[400, 0], [600, 0], [600, 200], [400, 200]] },
      ],
      sensors: [{ id: 's', x: 100, y: 100, entity: 'sensor.a' }],
    },
  });
  const field = new HeatField(config.floorplan, {
    cellSize: config.cell_size,
    transmittance: config.transmittance,
    pxPerMeter: config.px_per_meter,
    sensorRadius: config.sensor_radius,
  });
  assert.equal(field.solve([22]), true);
  assert.ok(Number.isNaN(field.sample(500, 100)), 'Raum B darf keinen erfundenen Wert bekommen');
});

test('warmer Neustart liefert dasselbe Ergebnis wie ein kalter Lauf', () => {
  const config = twoRooms();
  const field = fieldFor(config);
  const cold = field.sample(320, 200);

  field.solve([24, 18]); // zweiter Lauf, diesmal warm gestartet
  const warm = field.sample(320, 200);
  assert.ok(Math.abs(cold - warm) < 0.02, `warm ${warm.toFixed(3)} vs. kalt ${cold.toFixed(3)}`);
});

test('die Wandwirkung hängt nicht von der Gitterauflösung ab', () => {
  // Ohne die Umrechnung "Wand = so und so viele Meter Luft" würde eine
  // Wand bei feinem Gitter relativ immer schwächer, weil die Luft davor
  // aus mehr Zellen besteht, die Wand aber immer nur aus einer Kante.
  const jumps = [4, 6, 8, 12, 16].map((cell) => {
    const config = twoRooms();
    config.cell_size = cell;
    const field = fieldFor(config);
    return field.sample(280, 200) - field.sample(320, 200);
  });

  const min = Math.min(...jumps), max = Math.max(...jumps);
  assert.ok(
    max - min < 0.5,
    `der Sprung an der Wand darf über alle Auflösungen kaum schwanken, war ${jumps.map((j) => j.toFixed(2)).join(' / ')}`
  );
});

test('eine Wand auf einer Zellmittelpunkt-Linie dämpft nicht doppelt', () => {
  // Bei cell_size 8 fällt die Trennwand bei x = 300 genau auf eine Linie
  // von Zellmittelpunkten. Fänden beide angrenzenden Gitterkanten die
  // Wand, wäre die Dämmung dort schlagartig doppelt so stark.
  const aligned = twoRooms();
  aligned.cell_size = 8;
  const offset = twoRooms();
  offset.cell_size = 7;

  const jump = (config) => {
    const field = fieldFor(config);
    return field.sample(280, 200) - field.sample(320, 200);
  };
  assert.ok(
    Math.abs(jump(aligned) - jump(offset)) < 0.3,
    'zufällige Gitterausrichtung darf das Ergebnis nicht verschieben'
  );
});

test('Isothermen liegen im Wertebereich des Feldes', () => {
  const field = fieldFor(twoRooms());
  const bands = computeIsotherms(field, 0.5);
  assert.ok(bands.length > 3, `es sollten mehrere Isothermen entstehen, waren ${bands.length}`);
  for (const band of bands) {
    assert.ok(band.level >= field.stats.min - 0.5 && band.level <= field.stats.max + 0.5);
    assert.ok(band.segments.length > 0);
  }
});
