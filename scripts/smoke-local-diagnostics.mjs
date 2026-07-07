import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const child = spawnSync('npm', ['run', 'diagnose:local'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  shell: process.platform === 'win32',
  maxBuffer: 1024 * 1024 * 8
});

if (child.stdout) process.stdout.write(child.stdout);
if (child.stderr) process.stderr.write(child.stderr);

const jsonPath = path.resolve('artifacts', 'local-diagnostics', 'latest.json');
const markdownPath = path.resolve('artifacts', 'local-diagnostics', 'latest.md');
const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const markdown = fs.readFileSync(markdownPath, 'utf8');

const checks = {
  commandPassed: child.status === 0,
  protocolOk: report.protocol === 'ULTIMATEBRIDGE_LOCAL_DIAGNOSTICS_V1',
  statusPass: report.status === 'PASS',
  hasMarkdown: markdown.includes('# UltimateBridge Local Diagnostics'),
  hasDiagnoseScript: report.scriptChecks.some((item) => item.scriptName === 'diagnose:local' && item.exists),
  hasDiagnosticsSmoke: report.scriptChecks.some((item) => item.scriptName === 'smoke:local-diagnostics' && item.exists),
  hasVerifyLocal: report.scriptChecks.some((item) => item.scriptName === 'verify:local' && item.exists),
  hasNativeHost: report.fileChecks.some((item) => item.filePath === 'native-host/src/host.mjs' && item.exists),
  hasPopupWorkflow: report.featureChecks.some((item) => item.name === 'popupHasProjectWorkflowPanel' && item.ok),
  hasWorkflowSmokeInVerify: report.featureChecks.some((item) => item.name === 'verifyIncludesProjectWorkflowSmoke' && item.ok),
  failedCountZero: report.failedCount === 0
};

console.log(JSON.stringify({ checks }, null, 2));

if (!Object.values(checks).every(Boolean)) {
  process.exitCode = 1;
}
