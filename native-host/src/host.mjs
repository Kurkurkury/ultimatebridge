import { normalizeRequest } from './protocol-validator.mjs';
import { createJob } from './job-spool.mjs';
import { buildReport, routeReport } from './report-router.mjs';

async function handleMessage(message) {
  try {
    const request = normalizeRequest(message?.body ?? message, {
      defaultTargetHost: process.env.ULTIMATEBRIDGE_TARGET_HOST
    });

    const job = await createJob(request);
    const report = buildReport({
      requestId: request.requestId,
      jobId: job.jobId,
      status: 'OK',
      exitCode: 0,
      timedOut: false,
      runFolder: job.runFolder,
      summary: 'Request accepted and normalized. Runner execution is scaffolded in this foundation version.'
    });

    const delivery = await routeReport(report, { runFolder: job.runFolder });
    return { ok: true, request, job, report, delivery };
  } catch (error) {
    return {
      ok: false,
      status: error.status ?? 'ERROR',
      code: error.code ?? 'UNHANDLED_ERROR',
      message: error.message
    };
  }
}

process.stdin.on('readable', async () => {
  let header;
  while ((header = process.stdin.read(4)) !== null) {
    const length = header.readUInt32LE(0);
    const body = process.stdin.read(length);
    if (!body) return;

    const input = JSON.parse(body.toString('utf8'));
    const output = await handleMessage(input);
    writeNativeMessage(output);
  }
});

function writeNativeMessage(payload) {
  const json = Buffer.from(JSON.stringify(payload), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  process.stdout.write(header);
  process.stdout.write(json);
}

export { handleMessage };
