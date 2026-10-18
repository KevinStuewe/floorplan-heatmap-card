/* ------------------------------------------------------------------ *
 * card.js — the Lovelace card itself.
 *
 * Layers from bottom to top:
 *   1. optional background image (reference floor plan, dimmed)
 *   2. temperature field, clipped to the room polygons
 *   3. isotherms
 *   4. walls, doors, windows, room names
 *   5. sensor chips as real DOM — hence readable, hoverable and
 *      clickable (opens the entity's more-info dialog)
 * ------------------------------------------------------------------ */

import { normalizeConfig, isEmptyFloorplan, floorplanBounds, DEFAULTS } from './model.js';
import { HeatField } from './solver.js';
import { computeIsotherms } from './isotherms.js';
import { computeView, roomsPath, renderField, renderIsotherms, renderFloorplan, heatmapBuffer } from './renderer.js';
import { createProjection, projectedAspect, clampPitch, DEG } from './projection.js';
import { renderScene } from './scene3d.js';
import { paletteGradientCss, paletteColorCss, readableTextOn, paletteLUT } from './palette.js';
import { clamp } from './geometry.js';
import { t, detectLanguage, detectLanguageFallback } from './i18n.js';
import {
  uniqueHistoryEntityIds,
  normalizeHistory,
  sensorValuesAt,
  extractSunEvents,
  fetchHistory,
} from './history.js';

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
    pointer-events: none;
  }
  .chip .pill {
    position: absolute;
    left: 0;
    bottom: 100%;
    margin-bottom: 2px;
    transform: translate(-50%, 0);
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
    pointer-events: auto;
    cursor: pointer;
  }
  .chip .pill .name { font-weight: 500; opacity: 0.75; }
  .chip .pill .value { font-variant-numeric: tabular-nums; }
  .chip:hover .pill { transform: translate(-50%, -1px) scale(1.04); }
  .chip .dot {
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(-50%, -50%);
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.9);
    box-shadow: 0 0 0 1px rgba(0,0,0,0.35);
    pointer-events: auto;
    cursor: pointer;
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
  .timeline {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px 14px;
    font-size: 11px;
    color: var(--secondary-text-color);
    font-variant-numeric: tabular-nums;
  }
  .timeline[hidden] {
    display: none !important;
  }
  .timeline .time {
    min-width: 128px;
    color: var(--primary-text-color);
    font-weight: 600;
    white-space: nowrap;
  }
  .timeline.compact {
    gap: 7px;
    padding-left: 12px;
    padding-right: 12px;
  }
  .timeline.compact .time {
    min-width: 72px;
  }
  .timeline .timeline-track {
    position: relative;
    flex: 1;
    min-width: 80px;
    height: 30px;
    display: flex;
    align-items: center;
  }
  .timeline input[type=range] {
    position: relative;
    z-index: 2;
    width: 100%;
    min-width: 0;
    margin: 0;
    accent-color: var(--primary-color);
    cursor: pointer;
  }
  .timeline input[type=range]:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .timeline .sun-markers {
    position: absolute;
    z-index: 3;
    left: 10px;
    right: 10px;
    top: 50%;
    height: 18px;
    transform: translateY(-50%);
    pointer-events: none;
  }
  .timeline .sun-marker {
    position: absolute;
    left: 0;
    top: 50%;
    width: 2px;
    height: 14px;
    border-radius: 999px;
    background: var(--warning-color, #f9a825);
    opacity: 0.9;
    transform: translate(-1px, -50%);
    pointer-events: auto;
    cursor: help;
  }
  .timeline .sun-marker::after {
    content: "";
    position: absolute;
    left: 50%;
    width: 6px;
    height: 6px;
    border: 2px solid var(--card-background-color, var(--ha-card-background, #111));
    border-radius: 50%;
    background: inherit;
    transform: translateX(-50%);
  }
  .timeline .sun-marker.sunrise::after {
    top: -4px;
  }
  .timeline .sun-marker.sunset::after {
    bottom: -4px;
  }
  .timeline .play,
  .timeline .speed,
  .timeline .live {
    box-sizing: border-box;
    height: 30px;
    border: 1px solid var(--divider-color, rgba(127,140,158,.35));
    border-radius: 999px;
    padding: 0 10px;
    background: transparent;
    color: var(--primary-text-color);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .timeline .play {
    width: 36px;
    padding: 0;
  }
  .timeline .speed {
    min-width: 42px;
    padding: 0 8px;
  }
  .timeline .live {
    min-width: 46px;
  }
  .timeline .range-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    color: var(--primary-text-color);
  }
  .timeline .range {
    box-sizing: border-box;
    height: 30px;
    min-width: 64px;
    appearance: none;
    -webkit-appearance: none;
    border: 1px solid var(--divider-color, rgba(127,140,158,.35));
    border-radius: 999px;
    padding: 0 24px 0 10px;
    background: transparent;
    color: var(--primary-text-color);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .timeline .range-wrap::after {
    content: "";
    position: absolute;
    right: 10px;
    top: 50%;
    width: 6px;
    height: 6px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    opacity: 0.7;
    pointer-events: none;
    transform: translateY(-65%) rotate(45deg);
  }
  .timeline .range:hover:not(:disabled) {
    background: var(--secondary-background-color, rgba(127,140,158,.12));
  }
  .timeline .range:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  .timeline .range option {
    color: var(--primary-text-color);
    background: var(--card-background-color, var(--ha-card-background, #fff));
  }
  .timeline button:hover:not(:disabled) {
    background: var(--secondary-background-color, rgba(127,140,158,.12));
  }
  .timeline button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  .timeline .play-icon {
    position: relative;
    display: block;
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    color: currentColor;
  }
  .timeline .play-icon::before,
  .timeline .play-icon::after {
    content: "";
    position: absolute;
  }
  .timeline .play:not(.playing) .play-icon::before {
    left: 4px;
    top: 2px;
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-left: 10px solid currentColor;
  }
  .timeline .play:not(.playing) .play-icon::after {
    display: none;
  }
  .timeline .play.playing .play-icon::before,
  .timeline .play.playing .play-icon::after {
    top: 2px;
    width: 4px;
    height: 12px;
    border-radius: 1px;
    background: currentColor;
  }
  .timeline .play.playing .play-icon::before {
    left: 3px;
  }
  .timeline .play.playing .play-icon::after {
    right: 3px;
  }
  .timeline.compact .speed {
    min-width: 38px;
    padding: 0 6px;
  }
  .timeline.compact .range {
    min-width: 58px;
    padding-left: 8px;
    padding-right: 22px;
  }
  .timeline .play:disabled,
  .timeline .speed:disabled,
  .timeline .live:disabled {
    opacity: 0.45;
    cursor: default;
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
  .empty[hidden] { display: none !important; }
  .empty .big { font-size: 26px; opacity: 0.65; }
`;

/** Leaves paths in floor-plan coordinates — for the 2.5D floor plane. */
const IDENTITY_VIEW = { toX: (x) => x, toY: (y) => y, scale: 1 };

export class FloorplanHeatmapCard extends HTMLElement {
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

    this._history = null;
    this._historyLoading = false;
    this._historyError = '';
    this._historyStart = 0;
    this._historyEnd = 0;
    this._historyStepMs = 0;
    this._historyFrames = 0;
    this._selectedHistoryTime = null;
    this._historyRequestToken = 0;
    this._playTimer = 0;
    this._playbackSpeed = 1;
    this._historyRangeKey = '24h';
    this._sunEvents = [];
    this._sunMarkerSignature = '';
  }

  setConfig(config) {
    this._rawConfig = config;
    this._config = normalizeConfig(config);
    this._field = null;
    this._fieldSignature = '';
    this._lastValues = null;
    this._buffer = null;

    if (this._playTimer) {
      clearTimeout(this._playTimer);
      this._playTimer = 0;
    }

    // A changed config may use different sensors or a different range,
    // which invalidates any history request still in flight.
    this._historyRequestToken += 1;
    this._history = null;
    this._historyLoading = false;
    this._historyError = '';
    this._historyStart = 0;
    this._historyEnd = 0;
    this._historyStepMs = 0;
    this._historyFrames = 0;
    this._selectedHistoryTime = null;
    this._historyRangeKey = this._initialHistoryRangeKey(this._config);
    this._sunEvents = [];
    this._sunMarkerSignature = '';

    // The view angle from the config is the starting point.
    // If the viewer then rotates the model, that remains purely a
    // viewing choice and is deliberately not written back to the config.
    this._angles = { yaw: this._config.yaw, pitch: clampPitch(this._config.pitch) };
    this._anglesTouched = false;
    this._build();
    this._update(true);
  }

  set hass(hass) {
    this._hass = hass;
    this._applyStaticText();
    this._updateTimelineUi();
    this._update(false);

    if (this._config && this._config.show_timeline) {
      this._ensureHistory();
    }
  }

  /** Language from hass.language — browser fallback before the first hass update. */
  _lang() {
    return detectLanguage(this._hass);
  }

  getCardSize() {
    return this._config && !isEmptyFloorplan(this._config.floorplan) ? 8 : 3;
  }

  connectedCallback() {
    if (!this._resizeObserver && this._stage) {
      this._resizeObserver = new ResizeObserver(() => {
        this._scheduleRender();
        this._updateTimelineUi();
      });
      this._resizeObserver.observe(this._stage);
    }
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    if (this._playTimer) {
      clearTimeout(this._playTimer);
      this._playTimer = 0;
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
        <div class="timeline" hidden>
          <button class="play" type="button">
            <span class="play-icon" aria-hidden="true"></span>
          </button>
          <button class="speed" type="button">1&times;</button>
          <label class="range-wrap">
            <select class="range">
              <option value="today"></option>
              <option value="24h"></option>
              <option value="48h"></option>
              <option value="7d"></option>
            </select>
          </label>
          <span class="time"></span>
          <div class="timeline-track">
            <div class="sun-markers"></div>
            <input class="timeline-slider" type="range" min="0" max="1" step="1" value="1">
          </div>
          <button class="live" type="button"></button>
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
    this._timeline = this.shadowRoot.querySelector('.timeline');
    this._timelinePlay = this.shadowRoot.querySelector('.timeline .play');
    this._timelineSpeed = this.shadowRoot.querySelector('.timeline .speed');
    this._timelineRange = this.shadowRoot.querySelector('.timeline .range');
    this._timelineTime = this.shadowRoot.querySelector('.timeline .time');
    this._timelineSunMarkers = this.shadowRoot.querySelector('.timeline .sun-markers');
    this._timelineSlider = this.shadowRoot.querySelector('.timeline-slider');
    this._timelineLive = this.shadowRoot.querySelector('.timeline .live');
    this._empty = this.shadowRoot.querySelector('.empty');
    this._emptyText = this.shadowRoot.querySelector('.empty-text');
    this._resetBtn = this.shadowRoot.querySelector('.reset');

    const header = this.shadowRoot.querySelector('.header');
    header.hidden = !cfg.title;
    this._titleEl.textContent = cfg.title || '';
    this._legend.hidden = !cfg.show_legend;
    this._timeline.hidden = !cfg.show_timeline;

    if (this._historyRangeKey === 'config') {
      const option = document.createElement('option');
      option.value = 'config';
      option.textContent = this._formatHistoryHours(cfg.history_hours);
      this._timelineRange.prepend(option);
    }
    this._timelineRange.value = this._historyRangeKey;

    this._timelinePlay.addEventListener('click', () => {
      this._togglePlayback();
    });

    this._timelineSpeed.addEventListener('click', () => {
      this._cyclePlaybackSpeed();
    });

    this._timelineRange.addEventListener('change', (event) => {
      this._setHistoryRange(event.target.value);
    });

    this._timelineSlider.addEventListener('input', (event) => {
      this._onTimelineInput(event);
    });

    this._timelineLive.addEventListener('click', () => {
      this._setLive();
    });

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
    this._resizeObserver = new ResizeObserver(() => {
      this._scheduleRender();
      this._updateTimelineUi();
    });
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
    this._updateTimelineUi();

    if (cfg.show_timeline && this._hass) {
      this._ensureHistory();
    }
  }

  /** Refreshes the language-dependent, statically built texts — also
   *  called when hass arrives only after _build(). */
  _applyStaticText() {
    if (!this._resetBtn) return;
    const lang = this._lang();

    this._resetBtn.title = t(lang, 'card.resetViewTitle');
    this._resetBtn.textContent = `↺ ${t(lang, 'card.resetViewLabel')}`;
    this._emptyText.innerHTML =
      `${t(lang, 'card.emptyLine1')}<br>` +
      `${t(lang, 'card.emptyLine2', { button: `<b>${t(lang, 'planEditor.title')}</b>` })}`;

    if (!this._timeline) return;

    const playing = Boolean(this._playTimer);
    const playLabel = t(
      lang,
      playing ? 'timeline.pause' : 'timeline.play'
    );

    this._timelinePlay.title = playLabel;
    this._timelinePlay.setAttribute('aria-label', playLabel);

    this._timelineSpeed.title = t(lang, 'timeline.playbackSpeed');

    const rangeLabel = t(lang, 'timeline.historyRange');
    const rangeWrap = this._timelineRange.closest('.range-wrap');
    if (rangeWrap) rangeWrap.title = rangeLabel;
    this._timelineRange.setAttribute('aria-label', rangeLabel);

    const rangeLabels = {
      today: t(lang, 'timeline.today'),
      '24h': t(lang, 'timeline.range24h'),
      '48h': t(lang, 'timeline.range48h'),
      '7d': t(lang, 'timeline.range7d'),
    };

    for (const option of this._timelineRange.options) {
      if (rangeLabels[option.value]) {
        option.textContent = rangeLabels[option.value];
      }
    }

    const liveLabel = t(lang, 'timeline.live');
    this._timelineLive.textContent = liveLabel;
    this._timelineLive.title = liveLabel;
    this._timelineLive.setAttribute('aria-label', liveLabel);
  }

  /** Readings in sensor order — live or at the selected point in time. */
  _readValues() {
    const sensors = this._config.floorplan.sensors;

    if (this._selectedHistoryTime != null && this._history) {
      return sensorValuesAt(
        this._history,
        sensors,
        this._selectedHistoryTime
      );
    }

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
    this._timeline.hidden = empty || !cfg.show_timeline;
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
    this._buffer = null; // recolor the color buffer as soon as values change
    this._isotherms =
      this._hasField && cfg.show_isotherms ? computeIsotherms(this._field, cfg.isotherm_step) : [];
    this._scheduleRender();
  }

  _initialHistoryRangeKey(config) {
    const hours = Number(config && config.history_hours);

    if (hours === 24) return '24h';
    if (hours === 48) return '48h';
    if (hours === 168) return '7d';

    return 'config';
  }

  _formatHistoryHours(hours) {
    const value = Number(hours);
    if (!Number.isFinite(value)) {
      return t(this._lang(), 'timeline.custom');
    }
    return `${Number.isInteger(value) ? value : value.toFixed(1)}h`;
  }

  _historyRangeSpec(key) {
    const cfg = this._config;
    const configuredHours = Number(cfg.history_hours);
    const configuredStep = Number(cfg.history_step_minutes);

    if (key === 'today') {
      return {
        mode: 'today',
        stepMinutes: 15,
      };
    }

    if (key === '48h') {
      return {
        mode: 'rolling',
        hours: 48,
        stepMinutes: configuredHours === 48 ? configuredStep : 30,
      };
    }

    if (key === '7d') {
      return {
        mode: 'rolling',
        hours: 168,
        stepMinutes: configuredHours === 168 ? configuredStep : 60,
      };
    }

    if (key === 'config') {
      return {
        mode: 'rolling',
        hours: configuredHours,
        stepMinutes: configuredStep,
      };
    }

    return {
      mode: 'rolling',
      hours: 24,
      stepMinutes: configuredHours === 24 ? configuredStep : 15,
    };
  }

  _setHistoryRange(key) {
    if (!this._config || key === this._historyRangeKey) return;

    this._stopPlayback();

    // Invalidate any fetch that is still in flight before starting the
    // newly selected range.
    this._historyRequestToken += 1;
    this._historyRangeKey = key;
    this._history = null;
    this._historyLoading = false;
    this._historyError = '';
    this._historyStart = 0;
    this._historyEnd = 0;
    this._historyStepMs = 0;
    this._historyFrames = 0;
    this._selectedHistoryTime = null;
    this._sunEvents = [];
    this._sunMarkerSignature = '';

    this._updateTimelineUi();
    this._update(true);

    if (this._hass) {
      this._ensureHistory();
    }
  }

  _renderSunMarkers() {
    if (!this._timelineSunMarkers) return;

    const span = this._historyEnd - this._historyStart;
    const signature =
      `${this._historyStart}:${this._historyEnd}:` +
      this._sunEvents.map((event) => `${event.type}:${event.time}`).join(',');

    if (signature === this._sunMarkerSignature) return;
    this._sunMarkerSignature = signature;

    this._timelineSunMarkers.replaceChildren();

    if (!(span > 0) || !this._sunEvents.length) return;

    for (const event of this._sunEvents) {
      const ratio =
        (event.time - this._historyStart) / span;

      if (ratio < 0 || ratio > 1) continue;

      const marker = document.createElement('span');
      marker.className = `sun-marker ${event.type}`;
      marker.style.left = `${ratio * 100}%`;

      const label =
        event.type === 'sunrise'
          ? t(this._lang(), 'timeline.sunrise')
          : t(this._lang(), 'timeline.sunset');

      marker.title =
        `${label} · ${this._formatTimelineTooltip(event.time)}`;
      marker.setAttribute(
        'aria-label',
        `${label}, ${this._formatTimelineTooltip(event.time)}`
      );

      this._timelineSunMarkers.appendChild(marker);
    }
  }

  async _ensureHistory() {
    const cfg = this._config;

    if (
      !cfg ||
      !cfg.show_timeline ||
      !this._hass ||
      this._history ||
      this._historyLoading ||
      this._historyError
    ) {
      return;
    }

    const entityIds = uniqueHistoryEntityIds(cfg.floorplan.sensors);

    if (!entityIds.length) {
      this._historyError =
        t(this._lang(), 'timeline.noSensors');
      this._updateTimelineUi();
      return;
    }

    const range = this._historyRangeSpec(this._historyRangeKey);
    const stepMinutes = Math.max(1, Number(range.stepMinutes) || 15);
    const stepMs = stepMinutes * 60 * 1000;
    const endMs = Date.now();

    let startMs;

    if (range.mode === 'today') {
      const start = new Date(endMs);
      start.setHours(0, 0, 0, 0);
      startMs = start.getTime();
    } else {
      const hours = Math.max(1, Number(range.hours) || 24);
      startMs = endMs - hours * 60 * 60 * 1000;
    }

    const frames = Math.max(
      1,
      Math.ceil((endMs - startMs) / stepMs)
    );

    this._historyStepMs = stepMs;
    this._historyFrames = frames;
    this._historyStart = startMs;
    this._historyEnd = endMs;
    this._historyLoading = true;
    this._historyError = '';

    const token = ++this._historyRequestToken;
    const historyEntityIds = [...entityIds];

    if (
      this._hass.states &&
      this._hass.states['sun.sun'] &&
      !historyEntityIds.includes('sun.sun')
    ) {
      historyEntityIds.push('sun.sun');
    }

    this._updateTimelineUi();

    try {
      const raw = await fetchHistory(
        this._hass,
        new Date(startMs),
        new Date(endMs),
        historyEntityIds
      );

      if (token !== this._historyRequestToken) return;

      this._history = normalizeHistory(raw);
      this._sunEvents = extractSunEvents(
        raw,
        startMs,
        endMs
      );
      this._sunMarkerSignature = '';
    } catch (error) {
      if (token !== this._historyRequestToken) return;

      this._historyError =
        error && error.message
          ? error.message
          : String(
              error ||
              t(this._lang(), 'timeline.unavailable')
            );
    } finally {
      if (token !== this._historyRequestToken) return;

      this._historyLoading = false;
      this._updateTimelineUi();
    }
  }

  _onTimelineInput(event) {
    this._stopPlayback();

    if (!this._history || !this._historyFrames) return;

    const index = Math.max(
      0,
      Math.min(
        this._historyFrames,
        Math.round(Number(event.target.value) || 0)
      )
    );

    // The far right position always means true live mode.
    if (index >= this._historyFrames) {
      this._setLive();
      return;
    }

    this._selectedHistoryTime =
      this._historyStart + index * this._historyStepMs;

    this._updateTimelineUi();
    this._update(true);
  }

  _cyclePlaybackSpeed() {
    const speeds = [0.5, 1, 2, 4];
    const current = speeds.indexOf(this._playbackSpeed);
    this._playbackSpeed = speeds[(current + 1) % speeds.length];
    this._updateTimelineUi();
  }

  _playbackDelay() {
    return 350 / this._playbackSpeed;
  }

  _togglePlayback() {
    if (this._playTimer) {
      this._stopPlayback();
      return;
    }

    if (!this._history || !this._historyFrames) return;

    let index;

    if (this._selectedHistoryTime == null) {
      // Start at the beginning when Play is pressed from LIVE.
      index = 0;
    } else {
      index = Math.round(
        (this._selectedHistoryTime - this._historyStart) /
          this._historyStepMs
      );

      // Continue with the next frame instead of replaying
      // the frame already shown.
      index += 1;

      if (index >= this._historyFrames) index = 0;
    }

    const advance = () => {
      if (!this._history || index >= this._historyFrames) {
        this._stopPlayback();
        this._setLive();
        return;
      }

      this._selectedHistoryTime =
        this._historyStart + index * this._historyStepMs;

      this._updateTimelineUi();
      this._update(true);

      index += 1;

      // 350 ms per historical frame at 1x speed.
      this._playTimer = setTimeout(
        advance,
        this._playbackDelay()
      );
    };

    // Non-zero marker tells the UI that playback is active.
    this._playTimer = -1;
    this._updateTimelineUi();
    advance();
  }

  _stopPlayback() {
    if (this._playTimer > 0) {
      clearTimeout(this._playTimer);
    }

    this._playTimer = 0;

    if (this._timelinePlay) {
      const playLabel =
        t(this._lang(), 'timeline.play');

      this._timelinePlay.classList.remove('playing');
      this._timelinePlay.title = playLabel;
      this._timelinePlay.setAttribute('aria-label', playLabel);
    }
  }

  _setLive() {
    this._stopPlayback();
    this._selectedHistoryTime = null;
    this._updateTimelineUi();
    this._update(true);
  }

  _formatTimelineTime(time, compact = false) {
    const language =
      this._hass && this._hass.language
        ? this._hass.language
        : undefined;
    const date = new Date(time);

    const timeText = new Intl.DateTimeFormat(language, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

    if (compact) {
      const weekday = new Intl.DateTimeFormat(language, {
        weekday: 'short',
      }).format(date);

      return `${weekday} ${timeText}`;
    }

    const dateText = new Intl.DateTimeFormat(language, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
      .format(date)
      .replace(/,/g, '');

    return `${dateText} \u00B7 ${timeText}`;
  }

  _formatTimelineTooltip(time) {
    const language =
      this._hass && this._hass.language
        ? this._hass.language
        : undefined;

    return new Intl.DateTimeFormat(language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(time));
  }

  _updateTimelineUi() {
    if (!this._timeline || !this._config) return;

    const visible =
      this._config.show_timeline &&
      this._stage &&
      !this._stage.hidden;

    this._timeline.hidden = !visible;

    if (!visible) return;

    const timelineWidth = this._timeline.getBoundingClientRect().width;
    const compact = timelineWidth > 0 && timelineWidth < 560;
    this._timeline.classList.toggle('compact', compact);

    this._timeline.title = this._historyError || '';
    this._timelineRange.value = this._historyRangeKey;
    this._renderSunMarkers();

    if (this._historyLoading) {
      this._timelineTime.textContent =
        t(this._lang(), 'timeline.loading');
      this._timelineTime.title = '';
      this._timelinePlay.disabled = true;
      this._timelineSpeed.disabled = true;
      this._timelineSlider.disabled = true;
      this._timelineLive.disabled = true;
      return;
    }

    if (this._historyError) {
      this._timelineTime.textContent =
        t(this._lang(), 'timeline.unavailable');
      this._timelineTime.title = '';
      this._timelinePlay.disabled = true;
      this._timelineSpeed.disabled = true;
      this._timelineSlider.disabled = true;
      this._timelineLive.disabled = true;
      return;
    }

    if (!this._history || !this._historyFrames) {
      this._timelineTime.textContent =
        t(this._lang(), 'timeline.live');
      this._timelineTime.title = '';
      this._timelinePlay.disabled = true;
      this._timelineSpeed.disabled = true;
      this._timelineSlider.disabled = true;
      this._timelineLive.disabled = true;
      return;
    }

    this._timelinePlay.disabled = false;
    this._timelineSpeed.disabled = false;

    const playing = Boolean(this._playTimer);
    const playLabel =
      t(
        this._lang(),
        playing ? 'timeline.pause' : 'timeline.play'
      );

    this._timelinePlay.classList.toggle('playing', playing);
    this._timelinePlay.title = playLabel;
    this._timelinePlay.setAttribute('aria-label', playLabel);

    this._timelineSpeed.textContent =
      `${this._playbackSpeed}\u00D7`;

    this._timelineSlider.disabled = false;
    this._timelineSlider.min = '0';
    this._timelineSlider.max = String(this._historyFrames);
    this._timelineSlider.step = '1';

    const live = this._selectedHistoryTime == null;

    if (live) {
      this._timelineSlider.value = String(this._historyFrames);
      this._timelineTime.textContent =
        t(this._lang(), 'timeline.live');
      this._timelineTime.title = '';
    } else {
      const index = Math.max(
        0,
        Math.min(
          this._historyFrames - 1,
          Math.round(
            (this._selectedHistoryTime - this._historyStart) /
              this._historyStepMs
          )
        )
      );

      this._timelineSlider.value = String(index);
      this._timelineTime.textContent =
        this._formatTimelineTime(this._selectedHistoryTime, compact);
      this._timelineTime.title =
        this._formatTimelineTooltip(this._selectedHistoryTime);
    }

    this._timelineLive.disabled = live;
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
    // A resize can reach us before the first solve run.
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

    // The colored buffer depends only on field, palette and scale — none
    // of that changes on rotation, so it gets reused.
    if (this._hasField && !this._buffer) {
      this._buffer = heatmapBuffer(document, this._field, {
        palette: cfg.palette,
        paletteStops: cfg.palette_stops,
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

  /** Classic top-down view. */
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
        paletteStops: cfg.palette_stops,
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

  /** 2.5D view with raised walls. */
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
    // The hover value always refers to the floor plane — you read the
    // temperature at the foot point under the pointer, not on the wall.
    this._sampleAt = (px, py) => projection.unprojectFloor(px, py);

    // The clip path is built here in floor-plan coordinates because the
    // floor matrix transforms it during drawing anyway.
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
        // Deliberately read via this._config: the chip outlives config
        // changes, the sensor list from back then does not.
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
      const bg = known
        ? paletteColorCss(cfg.palette, ratio, cfg.palette_stops)
        : 'rgba(120,130,145,0.85)';
      const fg = known
        ? readableTextOn(cfg.palette, ratio, cfg.palette_stops)
        : '#fff';

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
    bar.style.background = paletteGradientCss(cfg.palette, '90deg', cfg.palette_stops);
    this._legend.querySelector('.lo').textContent = `${this._range.min.toFixed(1)} ${unit}`;
    this._legend.querySelector('.hi').textContent = `${this._range.max.toFixed(1)} ${unit}`;

    // Markers for the actual readings on the scale.
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
    // Chips should stay clickable and not trigger a rotation.
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
    const lut = paletteLUT(
      this._config.palette,
      this._config.palette_stops
    );
    const l = Math.round(ratio * 255) * 4;
    this._tooltip.style.left = `${px}px`;
    this._tooltip.style.top = `${py}px`;
    this._tooltip.style.background = `rgba(${lut[l]},${lut[l + 1]},${lut[l + 2]},0.95)`;
    this._tooltip.style.color = readableTextOn(
      this._config.palette,
      ratio,
      this._config.palette_stops
    );
    this._tooltip.textContent = `${value.toFixed(1)} ${this._detectUnit()}`;
    this._tooltip.classList.add('show');
  }
}
