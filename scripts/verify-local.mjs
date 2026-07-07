import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const startedAt = new Date();
const artifactDir = path.resolve('artifacts', 'local-verification');
const jsonPath = path.join(artifactDir, 'latest.json');
const markdownPath = path.join(artifactDir, 'latest.md');

const commands = [
  ['npm', ['test']],
  ['npm', ['run', 'smoke:browser-project-workflow-panel']],
  ['npm', ['run', 'smoke:browser-template-selection-ui']],
  ['npm', ['run', 'smoke:browser-root-aware-popup-wiring']],
  ['npm', ['run', 'smoke:browser-root-aware-command-templates']],
  ['npm', ['run', 'smoke:browser-project-root-labels']],
  ['npm', ['run', 'smoke:browser-project-root-memory']],
  ['npm', ['run', 'smoke:browser-command-templates']],
  ['npm', ['run', 'smoke:browser-session-summary']],
  ['npm', ['run', 'smoke:browser-final-review-checklist']],
  ['npm', ['run', 'smoke:browser-artifact-open-plan']],
  ['npm', ['run', 'smoke:browser-diff-viewer']],
  ['npm', ['run', 'smoke:browser-roundtrip-panel']],
  ['npm', ['run', 'smoke:full-browser-roundtrip']],
  ['npm', ['run', 'smoke:manual-send-guard']],
  ['npm', ['run', 'smoke:browser-apply-injection']],
  ['npm', ['run', 'smoke:browser-safe-change-builder']],
  ['npm', ['run', 'smoke:extension-preview-ui']],
  ['npm', ['run', 'smoke:preview-apply']],
  ['npm', ['run', 'smoke:preview-diff']],
  ['npm', ['run', 'smoke:rollback']],
  ['npm', ['run', 'smoke:project-roots']],
  ['npm', ['run', 'smoke:safe-change']],
  ['npm', ['run', 'smoke:readonly']],
  ['npm', ['run', 'smoke:delivery']],
  ['npm', ['run', 'smoke:extension-queue']],
  ['npm', ['run', 'smoke:confirmed-plan']],
  ['npm', ['run', 'e2e:native']],
  [process.platform === 'win32' ? 'pwsh' : 'pwsh', ['-NoProfile', '-File', 'scripts/check-powershell.ps1']]
];

fs.mkdirSync(artifactDir, { recursive: true });

const results = [];
let status = 'PASS';
let failure = null;

for (const [command, args] of commands) {
  const label = [command, ...args].join(' ');
  const commandStartedAt = new Date();
  console.log(`\n[verify:local] START ${label}`);
  const child = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 1024 * 1024 * 32
  });
  const commandEndedAt = new Date();
  const result = {
    label,
    command,
    args,
    exitCode: child.status,
    signal: child.signal,
    ok: child.status === 0,
    durationMs: commandEndedAt.getTime() - commandStartedAt.getTime(),
    stdoutTail: tail(child.stdout ?? '', 80),
    stderrTail: tail(child.stderr ?? '', 80)
  };
  results.push(result);

  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);
  console.log(`[verify:local] ${result.ok ? 'PASS' : 'FAIL'} ${label} (${result.durationMs}ms)`);

  writeReports({ status: result.ok ? status : 'FAIL', failure: result.ok ? failure : result, results });

  if (!result.ok) {
    status = 'FAIL';
    failure = result;
    break;
  }
}

writeReports({ status, failure, results });

if (status !== 'PASS') {
  console.error(`\n[verify:local] FAIL at: ${failure?.label}`);
  console.error(`[verify:local] Proof written: ${markdownPath}`);
  process.exitCode = 1;
} else {
  console.log('\n[verify:local] PASS all checks');
  console.log(`[verify:local] Proof written: ${markdownPath}`);
}

function writeReports({ status, failure, results }) {
  const endedAt = new Date();
  const report = {
    protocol: 'ULTIMATEBRIDGE_LOCAL_VERIFICATION_V1',
    status,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - startedAt.getTime(),
    cwd: process.cwd(),
    platform: process.platform,
    hostname: os.hostname(),
    node: process.version,
    total: results.length,
    passed: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    failure: failure ? compactFailure(failure) : null,
    results
  };
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, formatMarkdown(report), 'utf8');
}

function formatMarkdown(report) {
  const lines = [
    '# UltimateBridge Local Verification',
    '',
    `status=${report.status}`,
    `startedAt=${report.startedAt}`,
    `endedAt=${report.endedAt}`,
    `durationMs=${report.durationMs}`,
    `hostname=${report.hostname}`,
    `cwd=${report.cwd}`,
    `node=${report.node}`,
    `passed=${report.passed}`,
    `failed=${report.failed}`,
    ''
  ];

  if (report.failure) {
    lines.push('## Failure', '');
    lines.push(`label=${report.failure.label}`);
    lines.push(`exitCode=${report.failure.exitCode}`);
    lines.push('');
  }

  lines.push('## Checks', '');
  for (const result of report.results) {
    lines.push(`- ${result.ok ? 'PASS' : 'FAIL'} ${result.label} (${result.durationMs}ms)`);
  }
  lines.push('');

  if (report.failure?.stderrTail) {
    lines.push('## Failure stderr tail', '', '```text', report.failure.stderrTail, '```', '');
  }
  if (report.failure?.stdoutTail) {
    lines.push('## Failure stdout tail', '', '```text', report.failure.stdoutTail, '```', '');
  }

  lines.push('## PR comment summary', '');
  lines.push('```text');
  lines.push(`Local verification: ${report.status}`);
  lines.push(`passed=${report.passed}`);
  lines.push(`failed=${report.failed}`);
  lines.push(`durationMs=${report.durationMs}`);
  if (report.failure) lines.push(`failure=${report.failure.label}`);
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

function compactFailure(result) {
  return {
    label: result.label,
    exitCode: result.exitCode,
    signal: result.signal,
    durationMs: result.durationMs,
    stdoutTail: result.stdoutTail,
    stderrTail: result.stderrTail
  };
}

function tail(text, lines) {
  const split = String(text).split(/\r?\n/);
  return split.slice(Math.max(0, split.length - lines)).join('\n').trim();
}
