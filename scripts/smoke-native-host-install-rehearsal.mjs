import fs from 'node:fs';
import path from 'node:path';

const files = {
  rehearsal: 'scripts/Test-NativeHostInstallRehearsal.ps1',
  install: 'scripts/Install-NativeHost.ps1',
  extensionId: 'scripts/Set-NativeHostExtensionId.ps1',
  packageJson: 'package.json',
  verifyLocal: 'scripts/verify-local.mjs'
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const packageJson = JSON.parse(text.packageJson);
const expectedHost = 'com.ultimatebridge.host';
const rehearsalExecutableText = stripQuotedLines(text.rehearsal);

const checks = {
  rehearsalExists: exists(files.rehearsal),
  rehearsalHasProtocol: text.rehearsal.includes('ULTIMATEBRIDGE_NATIVE_HOST_REAL_INSTALL_REHEARSAL_V1'),
  rehearsalReadOnlyMode: text.rehearsal.includes("mode = 'READ_ONLY_REHEARSAL'"),
  rehearsalHostAligned: text.rehearsal.includes(`$HostName = '${expectedHost}'`),
  rehearsalValidatesExtensionId: text.rehearsal.includes('^[a-p]{32}$'),
  rehearsalReadsManifest: text.rehearsal.includes('Read-JsonFile $ManifestPath'),
  rehearsalReadsRegistry: text.rehearsal.includes('Get-RegistryDefaultValue'),
  rehearsalWritesOnlyArtifact: text.rehearsal.includes('native-host-install-rehearsal.json') && !/Set-ItemProperty|New-Item\s+-Path\s+\$.*Registry/i.test(rehearsalExecutableText),
  rehearsalDoesNotWriteManifest: !/Set-Content\s+-LiteralPath\s+\$ManifestPath/i.test(rehearsalExecutableText),
  rehearsalDoesNotSendOrApply: !/sendNativeMessage|SAFE_CHANGE|git\s+(push|merge)|chrome\.runtime\.sendMessage/i.test(rehearsalExecutableText),
  installPlanHostAligned: text.install.includes(`$HostName = '${expectedHost}'`),
  extensionIdHelperHostAligned: text.extensionId.includes(`$HostName = '${expectedHost}'`),
  packageHasScript: packageJson.scripts?.['native-host:install:rehearsal'] === 'pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/Test-NativeHostInstallRehearsal.ps1',
  packageHasSmoke: packageJson.scripts?.['smoke:native-host-install-rehearsal'] === 'node scripts/smoke-native-host-install-rehearsal.mjs',
  verifyIncludesSmoke: text.verifyLocal.includes('smoke:native-host-install-rehearsal')
};

const result = {
  protocol: 'ULTIMATEBRIDGE_NATIVE_HOST_INSTALL_REHEARSAL_SMOKE_V1',
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

function stripQuotedLines(value) {
  return String(value)
    .split(/\r?\n/)
    .filter((line) => !/^\s*['\"].*['\"]\s*,?\s*$/.test(line.trim()))
    .join('\n');
}
