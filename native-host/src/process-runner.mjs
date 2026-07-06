import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function runPowerShellScript(scriptPath, args = [], options = {}) {
  const timeoutSeconds = options.timeoutSeconds ?? 300;
  const cwd = options.cwd ?? process.cwd();
  const runFolder = options.runFolder;
  const startedAt = new Date();

  let timedOut = false;
  let stdout = '';
  let stderr = '';

  await fs.access(scriptPath);

  const child = spawn('pwsh', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args], {
    cwd,
    windowsHide: true,
    shell: false
  });

  const timeout = setTimeout(() => {
    timedOut = true;
    try {
      child.kill('SIGTERM');
    } catch {
      // best effort
    }
  }, timeoutSeconds * 1000);

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString('utf8');
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8');
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });

  clearTimeout(timeout);

  const finishedAt = new Date();
  const result = {
    scriptPath,
    args,
    cwd,
    exitCode: timedOut ? 124 : exitCode,
    timedOut,
    timeoutSeconds,
    stdout,
    stderr,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime()
  };

  if (runFolder) {
    await fs.writeFile(path.join(runFolder, 'runner-result.json'), JSON.stringify(result, null, 2), 'utf8');
    await fs.writeFile(path.join(runFolder, 'stdout.txt'), stdout, 'utf8');
    await fs.writeFile(path.join(runFolder, 'stderr.txt'), stderr, 'utf8');
  }

  return result;
}
