import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function createJob(request, options = {}) {
  const root = options.root ?? process.env.ULTIMATEBRIDGE_RUN_ROOT ?? path.join(os.tmpdir(), 'ultimatebridge', 'runs');
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const safeTask = safeName(request.taskName ?? 'Task');
  const jobId = `${stamp}_${safeTask}_${request.requestId}`;
  const runFolder = path.join(root, jobId);

  await fs.mkdir(runFolder, { recursive: true });
  await fs.writeFile(path.join(runFolder, 'request.normalized.json'), JSON.stringify({ ...request, jobId }, null, 2), 'utf8');

  return { jobId, runFolder };
}

function safeName(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]+/g, '_').slice(0, 64) || 'Task';
}
