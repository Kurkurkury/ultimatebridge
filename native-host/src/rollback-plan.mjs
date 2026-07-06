import fs from 'node:fs/promises';
import path from 'node:path';

export async function writeRollbackPlan(job, safeChangeResult) {
  const planPath = path.join(job.runFolder, 'rollback-plan.json');
  const commandPath = path.join(job.runFolder, 'rollback-restore-command.txt');
  const plan = buildRollbackPlan(job, safeChangeResult, planPath);

  await fs.writeFile(planPath, JSON.stringify(plan, null, 2), 'utf8');
  await fs.writeFile(commandPath, buildRestoreCommandText(plan), 'utf8');

  return { plan, planPath, commandPath };
}

export function buildRollbackPlan(job, safeChangeResult, planPath = null) {
  const operations = safeChangeResult.changes.map((change) => {
    if (change.existedBefore) {
      return {
        op: 'restoreTextFile',
        path: change.path,
        target: change.target,
        backupPath: change.backupPath,
        beforeBytes: change.beforeBytes,
        afterBytes: change.afterBytes
      };
    }

    return {
      op: 'deleteCreatedFile',
      path: change.path,
      target: change.target,
      backupPath: null,
      beforeBytes: change.beforeBytes,
      afterBytes: change.afterBytes
    };
  });

  return {
    protocol: 'ULTIMATEBRIDGE_ROLLBACK_PLAN_V1',
    jobId: job.jobId,
    createdAt: new Date().toISOString(),
    approvedProjectRoot: safeChangeResult.approvedProjectRoot,
    backupRoot: safeChangeResult.backupRoot,
    planPath,
    restoreCommand: planPath ? `node scripts/restore-rollback.mjs "${planPath}"` : null,
    operationCount: operations.length,
    operations
  };
}

export async function applyRollbackPlan(plan, options = {}) {
  if (!plan || plan.protocol !== 'ULTIMATEBRIDGE_ROLLBACK_PLAN_V1') {
    throw new Error('Unsupported rollback plan protocol.');
  }

  const dryRun = Boolean(options.dryRun);
  const results = [];

  for (const operation of plan.operations ?? []) {
    if (operation.op === 'restoreTextFile') {
      results.push(await restoreTextFile(operation, { dryRun }));
      continue;
    }

    if (operation.op === 'deleteCreatedFile') {
      results.push(await deleteCreatedFile(operation, { dryRun }));
      continue;
    }

    throw new Error(`Unsupported rollback operation: ${operation.op}`);
  }

  return {
    protocol: 'ULTIMATEBRIDGE_ROLLBACK_RESTORE_RESULT_V1',
    jobId: plan.jobId,
    dryRun,
    restoredAt: new Date().toISOString(),
    operationCount: results.length,
    results
  };
}

function buildRestoreCommandText(plan) {
  return [
    'ULTIMATEBRIDGE ROLLBACK RESTORE COMMAND',
    `jobId=${plan.jobId}`,
    `planPath=${plan.planPath}`,
    `operationCount=${plan.operationCount}`,
    '',
    'Dry run:',
    `node scripts/restore-rollback.mjs "${plan.planPath}" --dry-run`,
    '',
    'Restore:',
    `node scripts/restore-rollback.mjs "${plan.planPath}"`
  ].join('\n');
}

async function restoreTextFile(operation, options) {
  if (!operation.backupPath) {
    throw new Error(`Missing backupPath for restoreTextFile: ${operation.path}`);
  }

  if (!options.dryRun) {
    const text = await fs.readFile(operation.backupPath, 'utf8');
    await fs.mkdir(path.dirname(operation.target), { recursive: true });
    await fs.writeFile(operation.target, text, 'utf8');
  }

  return {
    op: operation.op,
    path: operation.path,
    target: operation.target,
    backupPath: operation.backupPath,
    restored: !options.dryRun
  };
}

async function deleteCreatedFile(operation, options) {
  if (!options.dryRun) {
    await fs.rm(operation.target, { force: true });
  }

  return {
    op: operation.op,
    path: operation.path,
    target: operation.target,
    restored: !options.dryRun
  };
}
