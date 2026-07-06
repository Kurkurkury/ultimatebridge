import fs from 'node:fs/promises';
import path from 'node:path';
import { applyRollbackPlan } from '../native-host/src/rollback-plan.mjs';

const planPath = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!planPath) {
  console.error('Usage: node scripts/restore-rollback.mjs <rollback-plan.json> [--dry-run]');
  process.exit(2);
}

const resolvedPlanPath = path.resolve(planPath);
const plan = JSON.parse(await fs.readFile(resolvedPlanPath, 'utf8'));
const result = await applyRollbackPlan(plan, { dryRun });
const resultPath = path.join(path.dirname(resolvedPlanPath), dryRun ? 'rollback-dry-run-result.json' : 'rollback-restore-result.json');
await fs.writeFile(resultPath, JSON.stringify(result, null, 2), 'utf8');

console.log(JSON.stringify({ resultPath, result }, null, 2));

if (result.protocol !== 'ULTIMATEBRIDGE_ROLLBACK_RESTORE_RESULT_V1') {
  process.exitCode = 1;
}
