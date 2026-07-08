import fs from 'node:fs';
import path from 'node:path';

const files = {
  planner: 'scripts/build-release-package-stable-freeze.mjs',
  packageJson: 'package.json',
  verifyLocal: 'scripts/verify-local.mjs',
  doc: 'docs/RELEASE_PACKAGE_STABLE_FREEZE_V1.md'
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const packageJson = JSON.parse(text.packageJson);

const checks = {
  plannerExists: exists(files.planner),
  plannerHasProtocol: text.planner.includes('ULTIMATEBRIDGE_RELEASE_PACKAGE_STABLE_FREEZE_V1'),
  plannerHasPlanOnlyMode: text.planner.includes('FREEZE_PLAN_ONLY'),
  plannerWritesPlanAndManifest: text.planner.includes('stable-freeze-plan.json') && text.planner.includes('stable-freeze-plan.md') && text.planner.includes('stable-freeze-manifest.json'),
  plannerIncludesImportantDocs: text.planner.includes('docs/FINAL_STATUS_MVP_V1.md') && text.planner.includes('docs/START_HERE_MVP_V1.md'),
  plannerListsIncludeExclude: text.planner.includes('includePatterns') && text.planner.includes('excludePatterns') && text.planner.includes('node_modules') && text.planner.includes('artifacts'),
  plannerUsesSha256: text.planner.includes('sha256File') && text.planner.includes("createHash('sha256')"),
  plannerHasManualSteps: text.planner.includes('manualFreezeSteps') && text.planner.includes('Record the zip SHA256'),
  plannerHasPreflight: text.planner.includes('npm run verify:local') && text.planner.includes('npm run status:local'),
  plannerDoesNotPublish: !/git\s+tag|npm\s+publish|gh\s+release|fetch\(|https:\/\//i.test(text.planner),
  packageHasScript: packageJson.scripts?.['release:freeze:plan'] === 'node scripts/build-release-package-stable-freeze.mjs',
  packageHasSmoke: packageJson.scripts?.['smoke:release-package-stable-freeze'] === 'node scripts/smoke-release-package-stable-freeze.mjs',
  verifyIncludesSmoke: text.verifyLocal.includes('smoke:release-package-stable-freeze'),
  docExists: exists(files.doc),
  docMentionsArtifacts: text.doc.includes('artifacts/release-freeze/stable-freeze-plan.json') && text.doc.includes('artifacts/release-freeze/stable-freeze-manifest.json')
};

const result = {
  protocol: 'ULTIMATEBRIDGE_RELEASE_PACKAGE_STABLE_FREEZE_SMOKE_V1',
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
