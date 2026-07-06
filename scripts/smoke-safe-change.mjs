import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-safe-change-smoke-'));
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

console.log(JSON.stringify({ root, response }, null, 2));

if (!response.ok) {
  process.exitCode = 1;
}
