param(
    [switch]$EnableWrite,
    [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$env:ULTIMATEBRIDGE_EXPECTED_HOSTNAME = 'SPEIDELBASE'
$env:ULTIMATEBRIDGE_MCP_HOST = '127.0.0.1'
$env:ULTIMATEBRIDGE_MCP_PORT = [string]$Port
$env:ULTIMATEBRIDGE_MCP_WRITE = if ($EnableWrite) { '1' } else { '0' }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js 20+ is required.'
}

if (-not (Test-Path (Join-Path $RepoRoot 'node_modules'))) {
    Write-Host '[UltimateBridge MCP] Installing dependencies...'
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
}

Write-Host "[UltimateBridge MCP] Starting on http://127.0.0.1:$Port/mcp"
Write-Host "[UltimateBridge MCP] Write execution: $(if ($EnableWrite) { 'ENABLED' } else { 'disabled' })"
node mcp/server.mjs
exit $LASTEXITCODE
