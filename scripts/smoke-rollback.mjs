import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';
import { applyRollbackPlan } from '../native-host/src/rollback-plan.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-rollback-smoke-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'rollback.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before rollback', 'utf8');

const response = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'ROLLBACK_SMOKE',
    mode: 'SAFE_CHANGE',
    taskName: 'RollbackSmoke',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/rollback.txt', search: 'before', replace: 'after' }
    ]
  }
});

const afterChange = await fs.readFile(targetPath, 'utf8');
const rollbackPlanItem = response.manifest.items.find((item) => item.path.endsWith('rollback-plan.json'));
const rollbackPlan = JSON.parse(await fs.readFile(rollbackPlanItem.path, 'utf8'));
const dryRunResult = await applyRollbackPlan(rollbackPlan, { dryRun: true });
const afterDryRun = await fs.readFile(targetPath, 'utf8');
const restoreResult = await applyRollbackPlan(rollbackPlan);
const afterRestore = await fs.readFile(targetPath, 'utf8');

console.log(JSON.stringify({
  root,
  configPath,
  response,
  rollbackPlanPath: rollbackPlanItem.path,
  afterChange,
  dryRunResult,
  afterDryRun,
  restoreResult,
  afterRestore
}, null, 2));

if (!response.ok || afterChange !== 'after rollback' || afterDryRun !== 'after rollback' || afterRestore !== 'before rollback') {
  process.exitCode = 1;
}
