import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';

const outputDir = path.resolve('artifacts', 'release-freeze');
const jsonPath = path.join(outputDir, 'stable-freeze-plan.json');
const markdownPath = path.join(outputDir, 'stable-freeze-plan.md');
const manifestPath = path.join(outputDir, 'stable-freeze-manifest.json');

const releaseName = readArg('--release-name') ?? 'UltimateBridge_MVP_V1_STABLE_FREEZE';
const includePatterns = [
  'package.json',
  'README.md',
  'START_ULTIMATEBRIDGE.cmd',
  'docs',
  'extension',
  'native-host',
  'scripts',
  'tests'
];

const excludePatterns = [
  '.git',
  'node_modules',
  'artifacts',
  '*.log',
  '*.tmp'
];

const importantFiles = [
  'package.json',
  'START_ULTIMATEBRIDGE.cmd',
  'docs/FINAL_STATUS_MVP_V1.md',
  'docs/START_HERE_MVP_V1.md',
  'docs/MILESTONES_MVP_V1.md',
  'docs/INSTALLER_LAUNCHER_V1.md',
  'docs/NATIVE_HOST_EXTENSION_ID_HELPER_V1.md',
  'docs/BROWSER_NATIVE_CONNECTION_DIAGNOSTICS_V1.md',
  'docs/NATIVE_HOST_REAL_INSTALL_REHEARSAL_V1.md',
  'docs/EXTENSION_LOAD_RELOAD_GUIDE_V1.md',
  'docs/LOCAL_STATUS_DASHBOARD_V1.md',
  'docs/REAL_PROJECT_DOGFOOD_RUN_V1.md',
  'scripts/verify-local.mjs',
  'scripts/build-local-status-dashboard.mjs',
  'scripts/build-real-project-dogfood-run.mjs'
];

const manifestEntries = importantFiles.map((file) => buildEntry(file));
const plan = {
  protocol: 'ULTIMATEBRIDGE_RELEASE_PACKAGE_STABLE_FREEZE_V1',
  mode: 'FREEZE_PLAN_ONLY',
  generatedAt: new Date().toISOString(),
  hostname: os.hostname(),
  cwd: process.cwd(),
  node: process.version,
  releaseName,
  proposedZipName: `${releaseName}.zip`,
  includePatterns,
  excludePatterns,
  importantFiles: manifestEntries,
  requiredPreflight: [
    'npm run verify:local',
    'npm run status:local',
    'npm run dogfood:real-project:plan'
  ],
  manualFreezeSteps: [
    'Run npm run verify:local.',
    'Run npm run status:local.',
    'Run npm run release:freeze:plan.',
    'Review artifacts/release-freeze/stable-freeze-plan.md.',
    'Create a zip from the repository working tree using the include and exclude lists.',
    'Store the zip outside the repository artifacts folder.',
    'Record the zip SHA256 next to the generated manifest.'
  ],
  acceptanceCriteria: [
    'Local verification proof is PASS.',
    'Local status dashboard exists.',
    'Release freeze plan exists.',
    'Important file manifest exists.',
    'Package excludes transient folders.',
    'No release tag or external publication is performed by this planner.'
  ],
  outputs: {
    planJson: path.relative(process.cwd(), jsonPath),
    planMarkdown: path.relative(process.cwd(), markdownPath),
    manifestJson: path.relative(process.cwd(), manifestPath)
  }
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
fs.writeFileSync(manifestPath, `${JSON.stringify({ protocol: 'ULTIMATEBRIDGE_RELEASE_FREEZE_MANIFEST_V1', releaseName, generatedAt: plan.generatedAt, files: manifestEntries }, null, 2)}\n`, 'utf8');
fs.writeFileSync(markdownPath, formatMarkdown(plan), 'utf8');
console.log(JSON.stringify(plan, null, 2));
console.log(`Release freeze plan written: ${jsonPath}`);
console.log(`Release freeze plan written: ${markdownPath}`);
console.log(`Release freeze manifest written: ${manifestPath}`);

function buildEntry(file) {
  const abs = path.resolve(file);
  const exists = fs.existsSync(abs);
  const stat = exists ? fs.statSync(abs) : null;
  return {
    path: file,
    exists,
    sizeBytes: stat?.isFile() ? stat.size : null,
    sha256: stat?.isFile() ? sha256File(abs) : null
  };
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function formatMarkdown(plan) {
  const lines = [
    '# UltimateBridge Release Package Stable Freeze Plan',
    '',
    `protocol=${plan.protocol}`,
    `mode=${plan.mode}`,
    `generatedAt=${plan.generatedAt}`,
    `releaseName=${plan.releaseName}`,
    `proposedZipName=${plan.proposedZipName}`,
    `hostname=${plan.hostname}`,
    `cwd=${plan.cwd}`,
    '',
    '## Required preflight',
    ''
  ];
  for (const item of plan.requiredPreflight) lines.push(`- ${item}`);
  lines.push('', '## Include patterns', '');
  for (const item of plan.includePatterns) lines.push(`- ${item}`);
  lines.push('', '## Exclude patterns', '');
  for (const item of plan.excludePatterns) lines.push(`- ${item}`);
  lines.push('', '## Important files', '');
  for (const file of plan.importantFiles) lines.push(`- ${file.exists ? 'FOUND' : 'MISSING'} ${file.path} ${file.sha256 ? `sha256=${file.sha256}` : ''}`.trim());
  lines.push('', '## Manual freeze steps', '');
  for (const item of plan.manualFreezeSteps) lines.push(`- ${item}`);
  lines.push('', '## Acceptance criteria', '');
  for (const item of plan.acceptanceCriteria) lines.push(`- ${item}`);
  lines.push('', '## PR comment summary', '', '```text');
  lines.push('Release package stable freeze plan generated');
  lines.push(`releaseName=${plan.releaseName}`);
  lines.push(`importantFiles=${plan.importantFiles.length}`);
  lines.push('```', '');
  return lines.join('\n');
}
