import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiffViewerState, formatDiffViewerState } from '../extension/src/diff-viewer.js';

const previewHash = 'c'.repeat(64);
const previewItem = {
  isPreview: true,
  jobId: 'PREVIEW_JOB',
  previewHash,
  requiredPreviewHash: previewHash,
  previewJsonPath: 'C:/run/safe-change-preview.json',
  previewDiffPath: 'C:/run/safe-change-preview.diff.txt',
  approvedProjectRoot: 'C:/project',
  previewChanges: [
    { op: 'replaceText', path: 'notes/file.txt', search: 'before', replace: 'after' },
    { op: 'writeTextFile', path: 'notes/new.txt', content: 'new content' }
  ]
};

test('buildDiffViewerState reports no preview when queue is empty', () => {
  const state = buildDiffViewerState([]);
  assert.equal(state.available, false);
  assert.equal(state.reason, 'NO_PREVIEW_AVAILABLE');
  assert.match(state.text, /Run preview first/);
});

test('buildDiffViewerState summarizes preview changes', () => {
  const state = buildDiffViewerState([previewItem]);
  assert.equal(state.available, true);
  assert.equal(state.previewJobId, 'PREVIEW_JOB');
  assert.equal(state.previewHash, previewHash);
  assert.equal(state.changeCount, 2);
  assert.equal(state.changes[0].op, 'replaceText');
  assert.equal(state.changes[0].path, 'notes/file.txt');
  assert.equal(state.changes[0].searchPreview, 'before');
  assert.equal(state.changes[0].replacePreview, 'after');
  assert.equal(state.changes[0].risk, 'normal');
  assert.equal(state.changes[1].op, 'writeTextFile');
  assert.equal(state.changes[1].contentPreview, 'new content');
});

test('formatDiffViewerState renders compact preview text', () => {
  const state = buildDiffViewerState([previewItem]);
  const text = formatDiffViewerState(state);
  assert.match(text, /ULTIMATEBRIDGE DIFF PREVIEW/);
  assert.match(text, /previewJobId=PREVIEW_JOB/);
  assert.match(text, /previewHash=/);
  assert.match(text, /previewDiffPath=/);
  assert.match(text, /changeCount=2/);
  assert.match(text, /change\[0\] op=replaceText/);
  assert.match(text, /path=notes\/file\.txt/);
  assert.match(text, /search=before/);
  assert.match(text, /replace=after/);
});

test('buildDiffViewerState flags risky-looking paths for visibility', () => {
  const state = buildDiffViewerState([{
    ...previewItem,
    previewChanges: [{ op: 'writeTextFile', path: '../escape.txt', content: 'bad' }]
  }]);
  assert.equal(state.changes[0].risk, 'blocked-by-path-policy-if-executed');
});
