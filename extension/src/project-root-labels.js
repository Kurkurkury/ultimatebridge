export function buildProjectRootLabels(memory, customLabels = {}) {
  const roots = Array.isArray(memory?.roots) ? memory.roots : [];
  const labelsByRoot = normalizeCustomLabels(customLabels);
  const items = roots.map((root, index) => {
    const label = labelsByRoot.get(root.toLowerCase()) ?? inferProjectRootLabel(root);
    return {
      index,
      root,
      label,
      isSelected: root === memory?.selectedRoot,
      source: labelsByRoot.has(root.toLowerCase()) ? 'custom' : 'inferred'
    };
  });

  return {
    available: items.length > 0,
    selectedLabel: items.find((item) => item.isSelected)?.label ?? null,
    selectedRoot: memory?.selectedRoot ?? null,
    itemCount: items.length,
    items,
    nextAction: items.length
      ? 'Use the label to confirm the intended project root before copying preview templates.'
      : 'Add or observe a project root first.'
  };
}

export function formatProjectRootLabels(labels) {
  const lines = [
    'ULTIMATEBRIDGE PROJECT ROOT LABELS',
    `available=${labels?.available === true}`,
    `itemCount=${labels?.itemCount ?? 0}`,
    `selectedLabel=${labels?.selectedLabel ?? '(none)'}`,
    `selectedRoot=${labels?.selectedRoot ?? '(none)'}`,
    `nextAction=${labels?.nextAction ?? 'Add or observe a project root first.'}`
  ];

  const items = Array.isArray(labels?.items) ? labels.items : [];
  for (const item of items) {
    lines.push('');
    lines.push(`root[${item.index}] label=${item.label}`);
    lines.push(`selected=${item.isSelected}`);
    lines.push(`source=${item.source}`);
    lines.push(`path=${item.root}`);
  }

  return lines.join('\n');
}

export function buildProjectRootLabelMap(labels) {
  const map = {};
  for (const item of labels?.items ?? []) {
    map[item.root] = item.label;
  }
  return map;
}

export function inferProjectRootLabel(root) {
  const normalized = String(root ?? '').replace(/\\/g, '/').replace(/\/+$/, '');
  if (!normalized) return 'UnknownRoot';
  const parts = normalized.split('/').filter(Boolean);
  const last = parts.at(-1) ?? 'Root';

  const projectMatch = last.match(/Projekt[_ -]?(\d{3})[_ -]?(.*)/i);
  if (projectMatch) {
    const number = projectMatch[1];
    const suffix = cleanupLabel(projectMatch[2]);
    return suffix ? `P${number} ${suffix}` : `P${number}`;
  }

  if (/ultimatebridge/i.test(last)) return 'UltimateBridge';
  if (/tradingbot/i.test(last)) return 'TradingBot';
  if (/autobridge/i.test(last)) return 'AutoBridge';

  return cleanupLabel(last) || 'Root';
}

function normalizeCustomLabels(customLabels) {
  const map = new Map();
  for (const [root, label] of Object.entries(customLabels ?? {})) {
    if (typeof root !== 'string' || typeof label !== 'string') continue;
    const normalizedRoot = root.trim().replace(/[\\/]+$/, '');
    const normalizedLabel = cleanupLabel(label);
    if (!normalizedRoot || !normalizedLabel) continue;
    map.set(normalizedRoot.toLowerCase(), normalizedLabel);
  }
  return map;
}

function cleanupLabel(value) {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);
}
