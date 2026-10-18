import test from 'node:test';
import assert from 'node:assert/strict';

import {
  uniqueHistoryEntityIds,
  historyTimestampMs,
  historyNumericValue,
  normalizeHistory,
  historyValueAt,
  sensorValuesAt,
  extractSunEvents,
  fetchHistory,
} from '../src/history.js';

test('uniqueHistoryEntityIds removes blanks and duplicate entities', () => {
  const sensors = [
    { entity: 'sensor.living_temperature' },
    { entity: 'sensor.kitchen_temperature' },
    { entity: 'sensor.living_temperature' },
    { entity: '' },
    {},
  ];

  assert.deepEqual(uniqueHistoryEntityIds(sensors), [
    'sensor.living_temperature',
    'sensor.kitchen_temperature',
  ]);
});

test('historyTimestampMs accepts HA seconds, milliseconds and ISO timestamps', () => {
  assert.equal(
    historyTimestampMs({ lu: 1_700_000_000 }),
    1_700_000_000_000
  );

  assert.equal(
    historyTimestampMs({ lu: 1_700_000_000_000 }),
    1_700_000_000_000
  );

  assert.equal(
    historyTimestampMs({ last_changed: '2026-09-07T06:30:00Z' }),
    Date.parse('2026-09-07T06:30:00Z')
  );
});

test('historyNumericValue accepts numeric states and rejects unavailable values', () => {
  assert.equal(historyNumericValue({ s: '21.75' }), 21.75);
  assert.equal(historyNumericValue({ state: '47' }), 47);
  assert.ok(Number.isNaN(historyNumericValue({ s: 'unknown' })));
  assert.ok(Number.isNaN(historyNumericValue({ s: 'unavailable' })));
});

test('normalizeHistory sorts compact Home Assistant history chronologically', () => {
  const history = normalizeHistory({
    'sensor.room': [
      { s: '22', lu: 300 },
      { s: '20', lu: 100 },
      { s: '21', lu: 200 },
    ],
  });

  assert.deepEqual(history['sensor.room'], [
    { time: 100000, value: 20 },
    { time: 200000, value: 21 },
    { time: 300000, value: 22 },
  ]);
});

test('historyValueAt returns the latest recorded value at or before the selected time', () => {
  const history = normalizeHistory({
    'sensor.room': [
      { s: '20', lu: 100 },
      { s: '21', lu: 200 },
      { s: '22', lu: 300 },
    ],
  });

  assert.ok(
    Number.isNaN(historyValueAt(history, 'sensor.room', 99_999))
  );

  assert.equal(
    historyValueAt(history, 'sensor.room', 100_000),
    20
  );

  assert.equal(
    historyValueAt(history, 'sensor.room', 250_000),
    21
  );

  assert.equal(
    historyValueAt(history, 'sensor.room', 999_000),
    22
  );
});

test('sensorValuesAt preserves sensor order and supports duplicate entities', () => {
  const history = normalizeHistory({
    'sensor.shared': [
      { s: '20', lu: 100 },
      { s: '23', lu: 200 },
    ],
    'sensor.other': [
      { s: '40', lu: 100 },
      { s: '45', lu: 200 },
    ],
  });

  const sensors = [
    { entity: 'sensor.shared' },
    { entity: 'sensor.other' },
    { entity: 'sensor.shared' },
    { entity: 'sensor.missing' },
  ];

  const values = sensorValuesAt(history, sensors, 250_000);

  assert.equal(values[0], 23);
  assert.equal(values[1], 45);
  assert.equal(values[2], 23);
  assert.ok(Number.isNaN(values[3]));
});

test('extractSunEvents detects sunrise and sunset transitions', () => {
  const raw = {
    'sun.sun': [
      { s: 'below_horizon', lu: 100 },
      { s: 'above_horizon', lu: 200 },
      { s: 'below_horizon', lu: 300 },
    ],
  };

  assert.deepEqual(extractSunEvents(raw, 100_000, 300_000), [
    { type: 'sunrise', time: 200_000 },
    { type: 'sunset', time: 300_000 },
  ]);
});

test('extractSunEvents ignores duplicate states and the first state', () => {
  const raw = {
    'sun.sun': [
      { s: 'below_horizon', lu: 100 },
      { s: 'below_horizon', lu: 150 },
      { s: 'above_horizon', lu: 200 },
      { s: 'above_horizon', lu: 250 },
    ],
  };

  assert.deepEqual(extractSunEvents(raw, 0, 999_000), [
    { type: 'sunrise', time: 200_000 },
  ]);
});

test('extractSunEvents sorts history and filters events outside the requested range', () => {
  const raw = {
    'sun.sun': [
      { s: 'below_horizon', lu: 500 },
      { s: 'below_horizon', lu: 100 },
      { s: 'above_horizon', lu: 200 },
      { s: 'below_horizon', lu: 300 },
      { s: 'above_horizon', lu: 400 },
    ],
  };

  assert.deepEqual(extractSunEvents(raw, 250_000, 450_000), [
    { type: 'sunset', time: 300_000 },
    { type: 'sunrise', time: 400_000 },
  ]);
});

test('extractSunEvents accepts full HA state fields and ignores invalid sun states', () => {
  const raw = {
    'sun.sun': [
      {
        state: 'below_horizon',
        last_changed: '2026-09-07T06:00:00Z',
      },
      {
        state: 'unknown',
        last_changed: '2026-09-07T06:10:00Z',
      },
      {
        state: 'above_horizon',
        last_changed: '2026-09-07T06:30:00Z',
      },
    ],
  };

  assert.deepEqual(
    extractSunEvents(
      raw,
      new Date('2026-09-07T06:00:00Z'),
      new Date('2026-09-07T07:00:00Z')
    ),
    [
      {
        type: 'sunrise',
        time: Date.parse('2026-09-07T06:30:00Z'),
      },
    ]
  );
});

test('fetchHistory sends the compact history request expected by Home Assistant', async () => {
  let received = null;

  const hass = {
    callWS(request) {
      received = request;
      return Promise.resolve({ 'sensor.room': [] });
    },
  };

  const start = new Date('2026-09-07T00:00:00Z');
  const end = new Date('2026-09-07T12:00:00Z');

  const response = await fetchHistory(
    hass,
    start,
    end,
    ['sensor.room', 'sensor.room', 'sensor.other']
  );

  assert.deepEqual(received, {
    type: 'history/history_during_period',
    start_time: '2026-09-07T00:00:00.000Z',
    end_time: '2026-09-07T12:00:00.000Z',
    minimal_response: true,
    no_attributes: true,
    entity_ids: ['sensor.room', 'sensor.other'],
  });

  assert.deepEqual(response, { 'sensor.room': [] });
});