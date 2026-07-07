export const CONNECTION_DIAGNOSTICS_PROTOCOL = 'ULTIMATEBRIDGE_BROWSER_NATIVE_CONNECTION_DIAGNOSTICS_V1';

export function buildBrowserNativeConnectionDiagnostics(input = {}) {
  const diagnostics = {
    protocol: CONNECTION_DIAGNOSTICS_PROTOCOL,
    createdAt: input.createdAt ?? new Date().toISOString(),
    nativeHostName: input.nativeHostName ?? null,
    runtime: {
      chromeRuntimeAvailable: Boolean(input.chromeRuntimeAvailable),
      manifestAvailable: Boolean(input.manifest),
      extensionId: input.extensionId ?? null,
      manifestVersion: input.manifest?.manifest_version ?? null,
      extensionName: input.manifest?.name ?? null,
      permissions: Array.isArray(input.manifest?.permissions) ? input.manifest.permissions : [],
      hostPermissions: Array.isArray(input.manifest?.host_permissions) ? input.manifest.host_permissions : []
    },
    background: {
      serviceWorkerReachable: Boolean(input.serviceWorkerReachable),
      nativeMessageApiAvailable: Boolean(input.nativeMessageApiAvailable),
      deliveryQueueLength: Number.isInteger(input.deliveryQueueLength) ? input.deliveryQueueLength : null,
      uploadPlanPresent: Boolean(input.uploadPlanPresent),
      lastRuntimeError: input.lastRuntimeError ?? null
    },
    installPlan: {
      expectedNativeHostName: input.nativeHostName ?? null,
      installCommand: 'npm run install:native-host:plan',
      extensionIdPlanCommand: 'npm run native-host:extension-id:plan -- -ExtensionId <id>',
      installPlanPath: 'artifacts/install/native-host-install-plan.json',
      extensionIdPlanPath: 'artifacts/install/native-host-extension-id-plan.json'
    },
    safety: {
      reportOnly: true,
      doesNotSendNativeMessage: input.doesNotSendNativeMessage !== false,
      doesNotSubmitBrowserMessage: true,
      doesNotApplySafeChange: true,
      doesNotWriteRegistry: true,
      doesNotUploadArtifacts: true,
      manualReviewRequired: true
    }
  };

  diagnostics.status = summarizeConnectionDiagnostics(diagnostics);
  return diagnostics;
}

export function summarizeConnectionDiagnostics(diagnostics) {
  const issues = [];
  if (!diagnostics.runtime.chromeRuntimeAvailable) issues.push('CHROME_RUNTIME_UNAVAILABLE');
  if (!diagnostics.runtime.manifestAvailable) issues.push('MANIFEST_UNAVAILABLE');
  if (!diagnostics.background.serviceWorkerReachable) issues.push('SERVICE_WORKER_UNREACHABLE');
  if (!diagnostics.background.nativeMessageApiAvailable) issues.push('NATIVE_MESSAGE_API_UNAVAILABLE');
  if (!diagnostics.nativeHostName) issues.push('NATIVE_HOST_NAME_MISSING');
  return {
    ok: issues.length === 0,
    issues,
    nextRecommendedAction: issues.length === 0
      ? 'Run native read-only smoke only when ready to test the real native host.'
      : 'Review extension reload, native host install plan, extension id plan, and browser permissions.'
  };
}

export function formatBrowserNativeConnectionDiagnostics(diagnostics) {
  return [
    '# Browser / Native Connection Diagnostics',
    '',
    `protocol=${diagnostics.protocol}`,
    `ok=${diagnostics.status.ok}`,
    `issues=${diagnostics.status.issues.join(',') || 'NONE'}`,
    `nativeHostName=${diagnostics.nativeHostName ?? 'UNKNOWN'}`,
    `extensionId=${diagnostics.runtime.extensionId ?? 'UNKNOWN'}`,
    `manifestVersion=${diagnostics.runtime.manifestVersion ?? 'UNKNOWN'}`,
    `extensionName=${diagnostics.runtime.extensionName ?? 'UNKNOWN'}`,
    `chromeRuntimeAvailable=${diagnostics.runtime.chromeRuntimeAvailable}`,
    `serviceWorkerReachable=${diagnostics.background.serviceWorkerReachable}`,
    `nativeMessageApiAvailable=${diagnostics.background.nativeMessageApiAvailable}`,
    `deliveryQueueLength=${diagnostics.background.deliveryQueueLength ?? 'UNKNOWN'}`,
    `uploadPlanPresent=${diagnostics.background.uploadPlanPresent}`,
    '',
    '## Install plan',
    '',
    `expectedNativeHostName=${diagnostics.installPlan.expectedNativeHostName ?? 'UNKNOWN'}`,
    `installCommand=${diagnostics.installPlan.installCommand}`,
    `extensionIdPlanCommand=${diagnostics.installPlan.extensionIdPlanCommand}`,
    `installPlanPath=${diagnostics.installPlan.installPlanPath}`,
    `extensionIdPlanPath=${diagnostics.installPlan.extensionIdPlanPath}`,
    '',
    '## Safety',
    '',
    `reportOnly=${diagnostics.safety.reportOnly}`,
    `doesNotSendNativeMessage=${diagnostics.safety.doesNotSendNativeMessage}`,
    `doesNotSubmitBrowserMessage=${diagnostics.safety.doesNotSubmitBrowserMessage}`,
    `doesNotApplySafeChange=${diagnostics.safety.doesNotApplySafeChange}`,
    `doesNotWriteRegistry=${diagnostics.safety.doesNotWriteRegistry}`,
    `manualReviewRequired=${diagnostics.safety.manualReviewRequired}`,
    '',
    '## Next recommended action',
    '',
    diagnostics.status.nextRecommendedAction,
    ''
  ].join('\n');
}
