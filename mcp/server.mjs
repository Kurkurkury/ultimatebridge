import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { toNodeHandler, localhostHostValidation, localhostOriginValidation } from '@modelcontextprotocol/node';
import * as z from 'zod/v4';

const execFileAsync = promisify(execFile);
const HOST = process.env.ULTIMATEBRIDGE_MCP_HOST ?? '127.0.0.1';
const PORT = Number(process.env.ULTIMATEBRIDGE_MCP_PORT ?? '8765');
const WRITE_ENABLED = process.env.ULTIMATEBRIDGE_MCP_WRITE === '1';
const EXPECTED_HOSTNAME = process.env.ULTIMATEBRIDGE_EXPECTED_HOSTNAME ?? 'SPEIDELBASE';
const POWERSHELL = process.env.ULTIMATEBRIDGE_POWERSHELL ?? 'pwsh';

async function runPowerShell(command, timeoutMs = 15000) {
  const { stdout = '', stderr = '' } = await execFileAsync(
    POWERSHELL,
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command],
    {
      windowsHide: true,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      encoding: 'utf8'
    }
  );

  return { stdout: String(stdout).trimEnd(), stderr: String(stderr).trimEnd() };
}

async function assertExpectedHost() {
  const { stdout } = await runPowerShell('[Environment]::MachineName');
  const actual = stdout.trim();
  if (EXPECTED_HOSTNAME && actual.toLowerCase() !== EXPECTED_HOSTNAME.toLowerCase()) {
    throw new Error(`Host identity mismatch: expected ${EXPECTED_HOSTNAME}, got ${actual || '<empty>'}`);
  }
  return actual;
}

const READ_ONLY_OPERATIONS = {
  hostname: '[Environment]::MachineName',
  whoami: '[System.Security.Principal.WindowsIdentity]::GetCurrent().Name',
  powershell_version: '$PSVersionTable.PSVersion.ToString()',
  current_directory: '(Get-Location).Path',
  processes: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 50 Name,Id,CPU,WorkingSet | ConvertTo-Json -Depth 3',
  services: 'Get-Service | Select-Object Status,Name,DisplayName | ConvertTo-Json -Depth 3',
  drives: 'Get-PSDrive -PSProvider FileSystem | Select-Object Name,Root,Used,Free | ConvertTo-Json -Depth 3'
};

function textResult(payload) {
  return { content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }] };
}

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: 'ultimatebridge-powershell', version: '0.1.0' });

  server.registerTool(
    'bridge_health',
    {
      description: 'Verify that the MCP server can reach PowerShell on the expected Windows host.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async () => {
      const host = await assertExpectedHost();
      const [{ stdout: identity }, { stdout: psVersion }] = await Promise.all([
        runPowerShell('[System.Security.Principal.WindowsIdentity]::GetCurrent().Name'),
        runPowerShell('$PSVersionTable.PSVersion.ToString()')
      ]);
      return textResult({ ok: true, host, identity, powershellVersion: psVersion, writeEnabled: WRITE_ENABLED });
    }
  );

  server.registerTool(
    'powershell_readonly',
    {
      description: 'Run one fixed read-only PowerShell diagnostic operation on the local Windows host.',
      inputSchema: z.object({ operation: z.enum(Object.keys(READ_ONLY_OPERATIONS)) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }
    },
    async ({ operation }) => {
      const host = await assertExpectedHost();
      const result = await runPowerShell(READ_ONLY_OPERATIONS[operation]);
      return textResult({ ok: true, host, operation, ...result });
    }
  );

  server.registerTool(
    'powershell_exec',
    {
      description: 'Run an explicitly approved PowerShell command. Disabled unless ULTIMATEBRIDGE_MCP_WRITE=1 is set locally.',
      inputSchema: z.object({
        command: z.string().min(1).max(12000),
        reason: z.string().min(1).max(1000),
        timeoutMs: z.number().int().min(1000).max(120000).optional()
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
    },
    async ({ command, reason, timeoutMs }) => {
      if (!WRITE_ENABLED) {
        throw new Error('Write execution is disabled locally. Set ULTIMATEBRIDGE_MCP_WRITE=1 on SPEIDELBASE to enable it.');
      }
      const host = await assertExpectedHost();
      const result = await runPowerShell(command, timeoutMs ?? 30000);
      return textResult({ ok: true, host, reason, ...result });
    }
  );

  return server;
});

const nodeHandler = toNodeHandler(handler);
const validateHost = localhostHostValidation();
const validateOrigin = localhostOriginValidation();

const httpServer = createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, service: 'ultimatebridge-mcp', host: HOST, port: PORT, writeEnabled: WRITE_ENABLED }));
    return;
  }

  if (req.url !== '/mcp') {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  if (!validateHost(req, res) || !validateOrigin(req, res)) return;
  void nodeHandler(req, res);
});

httpServer.listen(PORT, HOST, () => {
  console.log(`[UltimateBridge MCP] http://${HOST}:${PORT}/mcp`);
  console.log(`[UltimateBridge MCP] expected host: ${EXPECTED_HOSTNAME}`);
  console.log(`[UltimateBridge MCP] write execution: ${WRITE_ENABLED ? 'ENABLED' : 'disabled'}`);
});

async function shutdown(signal) {
  console.log(`[UltimateBridge MCP] ${signal}: shutting down`);
  httpServer.close();
  await handler.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
