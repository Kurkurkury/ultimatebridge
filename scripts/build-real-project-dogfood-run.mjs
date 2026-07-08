import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const outputDir = path.resolve('artifacts', 'dogfood');
const jsonPath = path.join(outputDir, 'real-project-dogfood-run.json');
const markdownPath = path.join(outputDir, 'real-project-dogfood-run.md');

const targetProjectRoot = process.argv.includes('--project-root')
  ? process.argv[process.argv.indexOf('--project-root') + 1]
  : process.env.ULTIMATEBRIDGE_DOGFOOD_PROJECT_ROOT ?? null;

const targetProjectLabel = process.argv.includes('--project-label')
  ? process.argv[process.argv.indexOf('--project-label') + 1]
  : process.env.ULTIMATEBRIDGE_DOGFOOD_PROJECT_LABEL ?? 'manual-real-project';

const report = {
  protocol: 'ULTIMATEBRIDGE_REAL_PROJECT_DOGFOOD_RUN_V1',
  mode: 'PLAN_AND_PROOF_TEMPLATE',
  generatedAt: new Date().toISOString(),
  hostname: os.hostname(),
  cwd: process.cwd(),
  node: process.version,
  targetProject: {
    label: targetProjectLabel,
    root: targetProjectRoot,
    rootProvided: Boolean(targetProjectRoot)
  },
  phases: [
    {
      id: 'readOnlyAnalysis',
      title: 'READ_ONLY analysis',
      goal: 'Use the browser workflow to request a scoped project analysis without target writes.',
      expectedArtifact: 'read-only report in delivery queue',
      operatorProof: 'Paste or upload the generated report summary.'
    },
    {
      id: 'preview',
      title: 'Preview',
      goal: 'Request a SAFE_CHANGE_PREVIEW for a small reversible documentation-only improvement.',
      expectedArtifact: 'preview report with diff and preview hash',
      operatorProof: 'Capture preview hash, changed files, and diff summary.'
    },
    {
      id: 'applyBlockPrepared',
      title: 'Apply block prepared',
      goal: 'Use the browser popup to build the apply block for manual review only.',
      expectedArtifact: 'SAFE_CHANGE apply block visible or copied, not submitted by automation',
      operatorProof: 'Confirm manual review gate and no automatic submit.'
    },
    {
      id: 'proof',
      title: 'Proof',
      goal: 'Run local verification and local status dashboard after the workflow.',
      expectedArtifact: 'artifacts/local-verification/latest.md and artifacts/local-status/latest.md',
      operatorProof: 'Upload latest.md proof artifacts.'
    }
  ],
  suggestedBrowserPrompts: {
    readOnly: buildReadOnlyPrompt(targetProjectRoot),
    preview: buildPreviewPrompt(targetProjectRoot),
    proof: 'Run npm run verify:local and npm run status:local, then upload artifacts/local-verification/latest.md and artifacts/local-status/latest.md.'
  },
  acceptanceCriteria: [
    'READ_ONLY analysis report exists.',
    'Preview report exists and includes a preview hash.',
    'Apply block is prepared only for manual review.',
    'No automation submits the apply block.',
    'Local verification passes after the dogfood workflow.',
    'Local status dashboard is generated after the dogfood workflow.'
  ],
  quickActions: [
    'npm run status:local',
    'npm run verify:local',
    'npm run extension:load:checklist',
    'npm run native-host:install:rehearsal'
  ],
  outputs: {
    json: path.relative(process.cwd(), jsonPath),
    markdown: path.relative(process.cwd(), markdownPath)
  }
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(markdownPath, formatMarkdown(report), 'utf8');
console.log(JSON.stringify(report, null, 2));
console.log(`Dogfood run plan written: ${jsonPath}`);
console.log(`Dogfood run plan written: ${markdownPath}`);

function buildReadOnlyPrompt(root) {
  return JSON.stringify({
    action: 'READ_ONLY',
    approvedProjectRoot: root ?? '<REAL_PROJECT_ROOT>',
    task: 'Analyze the project structure and identify one tiny documentation-only improvement suitable for SAFE_CHANGE_PREVIEW.'
  }, null, 2);
}

function buildPreviewPrompt(root) {
  return JSON.stringify({
    action: 'SAFE_CHANGE_PREVIEW',
    approvedProjectRoot: root ?? '<REAL_PROJECT_ROOT>',
    task: 'Prepare a minimal documentation-only update based on the READ_ONLY analysis. Preview only; do not apply.'
  }, null, 2);
}

function formatMarkdown(report) {
  const lines = [
    '# UltimateBridge Real Project Dogfood Run',
    '',
    `protocol=${report.protocol}`,
    `mode=${report.mode}`,
    `generatedAt=${report.generatedAt}`,
    `hostname=${report.hostname}`,
    `cwd=${report.cwd}`,
    `targetProjectLabel=${report.targetProject.label}`,
    `targetProjectRoot=${report.targetProject.root ?? 'NOT_PROVIDED'}`,
    '',
    '## Phases',
    ''
  ];

  for (const phase of report.phases) {
    lines.push(`### ${phase.title}`, '', `goal=${phase.goal}`, `expectedArtifact=${phase.expectedArtifact}`, `operatorProof=${phase.operatorProof}`, '');
  }

  lines.push('## Suggested READ_ONLY prompt', '', '```json', report.suggestedBrowserPrompts.readOnly, '```', '');
  lines.push('## Suggested preview prompt', '', '```json', report.suggestedBrowserPrompts.preview, '```', '');
  lines.push('## Acceptance criteria', '');
  for (const item of report.acceptanceCriteria) lines.push(`- ${item}`);
  lines.push('', '## Quick actions', '');
  for (const item of report.quickActions) lines.push(`- ${item}`);
  lines.push('', '## PR comment summary', '', '```text');
  lines.push('Real project dogfood run plan generated');
  lines.push(`targetProjectRootProvided=${report.targetProject.rootProvided}`);
  lines.push(`phases=${report.phases.length}`);
  lines.push('```', '');
  return lines.join('\n');
}
