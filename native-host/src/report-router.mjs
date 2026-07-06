import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_DIRECT_REPORT_LIMIT, REPORT_PROTOCOL } from '../../common/constants.mjs';

export async function routeReport(report, options = {}) {
  const limit = options.directLimit ?? DEFAULT_DIRECT_REPORT_LIMIT;
  const text = typeof report === 'string' ? report : JSON.stringify(report, null, 2);

  if (text.length <= limit) {
    return {
      delivery: 'direct',
      text,
      attachments: []
    };
  }

  const runFolder = options.runFolder;
  if (!runFolder) {
    return {
      delivery: 'direct-summary',
      text: text.slice(0, limit) + '\n\n[TRUNCATED: full report could not be staged because runFolder is missing]',
      attachments: []
    };
  }

  const fullReportPath = path.join(runFolder, 'ultimatebridge-full-report.txt');
  await fs.writeFile(fullReportPath, text, 'utf8');

  return {
    delivery: 'attachment',
    text: summarize(report),
    attachments: [fullReportPath]
  };
}

export function buildReport(fields) {
  return {
    protocol: REPORT_PROTOCOL,
    requestId: fields.requestId ?? 'AUTO',
    jobId: fields.jobId,
    status: fields.status ?? 'OK',
    exitCode: fields.exitCode ?? 0,
    timedOut: Boolean(fields.timedOut),
    timeoutSeconds: fields.timeoutSeconds ?? 300,
    runFolder: fields.runFolder,
    summary: fields.summary ?? '',
    attachments: fields.attachments ?? []
  };
}

function summarize(report) {
  if (typeof report === 'string') {
    return report.slice(0, 2000);
  }

  return [
    'ULTIMATEBRIDGE REPORT READY',
    `Status: ${report.status}`,
    `JobId: ${report.jobId}`,
    `Summary: ${report.summary ?? ''}`,
    '',
    'Full report was staged as an attachment.'
  ].join('\n');
}
