export function buildProjectRootMemory(queue, storedRoots = [], options = {}) {
  const maxRoots = Number.isInteger(options.maxRoots) ? options.maxRoots : 10;
  const entries = Array.isArray(queue) ? queue : [];
  const rootsFromQueue = entries.flatMap((item) => [
    item?.approvedProjectRoot,
    item?.request?.approvedProjectRoot
  ]).filter(Boolean);
  const roots = dedupeRoots([...rootsFromQueue, ...(Array.isArray(storedRoots) ? storedRoots : [])]).slice(0, maxRoots);
  const selectedRoot = roots[0] ?? null;

  return {
    available: roots.length > 0,
    rootCount: roots.length,
    selectedRoot,
    roots,
    nextAction: selectedRoot
      ? 'Use selectedRoot for the next SAFE_CHANGE_PREVIEW template, then review before sending.'
      : 'Run SAFE_CHANGE_PREVIEW with an approvedProjectRoot first.'
  };
}

export function mergeProjectRootMemory(queue, storedRoots = [], options = {}) {
  return buildProjectRootMemory(queue, storedRoots, options).roots;
}

export function formatProjectRootMemory(memory) {
  const lines = [
    'ULTIMATEBRIDGE PROJECT ROOT MEMORY',
    `available=${memory?.available === true}`,
    `rootCount=${memory?.rootCount ?? 0}`,
    `selectedRoot=${memory?.selectedRoot ?? '(none)'}`,
    `nextAction=${memory?.nextAction ?? 'Run SAFE_CHANGE_PREVIEW with an approvedProjectRoot first.'}`
  ];

  const roots = Array.isArray(memory?.roots) ? memory.roots : [];
  roots.forEach((root, index) => lines.push(`root[${index}]=${root}`));
  return lines.join('\n');
}

export function buildPreviewTemplateFromProjectRootMemory(memory, options = {}) {
  const root = memory?.selectedRoot ?? '<APPROVED_PROJECT_ROOT>';
  return JSON.stringify({
    protocol: 'ULTIMATEBRIDGE_REQUEST_V1',
    requestId: options.requestId ?? 'AUTO',
    mode: 'SAFE_CHANGE_PREVIEW',
    taskName: options.taskName ?? 'PreviewChange',
    approvedProjectRoot: root,
    changes: [
      {
        op: 'replaceText',
        path: '<relative/path.txt>',
        search: '<before>',
        replace: '<after>'
      }
    ]
  }, null, 2);
}

function dedupeRoots(roots) {
  const seen = new Set();
  const result = [];
  for (const root of roots) {
    const normalized = normalizeRoot(root);
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }
  return result;
}

function normalizeRoot(root) {
  if (typeof root !== 'string') return null;
  const trimmed = root.trim();
  if (!trimmed) return null;
  return trimmed.replace(/[\\/]+$/, '');
}
