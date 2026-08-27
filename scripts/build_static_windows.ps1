# Build the serverless site and preview it (Windows PowerShell 5.1).
#   .\scripts\build_static_windows.ps1 [-BasePath /wachttijd-radar] [-Port 8099] [-NoServe]
#
# Fetches, writes the API out as flat JSON, and builds the static export. What comes
# out of frontend/out is the whole site: no backend, no API key, nothing to keep alive.

[CmdletBinding()]
param(
    [string]$BasePath = "",
    [int]$Port = 8099,
    [switch]$Refresh,
    [switch]$NoServe
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if ($Refresh) {
    Write-Host "Fetching from the NZa API"
    Set-Location backend
    uv run python -m app.fetch --refresh
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Set-Location ..
}

Write-Host "Writing the API out as static JSON"
Set-Location backend
uv run python -m app.export_static --out ../frontend/public/api
if ($LASTEXITCODE -ne 0) { exit 1 }
Set-Location ..

Write-Host "Building the static export"
Set-Location frontend
$env:NEXT_PUBLIC_WACHTTIJD_STATIC = "true"
$env:NEXT_PUBLIC_BASE_PATH = $BasePath
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }
Set-Location ..

Write-Host "Built to frontend/out"

if ($NoServe) { return }

if ($BasePath) {
    # The export expects to sit under $BasePath on the host, and a file server rooted
    # at frontend/out does not put it there. Previewing that faithfully means copying
    # the directory, which is what the real host does for you.
    Write-Host "Built with base path '$BasePath'. Not serving: a local preview would"
    Write-Host "need frontend/out copied into a '$BasePath' directory first."
    return
}

# Served from a plain file server on purpose: if it works here it works on any static
# host, because nothing else is running.
$url = "http://localhost:$Port/"
Write-Host "Serving frontend/out at $url  (Ctrl+C to stop)"
Set-Location frontend/out
Start-Process $url
python -m http.server $Port
