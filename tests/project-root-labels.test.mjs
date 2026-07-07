import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProjectRootLabelMap,
  buildProjectRootLabels,
  formatProjectRootLabels,
  inferProjectRootLabel
} from '../extension/src/project-root-labels.js';

const memory = {
  available: true,
  selectedRoot: 'C:/Users/noahr/Desktop/ChatGPT_Projekte/01_Aktive_Projekte/Projekt_024_UltimateBridge',
  roots: [
    'C:/Users/noahr/Desktop/ChatGPT_Projekte/01_Aktive_Projekte/Projekt_024_UltimateBridge',
    'C:/Users/noahr/Desktop/ChatGPT_Projekte/01_Aktive_Projekte/Projekt_002_TradingBot',
    'C:/Users/noahr/Desktop/ChatGPT_Projekte/01_Aktive_Projekte/Projekt_008_AutoBridge_5_Core'
  ]
};

test('inferProjectRootLabel recognizes project roots and known names', () => {
  assert.equal(inferProjectRootLabel(memory.roots[0]), 'P024 UltimateBridge');
  assert.equal(inferProjectRootLabel(memory.roots[1]), 'P002 TradingBot');
  assert.equal(inferProjectRootLabel(memory.roots[2]), 'P008 AutoBridge 5 Core');
  assert.equal(inferProjectRootLabel('C:/tmp/ultimatebridge-root-memory-test'), 'UltimateBridge');
});

test('buildProjectRootLabels builds readable inferred labels', () => {
  const labels = buildProjectRootLabels(memory);
  assert.equal(labels.available, true);
  assert.equal(labels.itemCount, 3);
  assert.equal(labels.selectedLabel, 'P024 UltimateBridge');
  assert.equal(labels.items[0].isSelected, true);
  assert.equal(labels.items[0].source, 'inferred');
});

test('buildProjectRootLabels supports custom labels', () => {
  const labels = buildProjectRootLabels(memory, {
    [memory.roots[1]]: 'Trading Lab'
  });
  assert.equal(labels.items[1].label, 'Trading Lab');
  assert.equal(labels.items[1].source, 'custom');
});

test('formatProjectRootLabels is readable', () => {
  const labels = buildProjectRootLabels(memory);
  const text = formatProjectRootLabels(labels);
  assert.match(text, /ULTIMATEBRIDGE PROJECT ROOT LABELS/);
  assert.match(text, /selectedLabel=P024 UltimateBridge/);
  assert.match(text, /root\[0\] label=P024 UltimateBridge/);
  assert.match(text, /path=C:\/Users\/noahr/);
});

test('buildProjectRootLabelMap returns copyable root to label mapping', () => {
  const labels = buildProjectRootLabels(memory);
  const map = buildProjectRootLabelMap(labels);
  assert.equal(map[memory.roots[0]], 'P024 UltimateBridge');
  assert.equal(map[memory.roots[1]], 'P002 TradingBot');
});
