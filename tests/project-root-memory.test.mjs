import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPreviewTemplateFromProjectRootMemory,
  buildProjectRootMemory,
  formatProjectRootMemory,
  mergeProjectRootMemory
} from '../extension/src/project-root-memory.js';

const queue = [
  {
    isPreview: true,
    jobId: 'PREVIEW_JOB',
    approvedProjectRoot: 'C:/project/current/',
    request: { approvedProjectRoot: 'C:/project/current' }
  },
  {
    isPreview: false,
    jobId: 'APPLY_JOB',
    request: { approvedProjectRoot: 'C:/project/apply' }
  }
];

test('buildProjectRootMemory reports empty state without roots', () => {
  const memory = buildProjectRootMemory([], []);
  assert.equal(memory.available, false);
  assert.equal(memory.rootCount, 0);
  assert.equal(memory.selectedRoot, null);
  assert.match(memory.nextAction, /Run SAFE_CHANGE_PREVIEW/);
});

test('buildProjectRootMemory dedupes queue and stored roots', () => {
  const memory = buildProjectRootMemory(queue, ['C:/project/old', 'C:/project/current']);
  assert.equal(memory.available, true);
  assert.equal(memory.rootCount, 3);
  assert.equal(memory.selectedRoot, 'C:/project/current');
  assert.deepEqual(memory.roots, ['C:/project/current', 'C:/project/apply', 'C:/project/old']);
});

test('mergeProjectRootMemory preserves newest queue roots first', () => {
  const roots = mergeProjectRootMemory(queue, ['C:/project/old', 'C:/project/current']);
  assert.deepEqual(roots, ['C:/project/current', 'C:/project/apply', 'C:/project/old']);
});

test('formatProjectRootMemory is readable', () => {
  const memory = buildProjectRootMemory(queue, ['C:/project/old']);
  const text = formatProjectRootMemory(memory);
  assert.match(text, /ULTIMATEBRIDGE PROJECT ROOT MEMORY/);
  assert.match(text, /available=true/);
  assert.match(text, /selectedRoot=C:\/project\/current/);
  assert.match(text, /root\[0\]=C:\/project\/current/);
});

test('buildPreviewTemplateFromProjectRootMemory uses selected root', () => {
  const memory = buildProjectRootMemory(queue, []);
  const template = buildPreviewTemplateFromProjectRootMemory(memory);
  const parsed = JSON.parse(template);
  assert.equal(parsed.mode, 'SAFE_CHANGE_PREVIEW');
  assert.equal(parsed.approvedProjectRoot, 'C:/project/current');
  assert.equal(parsed.changes[0].op, 'replaceText');
});
