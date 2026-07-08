import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const outputDir = path.resolve('artifacts', 'v1-closure');
const summaryJsonPath = path.join(outputDir, 'v1-closure-summary.json');
const finalStatusPath = path.join(outputDir, 'FINAL_STATUS_V1_0.md');
const startHerePath = path.join(outputDir, 'START_HERE_V1_0.md');
const handoverPath = path.join(outputDir, 'NEXT_CHAT_HANDOVER_V1_0.md');
const freezePath = path.join(outputDir, 'V1_0_FREEZE_INSTRUCTIONS.md');

const evidence = {
  localVerification: readJson('artifacts/local-verification/latest.json'),
  localStatus: readJson('artifacts/local-status/latest.json'),
  finalAcceptance: readJson('artifacts/final-acceptance/final-v1-acceptance-sweep.json'),
  releaseFreeze: readJson('artifacts/release-freeze/stable-freeze-plan.json'),
  releaseManifest: readJson('artifacts/release-freeze/stable-freeze-manifest.json')
};

const finalDecision = evidence.finalAcceptance?.decision ?? 'REVIEW_NEEDED';
const verificationStatus = evidence.localVerification?.status ?? 'UNKNOWN';
const statusDashboard = evidence.localStatus?.summary?.status ?? evidence.localStatus?.status ?? 'UNKNOWN';
const releaseName = evidence.releaseFreeze?.releaseName ?? 'UltimateBridge_MVP_V1_STABLE_FREEZE';
const proposedZipName = evidence.releaseFreeze?.proposedZipName ?? `${releaseName}.zip`;

const closure = {
  protocol: 'ULTIMATEBRIDGE_V1_CLOSURE_HANDOVER_DOCS_V1',
  mode: 'CLOSURE_DOCS_ONLY',
  generatedAt: new Date().toISOString(),
  hostname: os.hostname(),
  cwd: process.cwd(),
  node: process.version,
  productName: 'UltimateBridge',
  version: 'V1.0',
  decision: finalDecision,
  productReady: finalDecision === 'V1_READY' && verificationStatus === 'PASS',
  verification: {
    status: verificationStatus,
    passed: evidence.localVerification?.passed ?? null,
    failed: evidence.localVerification?.failed ?? null,
    durationMs: evidence.localVerification?.durationMs ?? null
  },
  localStatus: {
    status: statusDashboard,
    foundReports: evidence.localStatus?.summary?.foundReports ?? null,
    issues: evidence.localStatus?.summary?.issues ?? []
  },
  finalAcceptance: {
    decision: finalDecision,
    blockingIssues: evidence.finalAcceptance?.blockingIssues ?? []
  },
  releaseFreeze: {
    releaseName,
    proposedZipName,
    manifestFiles: Array.isArray(evidence.releaseManifest?.files) ? evidence.releaseManifest.files.length : null
  },
  stableMilestones: 40,
  keyCommands: [
    'npm run verify:local',
    'npm run status:local',
    'npm run acceptance:v1:sweep',
    'npm run release:freeze:plan',
    'npm run closure:v1:docs'
  ],
  handoverFiles: {
    summaryJson: path.relative(process.cwd(), summaryJsonPath),
    finalStatus: path.relative(process.cwd(), finalStatusPath),
    startHere: path.relative(process.cwd(), startHerePath),
    nextChatHandover: path.relative(process.cwd(), handoverPath),
    freezeInstructions: path.relative(process.cwd(), freezePath)
  },
  safety: {
    docsOnly: true,
    noReleasePublish: true,
    noGitTag: true,
    noUpload: true,
    noBrowserMutation: true,
    noNativeHostMutation: true,
    noProjectApply: true
  }
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(summaryJsonPath, `${JSON.stringify(closure, null, 2)}\n`, 'utf8');
fs.writeFileSync(finalStatusPath, buildFinalStatus(closure), 'utf8');
fs.writeFileSync(startHerePath, buildStartHere(closure), 'utf8');
fs.writeFileSync(handoverPath, buildHandover(closure), 'utf8');
fs.writeFileSync(freezePath, buildFreezeInstructions(closure), 'utf8');
console.log(JSON.stringify(closure, null, 2));
console.log(`V1 closure summary written: ${summaryJsonPath}`);
console.log(`V1 final status written: ${finalStatusPath}`);
console.log(`V1 start-here written: ${startHerePath}`);
console.log(`V1 handover written: ${handoverPath}`);
console.log(`V1 freeze instructions written: ${freezePath}`);

function readJson(relPath) {
  const abs = path.resolve(relPath);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch {
    return null;
  }
}

function buildFinalStatus(data) {
  return [
    '# UltimateBridge Final Status V1.0',
    '',
    `protocol=${data.protocol}`,
    `version=${data.version}`,
    `decision=${data.decision}`,
    `productReady=${data.productReady}`,
    `generatedAt=${data.generatedAt}`,
    `hostname=${data.hostname}`,
    `cwd=${data.cwd}`,
    '',
    '## Verification',
    '',
    `status=${data.verification.status}`,
    `passed=${data.verification.passed}`,
    `failed=${data.verification.failed}`,
    `durationMs=${data.verification.durationMs}`,
    '',
    '## Final acceptance',
    '',
    `decision=${data.finalAcceptance.decision}`,
    `blockingIssues=${data.finalAcceptance.blockingIssues.join(',') || 'NONE'}`,
    '',
    '## Stable milestone count',
    '',
    `${data.stableMilestones}`,
    '',
    '## Release package',
    '',
    `releaseName=${data.releaseFreeze.releaseName}`,
    `proposedZipName=${data.releaseFreeze.proposedZipName}`,
    `manifestFiles=${data.releaseFreeze.manifestFiles}`,
    '',
    '## Safety',
    '',
    '- Human-gated operation remains required.',
    '- Read-only, preview, apply, rollback, diagnostics, and proof paths are separately tested.',
    '- No release publication is performed by this closure doc generator.',
    ''
  ].join('\n');
}

function buildStartHere(data) {
  return [
    '# START HERE - UltimateBridge V1.0',
    '',
    'Use this file as the entry point for the next ChatGPT session or local operator session.',
    '',
    '## Current state',
    '',
    `UltimateBridge ${data.version}`,
    `decision=${data.decision}`,
    `productReady=${data.productReady}`,
    `stableMilestones=${data.stableMilestones}`,
    '',
    '## First local commands',
    '',
    '```powershell',
    'npm run verify:local',
    'npm run status:local',
    'npm run acceptance:v1:sweep',
    'npm run closure:v1:docs',
    '```',
    '',
    '## Important generated files',
    '',
    `- ${data.handoverFiles.finalStatus}`,
    `- ${data.handoverFiles.nextChatHandover}`,
    `- ${data.handoverFiles.freezeInstructions}`,
    '',
    '## Operational boundary',
    '',
    'UltimateBridge V1.0 remains a human-gated local bridge. It prepares, verifies, and reports actions. Destructive, publishing, browser-send, native-host setup, and project-apply actions remain explicit operator decisions.',
    ''
  ].join('\n');
}

function buildHandover(data) {
  return [
    '# NEXT CHAT HANDOVER - UltimateBridge V1.0',
    '',
    `Project: ${data.productName}`,
    `Version: ${data.version}`,
    `Decision: ${data.decision}`,
    `ProductReady: ${data.productReady}`,
    `StableMilestones: ${data.stableMilestones}`,
    '',
    '## Latest proof summary',
    '',
    `Local verification: ${data.verification.status}`,
    `passed=${data.verification.passed}`,
    `failed=${data.verification.failed}`,
    `durationMs=${data.verification.durationMs}`,
    '',
    '## Continue from here',
    '',
    '1. Read `artifacts/v1-closure/FINAL_STATUS_V1_0.md`.',
    '2. Run `npm run verify:local` after any change.',
    '3. Run `npm run status:local` to inspect local health.',
    '4. Run `npm run release:freeze:plan` before building a final ZIP.',
    '5. Do not merge, publish, tag, upload, or apply without explicit operator proof.',
    '',
    '## Key commands',
    '',
    ...data.keyCommands.map((item) => `- ${item}`),
    ''
  ].join('\n');
}

function buildFreezeInstructions(data) {
  return [
    '# UltimateBridge V1.0 Freeze Instructions',
    '',
    `releaseName=${data.releaseFreeze.releaseName}`,
    `proposedZipName=${data.releaseFreeze.proposedZipName}`,
    '',
    '## Preflight',
    '',
    '```powershell',
    'npm run verify:local',
    'npm run status:local',
    'npm run acceptance:v1:sweep',
    'npm run release:freeze:plan',
    'npm run closure:v1:docs',
    '```',
    '',
    '## Manual freeze',
    '',
    'Create the ZIP manually from the repository working tree using the release freeze include/exclude plan. Store the ZIP outside the repository artifacts folder and record its SHA256 next to the generated release manifest.',
    '',
    '## Not performed by this script',
    '',
    '- no Git tag',
    '- no GitHub release',
    '- no upload',
    '- no publish',
    ''
  ].join('\n');
}
