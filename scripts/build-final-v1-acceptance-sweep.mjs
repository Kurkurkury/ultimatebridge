import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const outputDir = path.resolve('artifacts', 'final-acceptance');
const jsonPath = path.join(outputDir, 'final-v1-acceptance-sweep.json');
const markdownPath = path.join(outputDir, 'final-v1-acceptance-sweep.md');

const evidenceFiles = [
  ['localVerification', 'Local verification', 'artifacts/local-verification/latest.json', 'ULTIMATEBRIDGE_LOCAL_VERIFICATION_V1'],
  ['localStatus', 'Local status dashboard', 'artifacts/local-status/latest.json', 'ULTIMATEBRIDGE_LOCAL_STATUS_DASHBOARD_V1'],
  ['releaseFreeze', 'Release freeze plan', 'artifacts/release-freeze/stable-freeze-plan.json', 'ULTIMATEBRIDGE_RELEASE_PACKAGE_STABLE_FREEZE_V1'],
  ['releaseManifest', 'Release freeze manifest', 'artifacts/release-freeze/stable-freeze-manifest.json', 'ULTIMATEBRIDGE_RELEASE_FREEZE_MANIFEST_V1'],
  ['dogfoodPlan', 'Real project dogfood plan', 'artifacts/dogfood/real-project-dogfood-run.json', 'ULTIMATEBRIDGE_REAL_PROJECT_DOGFOOD_RUN_V1'],
  ['extensionChecklist', 'Extension load checklist', 'artifacts/browser/extension-load-reload-checklist.json', 'ULTIMATEBRIDGE_EXTENSION_LOAD_RELOAD_CHECKLIST_V1'],
  ['nativeRehearsal', 'Native setup rehearsal', 'artifacts/install/native-host-install-rehearsal.json', 'ULTIMATEBRIDGE_NATIVE_HOST_REAL_INSTALL_REHEARSAL_V1']
];

const sourceChecks = [
  ['packageJson', 'package.json'],
  ['startLauncher', 'START_ULTIMATEBRIDGE.cmd'],
  ['finalStatusDoc', 'docs/FINAL_STATUS_MVP_V1.md'],
  ['startHereDoc', 'docs/START_HERE_MVP_V1.md'],
  ['milestonesDoc', 'docs/MILESTONES_MVP_V1.md'],
  ['releaseFreezeDoc', 'docs/RELEASE_PACKAGE_STABLE_FREEZE_V1.md'],
  ['dogfoodDoc', 'docs/REAL_PROJECT_DOGFOOD_RUN_V1.md'],
  ['statusDashboardDoc', 'docs/LOCAL_STATUS_DASHBOARD_V1.md'],
  ['extensionGuideDoc', 'docs/EXTENSION_LOAD_RELOAD_GUIDE_V1.md'],
  ['verifyLocal', 'scripts/verify-local.mjs']
];

const evidence = evidenceFiles.map(([id, label, file, protocol]) => readEvidence(id, label, file, protocol));
const sources = sourceChecks.map(([id, file]) => ({ id, path: file, exists: fs.existsSync(path.resolve(file)) }));

const acceptanceMatrix = [
  section('Core verification', evidence.some((item) => item.id === 'localVerification' && item.status === 'PASS'), 'latest local verification exists and is PASS'),
  section('Local status', evidence.some((item) => item.id === 'localStatus' && ['PASS', 'OK'].includes(item.status)), 'local status dashboard exists and is green'),
  section('Release readiness', evidence.some((item) => item.id === 'releaseFreeze' && item.exists) && evidence.some((item) => item.id === 'releaseManifest' && item.exists), 'release freeze plan and manifest exist'),
  section('Dogfood readiness', evidence.some((item) => item.id === 'dogfoodPlan' && item.exists), 'real project dogfood plan exists'),
  section('Browser setup readiness', evidence.some((item) => item.id === 'extensionChecklist' && item.exists), 'extension load checklist exists'),
  section('Native setup readiness', evidence.some((item) => item.id === 'nativeRehearsal' && item.exists), 'native host setup rehearsal exists'),
  section('Documentation set', sources.filter((item) => item.path.startsWith('docs/')).every((item) => item.exists), 'required V1 documentation files exist'),
  section('Launcher set', sources.some((item) => item.id === 'startLauncher' && item.exists), 'start launcher exists'),
  section('Verification script', sources.some((item) => item.id === 'verifyLocal' && item.exists), 'verify-local script exists')
];

const blockingIssues = acceptanceMatrix.filter((item) => !item.ok).map((item) => item.id);
const decision = blockingIssues.length === 0 ? 'V1_READY' : 'REVIEW_NEEDED';

const report = {
  protocol: 'ULTIMATEBRIDGE_FINAL_V1_ACCEPTANCE_SWEEP_V1',
  mode: 'ACCEPTANCE_REPORT_ONLY',
  generatedAt: new Date().toISOString(),
  hostname: os.hostname(),
  cwd: process.cwd(),
  node: process.version,
  decision,
  blockingIssues,
  acceptanceMatrix,
  evidence,
  sources,
  requiredCommandsBeforeClosure: [
    'npm run verify:local',
    'npm run status:local',
    'npm run dogfood:real-project:plan',
    'npm run release:freeze:plan',
    'npm run acceptance:v1:sweep'
  ],
  nextStep: decision === 'V1_READY' ? 'Proceed to V1.0 closure and handover docs.' : 'Generate missing evidence, rerun verification, and rerun the acceptance sweep.',
  outputs: {
    json: path.relative(process.cwd(), jsonPath),
    markdown: path.relative(process.cwd(), markdownPath)
  }
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(markdownPath, formatMarkdown(report), 'utf8');
console.log(JSON.stringify(report, null, 2));
console.log(`Final V1 acceptance sweep written: ${jsonPath}`);
console.log(`Final V1 acceptance sweep written: ${markdownPath}`);

function section(id, ok, proof) {
  return { id, ok, proof };
}

function readEvidence(id, label, relPath, expectedProtocol) {
  const absPath = path.resolve(relPath);
  const exists = fs.existsSync(absPath);
  const data = exists ? readJson(absPath) : null;
  return {
    id,
    label,
    path: relPath,
    exists,
    readOk: exists ? Boolean(data) : false,
    protocol: data?.protocol ?? null,
    expectedProtocol,
    protocolMatches: data?.protocol ? data.protocol === expectedProtocol : null,
    status: deriveStatus(data),
    passed: data?.passed ?? null,
    failed: data?.failed ?? null,
    durationMs: data?.durationMs ?? null,
    generatedAt: data?.generatedAt ?? data?.endedAt ?? null
  };
}

function readJson(absPath) {
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

function deriveStatus(data) {
  if (!data) return null;
  if (typeof data.status === 'string') return data.status;
  if (typeof data.summary?.status === 'string') return data.summary.status;
  if (typeof data.decision === 'string') return data.decision;
  if (data.failed === 0) return 'PASS';
  return null;
}

function formatMarkdown(report) {
  const lines = [
    '# UltimateBridge Final V1 Acceptance Sweep',
    '',
    `protocol=${report.protocol}`,
    `mode=${report.mode}`,
    `decision=${report.decision}`,
    `generatedAt=${report.generatedAt}`,
    `hostname=${report.hostname}`,
    `cwd=${report.cwd}`,
    `node=${report.node}`,
    `blockingIssues=${report.blockingIssues.join(',') || 'NONE'}`,
    '',
    '## Acceptance matrix',
    ''
  ];
  for (const item of report.acceptanceMatrix) lines.push(`- ${item.ok ? 'PASS' : 'REVIEW'} ${item.id}: ${item.proof}`);
  lines.push('', '## Evidence', '');
  for (const item of report.evidence) lines.push(`- ${item.exists ? 'FOUND' : 'MISSING'} ${item.label} | status=${item.status ?? 'UNKNOWN'} | path=${item.path}`);
  lines.push('', '## Source files', '');
  for (const item of report.sources) lines.push(`- ${item.exists ? 'FOUND' : 'MISSING'} ${item.path}`);
  lines.push('', '## Required commands before closure', '');
  for (const item of report.requiredCommandsBeforeClosure) lines.push(`- ${item}`);
  lines.push('', '## Next step', '', report.nextStep, '');
  lines.push('## PR comment summary', '', '```text');
  lines.push(`Final V1 acceptance decision: ${report.decision}`);
  lines.push(`blockingIssues=${report.blockingIssues.join(',') || 'NONE'}`);
  lines.push(`matrixItems=${report.acceptanceMatrix.length}`);
  lines.push('```', '');
  return lines.join('\n');
}
