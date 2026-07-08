import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const outputDir = path.resolve('artifacts', 'local-status');
const jsonPath = path.join(outputDir, 'latest.json');
const markdownPath = path.join(outputDir, 'latest.md');

const sources = [
  ['verification', 'Local verification', 'artifacts/local-verification/latest.json'],
  ['diagnostics', 'Local diagnostics', 'artifacts/local-diagnostics/latest.json'],
  ['extensionChecklist', 'Extension checklist', 'artifacts/browser/extension-load-reload-checklist.json'],
  ['setupRehearsal', 'Setup rehearsal', 'artifacts/install/native-host-install-rehearsal.json'],
  ['setupPlan', 'Setup plan', 'artifacts/install/native-host-install-plan.json'],
  ['extensionIdPlan', 'Extension id plan', 'artifacts/install/native-host-extension-id-plan.json'],
  ['repairPlan', 'Repair plan', 'artifacts/repair/repair-plan.json']
];

const sourceReports = sources.map(([id, label, relPath]) => readSource(id, label, relPath));
const verification = sourceReports.find((item) => item.id === 'verification');
const diagnostics = sourceReports.find((item) => item.id === 'diagnostics');

const issues = [];
if (!verification?.exists) issues.push('LOCAL_VERIFICATION_MISSING');
if (verification?.exists && verification.status !== 'PASS') issues.push('LOCAL_VERIFICATION_NOT_PASS');
if (!diagnostics?.exists) issues.push('LOCAL_DIAGNOSTICS_MISSING');
if (diagnostics?.exists && !['PASS', 'OK'].includes(diagnostics.status)) issues.push('LOCAL_DIAGNOSTICS_NOT_PASS');

const dashboard = {
  protocol: 'ULTIMATEBRIDGE_LOCAL_STATUS_DASHBOARD_V1',
  generatedAt: new Date().toISOString(),
  hostname: os.hostname(),
  cwd: process.cwd(),
  node: process.version,
  summary: {
    status: issues.length === 0 ? 'PASS' : 'REVIEW_NEEDED',
    verificationOk: verification?.status === 'PASS',
    diagnosticsOk: ['PASS', 'OK'].includes(diagnostics?.status),
    foundReports: sourceReports.filter((item) => item.exists).length,
    totalReports: sourceReports.length,
    issues
  },
  quickActions: [
    'npm run diagnose:local',
    'npm run verify:local',
    'npm run extension:load:checklist',
    'npm run native-host:install:rehearsal',
    'npm run status:local'
  ],
  outputs: {
    json: path.relative(process.cwd(), jsonPath),
    markdown: path.relative(process.cwd(), markdownPath)
  },
  sources: sourceReports
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(dashboard, null, 2)}\n`, 'utf8');
fs.writeFileSync(markdownPath, formatMarkdown(dashboard), 'utf8');
console.log(JSON.stringify(dashboard, null, 2));
console.log(`Local status dashboard written: ${jsonPath}`);
console.log(`Local status dashboard written: ${markdownPath}`);

function readSource(id, label, relPath) {
  const absPath = path.resolve(relPath);
  const exists = fs.existsSync(absPath);
  const parsed = exists ? readJson(absPath) : null;
  return {
    id,
    label,
    path: relPath,
    exists,
    protocol: parsed?.protocol ?? null,
    status: deriveStatus(parsed),
    startedAt: parsed?.startedAt ?? null,
    endedAt: parsed?.endedAt ?? null,
    durationMs: parsed?.durationMs ?? null,
    passed: parsed?.passed ?? null,
    failed: parsed?.failed ?? null,
    issues: Array.isArray(parsed?.issues) ? parsed.issues : [],
    readOk: exists ? Boolean(parsed) : false
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
  if (data.failed === 0) return 'PASS';
  return null;
}

function formatMarkdown(report) {
  const lines = [
    '# UltimateBridge Local Status Dashboard',
    '',
    `protocol=${report.protocol}`,
    `status=${report.summary.status}`,
    `generatedAt=${report.generatedAt}`,
    `hostname=${report.hostname}`,
    `cwd=${report.cwd}`,
    `node=${report.node}`,
    '',
    '## Summary',
    '',
    `verificationOk=${report.summary.verificationOk}`,
    `diagnosticsOk=${report.summary.diagnosticsOk}`,
    `foundReports=${report.summary.foundReports}`,
    `totalReports=${report.summary.totalReports}`,
    `issues=${report.summary.issues.join(',') || 'NONE'}`,
    '',
    '## Sources',
    ''
  ];

  for (const source of report.sources) {
    lines.push(`- ${source.exists ? 'FOUND' : 'MISSING'} ${source.label} | status=${source.status ?? 'UNKNOWN'} | path=${source.path}`);
  }

  lines.push('', '## Quick actions', '');
  for (const action of report.quickActions) lines.push(`- ${action}`);

  lines.push('', '## PR comment summary', '', '```text');
  lines.push(`Local status dashboard: ${report.summary.status}`);
  lines.push(`verificationOk=${report.summary.verificationOk}`);
  lines.push(`diagnosticsOk=${report.summary.diagnosticsOk}`);
  lines.push(`issues=${report.summary.issues.join(',') || 'NONE'}`);
  lines.push('```', '');
  return lines.join('\n');
}
