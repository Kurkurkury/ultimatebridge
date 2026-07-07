const workflowStatus = document.getElementById('project-workflow-status');
const workflowShowProject = document.getElementById('workflow-show-project');
const workflowCopyAnalyze = document.getElementById('workflow-copy-analyze');
const workflowCopyPreview = document.getElementById('workflow-copy-preview');
const workflowBuildApply = document.getElementById('workflow-build-apply');
const workflowCopyProof = document.getElementById('workflow-copy-proof');
const commandTemplateSelect = document.getElementById('command-template-select');
const copySelectedCommandTemplate = document.getElementById('copy-selected-command-template');

function setWorkflowStatus(text) {
  if (workflowStatus) workflowStatus.textContent = text;
}

function clickById(id) {
  document.getElementById(id)?.click();
}

function selectTemplate(templateId) {
  if (commandTemplateSelect) commandTemplateSelect.value = templateId;
}

workflowShowProject?.addEventListener('click', () => {
  clickById('show-project-root-memory');
  clickById('show-project-root-labels');
  setWorkflowStatus('Step 1 Project: remembered root and labels loaded. Review before continuing.');
});

workflowCopyAnalyze?.addEventListener('click', () => {
  selectTemplate('read-only-healthcheck');
  copySelectedCommandTemplate?.click();
  setWorkflowStatus('Step 2 Analyze: READ_ONLY template copied. Review and send manually.');
});

workflowCopyPreview?.addEventListener('click', () => {
  selectTemplate('safe-change-preview-skeleton');
  copySelectedCommandTemplate?.click();
  setWorkflowStatus('Step 3 Preview: SAFE_CHANGE_PREVIEW template copied. Review full root path before sending.');
});

workflowBuildApply?.addEventListener('click', () => {
  clickById('build-safe-change');
  setWorkflowStatus('Step 4 Apply: SAFE_CHANGE apply block prepared for manual review only. It is not submitted automatically.');
});

workflowCopyProof?.addEventListener('click', () => {
  clickById('copy-session-summary');
  setWorkflowStatus('Step 5 Proof: session summary copied for review and handoff.');
});
