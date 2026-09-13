$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Set-Location -LiteralPath $repoRoot
$env:PATH = "$env:LOCALAPPDATA\Microsoft\dotnet;$env:PATH"
$testDatabase = 'lifemaxing_browser_' + [Guid]::NewGuid().ToString('N')
$apiProcess = $null
$viteProcess = $null
$created = $false
$variables = @('ConnectionStrings__Database', 'ASPNETCORE_ENVIRONMENT', 'ASPNETCORE_URLS', 'ASPNETCORE_CONTENTROOT',
  'OwnerProvisioning__Email', 'OwnerProvisioning__Password', 'SMOKE_EMAIL', 'SMOKE_PASSWORD', 'SMOKE_BASE_URL',
  'SMOKE_RESTART', 'LIFEMAXING_API_TARGET', 'Logging__LogLevel__Default')
$previous = @{}
foreach ($name in $variables) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
function Wait-Ready([string] $url) {
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try { $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { return } } catch { }
    Start-Sleep -Milliseconds 500
  }
  throw "Test service did not become ready: $url"
}
try {
  # Read the existing local secret without printing or copying it into a tracked file.
  $secretFile = Join-Path $env:APPDATA 'Microsoft/UserSecrets/lifemaxing-local-development/secrets.json'
  $secrets = Get-Content -LiteralPath $secretFile -Raw | ConvertFrom-Json
  $connection = New-Object System.Data.Common.DbConnectionStringBuilder
  $connection.set_ConnectionString($secrets.'ConnectionStrings:Database')
  $connection.set_Item('Database', $testDatabase)
  if ($connection.get_Item('Database') -ne $testDatabase) { throw 'Isolated database selection failed.' }
  $env:ConnectionStrings__Database = $connection.get_ConnectionString()
  $secrets = $null
  docker compose exec -T db psql -U lifemaxing -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $testDatabase"
  if ($LASTEXITCODE -ne 0) { throw 'Could not create browser test database.' }
  $created = $true
  $env:ASPNETCORE_ENVIRONMENT = 'Development'
  $env:Logging__LogLevel__Default = 'Warning'
  dotnet tool run dotnet-ef database update --project server/Lifemaxing.Api --configuration Release --no-build
  if ($LASTEXITCODE -ne 0) { throw 'Browser database migration failed.' }
  $env:OwnerProvisioning__Email = 'browser-owner@example.test'
  $env:OwnerProvisioning__Password = 'Browser-Test!-' + [Guid]::NewGuid().ToString('N')
  $env:SMOKE_EMAIL = $env:OwnerProvisioning__Email
  $env:SMOKE_PASSWORD = $env:OwnerProvisioning__Password
  dotnet server/Lifemaxing.Api/bin/Release/net10.0/Lifemaxing.Api.dll --provision-owner
  if ($LASTEXITCODE -ne 0) { throw 'Disposable owner provisioning failed.' }
  Remove-Item Env:OwnerProvisioning__Email, Env:OwnerProvisioning__Password
  $env:ASPNETCORE_URLS = 'http://127.0.0.1:5082'
  $env:ASPNETCORE_CONTENTROOT = Join-Path $repoRoot 'server/Lifemaxing.Api'
  $env:LIFEMAXING_API_TARGET = 'http://127.0.0.1:5082'
  $env:SMOKE_BASE_URL = 'http://127.0.0.1:5174'
  $env:SMOKE_RESTART = '0'
  New-Item -ItemType Directory -Path artifacts -Force | Out-Null
  $apiProcess = Start-Process dotnet -ArgumentList 'server/Lifemaxing.Api/bin/Release/net10.0/Lifemaxing.Api.dll' -WindowStyle Hidden -PassThru -RedirectStandardOutput artifacts/browser-api.log -RedirectStandardError artifacts/browser-api-error.log
  $viteProcess = Start-Process node -ArgumentList 'node_modules/vite/bin/vite.js client --config client/vite.config.js --port 5174' -WindowStyle Hidden -PassThru -RedirectStandardOutput artifacts/browser-vite.log -RedirectStandardError artifacts/browser-vite-error.log
  Wait-Ready 'http://127.0.0.1:5082/health/live'
  Wait-Ready 'http://127.0.0.1:5174/start'
  npm run test:smoke -- foundation.spec.js phase1.spec.js phase2.spec.js ux.spec.js
  if ($LASTEXITCODE -ne 0) { throw 'Browser checks failed.' }
  Stop-Process -Id $apiProcess.Id
  $apiProcess.WaitForExit()
  $apiProcess = Start-Process dotnet -ArgumentList 'server/Lifemaxing.Api/bin/Release/net10.0/Lifemaxing.Api.dll' -WindowStyle Hidden -PassThru -RedirectStandardOutput artifacts/browser-api-restart.log -RedirectStandardError artifacts/browser-api-restart-error.log
  Wait-Ready 'http://127.0.0.1:5082/health/live'
  $env:SMOKE_RESTART = '1'
  npm run test:smoke -- phase2-restart.spec.js
  if ($LASTEXITCODE -ne 0) { throw 'Persistence checks after restart failed.' }
} finally {
  if ($apiProcess -and !$apiProcess.HasExited) { Stop-Process -Id $apiProcess.Id }
  if ($viteProcess -and !$viteProcess.HasExited) { Stop-Process -Id $viteProcess.Id }
  if ($created -and $testDatabase -match '^lifemaxing_browser_[a-f0-9]{32}$') {
    docker compose exec -T db psql -U lifemaxing -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE $testDatabase WITH (FORCE)"
  }
  foreach ($name in $variables) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}
