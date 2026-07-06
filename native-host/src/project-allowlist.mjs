import fs from 'node:fs/promises';
import path from 'node:path';
import { policyError } from './path-policy.mjs';

export const DEFAULT_ALLOWLIST_PATH = path.resolve('config', 'project-allowlist.local.json');

export async function assertProjectRootAllowed(approvedProjectRoot, options = {}) {
  const allowlistPath = path.resolve(options.allowlistPath ?? process.env.ULTIMATEBRIDGE_PROJECT_ALLOWLIST_PATH ?? DEFAULT_ALLOWLIST_PATH);
  const allowlist = await readAllowlist(allowlistPath);
  const approvedRoot = normalizeRoot(approvedProjectRoot);
  const allowedRoots = allowlist.allowedProjectRoots.map(normalizeRoot);

  if (!allowedRoots.includes(approvedRoot)) {
    throw policyError(
      'PROJECT_ROOT_NOT_ALLOWLISTED',
      `approvedProjectRoot is not in the UltimateBridge project allowlist: ${approvedRoot}`
    );
  }

  return {
    allowlistPath,
    approvedProjectRoot: approvedRoot,
    allowed: true,
    matchedRoot: approvedRoot
  };
}

export async function readAllowlist(allowlistPath) {
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(allowlistPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw policyError(
        'PROJECT_ALLOWLIST_MISSING',
        `Project allowlist file is missing: ${allowlistPath}`
      );
    }
    throw error;
  }

  if (parsed?.protocol !== 'ULTIMATEBRIDGE_PROJECT_ALLOWLIST_V1') {
    throw policyError('BAD_PROJECT_ALLOWLIST_PROTOCOL', 'Project allowlist protocol is missing or unsupported.');
  }

  if (!Array.isArray(parsed.allowedProjectRoots) || parsed.allowedProjectRoots.length === 0) {
    throw policyError('PROJECT_ALLOWLIST_EMPTY', 'Project allowlist requires a non-empty allowedProjectRoots array.');
  }

  return parsed;
}

export function normalizeRoot(root) {
  if (!root || typeof root !== 'string') {
    throw policyError('MISSING_APPROVED_PROJECT_ROOT', 'approvedProjectRoot is required.');
  }
  return path.resolve(root);
}
