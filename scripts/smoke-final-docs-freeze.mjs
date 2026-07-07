import fs from 'node:fs';
import path from 'node:path';

const docs = [
  'docs/FINAL_STATUS_MVP_V1.md',
  'docs/START_HERE_MVP_V1.md',
  'docs/MILESTONES_MVP_V1.md',
  'docs/START_INSTALL_DIAGNOSTICS.md',
  'docs/BROWSER_PROJECT_WORKFLOW_PANEL.md',
  'docs/BROWSER_TEMPLATE_SELECTION_UI.md'
];

const requiredText = {
  'docs/FINAL_STATUS_MVP_V1.md': [
    'PRODUCT_READY_MVP_V1=YES',
    'MILESTONE_COUNT=29',
    'READ_ONLY',
    'SAFE_CHANGE_PREVIEW',
    'SAFE_CHANGE',
    'approvedProjectRoot',
    'preview hash',
    'rollback',
    'npm run diagnose:local',
    'npm run verify:local'
  ],
  'docs/START_HERE_MVP_V1.md': [
    'npm run diagnose:local',
    'npm run verify:local',
    'Project workflow',
    'Analyze',
    'Preview',
    'Apply',
    'Proof',
    'manual'
  ],
  'docs/MILESTONES_MVP_V1.md': [
    'MILESTONE_COUNT=29',
    'Read-only MVP Core',
    'Start Install Diagnostics',
    'Browser Project Workflow Panel',
    'Browser Template Selection UI'
  ],
  'docs/START_INSTALL_DIAGNOSTICS.md': [
    'npm run diagnose:local',
    'artifacts/local-diagnostics/latest.md',
    'smoke:local-diagnostics'
  ],
  'docs/BROWSER_PROJECT_WORKFLOW_PANEL.md': [
    'Project',
    'Analyze',
    'Preview',
    'Apply',
    'Proof'
  ],
  'docs/BROWSER_TEMPLATE_SELECTION_UI.md': [
    'command template selector',
    'copy-only',
    'read-only-healthcheck'
  ]
};

const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
const verifyLocal = fs.readFileSync(path.resolve('scripts/verify-local.mjs'), 'utf8');

const checks = [];

for (const doc of docs) {
  const exists = fs.existsSync(path.resolve(doc));
  checks.push({ name: `exists:${doc}`, ok: exists });
  const text = exists ? fs.readFileSync(path.resolve(doc), 'utf8') : '';
  for (const marker of requiredText[doc] ?? []) {
    checks.push({ name: `marker:${doc}:${marker}`, ok: text.includes(marker) });
  }
}

checks.push({
  name: 'packageHasFinalDocsSmoke',
  ok: packageJson.scripts?.['smoke:final-docs-freeze'] === 'node scripts/smoke-final-docs-freeze.mjs'
});
checks.push({
  name: 'verifyIncludesFinalDocsSmoke',
  ok: verifyLocal.includes('smoke:final-docs-freeze')
});

const result = {
  protocol: 'ULTIMATEBRIDGE_FINAL_DOCS_FREEZE_SMOKE_V1',
  status: checks.every((item) => item.ok) ? 'PASS' : 'FAIL',
  checkedDocs: docs,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (result.status !== 'PASS') process.exitCode = 1;
