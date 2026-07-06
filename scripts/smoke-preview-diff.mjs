import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-preview-smoke-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'preview.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before preview', 'utf8');

const response = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'PREVIEW_SMOKE',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'PreviewDiffSmoke',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/preview.txt', search: 'before', replace: 'after' }
    ]
  }
});

const afterPreview = await fs.readFile(targetPath, 'utf8');
const previewJsonItem = response.manifest.items.find((item) => item.path.endsWith('safe-change-preview.json'));
const previewDiffItem = response.manifest.items.find((item) => item.path.endsWith('safe-change-preview.diff.txt'));
const previewJson = JSON.parse(await fs.readFile(previewJsonItem.path, 'utf8'));
const previewDiff = await fs.readFile(previewDiffItem.path, 'utf8');

console.log(JSON.stringify({
  root,
  configPath,
  response,
  afterPreview,
  previewJsonPath: previewJsonItem.path,
  previewDiffPath: previewDiffItem.path,
  previewJson,
  previewDiff
}, null, 2));

if (!response.ok || afterPreview !== 'before preview' || !previewJson.wouldWrite || !previewDiff.includes('+after preview')) {
  process.exitCode = 1;
}
