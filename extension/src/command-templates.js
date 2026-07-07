import { buildArtifactOpenPlan, formatArtifactOpenPlan } from './artifact-open-plan.js';
import { buildSafeChangeApplyBlock, findLatestPreviewQueueItem } from './delivery-queue.js';
import { buildFinalReviewChecklist, formatFinalReviewChecklist } from './final-review-checklist.js';
import { buildBrowserSessionSummary, formatBrowserSessionSummary } from './session-summary.js';

export function buildCommandTemplateLibrary(queue, insertion = null, applyBlockState = null) {
  const entries = Array.isArray(queue) ? queue : [];
  const latestPreview = findLatestPreviewQueueItem(entries);
  const latestApply = entries.find((item) => !item?.isPreview && item?.summary?.includes('SAFE_CHANGE applied')) ?? null;
  const artifactPlan = buildArtifactOpenPlan(entries);
  const checklist = buildFinalReviewChecklist(entries, insertion, applyBlockState);
  const sessionSummary = buildBrowserSessionSummary(entries, insertion, applyBlockState);

  const templates = [
    buildReadOnlyHealthTemplate(),
    buildSafeChangePreviewSkeleton(latestPreview),
    buildApplyFromLatestPreviewTemplate(latestPreview),
    buildRollbackRestoreTemplate(latestApply),
    buildArtifactChecklistTemplate(artifactPlan),
    buildSessionSummaryTemplate(sessionSummary),
    buildFinalReviewTemplate(checklist)
  ];

  return {
    available: templates.length > 0,
    templateCount: templates.length,
    nextRecommendedTemplateId: chooseNextRecommendedTemplateId({ checklist, latestPreview, latestApply }),
    templates
  };
}

export function formatCommandTemplateLibrary(library) {
  const templates = Array.isArray(library?.templates) ? library.templates : [];
  const lines = [
    'ULTIMATEBRIDGE COMMAND TEMPLATE LIBRARY',
    `available=${library?.available === true}`,
    `templateCount=${templates.length}`,
    `nextRecommendedTemplateId=${library?.nextRecommendedTemplateId ?? '(none)'}`
  ];

  for (const template of templates) {
    lines.push('');
    lines.push(`template[${template.index}] id=${template.id}`);
    lines.push(`title=${template.title}`);
    lines.push(`ready=${template.ready}`);
    lines.push(`purpose=${template.purpose}`);
    lines.push(`manualBoundary=${template.manualBoundary}`);
    lines.push(`copyTextPreview=${previewTemplateText(template.copyText)}`);
  }

  return lines.join('\n');
}

export function getCommandTemplateById(library, templateId) {
  return library?.templates?.find((template) => template.id === templateId) ?? null;
}

function buildReadOnlyHealthTemplate() {
  return template({
    index: 0,
    id: 'read-only-healthcheck',
    title: 'READ_ONLY HealthCheck',
    ready: true,
    purpose: 'Ask the native host for a read-only health check.',
    copyText: [
      'AUTO_BRIDGE_REQUEST_ID=AUTO',
      'TARGET_HOST=<YOUR_COMPUTERNAME>',
      '& .\\runner\\powershell\\UB_BeginTask.ps1 HealthCheck'
    ].join('\n')
  });
}

function buildSafeChangePreviewSkeleton(latestPreview) {
  return template({
    index: 1,
    id: 'safe-change-preview-skeleton',
    title: 'SAFE_CHANGE_PREVIEW skeleton',
    ready: true,
    purpose: 'Create a non-mutating preview request with placeholders for root and changes.',
    copyText: JSON.stringify({
      protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
      requestId: 'AUTO',
      mode: 'SAFE_CHANGE_PREVIEW',
      taskName: 'PreviewChange',
      approvedProjectRoot: latestPreview?.approvedProjectRoot ?? '<APPROVED_PROJECT_ROOT>',
      changes: [
        { op: 'replaceText', path: '<relative/path.txt>', search: '<before>', replace: '<after>' }
      ]
    }, null, 2)
  });
}

function buildApplyFromLatestPreviewTemplate(latestPreview) {
  const ready = Boolean(latestPreview?.previewHash && latestPreview?.approvedProjectRoot && latestPreview?.previewChanges?.length);
  return template({
    index: 2,
    id: 'apply-from-latest-preview',
    title: 'Apply from latest preview',
    ready,
    purpose: 'Build a SAFE_CHANGE apply block from the latest preview hash and structured changes.',
    copyText: ready
      ? buildSafeChangeApplyBlock(latestPreview, { requestId: 'AUTO', taskName: 'ApplyFromLatestPreview' })
      : 'No latest SAFE_CHANGE_PREVIEW with structured changes is available. Run preview first.'
  });
}

function buildRollbackRestoreTemplate(latestApply) {
  const restoreArtifact = latestApply?.artifacts?.find((artifact) => String(artifact?.path ?? '').replace(/\\/g, '/').endsWith('/rollback-restore-command.txt')) ?? null;
  return template({
    index: 3,
    id: 'rollback-restore-review',
    title: 'Rollback restore review',
    ready: Boolean(restoreArtifact),
    purpose: 'Point to the rollback restore command artifact. Use only after explicit rollback decision.',
    copyText: restoreArtifact
      ? [
        'ROLLBACK RESTORE REVIEW',
        'Do not run automatically. Review this restore command artifact first:',
        restoreArtifact.path
      ].join('\n')
      : 'No rollback restore command artifact is available. Complete a SAFE_CHANGE apply first.'
  });
}

function buildArtifactChecklistTemplate(artifactPlan) {
  return template({
    index: 4,
    id: 'artifact-checklist',
    title: 'Artifact checklist',
    ready: artifactPlan.available === true,
    purpose: 'Copy the current artifact review checklist into ChatGPT.',
    copyText: formatArtifactOpenPlan(artifactPlan)
  });
}

function buildSessionSummaryTemplate(sessionSummary) {
  return template({
    index: 5,
    id: 'session-summary',
    title: 'Session summary',
    ready: sessionSummary.available === true,
    purpose: 'Copy the current session summary and next ChatGPT message.',
    copyText: formatBrowserSessionSummary(sessionSummary)
  });
}

function buildFinalReviewTemplate(checklist) {
  return template({
    index: 6,
    id: 'final-review-checklist',
    title: 'Final review checklist',
    ready: checklist.readyToApply === true || checklist.readyToComplete === true,
    purpose: 'Copy the final readiness checklist into ChatGPT.',
    copyText: formatFinalReviewChecklist(checklist)
  });
}

function template({ index, id, title, ready, purpose, copyText }) {
  return {
    index,
    id,
    title,
    ready: Boolean(ready),
    purpose,
    manualBoundary: 'copy-only; user must review and send manually',
    copyText
  };
}

function chooseNextRecommendedTemplateId({ checklist, latestPreview, latestApply }) {
  if (!latestPreview) return 'safe-change-preview-skeleton';
  if (checklist.readyToApply && !latestApply) return 'apply-from-latest-preview';
  if (checklist.readyToComplete) return 'session-summary';
  if (latestApply) return 'artifact-checklist';
  return 'final-review-checklist';
}

function previewTemplateText(text) {
  const compact = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (compact.length <= 180) return compact;
  return `${compact.slice(0, 177)}...`;
}
