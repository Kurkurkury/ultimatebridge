import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-safe-change-smoke-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const response = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'SAFE_SMOKE',
    mode: 'SAFE_CHANGE',
    taskName: 'SafeChangeSmoke',
    approvedProjectRoot: root,
    changes: [
      { op: 'writeTextFile', path: 'notes/safe-change.txt', content: 'UltimateBridge SAFE_CHANGE smoke ok' }
    ]
  }
});

console.log(JSON.stringify({ root, configPath, response }, null, 2));

if (!response.ok || !response.report.summary.includes('allowlistMatchedRoot=')) {
  process.exitCode = 1;
}
