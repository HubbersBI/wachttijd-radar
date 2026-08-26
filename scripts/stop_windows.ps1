# Stop Wachttijd-radar (Windows PowerShell 5.1). Safe to run repeatedly.
#   .\scripts\stop_windows.ps1 [-RemoveData]
#
# The named volume is kept unless -RemoveData is given, so the waiting times
# already fetched survive a stop.

[CmdletBinding()]
param(
    [switch]$RemoveData
)

$ErrorActionPreference = "Stop"

$ContainerName = "wachttijd-radar"
$VolumeName = "wachttijd-radar-data"

$existing = docker ps -aq -f "name=^$($ContainerName)$"
if ([string]::IsNullOrWhiteSpace($existing)) {
    Write-Host "Wachttijd-radar is not running"
} else {
    docker rm -f $ContainerName | Out-Null
    Write-Host "Stopped Wachttijd-radar"
}

if ($RemoveData) {
    docker volume rm $VolumeName | Out-Null
    Write-Host "Removed the data volume. The next start fetches from the NZa API again."
}
