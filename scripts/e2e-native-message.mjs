import { spawn } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const hostPath = path.join(repoRoot, 'native-host', 'src', 'host.mjs');
const host = process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? 'SPEIDELBASE';

const body = [
  'AUTO_BRIDGE_REQUEST_ID=AUTO',
  `TARGET_HOST=${host}`,
  '& .\\runner\\powershell\\UB_BeginTask.ps1 HealthCheck'
].join('\n');

const child = spawn(process.execPath, [hostPath], {
  cwd: repoRoot,
  stdio: ['pipe', 'pipe', 'pipe'],
  windowsHide: true
});

let stdout = Buffer.alloc(0);
let stderr = '';

child.stdout.on('data', (chunk) => {
  stdout = Buffer.concat([stdout, chunk]);
});

child.stderr.on('data', (chunk) => {
  stderr += chunk.toString('utf8');
});

const payload = Buffer.from(JSON.stringify({ body }), 'utf8');
const header = Buffer.alloc(4);
header.writeUInt32LE(payload.length, 0);
child.stdin.write(header);
child.stdin.write(payload);
child.stdin.end();

const exitCode = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    child.kill('SIGTERM');
    reject(new Error('Native host E2E timed out.'));
  }, 10000);

  child.on('error', (error) => {
    clearTimeout(timeout);
    reject(error);
  });

  child.on('close', (code) => {
    clearTimeout(timeout);
    resolve(code);
  });
});

if (stdout.length < 4) {
  console.error(stderr);
  throw new Error(`Native host returned no framed response. exitCode=${exitCode}`);
}

const length = stdout.readUInt32LE(0);
const responseBuffer = stdout.subarray(4, 4 + length);
const response = JSON.parse(responseBuffer.toString('utf8'));

console.log(JSON.stringify(response, null, 2));

if (!response.ok) {
  throw new Error(`Native messaging E2E failed: ${response.code ?? response.report?.status ?? 'UNKNOWN'}`);
}

if (response.report?.status !== 'OK') {
  throw new Error(`Native messaging report status was ${response.report?.status}`);
}

if (!response.manifest?.items?.length) {
  throw new Error('Native messaging response did not include staged manifest items.');
}
