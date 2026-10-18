import test from 'node:test';
import assert from 'node:assert/strict';

import { t } from '../src/i18n.js';

const TIMELINE_KEYS = [
  'timeline.live',
  'timeline.play',
  'timeline.pause',
  'timeline.playbackSpeed',
  'timeline.historyRange',
  'timeline.today',
  'timeline.range24h',
  'timeline.range48h',
  'timeline.range7d',
  'timeline.custom',
  'timeline.loading',
  'timeline.unavailable',
  'timeline.noSensors',
  'timeline.sunrise',
  'timeline.sunset',
  'editor.sectionTimeline',
  'editor.showTimeline',
  'editor.historyHours',
  'editor.historyStepMinutes',
  'editor.timelineNote',
  'editor.historyStepNote',
];

test('timeline strings exist in English and German', () => {
  for (const key of TIMELINE_KEYS) {
    assert.notEqual(t('en', key), key, `missing English translation for ${key}`);
    assert.notEqual(t('de', key), key, `missing German translation for ${key}`);
  }
});

test('timeline strings use English fallback for unsupported languages', () => {
  assert.equal(t('fr', 'timeline.play'), 'Play');
  assert.equal(t('fr', 'timeline.today'), 'Today');
});
