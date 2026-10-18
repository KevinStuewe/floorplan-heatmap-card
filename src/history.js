/* ------------------------------------------------------------------ *
 * history.js — historical sensor values for the timeline.
 *
 * Home Assistant delivers compact history via
 * history/history_during_period. The values are normalized once and
 * then looked up by binary search for any point in time.
 * ------------------------------------------------------------------ */

/** Unique, non-empty entity IDs in sensor order. */
export function uniqueHistoryEntityIds(sensors = []) {
  const seen = new Set();
  const result = [];

  for (const sensor of sensors) {
    const entityId = sensor && (sensor.entity || sensor.entity_id);
    if (!entityId || seen.has(entityId)) continue;
    seen.add(entityId);
    result.push(entityId);
  }

  return result;
}

/**
 * Timestamp of an HA history entry in milliseconds.
 *
 * Compact history normally uses lu/lc as Unix seconds. The long field
 * names are accepted too, so non-compact test or API data also works.
 */
export function historyTimestampMs(state) {
  if (!state) return NaN;

  const raw =
    state.lu ??
    state.lc ??
    state.last_updated ??
    state.last_changed;

  if (raw == null) return NaN;

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return NaN;
    return Math.abs(raw) < 1e12 ? raw * 1000 : raw;
  }

  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return NaN;

    const numeric = Number(text);
    if (Number.isFinite(numeric)) {
      return Math.abs(numeric) < 1e12 ? numeric * 1000 : numeric;
    }

    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  return NaN;
}

/** Numeric state of a history entry. */
export function historyNumericValue(state) {
  if (!state) return NaN;

  const raw = state.s ?? state.state;
  if (raw == null) return NaN;

  const text = String(raw).trim();
  if (!text) return NaN;

  const value = Number(text);
  return Number.isFinite(value) ? value : NaN;
}

/**
 * Convert HA history into a small, sorted format.
 *
 * Result:
 * {
 *   "sensor.room_temperature": [
 *     { time: 1234567890000, value: 21.4 },
 *     ...
 *   ]
 * }
 */
export function normalizeHistory(rawHistory = {}) {
  const result = {};

  for (const [entityId, states] of Object.entries(rawHistory || {})) {
    if (!Array.isArray(states)) {
      result[entityId] = [];
      continue;
    }

    result[entityId] = states
      .map((state) => ({
        time: historyTimestampMs(state),
        value: historyNumericValue(state),
      }))
      .filter((point) => Number.isFinite(point.time))
      .sort((a, b) => a.time - b.time);
  }

  return result;
}

/**
 * Last known state at or before the requested time.
 *
 * Deliberately does NOT interpolate between readings.
 */
export function historyValueAt(history, entityId, targetTime) {
  const series = history && history[entityId];
  if (!Array.isArray(series) || !series.length) return NaN;

  const target =
    targetTime instanceof Date
      ? targetTime.getTime()
      : Number(targetTime);

  if (!Number.isFinite(target)) return NaN;

  let lo = 0;
  let hi = series.length - 1;
  let found = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;

    if (series[mid].time <= target) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return found >= 0 ? series[found].value : NaN;
}

/**
 * Historical values in exactly the same order as floorplan.sensors.
 *
 * Several points may share one entity; they then get the same
 * historical value, as expected.
 */
export function sensorValuesAt(history, sensors = [], targetTime) {
  return sensors.map((sensor) => {
    const entityId = sensor && (sensor.entity || sensor.entity_id);
    return entityId
      ? historyValueAt(history, entityId, targetTime)
      : NaN;
  });
}

/**
 * Derive sunrises and sunsets from the history of sun.sun.
 *
 * An event is only produced by an actual state change:
 *   below_horizon -> above_horizon = sunrise
 *   above_horizon -> below_horizon = sunset
 *
 * The first known state only serves as the baseline and is not itself
 * counted as an event. This keeps the initial state that Home Assistant
 * includes at the start of a history period from producing a bogus event.
 */
export function extractSunEvents(
  rawHistory = {},
  startTime = -Infinity,
  endTime = Infinity,
  entityId = 'sun.sun'
) {
  const states =
    rawHistory && Array.isArray(rawHistory[entityId])
      ? rawHistory[entityId]
      : [];

  const start =
    startTime instanceof Date ? startTime.getTime() : Number(startTime);
  const end =
    endTime instanceof Date ? endTime.getTime() : Number(endTime);

  const startMs = Number.isFinite(start) ? start : -Infinity;
  const endMs = Number.isFinite(end) ? end : Infinity;

  const points = states
    .map((state) => {
      const value =
        state && typeof state.s === 'string'
          ? state.s
          : state && typeof state.state === 'string'
            ? state.state
            : null;

      return {
        time: historyTimestampMs(state),
        value,
      };
    })
    .filter(
      (point) =>
        Number.isFinite(point.time) &&
        (point.value === 'above_horizon' ||
          point.value === 'below_horizon')
    )
    .sort((a, b) => a.time - b.time);

  const events = [];
  let previousState = null;

  for (const point of points) {
    if (
      previousState != null &&
      point.value !== previousState &&
      point.time >= startMs &&
      point.time <= endMs
    ) {
      events.push({
        type:
          point.value === 'above_horizon'
            ? 'sunrise'
            : 'sunset',
        time: point.time,
      });
    }

    previousState = point.value;
  }

  return events;
}

/**
 * Load historical states directly via Home Assistant's WebSocket API.
 */
export function fetchHistory(hass, startTime, endTime, entityIds = []) {
  if (!hass || typeof hass.callWS !== 'function') {
    return Promise.reject(new Error('Home Assistant WebSocket API unavailable'));
  }

  const start = startTime instanceof Date ? startTime : new Date(startTime);
  const end = endTime instanceof Date ? endTime : new Date(endTime);

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return Promise.reject(new Error('Invalid history time range'));
  }

  const ids = [...new Set((entityIds || []).filter(Boolean))];

  const request = {
    type: 'history/history_during_period',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    minimal_response: true,
    no_attributes: true,
  };

  if (ids.length) request.entity_ids = ids;

  return hass.callWS(request);
}