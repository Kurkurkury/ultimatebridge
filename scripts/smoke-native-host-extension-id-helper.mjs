import fs from 'node:fs';
import path from 'node:path';

const helperPath = 'scripts/Set-NativeHostExtensionId.ps1';
const helperText = fs.existsSync(path.resolve(helperPath)) ? fs.readFileSync(path.resolve(helperPath), 'utf8') : '';
const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
const verifyLocal = fs.readFileSync(path.resolve('scripts/verify-local.mjs'), 'utf8');

const checks = {
  helperExists: fs.existsSync(path.resolve(helperPath)),
  helperHasProtocol: helperText.includes('ULTIMATEBRIDGE_NATIVE_HOST_EXTENSION_ID_PLAN_V1'),
  helperRequiresExtensionId: helperText.includes('Parameter(Mandatory = $true)') && helperText.includes('$ExtensionId'),
  helperValidatesChromeId: helperText.includes('^[a-p]{32}$'),
  helperBuildsAllowedOrigin: helperText.includes('chrome-extension://$ExtensionId/'),
  helperDefaultPlanOnly: helperText.includes('PLAN_ONLY') && helperText.includes('if ($Apply)'),
  helperWritesPlanArtifact: helperText.includes('native-host-extension-id-plan.json'),
  helperApplyUpdatesOnlyManifest: helperText.includes('Set-Content -LiteralPath $ManifestPath') && !helperText.includes('Set-ItemProperty'),
  helperDoesNotWriteRegistry: !/Set-ItemProperty\s+-Path/i.test(helperText) && !/New-Item\s+-Path\s+\$.*Registry/i.test(helperText),
  helperDoesNotSubmitOrGit: !/git\s+(push|merge)|submit\(\)|SAFE_CHANGE/i.test(stripQuotedLines(helperText)),
  packageHasScript: packageJson.scripts?.['native-host:extension-id:plan'] === 'pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/Set-NativeHostExtensionId.ps1',
  packageHasSmoke: packageJson.scripts?.['smoke:native-host-extension-id-helper'] === 'node scripts/smoke-native-host-extension-id-helper.mjs',
  verifyIncludesSmoke: verifyLocal.includes('smoke:native-host-extension-id-helper')
};

const result = {
  protocol: 'ULTIMATEBRIDGE_NATIVE_HOST_EXTENSION_ID_HELPER_SMOKE_V1',
  status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
  checks
};

console.log(JSON.stringify(result, null, 2));

if (result.status !== 'PASS') process.exitCode = 1;

function stripQuotedLines(text) {
  return String(text)
    .split(/\r?\n/)
    .filter((line) => !/^\s*['\"].*['\"]\s*,?\s*$/.test(line.trim()))
    .join('\n');
}
