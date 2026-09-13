param([switch] $InteractiveRecovery)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Set-Location -LiteralPath $repoRoot
$env:PATH = "$env:LOCALAPPDATA\Microsoft\dotnet;$env:PATH"
$suffix = [Guid]::NewGuid().ToString('N')
$database = 'lifemaxing_auth_' + $suffix
$container = 'lifemaxing-auth-' + $suffix
$volume = 'lifemaxing-auth-keys-' + $suffix
$created = $false
$volumeCreated = $false
$variables = @('ConnectionStrings__Database', 'ASPNETCORE_ENVIRONMENT', 'OwnerProvisioning__Email', 'OwnerProvisioning__Password', 'Logging__LogLevel__Default')
$previous = @{}
foreach ($name in $variables) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$base = 'http://127.0.0.1:5083'
function Start-TestContainer {
  docker run -d --rm --name $container --network lifemaxing_default --env ConnectionStrings__Database --env ASPNETCORE_ENVIRONMENT=Development --env Logging__LogLevel__Default=Warning --mount "type=volume,source=$volume,target=/var/lib/lifemaxing/keys" -p 127.0.0.1:5083:8080 lifemaxing:auth-verification | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Test container could not start.' }
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try { $response = Invoke-WebRequest "$base/health/live" -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { return } } catch { }
    Start-Sleep -Milliseconds 500
  }
  throw 'Test container did not become ready.'
}
function Sign-In([string] $password) {
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $csrf = Invoke-RestMethod "$base/api/v1/auth/csrf" -WebSession $session
  $body = @{ email = 'auth-admin@example.test'; password = $password; rememberMe = $true } | ConvertTo-Json
  Invoke-WebRequest "$base/api/v1/auth/login" -Method Post -WebSession $session -ContentType 'application/json' -Headers @{ 'X-CSRF-TOKEN' = $csrf.requestToken } -Body $body -UseBasicParsing | Out-Null
  return $session
}
function Stop-TestContainer {
  if (!(docker ps -aq --filter "name=^/$container`$")) { return }
  docker stop $container | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Test container did not stop.' }
  # --rm removal can finish shortly after docker stop returns.
  for ($attempt = 0; $attempt -lt 50; $attempt++) {
    if (!(docker ps -aq --filter "name=^/$container`$")) { return }
    Start-Sleep -Milliseconds 200
  }
  throw 'Test container removal did not finish; its volume is retained.'
}
try {
  if (Get-NetTCPConnection -LocalPort 5083 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 5083 is in use. No process was stopped.' }
  $secrets = Get-Content (Join-Path $env:APPDATA 'Microsoft/UserSecrets/lifemaxing-local-development/secrets.json') -Raw | ConvertFrom-Json
  $connection = New-Object System.Data.Common.DbConnectionStringBuilder
  $connection.set_ConnectionString($secrets.'ConnectionStrings:Database')
  $secrets = $null
  $connection.set_Item('Database', $database)
  $hostConnection = $connection.get_ConnectionString()
  $env:ConnectionStrings__Database = $hostConnection
  $env:ASPNETCORE_ENVIRONMENT = 'Development'
  $env:Logging__LogLevel__Default = 'Warning'
  docker compose exec -T db psql -U lifemaxing -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $database"
  if ($LASTEXITCODE -ne 0) { throw 'Test database creation failed.' }
  $created = $true
  dotnet tool run dotnet-ef database update --project server/Lifemaxing.Api --configuration Release --no-build
  if ($LASTEXITCODE -ne 0) { throw 'Test migrations failed.' }
  $initialPassword = 'Auth-Fixture!-' + [Guid]::NewGuid().ToString('N')
  $env:OwnerProvisioning__Email = 'auth-admin@example.test'
  $env:OwnerProvisioning__Password = $initialPassword
  dotnet server/Lifemaxing.Api/bin/Release/net10.0/Lifemaxing.Api.dll --provision-owner
  if ($LASTEXITCODE -ne 0) { throw 'Test provisioning failed.' }
  Remove-Item Env:OwnerProvisioning__Email, Env:OwnerProvisioning__Password
  docker volume create $volume | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Test volume creation failed.' }
  $volumeCreated = $true
  $connection.set_Item('Host', 'db')
  $env:ConnectionStrings__Database = $connection.get_ConnectionString()
  Start-TestContainer
  $session = Sign-In $initialPassword
  $before = Invoke-RestMethod "$base/api/v1/auth/me" -WebSession $session
  $cookie = $session.Cookies.GetCookies([Uri]$base) | Where-Object Name -eq 'Lifemaxing.Auth'
  if (!$cookie.HttpOnly -or $cookie.Expires -lt (Get-Date).AddDays(29)) { throw 'Unexpected persistent-cookie attributes.' }
  $permissions = docker exec $container stat -c '%a:%u' /var/lib/lifemaxing/keys/Development
  if ($permissions -ne '700:1654') { throw 'Key directory permissions are not restricted to the app user.' }
  Stop-TestContainer
  Start-TestContainer
  $after = Invoke-RestMethod "$base/api/v1/auth/me" -WebSession $session
  if ($before.id -ne $after.id) { throw 'Remembered session did not survive container recreation.' }
  Write-Output 'PASS: persisted login survives container recreation; key directory mode 700, non-root app owner.'

  # No account is provisioned in this Production process; refusal occurs before reading a password.
  docker run --rm lifemaxing:auth-verification --reset-owner-password
  if ($LASTEXITCODE -ne 1) { throw 'Production recovery was not rejected.' }
  Write-Output 'PASS: actual Production command refuses recovery.'

  if ($InteractiveRecovery) {
    # This phrase is a fictional fixture, never the real owner's password.
    $replacement = 'winter birch quiet meadow'
    Write-Output 'Interactive isolated fixture: auth-admin@example.test. Use the replacement phrase defined in this test script.'
    $env:ConnectionStrings__Database = $hostConnection
    dotnet server/Lifemaxing.Api/bin/Release/net10.0/Lifemaxing.Api.dll --reset-owner-password
    if ($LASTEXITCODE -ne 0) { throw 'Interactive recovery did not succeed.' }
    $rejected = $false
    try { $null = Sign-In $initialPassword } catch { if ([int]$_.Exception.Response.StatusCode -eq 401) { $rejected = $true } else { throw } }
    if (!$rejected) { throw 'Old password was accepted after recovery.' }
    $newSession = Sign-In $replacement
    $recovered = Invoke-RestMethod "$base/api/v1/auth/me" -WebSession $newSession
    if ($before.id -ne $recovered.id) { throw 'Account identity changed during recovery.' }
    $areas = Invoke-RestMethod "$base/api/v1/areas" -WebSession $newSession
    if ($areas.Count -ne 10) { throw 'Recovery did not preserve provisioned Life Areas.' }
    Write-Output 'PASS: masked interactive reset, old password rejected, new password accepted, same account and ten Life Areas.'
  }
} finally {
  # Only resources named and created for this invocation can be removed.
  if ($container -match '^lifemaxing-auth-[a-f0-9]{32}$') { Stop-TestContainer }
  if ($volumeCreated -and $volume -match '^lifemaxing-auth-keys-[a-f0-9]{32}$') {
    docker volume rm $volume | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Test key volume cleanup failed.' }
  }
  if ($created -and $database -match '^lifemaxing_auth_[a-f0-9]{32}$') {
    docker compose exec -T db psql -U lifemaxing -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE $database WITH (FORCE)"
  }
  foreach ($name in $variables) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}
