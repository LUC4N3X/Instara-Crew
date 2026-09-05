$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ExePath = [System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
$BaseDir = Split-Path -Parent $ExePath
$AppRoot = Join-Path $BaseDir "app"
$RuntimeRoot = Join-Path $BaseDir "runtime"
$DataRoot = Join-Path $env:LOCALAPPDATA "Instara Crew"
$LogRoot = Join-Path $DataRoot "logs"
$ConfigPath = Join-Path $DataRoot "settings.env"
$PgData = Join-Path $DataRoot "postgres"
$BrowserProfiles = Join-Path $DataRoot "browser-profiles"
$NodeExe = Join-Path $RuntimeRoot "node\node.exe"
$PgBin = Join-Path $RuntimeRoot "postgres\bin"
$PythonExe = Join-Path $RuntimeRoot "python\python.exe"
$AdbExe = Join-Path $RuntimeRoot "platform-tools\adb.exe"
$AppUrl = "http://127.0.0.1:3000"

New-Item -ItemType Directory -Force -Path $DataRoot, $LogRoot, $BrowserProfiles | Out-Null
$LauncherLog = Join-Path $LogRoot "launcher.log"

function Write-InstaraLog([string]$Message) {
  $line = "[$([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss'))] $Message"
  Add-Content -Path $LauncherLog -Value $line -Encoding UTF8
}

function Show-Fatal([string]$Message) {
  Write-InstaraLog "FATAL: $Message"
  [System.Windows.Forms.MessageBox]::Show(
    "$Message`r`n`r`nLog: $LauncherLog",
    "Instara Crew - by LUC4N3X",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  ) | Out-Null
}

function Open-Instara {
  $edgeCandidates = @(
    (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe")
  ) | Where-Object { $_ -and (Test-Path $_) }

  if ($edgeCandidates.Count -gt 0) {
    $edgeProfile = Join-Path $DataRoot "edge-profile"
    Start-Process -FilePath $edgeCandidates[0] -ArgumentList @(
      "--app=$AppUrl",
      "--user-data-dir=`"$edgeProfile`"",
      "--no-first-run"
    ) | Out-Null
  } else {
    Start-Process $AppUrl | Out-Null
  }
}

$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, "Local\InstaraCrewByLUC4N3X", [ref]$createdNew)
if (-not $createdNew) {
  Open-Instara
  exit 0
}

$splash = New-Object System.Windows.Forms.Form
$splash.Text = "Instara Crew - by LUC4N3X"
$splash.Width = 520
$splash.Height = 180
$splash.StartPosition = "CenterScreen"
$splash.FormBorderStyle = "FixedDialog"
$splash.MaximizeBox = $false
$splash.MinimizeBox = $false
$splash.ControlBox = $false

$title = New-Object System.Windows.Forms.Label
$title.Text = "Instara Crew"
$title.Font = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Left = 24
$title.Top = 20
$splash.Controls.Add($title)

$byline = New-Object System.Windows.Forms.Label
$byline.Text = "by LUC4N3X"
$byline.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$byline.AutoSize = $true
$byline.Left = 27
$byline.Top = 62
$splash.Controls.Add($byline)

$status = New-Object System.Windows.Forms.Label
$status.Text = "Preparazione runtime..."
$status.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$status.AutoSize = $true
$status.Left = 27
$status.Top = 105
$splash.Controls.Add($status)

function Set-Status([string]$Text) {
  $status.Text = $Text
  Write-InstaraLog $Text
  [System.Windows.Forms.Application]::DoEvents()
}

$splash.Show()
[System.Windows.Forms.Application]::DoEvents()

$script:WebProcess = $null
$script:WorkerProcess = $null
$script:PostgresProcess = $null
$script:PgPort = $null
$script:Stopping = $false

function New-SessionKey {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return [Convert]::ToBase64String($bytes)
}

function Ensure-Settings {
  if (-not (Test-Path $ConfigPath)) {
    $templatePath = Join-Path $AppRoot ".env.example"
    if (Test-Path $templatePath) {
      Copy-Item $templatePath $ConfigPath
    } else {
      Set-Content -Path $ConfigPath -Encoding UTF8 -Value @"
SESSION_ENCRYPTION_KEY_BASE64=
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:3000/api/auth/meta/callback
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=global
GEMINI_MODEL=gemini-2.5-flash
BROWSER_HEADLESS=false
BROWSER_TIMEZONE=Europe/Rome
BROWSER_CHANNEL=
DRY_RUN=true
BURST_MODE=false
BURST_CONCURRENCY=
RATE_LIMITS=on
POST_ACCOUNT_CONCURRENCY=2
ACCOUNT_MAX_PER_HOUR=4
ACCOUNT_MAX_PER_DAY=15
ACCOUNT_MIN_GAP_SEC=45
ACTIVE_HOUR_FROM=8
ACTIVE_HOUR_TO=23
"@
    }
  }

  $raw = Get-Content $ConfigPath -Raw
  if ($raw -match '(?m)^SESSION_ENCRYPTION_KEY_BASE64=\s*$') {
    $raw = $raw -replace '(?m)^SESSION_ENCRYPTION_KEY_BASE64=\s*$', "SESSION_ENCRYPTION_KEY_BASE64=$(New-SessionKey)"
    Set-Content -Path $ConfigPath -Value $raw -Encoding UTF8
  }
}

function Import-Settings {
  foreach ($line in Get-Content $ConfigPath) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $index = $trimmed.IndexOf("=")
    if ($index -lt 1) { continue }
    $name = $trimmed.Substring(0, $index).Trim()
    $value = $trimmed.Substring($index + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

function Get-FreeTcpPort {
  $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  try {
    return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
  } finally {
    $listener.Stop()
  }
}

function Assert-Port3000Available {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $result = $client.BeginConnect("127.0.0.1", 3000, $null, $null)
    $connected = $result.AsyncWaitHandle.WaitOne(250)
    if ($connected -and $client.Connected) {
      $client.Close()
      throw "La porta 3000 e' gia' occupata. Chiudi l'app che la sta usando e riapri Instara Crew."
    }
    $client.Close()
  } catch {
    if ($_.Exception.Message -like "*porta 3000*") { throw }
  }
}

function Start-EmbeddedPostgres {
  if (-not (Test-Path $PgBin)) { throw "Runtime PostgreSQL non trovato." }
  New-Item -ItemType Directory -Force -Path $PgData | Out-Null

  $initdb = Join-Path $PgBin "initdb.exe"
  $postgres = Join-Path $PgBin "postgres.exe"
  $pgIsReady = Join-Path $PgBin "pg_isready.exe"
  $createdb = Join-Path $PgBin "createdb.exe"
  $psql = Join-Path $PgBin "psql.exe"

  if (-not (Test-Path (Join-Path $PgData "PG_VERSION"))) {
    Set-Status "Prima inizializzazione del database locale..."
    & $initdb -D $PgData -U instara --auth=trust --encoding=UTF8 1>>$LauncherLog 2>>$LauncherLog
    if ($LASTEXITCODE -ne 0) { throw "initdb PostgreSQL non riuscito." }
  }

  $script:PgPort = Get-FreeTcpPort
  Set-Status "Avvio PostgreSQL embedded..."
  $pgOut = Join-Path $LogRoot "postgres.out.log"
  $pgErr = Join-Path $LogRoot "postgres.err.log"
  $script:PostgresProcess = Start-Process -FilePath $postgres -ArgumentList @(
    "-D", "`"$PgData`"", "-h", "127.0.0.1", "-p", "$script:PgPort"
  ) -WindowStyle Hidden -PassThru -RedirectStandardOutput $pgOut -RedirectStandardError $pgErr

  $ready = $false
  for ($i = 0; $i -lt 120; $i++) {
    & $pgIsReady -h 127.0.0.1 -p $script:PgPort -U instara *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    if ($script:PostgresProcess.HasExited) { break }
    Start-Sleep -Milliseconds 250
  }
  if (-not $ready) { throw "PostgreSQL embedded non si e' avviato. Controlla i log locali." }

  $exists = (& $psql -h 127.0.0.1 -p $script:PgPort -U instara -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='instara'" 2>$null).Trim()
  if ($exists -ne "1") {
    & $createdb -h 127.0.0.1 -p $script:PgPort -U instara instara 1>>$LauncherLog 2>>$LauncherLog
    if ($LASTEXITCODE -ne 0) { throw "Creazione database Instara non riuscita." }
  }
}

function Configure-RuntimeEnvironment {
  Import-Settings
  $databaseUrl = "postgresql://instara@127.0.0.1:$script:PgPort/instara?schema=public"
  [Environment]::SetEnvironmentVariable("DATABASE_URL", $databaseUrl, "Process")
  [Environment]::SetEnvironmentVariable("QUEUE_BACKEND", "postgres", "Process")
  [Environment]::SetEnvironmentVariable("NODE_ENV", "production", "Process")
  [Environment]::SetEnvironmentVariable("PORT", "3000", "Process")
  [Environment]::SetEnvironmentVariable("HOSTNAME", "127.0.0.1", "Process")
  [Environment]::SetEnvironmentVariable("PLAYWRIGHT_BROWSERS_PATH", "0", "Process")
  [Environment]::SetEnvironmentVariable("BROWSER_PROFILE_ROOT", $BrowserProfiles, "Process")
  if (Test-Path $AdbExe) { [Environment]::SetEnvironmentVariable("ADB_PATH", $AdbExe, "Process") }
  if (Test-Path $PythonExe) { [Environment]::SetEnvironmentVariable("ANDROID_PYTHON", $PythonExe, "Process") }
}

function Invoke-NodeSetup([string[]]$Arguments, [string]$FailureMessage) {
  Push-Location $AppRoot
  try {
    & $NodeExe @Arguments 1>>$LauncherLog 2>>$LauncherLog
    if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
  } finally {
    Pop-Location
  }
}

function Start-InstaraProcesses {
  $webOut = Join-Path $LogRoot "web.out.log"
  $webErr = Join-Path $LogRoot "web.err.log"
  $workerOut = Join-Path $LogRoot "worker.out.log"
  $workerErr = Join-Path $LogRoot "worker.err.log"

  $script:WebProcess = Start-Process -FilePath $NodeExe -WorkingDirectory $AppRoot -ArgumentList @(
    "node_modules\next\dist\bin\next", "start", "-H", "127.0.0.1", "-p", "3000"
  ) -WindowStyle Hidden -PassThru -RedirectStandardOutput $webOut -RedirectStandardError $webErr

  $script:WorkerProcess = Start-Process -FilePath $NodeExe -WorkingDirectory $AppRoot -ArgumentList @(
    "node_modules\tsx\dist\cli.mjs", "src\worker.ts"
  ) -WindowStyle Hidden -PassThru -RedirectStandardOutput $workerOut -RedirectStandardError $workerErr

  Set-Status "Avvio dashboard e worker..."
  $ready = $false
  for ($i = 0; $i -lt 120; $i++) {
    if ($script:WebProcess.HasExited) { break }
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $AppUrl -TimeoutSec 1
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { $ready = $true; break }
    } catch {}
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw "La dashboard non ha risposto su $AppUrl." }
}

function Stop-ProcessTree($Process) {
  if ($null -eq $Process) { return }
  try {
    if (-not $Process.HasExited) {
      Start-Process -FilePath "$env:SystemRoot\System32\taskkill.exe" -ArgumentList @("/PID", "$($Process.Id)", "/T", "/F") -WindowStyle Hidden -Wait | Out-Null
    }
  } catch {}
}

function Stop-Instara {
  if ($script:Stopping) { return }
  $script:Stopping = $true
  Write-InstaraLog "Arresto Instara Crew."
  Stop-ProcessTree $script:WorkerProcess
  Stop-ProcessTree $script:WebProcess

  try {
    $pgCtl = Join-Path $PgBin "pg_ctl.exe"
    if (Test-Path $pgCtl) {
      & $pgCtl stop -D $PgData -m fast -w *> $null
    }
  } catch {
    Stop-ProcessTree $script:PostgresProcess
  }
}

try {
  Set-Status "Controllo installazione..."
  if (-not (Test-Path $NodeExe)) { throw "Runtime Node.js non trovato." }
  if (-not (Test-Path $AppRoot)) { throw "File applicazione non trovati." }

  Assert-Port3000Available
  Ensure-Settings
  Start-EmbeddedPostgres
  Configure-RuntimeEnvironment

  Set-Status "Preparazione schema Prisma..."
  Invoke-NodeSetup @("node_modules\prisma\build\index.js", "db", "push", "--skip-generate") "Preparazione Prisma non riuscita."

  Set-Status "Preparazione coda locale..."
  Invoke-NodeSetup @("scripts\migrate-bullmq-postgres.mjs") "Migrazione BullMQ PostgreSQL non riuscita."

  Start-InstaraProcesses
  Set-Status "Instara Crew e' pronto."
  Start-Sleep -Milliseconds 400
  $splash.Hide()
  Open-Instara

  $notify = New-Object System.Windows.Forms.NotifyIcon
  $notify.Text = "Instara Crew - by LUC4N3X"
  $notify.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($ExePath)
  $notify.Visible = $true

  $menu = New-Object System.Windows.Forms.ContextMenuStrip
  $openItem = $menu.Items.Add("Apri Instara Crew")
  $configItem = $menu.Items.Add("Apri configurazione")
  $logsItem = $menu.Items.Add("Apri log")
  $menu.Items.Add("-") | Out-Null
  $exitItem = $menu.Items.Add("Chiudi Instara Crew")

  $openItem.Add_Click({ Open-Instara })
  $configItem.Add_Click({ Start-Process notepad.exe -ArgumentList "`"$ConfigPath`"" | Out-Null })
  $logsItem.Add_Click({ Start-Process explorer.exe -ArgumentList "`"$LogRoot`"" | Out-Null })

  $context = New-Object System.Windows.Forms.ApplicationContext
  $exitItem.Add_Click({
    Stop-Instara
    $notify.Visible = $false
    $notify.Dispose()
    $context.ExitThread()
  })
  $notify.Add_DoubleClick({ Open-Instara })
  $notify.ShowBalloonTip(2500, "Instara Crew", "Pronto - by LUC4N3X", [System.Windows.Forms.ToolTipIcon]::Info)

  [System.Windows.Forms.Application]::Run($context)
} catch {
  try { $splash.Hide() } catch {}
  Stop-Instara
  Show-Fatal $_.Exception.Message
} finally {
  try { $mutex.ReleaseMutex() } catch {}
  $mutex.Dispose()
}
