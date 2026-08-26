# Start Wachttijd-radar in Docker (Windows PowerShell 5.1). Safe to run repeatedly.
#   .\scripts\start_windows.ps1 [-Build] [-Port 8000] [-Synthetic] [-NoOpen]

[CmdletBinding()]
param(
    [switch]$Build,
    [int]$Port = 8000,
    [switch]$Synthetic,
    [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

$ImageName = "wachttijd-radar"
$ContainerName = "wachttijd-radar"
$VolumeName = "wachttijd-radar-data"
$Url = "http://localhost:$Port"

Set-Location (Split-Path -Parent $PSScriptRoot)

$existingImage = docker images -q $ImageName
if ($Build -or [string]::IsNullOrWhiteSpace($existingImage)) {
    Write-Host "Building image $ImageName"
    docker build -t $ImageName .
    if ($LASTEXITCODE -ne 0) {
        Write-Host "docker build failed"
        exit 1
    }
}

# Replace any container left over from a previous run. The volume is untouched, so
# the waiting times already fetched survive.
$existing = docker ps -aq -f "name=^$($ContainerName)$"
if (-not [string]::IsNullOrWhiteSpace($existing)) {
    docker rm -f $ContainerName | Out-Null
}

$source = if ($Synthetic) { "synthetic" } else { "nza" }
docker run -d --name $ContainerName -p "$($Port):8000" -v "$($VolumeName):/app/db" -e "WACHTTIJD_SOURCE=$source" $ImageName | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "docker run failed. Is port $Port already in use? Try -Port 8001"
    exit 1
}

# The first run fetches from the NZa API, which takes a few seconds. Later runs
# reuse the volume and start immediately.
Write-Host -NoNewline "Waiting for the app to start"
$healthy = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "$Url/api/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $healthy = $true
            break
        }
    } catch {
        # Not up yet.
    }
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 1
}
Write-Host ""

if (-not $healthy) {
    Write-Host "The app did not become healthy within 60 seconds. Container logs:"
    docker logs $ContainerName
    exit 1
}

Write-Host "Wachttijd-radar is running at $Url"
Write-Host "Stop it with: .\scripts\stop_windows.ps1"

if (-not $NoOpen) {
    Start-Process $Url
}
