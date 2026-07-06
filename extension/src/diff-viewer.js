export function buildDiffViewerState(queue) {
  const entries = Array.isArray(queue) ? queue : [];
  const latestPreview = entries.find((item) => item?.isPreview && item?.previewHash) ?? null;

  if (!latestPreview) {
    return {
      available: false,
      reason: 'NO_PREVIEW_AVAILABLE',
      text: 'No SAFE_CHANGE_PREVIEW diff is available. Run preview first.'
    };
  }

  const changes = Array.isArray(latestPreview.previewChanges) ? latestPreview.previewChanges : [];
  const changeSummaries = changes.map((change, index) => summarizeChange(change, index));

  return {
    available: true,
    previewJobId: latestPreview.jobId ?? null,
    previewHash: latestPreview.previewHash ?? null,
    requiredPreviewHash: latestPreview.requiredPreviewHash ?? null,
    previewJsonPath: latestPreview.previewJsonPath ?? null,
    previewDiffPath: latestPreview.previewDiffPath ?? null,
    approvedProjectRoot: latestPreview.approvedProjectRoot ?? null,
    changeCount: changeSummaries.length,
    changes: changeSummaries,
    text: formatDiffViewerState({
      available: true,
      previewJobId: latestPreview.jobId ?? null,
      previewHash: latestPreview.previewHash ?? null,
      requiredPreviewHash: latestPreview.requiredPreviewHash ?? null,
      previewJsonPath: latestPreview.previewJsonPath ?? null,
      previewDiffPath: latestPreview.previewDiffPath ?? null,
      approvedProjectRoot: latestPreview.approvedProjectRoot ?? null,
      changeCount: changeSummaries.length,
      changes: changeSummaries
    })
  };
}

export function formatDiffViewerState(state) {
  if (!state?.available) {
    return state?.text ?? 'No SAFE_CHANGE_PREVIEW diff is available. Run preview first.';
  }

  const lines = [
    'ULTIMATEBRIDGE DIFF PREVIEW',
    `previewJobId=${state.previewJobId ?? '(none)'}`,
    `previewHash=${state.previewHash ?? '(none)'}`,
    `requiredPreviewHash=${state.requiredPreviewHash ?? '(none)'}`,
    `approvedProjectRoot=${state.approvedProjectRoot ?? '(none)'}`,
    `previewJsonPath=${state.previewJsonPath ?? '(none)'}`,
    `previewDiffPath=${state.previewDiffPath ?? '(none)'}`,
    `changeCount=${state.changeCount ?? 0}`
  ];

  const changes = Array.isArray(state.changes) ? state.changes : [];
  for (const change of changes) {
    lines.push('');
    lines.push(`change[${change.index}] op=${change.op}`);
    lines.push(`path=${change.path}`);
    if (change.searchPreview !== null) lines.push(`search=${change.searchPreview}`);
    if (change.replacePreview !== null) lines.push(`replace=${change.replacePreview}`);
    if (change.contentPreview !== null) lines.push(`content=${change.contentPreview}`);
    lines.push(`risk=${change.risk}`);
  }

  return lines.join('\n');
}

function summarizeChange(change, index) {
  const op = String(change?.op ?? 'unknown');
  const path = String(change?.path ?? '(missing path)');
  const search = typeof change?.search === 'string' ? change.search : null;
  const replace = typeof change?.replace === 'string' ? change.replace : null;
  const content = typeof change?.content === 'string' ? change.content : null;

  return {
    index,
    op,
    path,
    searchPreview: previewText(search),
    replacePreview: previewText(replace),
    contentPreview: previewText(content),
    risk: classifyRisk({ op, path, search, replace, content })
  };
}

function previewText(value) {
  if (value === null) return null;
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= 160) return compact;
  return `${compact.slice(0, 157)}...`;
}

function classifyRisk({ op, path, search, replace, content }) {
  if (path.includes('..') || path.startsWith('/') || /^[A-Za-z]:/.test(path)) return 'blocked-by-path-policy-if-executed';
  if (op === 'replaceText' && (!search || search === replace)) return 'check-required';
  if (op === 'writeTextFile' && typeof content === 'string' && content.length > 50000) return 'large-write';
  return 'normal';
}
