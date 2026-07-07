import fs from 'node:fs';
import path from 'node:path';

const files = {
  diagnostics: 'extension/src/connection-diagnostics.js',
  nativeClient: 'extension/src/transport/native-client.js',
  serviceWorker: 'extension/src/service-worker/index.js',
  popupHtml: 'extension/src/popup/popup.html',
  popupJs: 'extension/src/popup/popup.js',
  installNativeHost: 'scripts/Install-NativeHost.ps1',
  extensionIdHelper: 'scripts/Set-NativeHostExtensionId.ps1',
  packageJson: 'package.json',
  verifyLocal: 'scripts/verify-local.mjs'
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const packageJson = JSON.parse(text.packageJson);
const expectedHost = 'com.ultimatebridge.host';

const checks = {
  diagnosticsModelExists: exists(files.diagnostics),
  diagnosticsProtocolPresent: text.diagnostics.includes('ULTIMATEBRIDGE_BROWSER_NATIVE_CONNECTION_DIAGNOSTICS_V1'),
  diagnosticsFormatsReport: text.diagnostics.includes('formatBrowserNativeConnectionDiagnostics'),
  diagnosticsIsReportOnly: text.diagnostics.includes('reportOnly: true') && text.diagnostics.includes('doesNotSendNativeMessage'),
  nativeClientExportsHostName: text.nativeClient.includes(`export const NATIVE_HOST_NAME = '${expectedHost}'`),
  nativeClientUsesExportedHostName: text.nativeClient.includes('chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME'),
  serviceWorkerImportsDiagnostics: text.serviceWorker.includes("../connection-diagnostics.js"),
  serviceWorkerImportsNativeHostName: text.serviceWorker.includes('NATIVE_HOST_NAME'),
  serviceWorkerHasDiagnosticsRoute: text.serviceWorker.includes('ULTIMATEBRIDGE_GET_CONNECTION_DIAGNOSTICS'),
  serviceWorkerDiagnosticsDoesNotSendNative: text.serviceWorker.includes('doesNotSendNativeMessage: true'),
  popupHasDiagnosticsButtons: text.popupHtml.includes('show-connection-diagnostics') && text.popupHtml.includes('copy-connection-diagnostics'),
  popupHasDiagnosticsOutput: text.popupHtml.includes('connection-diagnostics'),
  popupImportsDiagnosticsFormatter: text.popupJs.includes('formatBrowserNativeConnectionDiagnostics'),
  popupRequestsDiagnosticsRoute: text.popupJs.includes('ULTIMATEBRIDGE_GET_CONNECTION_DIAGNOSTICS'),
  popupCopiesDiagnostics: text.popupJs.includes('copyConnectionDiagnostics') && text.popupJs.includes('navigator.clipboard.writeText(text)'),
  installHostNameAligned: text.installNativeHost.includes(`$HostName = '${expectedHost}'`),
  extensionIdHelperHostNameAligned: text.extensionIdHelper.includes(`$HostName = '${expectedHost}'`),
  packageHasSmoke: packageJson.scripts?.['smoke:browser-native-connection-diagnostics'] === 'node scripts/smoke-browser-native-connection-diagnostics.mjs',
  verifyIncludesSmoke: text.verifyLocal.includes('smoke:browser-native-connection-diagnostics')
};

const result = {
  protocol: 'ULTIMATEBRIDGE_BROWSER_NATIVE_CONNECTION_DIAGNOSTICS_SMOKE_V1',
  status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
  expectedHost,
  checks
};

console.log(JSON.stringify(result, null, 2));

if (result.status !== 'PASS') process.exitCode = 1;

function exists(file) {
  return fs.existsSync(path.resolve(file));
}

function read(file) {
  return exists(file) ? fs.readFileSync(path.resolve(file), 'utf8') : '';
}
