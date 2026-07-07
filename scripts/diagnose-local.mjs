import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const startedAt = new Date();
const artifactDir = path.resolve('artifacts', 'local-diagnostics');
const jsonPath = path.join(artifactDir, 'latest.json');
const markdownPath = path.join(artifactDir, 'latest.md');

fs.mkdirSync(artifactDir, { recursive: true });

const requiredFiles = [
  'package.json',
  'scripts/verify-local.mjs',
  'native-host/src/host.mjs',
  'native-host/powershell/UB_BeginTask.ps1',
  'native-host/powershell/UB_EmitReport.ps1',
  'native-host/powershell/UB_HealthCheck.ps1',
  'native-host/powershell/UB_StageAttachments.ps1',
  'extension/src/manifest.json',
  'extension/src/background.js',
  'extension/src/content.js',
  'extension/src/popup/popup.html',
  'extension/src/popup/popup.js',
  'extension/src/popup/project-workflow-panel.js'
];

const requiredScripts = [
  'test',
  'verify:local',
  'diagnose:local',
  'smoke:browser-project-workflow-panel',
  'smoke:browser-template-selection-ui',
  'smoke:browser-root-aware-popup-wiring',
  'smoke:browser-root-aware-command-templates',
  'smoke:browser-project-root-labels',
  'smoke:browser-project-root-memory',
  'smoke:browser-command-templates',
  'smoke:full-browser-roundtrip',
  'smoke:manual-send-guard',
  'smoke:preview-apply',
  'smoke:rollback',
  'smoke:project-roots',
  'smoke:safe-change',
  'smoke:readonly',
  'smoke:delivery',
  'smoke:extension-queue',
  'smoke:confirmed-plan',
  'e2e:native',
  'check:powershell'
];

const commandChecks = [
  ['node', ['--version']],
  ['npm', ['--version']],
  [process.platform === 'win32' ? 'pwsh' : 'pwsh', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()']]
];

const packageJson = readJson('package.json');
const scripts = packageJson?.scripts ?? {};
const fileChecks = requiredFiles.map((filePath) => ({
  filePath,
  exists: fs.existsSync(path.resolve(filePath))
}));
const scriptChecks = requiredScripts.map((scriptName) => ({
  scriptName,
  exists: Object.prototype.hasOwnProperty.call(scripts, scriptName),
  command: scripts[scriptName] ?? null
}));
const commandResults = commandChecks.map(([command, args]) => checkCommand(command, args));

const popupHtml = readText('extension/src/popup/popup.html');
const popupJs = readText('extension/src/popup/popup.js');
const workflowJs = readText('extension/src/popup/project-workflow-panel.js');
const verifyLocal = readText('scripts/verify-local.mjs');

const featureChecks = [
  ['popupHasProjectWorkflowPanel', popupHtml.includes('project-workflow-panel')],
  ['popupLoadsProjectWorkflowScript', popupHtml.includes('project-workflow-panel.js')],
  ['popupHasCommandTemplateSelect', popupHtml.includes('command-template-select')],
  ['popupHasManualSendGuard', popupHtml.includes('manual-send-guard')],
  ['popupJsHasRootAwareTemplates', popupJs.includes('buildRootAwareCommandTemplateLibrary')],
  ['workflowUsesReadOnlyTemplate', workflowJs.includes('read-only-healthcheck')],
  ['workflowUsesPreviewTemplate', workflowJs.includes('safe-change-preview-skeleton')],
  ['workflowUsesSafeChangeBuilder', workflowJs.includes('build-safe-change')],
  ['workflowDoesNotSubmitChat', !workflowJs.includes('submit()')],
  ['verifyIncludesProjectWorkflowSmoke', verifyLocal.includes('smoke:browser-project-workflow-panel')]
].map(([name, ok]) => ({ name, ok }));

const failed = [
  ...fileChecks.filter((item) => !item.exists),
  ...scriptChecks.filter((item) => !item.exists),
  ...commandResults.filter((item) => !item.ok),
  ...featureChecks.filter((item) => !item.ok)
];

const endedAt = new Date();
const report = {
  protocol: 'ULTIMATEBRIDGE_LOCAL_DIAGNOSTICS_V1',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  startedAt: startedAt.toISOString(),
  endedAt: endedAt.toISOString(),
  durationMs: endedAt.getTime() - startedAt.getTime(),
  hostname: os.hostname(),
  platform: process.platform,
  cwd: process.cwd(),
  node: process.version,
  fileChecks,
  scriptChecks,
  commandResults,
  featureChecks,
  failedCount: failed.length
};

fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(markdownPath, formatMarkdown(report), 'utf8');
console.log(JSON.stringify(report, null, 2));
console.log(`[diagnose:local] Report written: ${markdownPath}`);

if (report.status !== 'PASS') process.exitCode = 1;

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
  } catch {
    return null;
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(path.resolve(filePath), 'utf8');
  } catch {
    return '';
  }
}

function checkCommand(command, args) {
  const child = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 1024 * 1024
  });
  return {
    label: [command, ...args].join(' '),
    ok: child.status === 0,
    exitCode: child.status,
    stdout: String(child.stdout ?? '').trim().split(/\r?\n/).slice(-3).join('\n'),
    stderr: String(child.stderr ?? '').trim().split(/\r?\n/).slice(-3).join('\n')
  };
}

function formatMarkdown(report) {
  const lines = [
    '# UltimateBridge Local Diagnostics',
    '',
    `status=${report.status}`,
    `startedAt=${report.startedAt}`,
    `endedAt=${report.endedAt}`,
    `durationMs=${report.durationMs}`,
    `hostname=${report.hostname}`,
    `platform=${report.platform}`,
    `cwd=${report.cwd}`,
    `node=${report.node}`,
    `failedCount=${report.failedCount}`,
    '',
    '## Commands',
    ''
  ];

  for (const item of report.commandResults) {
    lines.push(`- ${item.ok ? 'PASS' : 'FAIL'} ${item.label} ${item.stdout ? `=> ${item.stdout}` : ''}`.trim());
  }

  lines.push('', '## Required files', '');
  for (const item of report.fileChecks) {
    lines.push(`- ${item.exists ? 'PASS' : 'FAIL'} ${item.filePath}`);
  }

  lines.push('', '## Required package scripts', '');
  for (const item of report.scriptChecks) {
    lines.push(`- ${item.exists ? 'PASS' : 'FAIL'} ${item.scriptName}`);
  }

  lines.push('', '## Feature checks', '');
  for (const item of report.featureChecks) {
    lines.push(`- ${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
  }

  lines.push('', '## Summary', '', '```text');
  lines.push(`Local diagnostics: ${report.status}`);
  lines.push(`failedCount=${report.failedCount}`);
  lines.push(`durationMs=${report.durationMs}`);
  lines.push('```', '');
  return lines.join('\n');
}
