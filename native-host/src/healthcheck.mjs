import os from 'node:os';

export function getHealth() {
  return {
    protocol: 'ULTIMATEBRIDGE_HEALTH_V1',
    ok: true,
    hostname: os.hostname(),
    platform: process.platform,
    node: process.version,
    pid: process.pid,
    time: new Date().toISOString()
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(getHealth(), null, 2));
}
