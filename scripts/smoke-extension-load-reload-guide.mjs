import fs from 'node:fs';
import path from 'node:path';

const files = {
  checklist: 'scripts/Show-ExtensionLoadReloadChecklist.ps1',
  doc: 'docs/EXTENSION_LOAD_RELOAD_GUIDE_V1.md',
  popupHtml: 'extension/src/popup/popup.html',
  popupJs: 'extension/src/popup/popup.js',
  diagnosticsDoc: 'docs/BROWSER_NATIVE_CONNECTION_DIAGNOSTICS_V1.md',
  packageJson: 'package.json',
  verifyLocal: 'scripts/verify-local.mjs'
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const packageJson = JSON.parse(text.packageJson);
const executableText = stripQuotedLines(text.checklist);

const checks = {
  checklistExists: exists(files.checklist),
  checklistHasProtocol: text.checklist.includes('ULTIMATEBRIDGE_EXTENSION_LOAD_RELOAD_CHECKLIST_V1'),
  checklistGuideOnly: text.checklist.includes("mode = 'GUIDE_ONLY'"),
  checklistWritesArtifacts: text.checklist.includes('extension-load-reload-checklist.json') && text.checklist.includes('extension-load-reload-checklist.md'),
  checklistValidatesExtensionId: text.checklist.includes('^[a-p]{32}$'),
  checklistMentionsLoadUnpacked: text.checklist.includes('Load unpacked'),
  checklistMentionsDeveloperMode: text.checklist.includes('Developer mode'),
  checklistMentionsReload: text.checklist.includes('Click Reload'),
  checklistMentionsDiagnostics: text.checklist.includes('Show browser/native diagnostics'),
  checklistMentionsExtensionIdPlan: text.checklist.includes('native-host:extension-id:plan'),
  checklistMentionsInstallRehearsal: text.checklist.includes('native-host:install:rehearsal'),
  checklistHasNoStartProcess: !/Start-Process/i.test(executableText),
  checklistHasNoRegistryMutation: !/Set-ItemProperty|New-Item\s+-Path\s+\$.*Registry/i.test(executableText),
  docExists: exists(files.doc),
  docMentionsChromeAndEdge: text.doc.includes('chrome://extensions') && text.doc.includes('edge://extensions'),
  docMentionsExtensionId: text.doc.includes('Extension-ID') || text.doc.includes('extension id'),
  popupHasDiagnosticsControls: text.popupHtml.includes('show-connection-diagnostics') && text.popupHtml.includes('copy-connection-diagnostics'),
  popupWiresDiagnostics: text.popupJs.includes('ULTIMATEBRIDGE_GET_CONNECTION_DIAGNOSTICS'),
  diagnosticsDocExists: exists(files.diagnosticsDoc),
  packageHasScript: packageJson.scripts?.['extension:load:checklist'] === 'pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/Show-ExtensionLoadReloadChecklist.ps1',
  packageHasSmoke: packageJson.scripts?.['smoke:extension-load-reload-guide'] === 'node scripts/smoke-extension-load-reload-guide.mjs',
  verifyIncludesSmoke: text.verifyLocal.includes('smoke:extension-load-reload-guide')
};

const result = {
  protocol: 'ULTIMATEBRIDGE_EXTENSION_LOAD_RELOAD_GUIDE_SMOKE_V1',
  status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
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

function stripQuotedLines(value) {
  return String(value)
    .split(/\r?\n/)
    .filter((line) => !/^\s*['\"].*['\"]\s*,?\s*$/.test(line.trim()))
    .join('\n');
}
