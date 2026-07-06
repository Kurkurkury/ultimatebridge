import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleMessage } from '../native-host/src/host.mjs';
import {
  buildDeliveryQueueItem,
  buildSafeChangeApplyBlock,
  findLatestPreviewQueueItem
} from '../extension/src/delivery-queue.js';
import { buildArtifactOpenPlan, formatArtifactOpenPlan } from '../extension/src/artifact-open-plan.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ultimatebridge-artifact-open-plan-'));
const configDir = path.resolve('config');
const configPath = path.join(configDir, 'project-allowlist.local.json');
await fs.mkdir(configDir, { recursive: true });
await fs.writeFile(configPath, JSON.stringify({
  protocol: 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1',
  allowedProjectRoots: [root]
}, null, 2), 'utf8');

const targetPath = path.join(root, 'notes', 'artifacts.txt');
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(targetPath, 'before artifact plan', 'utf8');

const previewResponse = await handleMessage({
  body: {
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: 'ARTIFACT_PLAN_PREVIEW',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: 'BrowserArtifactOpenPlanPreview',
    approvedProjectRoot: root,
    changes: [
      { op: 'replaceText', path: 'notes/artifacts.txt', search: 'before', replace: 'after' }
    ]
  }
});

const afterPreview = await fs.readFile(targetPath, 'utf8');
const previewQueueItem = buildDeliveryQueueItem(previewResponse, '2026-01-01T00:00:00.000Z');
const applyBlock = buildSafeChangeApplyBlock(findLatestPreviewQueueItem([previewQueueItem]), {
  requestId: 'ARTIFACT_PLAN_APPLY',
  taskName: 'BrowserArtifactOpenPlanApply'
});
const applyResponse = await handleMessage({ body: JSON.parse(applyBlock) });
const afterApply = await fs.readFile(targetPath, 'utf8');
const applyQueueItem = buildDeliveryQueueItem(applyResponse, '2026-01-01T00:00:01.000Z');
const plan = buildArtifactOpenPlan([applyQueueItem, previewQueueItem]);
const formattedPlan = formatArtifactOpenPlan(plan);

const popupHtml = await fs.readFile('extension/src/popup/popup.html', 'utf8');
const popupJs = await fs.readFile('extension/src/popup/popup.js', 'utf8');

const roles = plan.artifacts.map((artifact) => artifact.role);
const result = {
  root,
  configPath,
  afterPreview,
  afterApply,
  previewJobId: previewQueueItem.jobId,
  applyJobId: applyQueueItem.jobId,
  plan,
  formattedPlan,
  roles,
  staticChecks: {
    popupHasArtifactOpenPlanSection: popupHtml.includes('artifact-open-plan'),
    popupHasShowButton: popupHtml.includes('show-artifact-open-plan'),
    popupHasCopyButton: popupHtml.includes('copy-artifact-open-plan'),
    popupImportsArtifactOpenPlan: popupJs.includes('formatArtifactOpenPlan'),
    popupUpdatesPlanOnQueueLoad: popupJs.includes('updateArtifactOpenPlan(currentQueue)'),
    popupClearsPlanOnQueueClear: popupJs.includes('updateArtifactOpenPlan([])'),
    planShowsHeader: formattedPlan.includes('ULTIMATEBRIDGE ARTIFACT OPEN/UPLOAD PLAN'),
    planShowsPreviewDiff: formattedPlan.includes('role=previewDiff'),
    planShowsApplyResult: formattedPlan.includes('role=applyResult'),
    planShowsRollbackPlan: formattedPlan.includes('role=rollbackPlan'),
    planShowsRestoreCommand: formattedPlan.includes('role=rollbackRestoreCommand'),
    planShowsNextReview: formattedPlan.includes('nextReview='),
    planShowsUploadFlags: formattedPlan.includes('upload=true')
  }
};

console.log(JSON.stringify(result, null, 2));
console.log('\n' + formattedPlan);

if (
  !previewResponse.ok ||
  !applyResponse.ok ||
  afterPreview !== 'before artifact plan' ||
  afterApply !== 'after artifact plan' ||
  !plan.available ||
  !roles.includes('runnerReport') ||
  !roles.includes('previewJson') ||
  !roles.includes('previewDiff') ||
  !roles.includes('applyResult') ||
  !roles.includes('rollbackPlan') ||
  !roles.includes('rollbackRestoreCommand') ||
  !result.staticChecks.popupHasArtifactOpenPlanSection ||
  !result.staticChecks.popupHasShowButton ||
  !result.staticChecks.popupHasCopyButton ||
  !result.staticChecks.popupImportsArtifactOpenPlan ||
  !result.staticChecks.popupUpdatesPlanOnQueueLoad ||
  !result.staticChecks.popupClearsPlanOnQueueClear ||
  !result.staticChecks.planShowsHeader ||
  !result.staticChecks.planShowsPreviewDiff ||
  !result.staticChecks.planShowsApplyResult ||
  !result.staticChecks.planShowsRollbackPlan ||
  !result.staticChecks.planShowsRestoreCommand ||
  !result.staticChecks.planShowsNextReview ||
  !result.staticChecks.planShowsUploadFlags
) {
  process.exitCode = 1;
}
