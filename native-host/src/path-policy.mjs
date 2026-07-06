import path from 'node:path';

export function resolveInsideRoot(approvedProjectRoot, targetRelativePath) {
  if (!approvedProjectRoot || typeof approvedProjectRoot !== 'string') {
    throw policyError('MISSING_APPROVED_PROJECT_ROOT', 'approvedProjectRoot is required for SAFE_CHANGE.');
  }

  if (!targetRelativePath || typeof targetRelativePath !== 'string') {
    throw policyError('MISSING_TARGET_PATH', 'target relative path is required.');
  }

  if (path.isAbsolute(targetRelativePath)) {
    throw policyError('ABSOLUTE_TARGET_PATH_BLOCKED', 'target path must be relative to approvedProjectRoot.');
  }

  const root = path.resolve(approvedProjectRoot);
  const target = path.resolve(root, targetRelativePath);
  const relative = path.relative(root, target);

  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw policyError('TARGET_OUTSIDE_APPROVED_ROOT', `target path escapes approvedProjectRoot: ${targetRelativePath}`);
  }

  return { root, target, relative };
}

export function policyError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.status = 'BLOCKED';
  return error;
}
