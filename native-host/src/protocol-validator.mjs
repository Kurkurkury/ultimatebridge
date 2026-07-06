import os from 'node:os';
import { MODES, REQUEST_PROTOCOL } from '../../common/constants.mjs';

export function normalizeRequest(input, options = {}) {
  if (typeof input === 'object' && input !== null) {
    return normalizeObjectRequest(input, options);
  }

  if (typeof input !== 'string') {
    throw block('REQUEST_NOT_TEXT_OR_OBJECT', 'Request must be a string or object.');
  }

  const trimmed = input.trim();
  if (trimmed.startsWith('{')) {
    return normalizeObjectRequest(JSON.parse(trimmed), options);
  }

  return normalizeLegacyRequest(trimmed, options);
}

function normalizeObjectRequest(request, options) {
  const normalized = {
    protocol: request.protocol ?? REQUEST_PROTOCOL,
    requestId: String(request.requestId ?? 'AUTO'),
    mode: request.mode ?? 'READ_ONLY',
    targetHost: request.targetHost,
    taskName: request.taskName ?? 'UntitledTask',
    createdBy: request.createdBy ?? 'chatgpt',
    body: typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? ''),
    approvedProjectRoot: request.approvedProjectRoot,
    changes: request.changes
  };

  validateNormalized(normalized, options);
  return normalized;
}

function normalizeLegacyRequest(text, options) {
  const requestId = matchFirst(text, /AUTO_BRIDGE_REQUEST_ID\s*=\s*([^\r\n]+)/i) ?? 'AUTO';
  const mode = matchFirst(text, /\bMODE\s*=\s*(READ_ONLY|SAFE_CHANGE_PREVIEW|SAFE_CHANGE|PROJECT_CHANGE|EXECUTION_LOCKED)\b/i) ?? 'READ_ONLY';
  const targetHost = matchFirst(text, /\bTARGET_HOST\s*=\s*([A-Za-z0-9_.-]+)/i) ?? options.defaultTargetHost;
  const taskName = matchFirst(text, /BeginTask\.ps1['" ]+([^'"\r\n]+)/i) ?? 'LegacyAutoBridgeTask';

  const normalized = {
    protocol: REQUEST_PROTOCOL,
    requestId: requestId.replace(/^[']|[']$/g, '').replace(/^["]|["]$/g, '').trim(),
    mode: mode.toUpperCase(),
    targetHost,
    taskName,
    createdBy: 'chatgpt-legacy',
    body: text
  };

  validateLegacyShape(text);
  validateNormalized(normalized, options);
  return normalized;
}

function validateLegacyShape(text) {
  if (!/AUTO_BRIDGE_REQUEST_ID\s*=/i.test(text)) {
    throw block('MISSING_REQUEST_ID', 'Legacy request is missing AUTO_BRIDGE_REQUEST_ID.');
  }

  const beginIndex = text.search(/\b(AB5|UB)_BeginTask\.ps1\b/i);
  if (beginIndex === -1) {
    throw block('MISSING_BEGIN_TASK', 'First task gate script is missing.');
  }
}

function validateNormalized(request, options) {
  if (request.protocol !== REQUEST_PROTOCOL) {
    throw block('BAD_PROTOCOL', `Unsupported protocol: ${request.protocol}`);
  }

  if (!MODES.includes(request.mode)) {
    throw block('BAD_MODE', `Unsupported mode: ${request.mode}`);
  }

  const localHost = (options.localHost ?? os.hostname()).toUpperCase();
  if (request.targetHost && request.targetHost.toUpperCase() !== localHost) {
    throw block('HOST_MISMATCH', `Target host ${request.targetHost} does not match ${localHost}.`);
  }

  if (!request.body && request.mode !== 'EXECUTION_LOCKED' && request.mode !== 'SAFE_CHANGE' && request.mode !== 'SAFE_CHANGE_PREVIEW') {
    throw block('EMPTY_BODY', 'Request body is empty.');
  }

  if (request.mode === 'SAFE_CHANGE' || request.mode === 'SAFE_CHANGE_PREVIEW') {
    if (!request.approvedProjectRoot) {
      throw block('MISSING_APPROVED_PROJECT_ROOT', `${request.mode} requires approvedProjectRoot.`);
    }
    if (!Array.isArray(request.changes) || request.changes.length === 0) {
      throw block('MISSING_CHANGES', `${request.mode} requires a non-empty changes array.`);
    }
  }
}

function matchFirst(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : null;
}

function block(code, message) {
  const error = new Error(message);
  error.code = code;
  error.status = 'BLOCKED';
  return error;
}
