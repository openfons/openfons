Set-Location "$PSScriptRoot\..\.."
pnpm check
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

docker compose -f infra/docker/compose.yaml config | Out-Null
Write-Host "verification complete"
