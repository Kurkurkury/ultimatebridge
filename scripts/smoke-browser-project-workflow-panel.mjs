import fs from 'node:fs/promises';

const popupHtml = await fs.readFile('extension/src/popup/popup.html', 'utf8');
const workflowJs = await fs.readFile('extension/src/popup/project-workflow-panel.js', 'utf8');
const verifyLocal = await fs.readFile('scripts/verify-local.mjs', 'utf8');

const requiredIds = [
  'project-workflow-panel',
  'project-workflow-status',
  'workflow-show-project',
  'workflow-copy-analyze',
  'workflow-copy-preview',
  'workflow-build-apply',
  'workflow-copy-proof'
];

const result = {
  requiredIds,
  staticChecks: {
    htmlHasAllWorkflowIds: requiredIds.every((id) => popupHtml.includes(id)),
    htmlShowsProjectAnalyzePreviewApplyProof: ['Project', 'Analyze', 'Preview', 'Apply', 'Proof'].every((text) => popupHtml.includes(text)),
    htmlLoadsWorkflowScript: popupHtml.includes('project-workflow-panel.js'),
    jsReadsWorkflowStatus: workflowJs.includes('project-workflow-status'),
    jsReadsWorkflowButtons: ['workflow-show-project', 'workflow-copy-analyze', 'workflow-copy-preview', 'workflow-build-apply', 'workflow-copy-proof'].every((id) => workflowJs.includes(id)),
    jsUsesExistingRootButtons: workflowJs.includes('show-project-root-memory') && workflowJs.includes('show-project-root-labels'),
    jsUsesReadOnlyTemplate: workflowJs.includes('read-only-healthcheck'),
    jsUsesPreviewTemplate: workflowJs.includes('safe-change-preview-skeleton'),
    jsUsesSelectedTemplateCopy: workflowJs.includes('copy-selected-command-template'),
    jsUsesBuildSafeChange: workflowJs.includes('build-safe-change'),
    jsUsesSessionSummaryProof: workflowJs.includes('copy-session-summary'),
    jsMentionsManualReview: workflowJs.includes('manual review') || workflowJs.includes('send manually'),
    jsDoesNotSubmitChat: !workflowJs.includes('submit()') && !workflowJs.includes('clickById(\'detect-latest\')'),
    verifyLocalIncludesSmoke: verifyLocal.includes('smoke:browser-project-workflow-panel')
  }
};

console.log(JSON.stringify(result, null, 2));

if (!Object.values(result.staticChecks).every(Boolean)) {
  process.exitCode = 1;
}
