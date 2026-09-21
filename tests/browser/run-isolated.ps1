param([ValidateSet('', 'before', 'after')][string] $ReferenceStage = '', [switch] $UxRefresh, [switch] $Redesign, [switch] $SignatureShell, [switch] $Artwork, [switch] $Quality, [switch] $SelectedFeatures, [switch] $AreaDetails,
  [ValidateSet('chromium', 'firefox')][string] $BrowserEngine = 'chromium',
  [string] $ArtifactRoot = '', [switch] $Headed, [string] $TestFilter = '', [switch] $DailyProgression,
  [ValidateSet('', 'before', 'after')][string] $PerformanceStage = '')
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Set-Location -LiteralPath $repoRoot
$dotnetExecutable = & node --input-type=module -e "import { resolveDotnetExecutable } from './scripts/run-dotnet.mjs'; console.log(resolveDotnetExecutable())"
if ($LASTEXITCODE -ne 0) { throw 'Pinned .NET SDK not found.' }
$logRoot = Join-Path $repoRoot 'artifacts'
if ($ArtifactRoot) {
  $evidencePath = [IO.Path]::GetFullPath((Join-Path $repoRoot $ArtifactRoot))
  if (!$evidencePath.StartsWith($logRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'ArtifactRoot must be a child of repository artifacts.' }
  $logRoot = $evidencePath
}
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$testDatabase = 'lifemaxing_browser_' + [Guid]::NewGuid().ToString('N')
$apiProcess = $null
$viteProcess = $null
$created = $false
$featureMailbox = $null
$variables = @('ConnectionStrings__Database', 'ASPNETCORE_ENVIRONMENT', 'ASPNETCORE_URLS', 'ASPNETCORE_CONTENTROOT',
  'OwnerProvisioning__Email', 'OwnerProvisioning__Password', 'SMOKE_EMAIL', 'SMOKE_PASSWORD', 'SMOKE_BASE_URL',
  'SMOKE_RESTART', 'LIFEMAXING_API_TARGET', 'Logging__LogLevel__Default', 'REFERENCE_STAGE', 'PERFORMANCE_STAGE', 'SMOKE_BROWSER', 'VISUAL_ARTIFACT_ROOT',
  'Authentication__Accounts__PublicOrigin', 'Authentication__Accounts__Email__Provider', 'Authentication__Accounts__Email__MailboxDirectory', 'LIFEMAXING_TEST_MAILBOX', 'PGPASSWORD')
$previous = @{}
foreach ($name in $variables) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
function Wait-Ready([string] $url) {
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try { $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { return } } catch { }
    Start-Sleep -Milliseconds 500
  }
  throw "Test service did not become ready: $url"
}
function Invoke-TestSql([string] $databaseName, [string] $sql) {
  if ($env:LIFEMAXING_TEST_CONNECTION) {
    $env:PGPASSWORD = $connection.get_Item('Password')
    $sql | & psql -h $connection.get_Item('Host') -p $connection.get_Item('Port') -U $connection.get_Item('Username') -d $databaseName -v ON_ERROR_STOP=1
  } else {
    $sql | docker compose exec -T db psql -U lifemaxing -d $databaseName -v ON_ERROR_STOP=1
  }
  if ($LASTEXITCODE -ne 0) { throw 'Isolated database command failed.' }
}
try {
  if ($ArtifactRoot) { $env:VISUAL_ARTIFACT_ROOT = $logRoot }
  foreach ($port in @(5082, 5174)) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
      throw "Test port $port is already occupied; inspect the process and project before retrying."
    }
  }
  # Read the existing local secret without printing or copying it into a tracked file.
  $connection = New-Object System.Data.Common.DbConnectionStringBuilder
  if ($env:LIFEMAXING_TEST_CONNECTION) {
    $connection.set_ConnectionString($env:LIFEMAXING_TEST_CONNECTION)
  } else {
    $secretFile = Join-Path $env:APPDATA 'Microsoft/UserSecrets/lifemaxing-local-development/secrets.json'
    $secrets = Get-Content -LiteralPath $secretFile -Raw | ConvertFrom-Json
    $connection.set_ConnectionString($secrets.'ConnectionStrings:Database')
    $secrets = $null
  }
  $connection.set_Item('Database', $testDatabase)
  if ($connection.get_Item('Database') -ne $testDatabase) { throw 'Isolated database selection failed.' }
  $env:ConnectionStrings__Database = $connection.get_ConnectionString()
  Invoke-TestSql 'postgres' "CREATE DATABASE $testDatabase"
  $created = $true
  $env:ASPNETCORE_ENVIRONMENT = 'Development'
  $env:Logging__LogLevel__Default = 'Warning'
  & $dotnetExecutable tool run dotnet-ef database update --project server/Lifemaxing.Api --configuration Release --no-build
  if ($LASTEXITCODE -ne 0) { throw 'Browser database migration failed.' }
  $env:OwnerProvisioning__Email = 'browser-owner@example.test'
  $env:OwnerProvisioning__Password = 'Browser-Test!-' + [Guid]::NewGuid().ToString('N')
  $env:SMOKE_EMAIL = $env:OwnerProvisioning__Email
  $env:SMOKE_PASSWORD = $env:OwnerProvisioning__Password
  & $dotnetExecutable server/Lifemaxing.Api/bin/Release/net10.0/Lifemaxing.Api.dll --provision-owner
  if ($LASTEXITCODE -ne 0) { throw 'Disposable owner provisioning failed.' }
  # Keep regression copy deterministic; language switching is tested separately.
  Invoke-TestSql $testDatabase 'UPDATE "UserSettings" SET "Locale" = ''en-GB'';'
  Remove-Item Env:OwnerProvisioning__Email, Env:OwnerProvisioning__Password
  $env:ASPNETCORE_URLS = 'http://127.0.0.1:5082'
  $env:ASPNETCORE_CONTENTROOT = Join-Path $repoRoot 'server/Lifemaxing.Api'
  $env:LIFEMAXING_API_TARGET = 'http://127.0.0.1:5082'
  $env:SMOKE_BASE_URL = 'http://127.0.0.1:5174'
  $env:SMOKE_RESTART = '0'
  if ($SelectedFeatures) {
    $featureMailbox = Join-Path ([IO.Path]::GetTempPath()) ('lifemaxing-browser-mail-' + [Guid]::NewGuid().ToString('N'))
    $env:Authentication__Accounts__PublicOrigin = $env:SMOKE_BASE_URL
    $env:Authentication__Accounts__Email__Provider = 'Development'
    $env:Authentication__Accounts__Email__MailboxDirectory = $featureMailbox
    $env:LIFEMAXING_TEST_MAILBOX = $featureMailbox
  }
  New-Item -ItemType Directory -Path artifacts -Force | Out-Null
  $apiProcess = Start-Process $dotnetExecutable -ArgumentList 'server/Lifemaxing.Api/bin/Release/net10.0/Lifemaxing.Api.dll' -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logRoot 'browser-api.log') -RedirectStandardError (Join-Path $logRoot 'browser-api-error.log')
  $viteArguments = 'node_modules/vite/bin/vite.js client --config client/vite.config.js --port 5174'
  if ($PerformanceStage -or $Redesign -or $SignatureShell -or $Artwork -or $Quality -or $SelectedFeatures -or $AreaDetails -or $DailyProgression) { $viteArguments = 'node_modules/vite/bin/vite.js preview client --config client/vite.config.js --port 5174 --strictPort' }
  $viteProcess = Start-Process node -ArgumentList $viteArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logRoot 'browser-vite.log') -RedirectStandardError (Join-Path $logRoot 'browser-vite-error.log')
  Wait-Ready 'http://127.0.0.1:5082/health/live'
  Wait-Ready 'http://127.0.0.1:5174/start'
  if ($DailyProgression) {
    $env:SMOKE_BROWSER = $BrowserEngine
    $browserArguments = @('run', 'test:smoke', '--', 'daily-progression.spec.js')
    if ($TestFilter) { $browserArguments += @('--grep', $TestFilter) }
    & npm @browserArguments
    if ($LASTEXITCODE -ne 0) { throw 'Daily planning and progression checks failed.' }
    if (!$TestFilter) {
      Stop-Process -Id $apiProcess.Id
      $apiProcess.WaitForExit()
      $apiProcess = Start-Process $dotnetExecutable -ArgumentList 'server/Lifemaxing.Api/bin/Release/net10.0/Lifemaxing.Api.dll' -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logRoot 'browser-api-restart.log') -RedirectStandardError (Join-Path $logRoot 'browser-api-restart-error.log')
      Wait-Ready 'http://127.0.0.1:5082/health/live'
      $env:SMOKE_RESTART = '1'
      npm run test:smoke -- daily-progression.spec.js --grep 'restart'
      if ($LASTEXITCODE -ne 0) { throw 'Daily state persistence after restart failed.' }
    }
    return
  }
  if ($AreaDetails) {
    $env:SMOKE_BROWSER = $BrowserEngine
    $browserArguments = @('run', 'test:smoke', '--', 'area-detail.spec.js')
    if ($TestFilter) { $browserArguments += @('--grep', $TestFilter) }
    if ($Headed) { $browserArguments += '--headed' }
    & npm @browserArguments
    if ($LASTEXITCODE -ne 0) { throw 'Life Area detail checks failed.' }
    return
  }
  if ($SelectedFeatures) {
    $env:SMOKE_BROWSER = $BrowserEngine
    $browserArguments = @('run', 'test:smoke', '--', 'selected-features.spec.js')
    if ($TestFilter) { $browserArguments += @('--grep', $TestFilter) }
    if ($Headed) { $browserArguments += '--headed' }
    & npm @browserArguments
    if ($LASTEXITCODE -ne 0) { throw 'Selected feature checks failed.' }
    return
  }
  if ($Quality) {
    $env:SMOKE_BROWSER = $BrowserEngine
    $browserArguments = @('run', 'test:smoke', '--', 'quality.spec.js')
    if ($TestFilter) { $browserArguments += @('--grep', $TestFilter) }
    if ($Headed) { $browserArguments += '--headed' }
    & npm @browserArguments
    if ($LASTEXITCODE -ne 0) { throw 'Application quality checks failed.' }
    return
  }
  if ($SignatureShell) {
    $env:SMOKE_BROWSER = $BrowserEngine
    $browserArguments = @('run', 'test:smoke', '--', 'redesign.spec.js', 'signature-shell.spec.js')
    if ($Headed) { $browserArguments += '--headed' }
    npm @browserArguments
    if ($LASTEXITCODE -ne 0) { throw 'Signature shell checks failed.' }
    return
  }
  if ($Artwork) {
    $env:SMOKE_BROWSER = $BrowserEngine
    $browserArguments = @('run', 'test:smoke', '--', 'redesign.spec.js', 'artwork.spec.js', 'signature-shell.spec.js')
    if ($TestFilter) { $browserArguments += @('--grep', $TestFilter) }
    if ($Headed) { $browserArguments += '--headed' }
    & npm @browserArguments
    if ($LASTEXITCODE -ne 0) { throw 'Artwork redesign checks failed.' }
    return
  }
  if ($Redesign) {
    $env:SMOKE_BROWSER = $BrowserEngine
    npm run test:smoke -- redesign.spec.js
    if ($LASTEXITCODE -ne 0) { throw 'Full redesign checks failed.' }
    return
  }
  if ($PerformanceStage) {
    $env:PERFORMANCE_STAGE = $PerformanceStage
    npm run test:smoke -- performance.spec.js
    if ($LASTEXITCODE -ne 0) { throw 'Production performance checks failed.' }
    return
  }
  if ($UxRefresh) {
    npm run test:smoke -- ux-refresh.spec.js
    if ($LASTEXITCODE -ne 0) { throw 'UX refresh checks failed.' }
    return
  }
  if ($ReferenceStage) {
    $env:REFERENCE_STAGE = $ReferenceStage
    npm run test:smoke -- reference.spec.js
    if ($LASTEXITCODE -ne 0) { throw 'Reference page checks failed.' }
    return
  }
  npm run test:smoke -- foundation.spec.js phase1.spec.js phase2.spec.js ux.spec.js phase3.spec.js
  if ($LASTEXITCODE -ne 0) { throw 'Browser checks failed.' }
  npm run test:smoke -- auth.spec.js
  if ($LASTEXITCODE -ne 0) { throw 'Authentication browser checks failed.' }
  Stop-Process -Id $apiProcess.Id
  $apiProcess.WaitForExit()
  $apiProcess = Start-Process $dotnetExecutable -ArgumentList 'server/Lifemaxing.Api/bin/Release/net10.0/Lifemaxing.Api.dll' -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logRoot 'browser-api-restart.log') -RedirectStandardError (Join-Path $logRoot 'browser-api-restart-error.log')
  Wait-Ready 'http://127.0.0.1:5082/health/live'
  $env:SMOKE_RESTART = '1'
  npm run test:smoke -- phase2-restart.spec.js phase3-restart.spec.js
  if ($LASTEXITCODE -ne 0) { throw 'Persistence checks after restart failed.' }
  npm run test:smoke -- auth-restart.spec.js
  if ($LASTEXITCODE -ne 0) { throw 'Remembered session after restart failed.' }
} finally {
  if ($apiProcess -and !$apiProcess.HasExited) { Stop-Process -Id $apiProcess.Id }
  if ($viteProcess -and !$viteProcess.HasExited) { Stop-Process -Id $viteProcess.Id }
  if ($created -and $testDatabase -match '^lifemaxing_browser_[a-f0-9]{32}$') {
    Invoke-TestSql 'postgres' "DROP DATABASE $testDatabase WITH (FORCE)"
  }
  if ($featureMailbox -and (Test-Path -LiteralPath $featureMailbox)) {
    $mailboxTarget = [IO.Path]::GetFullPath($featureMailbox)
    $temporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (!$mailboxTarget.StartsWith($temporaryRoot, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($mailboxTarget) -notmatch '^lifemaxing-browser-mail-[a-f0-9]{32}$') { throw 'Refusing unexpected mailbox cleanup path.' }
    Remove-Item -LiteralPath $mailboxTarget -Recurse -Force
  }
  foreach ($name in $variables) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}
