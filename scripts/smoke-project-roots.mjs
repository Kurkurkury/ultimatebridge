import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';

const allowedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-allowed-root-'));
const deniedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-denied-root-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [allowedRoot]
}, null, 2), 'utf8');

const allowedResponse = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'ROOT_OK',
    mode: 'SAFE_CHANGE',
    taskName: 'ProjectRootAllowedSmoke',
    approvedProjectRoot: allowedRoot,
    changes: [
      { op: 'writeTextFile', path: 'allowed.txt', content: 'allowed root ok' }
    ]
  }
});

const deniedResponse = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'ROOT_DENY',
    mode: 'SAFE_CHANGE',
    taskName: 'ProjectRootDeniedSmoke',
    approvedProjectRoot: deniedRoot,
    changes: [
      { op: 'writeTextFile', path: 'denied.txt', content: 'should not write' }
    ]
  }
});

console.log(JSON.stringify({ configPath, allowedRoot, deniedRoot, allowedResponse, deniedResponse }, null, 2));

if (!allowedResponse.ok || deniedResponse.ok || deniedResponse.code !== 'PROJECT_ROOT_NOT_ALLOWLISTED') {
  process.exitCode = 1;
}
