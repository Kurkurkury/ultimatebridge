import fs from 'node:fs';
import path from 'node:path';

const files = {
  dashboard: 'scripts/build-local-status-dashboard.mjs',
  packageJson: 'package.json',
  verifyLocal: 'scripts/verify-local.mjs',
  doc: 'docs/LOCAL_STATUS_DASHBOARD_V1.md'
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const packageJson = JSON.parse(text.packageJson);

const checks = {
  dashboardExists: exists(files.dashboard),
  dashboardHasProtocol: text.dashboard.includes('ULTIMATEBRIDGE_LOCAL_STATUS_DASHBOARD_V1'),
  dashboardReadsVerification: text.dashboard.includes('artifacts/local-verification/latest.json'),
  dashboardReadsDiagnostics: text.dashboard.includes('artifacts/local-diagnostics/latest.json'),
  dashboardReadsExtensionChecklist: text.dashboard.includes('extension-load-reload-checklist.json'),
  dashboardReadsSetupRehearsal: text.dashboard.includes('native-host-install-rehearsal.json'),
  dashboardWritesJsonAndMarkdown: text.dashboard.includes('artifacts') && text.dashboard.includes('local-status') && text.dashboard.includes('latest.json') && text.dashboard.includes('latest.md'),
  dashboardHasQuickActions: text.dashboard.includes('npm run diagnose:local') && text.dashboard.includes('npm run verify:local') && text.dashboard.includes('npm run status:local'),
  dashboardDoesNotStartProcesses: !/spawnSync|execSync|Start-Process/i.test(text.dashboard),
  packageHasScript: packageJson.scripts?.['status:local'] === 'node scripts/build-local-status-dashboard.mjs',
  packageHasSmoke: packageJson.scripts?.['smoke:local-status-dashboard'] === 'node scripts/smoke-local-status-dashboard.mjs',
  verifyIncludesSmoke: text.verifyLocal.includes('smoke:local-status-dashboard'),
  docExists: exists(files.doc),
  docMentionsOutputs: text.doc.includes('artifacts/local-status/latest.json') && text.doc.includes('artifacts/local-status/latest.md')
};

const result = {
  protocol: 'ULTIMATEBRIDGE_LOCAL_STATUS_DASHBOARD_SMOKE_V1',
  status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
  checks
};

console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;

function exists(file) {
  return fs.existsSync(path.resolve(file));
}

function read(file) {
  return exists(file) ? fs.readFileSync(path.resolve(file), 'utf8') : '';
}
