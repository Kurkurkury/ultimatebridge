import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildProjectRootMemory } from '../extension/src/project-root-memory.js';
import {
  buildProjectRootLabelMap,
  buildProjectRootLabels,
  formatProjectRootLabels,
  inferProjectRootLabel
} from '../extension/src/project-root-labels.js';

const root = path.join(os.tmpdir(), 'Projekt_024_UltimateBridge');
const secondRoot = path.join(os.tmpdir(), 'Projekt_002_TradingBot');
const memory = buildProjectRootMemory([], [root, secondRoot]);
const labels = buildProjectRootLabels(memory, { [secondRoot]: 'Trading Lab' });
const labelText = formatProjectRootLabels(labels);
const labelMap = buildProjectRootLabelMap(labels);

const popupHtml = await fs.readFile('extension/src/popup/popup.html', 'utf8');
const popupJs = await fs.readFile('extension/src/popup/popup.js', 'utf8');

const result = {
  memory,
  labels,
  labelText,
  labelMap,
  inferredRoot: inferProjectRootLabel(root),
  staticChecks: {
    popupHasProjectRootLabelsSection: popupHtml.includes('project-root-labels'),
    popupHasShowLabelsButton: popupHtml.includes('show-project-root-labels'),
    popupHasCopyLabelMapButton: popupHtml.includes('copy-project-root-label-map'),
    popupImportsProjectRootLabels: popupJs.includes('formatProjectRootLabels'),
    popupStoresProjectRootLabels: popupJs.includes('ultimatebridgeProjectRootLabels'),
    popupUpdatesLabelsWithMemory: popupJs.includes('updateProjectRootLabels(memory)'),
    popupCopiesLabelMap: popupJs.includes('buildProjectRootLabelMap'),
    labelTextShowsHeader: labelText.includes('ULTIMATEBRIDGE PROJECT ROOT LABELS'),
    labelTextShowsSelectedLabel: labelText.includes('selectedLabel=P024 UltimateBridge'),
    labelTextShowsCustomLabel: labelText.includes('label=Trading Lab'),
    labelMapContainsSelectedRoot: labelMap[root] === 'P024 UltimateBridge',
    labelMapContainsCustomRoot: labelMap[secondRoot] === 'Trading Lab'
  }
};

console.log(JSON.stringify(result, null, 2));

if (
  !memory.available ||
  memory.rootCount !== 2 ||
  !labels.available ||
  labels.itemCount !== 2 ||
  labels.selectedLabel !== 'P024 UltimateBridge' ||
  labels.items[1].label !== 'Trading Lab' ||
  labelMap[root] !== 'P024 UltimateBridge' ||
  labelMap[secondRoot] !== 'Trading Lab' ||
  !Object.values(result.staticChecks).every(Boolean)
) {
  process.exitCode = 1;
}
