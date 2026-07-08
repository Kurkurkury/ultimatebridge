import fs from 'node:fs';
import path from 'node:path';

const files = {
  builder: 'scripts/build-v1-closure-handover-docs.mjs',
  packageJson: 'package.json',
  verifyLocal: 'scripts/verify-local.mjs',
  doc: 'docs/V1_CLOSURE_HANDOVER_DOCS_V1.md'
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const packageJson = JSON.parse(text.packageJson);

const checks = {
  builderExists: exists(files.builder),
  builderHasProtocol: text.builder.includes('ULTIMATEBRIDGE_V1_CLOSURE_HANDOVER_DOCS_V1'),
  builderHasDocsOnlyMode: text.builder.includes('CLOSURE_DOCS_ONLY'),
  builderWritesSummary: text.builder.includes('artifacts') && text.builder.includes('v1-closure') && text.builder.includes('v1-closure-summary.json'),
  builderWritesFinalDocs: text.builder.includes('FINAL_STATUS_V1_0.md') && text.builder.includes('START_HERE_V1_0.md') && text.builder.includes('NEXT_CHAT_HANDOVER_V1_0.md') && text.builder.includes('V1_0_FREEZE_INSTRUCTIONS.md'),
  builderReadsProofEvidence: text.builder.includes('artifacts/local-verification/latest.json') && text.builder.includes('final-v1-acceptance-sweep.json') && text.builder.includes('stable-freeze-plan.json'),
  builderHasProductReadyLogic: text.builder.includes('productReady') && text.builder.includes('V1_READY'),
  builderMentionsFortyMilestones: text.builder.includes('stableMilestones: 40'),
  builderHasKeyCommands: text.builder.includes('npm run verify:local') && text.builder.includes('npm run closure:v1:docs'),
  builderDoesNotPublish: !/git\s+tag|npm\s+publish|gh\s+release|https:\/\//i.test(text.builder),
  packageHasScript: packageJson.scripts?.['closure:v1:docs'] === 'node scripts/build-v1-closure-handover-docs.mjs',
  packageHasSmoke: packageJson.scripts?.['smoke:v1-closure-handover-docs'] === 'node scripts/smoke-v1-closure-handover-docs.mjs',
  verifyIncludesSmoke: text.verifyLocal.includes('smoke:v1-closure-handover-docs'),
  docExists: exists(files.doc),
  docMentionsOutputs: text.doc.includes('artifacts/v1-closure/FINAL_STATUS_V1_0.md') && text.doc.includes('artifacts/v1-closure/NEXT_CHAT_HANDOVER_V1_0.md')
};

const result = {
  protocol: 'ULTIMATEBRIDGE_V1_CLOSURE_HANDOVER_DOCS_SMOKE_V1',
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
