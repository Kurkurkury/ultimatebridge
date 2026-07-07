import fs from 'node:fs';
import path from 'node:path';

const requiredFiles = [
  'START_ULTIMATEBRIDGE.cmd',
  'scripts/Start-UltimateBridge.ps1',
  'scripts/Install-NativeHost.ps1',
  'scripts/Repair-UltimateBridge.ps1'
];

const texts = Object.fromEntries(requiredFiles.map((file) => [file, fs.existsSync(path.resolve(file)) ? fs.readFileSync(path.resolve(file), 'utf8') : '']));
const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
const verifyLocal = fs.readFileSync(path.resolve('scripts/verify-local.mjs'), 'utf8');

const checks = {
  filesExist: requiredFiles.every((file) => fs.existsSync(path.resolve(file))),
  cmdCallsLauncher: texts['START_ULTIMATEBRIDGE.cmd'].includes('Start-UltimateBridge.ps1'),
  launcherHasProtocol: texts['scripts/Start-UltimateBridge.ps1'].includes('ULTIMATEBRIDGE_LAUNCHER_PLAN_V1'),
  launcherDoesNotApplyInstall: !texts['scripts/Start-UltimateBridge.ps1'].includes('Install-NativeHost.ps1 -Apply'),
  installerHasPlanProtocol: texts['scripts/Install-NativeHost.ps1'].includes('ULTIMATEBRIDGE_NATIVE_HOST_INSTALL_PLAN_V1'),
  installerDefaultPlanOnly: texts['scripts/Install-NativeHost.ps1'].includes('PLAN_ONLY') && texts['scripts/Install-NativeHost.ps1'].includes('if ($Apply)'),
  installerRequiresExtensionIdReview: texts['scripts/Install-NativeHost.ps1'].includes('__REPLACE_WITH_EXTENSION_ID__'),
  installerMentionsRegistryOnlyInApply: texts['scripts/Install-NativeHost.ps1'].includes('New-Item -Path $ChromeRegistryPath') && texts['scripts/Install-NativeHost.ps1'].includes('if ($Apply)'),
  repairHasPlanProtocol: texts['scripts/Repair-UltimateBridge.ps1'].includes('ULTIMATEBRIDGE_REPAIR_PLAN_V1'),
  repairDefaultPlanOnly: texts['scripts/Repair-UltimateBridge.ps1'].includes('PLAN_ONLY') && texts['scripts/Repair-UltimateBridge.ps1'].includes('if ($Apply)'),
  repairDoesNotGitPushOrMerge: !/git\s+(push|merge)/i.test(texts['scripts/Repair-UltimateBridge.ps1']),
  packageHasLauncherScripts: packageJson.scripts?.['launcher:plan'] && packageJson.scripts?.['install:native-host:plan'] && packageJson.scripts?.['repair:plan'],
  packageHasSmoke: packageJson.scripts?.['smoke:installer-launcher'] === 'node scripts/smoke-installer-launcher.mjs',
  verifyIncludesSmoke: verifyLocal.includes('smoke:installer-launcher')
};

const result = {
  protocol: 'ULTIMATEBRIDGE_INSTALLER_LAUNCHER_SMOKE_V1',
  status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
  checks
};

console.log(JSON.stringify(result, null, 2));

if (result.status !== 'PASS') process.exitCode = 1;
