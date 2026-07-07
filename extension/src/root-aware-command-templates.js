import { buildCommandTemplateLibrary, formatCommandTemplateLibrary, getCommandTemplateById } from './command-templates.js';
import { buildProjectRootLabels } from './project-root-labels.js';
import { buildProjectRootMemory } from './project-root-memory.js';

export function buildRootAwareCommandTemplateLibrary(queue, insertion = null, applyBlockState = null, options = {}) {
  const entries = Array.isArray(queue) ? queue : [];
  const memory = options.memory ?? buildProjectRootMemory(entries, options.storedRoots ?? []);
  const labels = options.labels ?? buildProjectRootLabels(memory, options.customLabels ?? {});
  const labelByRoot = Object.fromEntries((labels.items ?? []).map((item) => [item.root, item.label]));
  const base = buildCommandTemplateLibrary(entries, insertion, applyBlockState);
  const selectedRoot = memory.selectedRoot ?? null;
  const selectedLabel = selectedRoot ? (labelByRoot[selectedRoot] ?? labels.selectedLabel) : null;

  const templates = base.templates.map((template) => rootAwareTemplate(template, { selectedRoot, selectedLabel, labelByRoot }));

  return {
    ...base,
    rootAware: Boolean(selectedRoot),
    selectedRoot,
    selectedLabel,
    labels,
    templates
  };
}

export function formatRootAwareCommandTemplateLibrary(library) {
  return [
    'ULTIMATEBRIDGE ROOT-AWARE COMMAND TEMPLATE LIBRARY',
    `rootAware=${library?.rootAware === true}`,
    `selectedLabel=${library?.selectedLabel ?? '(none)'}`,
    `selectedRoot=${library?.selectedRoot ?? '(none)'}`,
    '',
    formatCommandTemplateLibrary(library)
  ].join('\n');
}

export function getRootAwareCommandTemplateById(library, templateId) {
  return getCommandTemplateById(library, templateId);
}

function rootAwareTemplate(template, context) {
  if (!context.selectedRoot) return template;
  if (template.id === 'safe-change-preview-skeleton') return rootAwarePreviewTemplate(template, context);
  if (template.id === 'apply-from-latest-preview') return rootAwareApplyTemplate(template, context);
  return {
    ...template,
    rootLabel: context.selectedLabel,
    rootPath: context.selectedRoot
  };
}

function rootAwarePreviewTemplate(template, context) {
  const parsed = parseJsonOrNull(template.copyText);
  const copyText = parsed
    ? JSON.stringify({
      ...parsed,
      projectLabel: context.selectedLabel,
      approvedProjectRoot: parsed.approvedProjectRoot === '<APPROVED_PROJECT_ROOT>' ? context.selectedRoot : parsed.approvedProjectRoot
    }, null, 2)
    : template.copyText;

  return {
    ...template,
    title: `SAFE_CHANGE_PREVIEW skeleton for ${context.selectedLabel}`,
    purpose: `Create a non-mutating preview request for ${context.selectedLabel}; review the full approvedProjectRoot before sending.`,
    rootLabel: context.selectedLabel,
    rootPath: context.selectedRoot,
    copyText
  };
}

function rootAwareApplyTemplate(template, context) {
  const parsed = parseJsonOrNull(template.copyText);
  const copyText = parsed
    ? JSON.stringify({ projectLabel: context.selectedLabel, ...parsed }, null, 2)
    : template.copyText;

  return {
    ...template,
    title: template.ready ? `Apply latest preview for ${context.selectedLabel}` : template.title,
    purpose: template.ready
      ? `Build a SAFE_CHANGE apply block for ${context.selectedLabel} from the latest preview hash and structured changes.`
      : template.purpose,
    rootLabel: context.selectedLabel,
    rootPath: context.selectedRoot,
    copyText
  };
}

function parseJsonOrNull(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
