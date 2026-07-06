import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeRequest } from './protocol-validator.mjs';
import { createJob } from './job-spool.mjs';
import { runPowerShellScript } from './process-runner.mjs';
import { buildReport, routeReport } from './report-router.mjs';
import { buildAttachmentManifest, writeAttachmentManifest } from './attachment-router.mjs';
import { applySafeChanges } from './safe-change-applier.mjs';
import { writeDeliveryArtifacts } from './delivery-planner.mjs';
import { assertProjectRootAllowed } from './project-allowlist.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const HEALTH_SCRIPT = path.join(REPO_ROOT, 'runner', 'powershell', 'UB_HealthCheck.ps1');

async function handleMessage(message) {
  try {
    const request = normalizeRequest(message?.body ?? message, {
      defaultTargetHost: process.env.ULTIMATEBRIDGE_TARGET_HOST
    });

    const job = await createJob(request);

    if (request.mode === 'EXECUTION_LOCKED') {
      const report = buildReport({
        requestId: request.requestId,
        jobId: job.jobId,
        status: 'BLOCKED',
        exitCode: 0,
        timedOut: false,
        runFolder: job.runFolder,
        summary: 'Execution locked by request mode. Request was parsed but not executed.'
      });
      return await finish(job, request, report);
    }

    if (request.mode === 'SAFE_CHANGE') {
      const allowlistResult = await assertProjectRootAllowed(request.approvedProjectRoot);
      const safeChangeResult = await applySafeChanges(request, job);
      const report = buildReport({
        requestId: request.requestId,
        jobId: job.jobId,
        status: 'OK',
        exitCode: 0,
        timedOut: false,
        runFolder: job.runFolder,
        summary: summarizeSafeChangeResult(safeChangeResult, allowlistResult),
        attachments: []
      });
      return await finish(job, request, report, null, [
        'safe-change-result.json',
        'rollback-plan.json',
        'rollback-restore-command.txt'
      ]);
    }

    if (request.mode !== 'READ_ONLY') {
      const report = buildReport({
        requestId: request.requestId,
        jobId: job.jobId,
        status: 'BLOCKED',
        exitCode: 0,
        timedOut: false,
        runFolder: job.runFolder,
        summary: `Mode ${request.mode} is not implemented.`
      });
      return await finish(job, request, report);
    }

    const runnerResult = await runPowerShellScript(HEALTH_SCRIPT, [], {
      cwd: REPO_ROOT,
      runFolder: job.runFolder,
      timeoutSeconds: Number(process.env.ULTIMATEBRIDGE_TIMEOUT_SECONDS ?? 300)
    });

    const status = runnerResult.timedOut ? 'TIMEOUT' : runnerResult.exitCode === 0 ? 'OK' : 'ERROR';
    const report = buildReport({
      requestId: request.requestId,
      jobId: job.jobId,
      status,
      exitCode: runnerResult.exitCode,
      timedOut: runnerResult.timedOut,
      timeoutSeconds: runnerResult.timeoutSeconds,
      runFolder: job.runFolder,
      summary: summarizeRunnerResult(runnerResult),
      attachments: []
    });

    return await finish(job, request, report, runnerResult);
  } catch (error) {
    return {
      ok: false,
      status: error.status ?? 'ERROR',
      code: error.code ?? 'UNHANDLED_ERROR',
      message: error.message
    };
  }
}

async function finish(job, request, report, runnerResult = null, extraRelativeArtifacts = []) {
  const reportPath = path.join(job.runFolder, 'ultimatebridge-runner-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  const staged = [reportPath];
  for (const artifact of extraRelativeArtifacts) {
    staged.push(path.join(job.runFolder, artifact));
  }
  if (runnerResult) {
    staged.push(path.join(job.runFolder, 'runner-result.json'));
    staged.push(path.join(job.runFolder, 'stdout.txt'));
    staged.push(path.join(job.runFolder, 'stderr.txt'));
  }

  let manifest = await buildAttachmentManifest(job.jobId, staged);
  const initialDelivery = await writeDeliveryArtifacts(job, report, manifest);
  manifest = await buildAttachmentManifest(job.jobId, [
    ...staged,
    initialDelivery.planPath,
    initialDelivery.plan.chatTextPath
  ]);
  const manifestPath = await writeAttachmentManifest(job.runFolder, manifest);
  const delivery = await routeReport(report, { runFolder: job.runFolder });

  return {
    ok: report.status === 'OK',
    request,
    job,
    report,
    manifest,
    manifestPath,
    delivery,
    deliveryPlan: initialDelivery.plan,
    chatText: initialDelivery.chatText
  };
}

function summarizeRunnerResult(result) {
  const lines = [
    `PowerShell healthcheck exitCode=${result.exitCode}`,
    `timedOut=${result.timedOut}`,
    `durationMs=${result.durationMs}`
  ];

  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();
  if (stdout) lines.push(`stdout=${stdout.slice(0, 1000)}`);
  if (stderr) lines.push(`stderr=${stderr.slice(0, 1000)}`);
  return lines.join('\n');
}

function summarizeSafeChangeResult(result, allowlistResult) {
  return [
    `SAFE_CHANGE applied changes=${result.changes.length}`,
    `approvedProjectRoot=${result.approvedProjectRoot}`,
    `allowlistPath=${allowlistResult.allowlistPath}`,
    `allowlistMatchedRoot=${allowlistResult.matchedRoot}`,
    `backupRoot=${result.backupRoot}`,
    `rollbackPlanPath=${result.rollbackPlanPath}`,
    `restoreCommand=${result.restoreCommand}`,
    ...result.changes.map((change) => `${change.op} ${change.path} beforeBytes=${change.beforeBytes} afterBytes=${change.afterBytes}`)
  ].join('\n');
}

function attachNativeStdio() {
  let buffer = Buffer.alloc(0);
  let busy = false;

  process.stdin.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    if (!busy) {
      busy = true;
      processNativeBuffer().finally(() => {
        busy = false;
      });
    }
  });

  async function processNativeBuffer() {
    while (buffer.length >= 4) {
      const length = buffer.readUInt32LE(0);
      if (buffer.length < 4 + length) {
        return;
      }

      const body = buffer.subarray(4, 4 + length);
      buffer = buffer.subarray(4 + length);

      const output = await handleMessage(JSON.parse(body.toString('utf8')));
      writeNativeMessage(output);
    }
  }
}

function writeNativeMessage(payload) {
  const json = Buffer.from(JSON.stringify(payload), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  process.stdout.write(header);
  process.stdout.write(json);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  attachNativeStdio();
}

export { handleMessage, attachNativeStdio };
