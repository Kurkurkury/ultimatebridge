import fs from 'node:fs';
import path from 'node:path';

const files = {
  dogfood: 'scripts/build-real-project-dogfood-run.mjs',
  packageJson: 'package.json',
  verifyLocal: 'scripts/verify-local.mjs',
  doc: 'docs/REAL_PROJECT_DOGFOOD_RUN_V1.md'
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const packageJson = JSON.parse(text.packageJson);

const checks = {
  plannerExists: exists(files.dogfood),
  plannerHasProtocol: text.dogfood.includes('ULTIMATEBRIDGE_REAL_PROJECT_DOGFOOD_RUN_V1'),
  plannerHasPlanMode: text.dogfood.includes('PLAN_AND_PROOF_TEMPLATE'),
  plannerWritesJsonAndMarkdown: text.dogfood.includes('artifacts') && text.dogfood.includes('dogfood') && text.dogfood.includes('real-project-dogfood-run.json') && text.dogfood.includes('real-project-dogfood-run.md'),
  plannerHasPhases: text.dogfood.includes('READ_ONLY analysis') && text.dogfood.includes('Preview') && text.dogfood.includes('Apply block prepared') && text.dogfood.includes('Proof'),
  plannerMentionsManualReview: text.dogfood.includes('manual review') && text.dogfood.includes('No automation submits'),
  plannerHasSuggestedPrompts: text.dogfood.includes('buildReadOnlyPrompt') && text.dogfood.includes('buildPreviewPrompt'),
  plannerHasAcceptanceCriteria: text.dogfood.includes('acceptanceCriteria'),
  plannerDoesNotExecuteCommands: !/spawnSync|execSync|chrome\.runtime|sendNativeMessage/i.test(text.dogfood),
  packageHasScript: packageJson.scripts?.['dogfood:real-project:plan'] === 'node scripts/build-real-project-dogfood-run.mjs',
  packageHasSmoke: packageJson.scripts?.['smoke:real-project-dogfood-run'] === 'node scripts/smoke-real-project-dogfood-run.mjs',
  verifyIncludesSmoke: text.verifyLocal.includes('smoke:real-project-dogfood-run'),
  docExists: exists(files.doc),
  docMentionsArtifacts: text.doc.includes('artifacts/dogfood/real-project-dogfood-run.json') && text.doc.includes('artifacts/dogfood/real-project-dogfood-run.md')
};

const result = {
  protocol: 'ULTIMATEBRIDGE_REAL_PROJECT_DOGFOOD_RUN_SMOKE_V1',
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
