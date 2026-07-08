import fs from 'node:fs';
import path from 'node:path';

const files = {
  builder: 'scripts/build-final-v1-acceptance-sweep.mjs',
  packageJson: 'package.json',
  verifyLocal: 'scripts/verify-local.mjs',
  doc: 'docs/FINAL_V1_ACCEPTANCE_SWEEP_V1.md'
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const packageJson = JSON.parse(text.packageJson);

const checks = {
  builderExists: exists(files.builder),
  builderHasProtocol: text.builder.includes('ULTIMATEBRIDGE_FINAL_V1_ACCEPTANCE_SWEEP_V1'),
  builderHasReportOnlyMode: text.builder.includes('ACCEPTANCE_REPORT_ONLY'),
  builderWritesJsonAndMarkdown: text.builder.includes('artifacts') && text.builder.includes('final-acceptance') && text.builder.includes('final-v1-acceptance-sweep.json') && text.builder.includes('final-v1-acceptance-sweep.md'),
  builderHasDecisionValues: text.builder.includes('V1_READY') && text.builder.includes('REVIEW_NEEDED'),
  builderReadsKeyEvidence: text.builder.includes('artifacts/local-verification/latest.json') && text.builder.includes('artifacts/local-status/latest.json') && text.builder.includes('stable-freeze-plan.json'),
  builderChecksDogfoodAndSetup: text.builder.includes('real-project-dogfood-run.json') && text.builder.includes('extension-load-reload-checklist.json') && text.builder.includes('native-host-install-rehearsal.json'),
  builderHasAcceptanceMatrix: text.builder.includes('acceptanceMatrix') && text.builder.includes('Core verification') && text.builder.includes('Release readiness'),
  builderHasClosureCommands: text.builder.includes('npm run acceptance:v1:sweep') && text.builder.includes('npm run verify:local'),
  builderDoesNotPublish: !/git\s+tag|npm\s+publish|gh\s+release|https:\/\//i.test(text.builder),
  packageHasScript: packageJson.scripts?.['acceptance:v1:sweep'] === 'node scripts/build-final-v1-acceptance-sweep.mjs',
  packageHasSmoke: packageJson.scripts?.['smoke:final-v1-acceptance-sweep'] === 'node scripts/smoke-final-v1-acceptance-sweep.mjs',
  verifyIncludesSmoke: text.verifyLocal.includes('smoke:final-v1-acceptance-sweep'),
  docExists: exists(files.doc),
  docMentionsDecision: text.doc.includes('V1_READY') && text.doc.includes('REVIEW_NEEDED')
};

const result = {
  protocol: 'ULTIMATEBRIDGE_FINAL_V1_ACCEPTANCE_SWEEP_SMOKE_V1',
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
