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

import { normalizeConfig, isEmptyFloorplan, floorplanBounds, DEFAULTS } from './model.js';
import { HeatField } from './solver.js';
import { computeIsotherms } from './isotherms.js';
import { computeView, roomsPath, renderField, renderIsotherms, renderFloorplan, heatmapBuffer } from './renderer.js';
import { createProjection, projectedAspect, clampPitch, DEG } from './projection.js';
import { renderScene } from './scene3d.js';
import { paletteGradientCss, paletteColorCss, readableTextOn, paletteLUT } from './palette.js';
import { clamp } from './geometry.js';
import { t, detectLanguage, detectLanguageFallback } from './i18n.js';

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
