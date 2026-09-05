param(
  [string]$OutputDir = (Join-Path $PWD "desktop-dist")
)

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$StageRoot = Join-Path $env:RUNNER_TEMP "instara-standalone"
$AppStage = Join-Path $StageRoot "app"
$RuntimeStage = Join-Path $StageRoot "runtime"
$NodeStage = Join-Path $RuntimeStage "node"
$PostgresStage = Join-Path $RuntimeStage "postgres"
$PythonStage = Join-Path $RuntimeStage "python"
$AdbStage = Join-Path $RuntimeStage "platform-tools"

Remove-Item $StageRoot -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $OutputDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $StageRoot, $AppStage, $RuntimeStage, $NodeStage, $OutputDir | Out-Null

$package = Get-Content (Join-Path $ProjectRoot "package.json") -Raw | ConvertFrom-Json
$version = [string]$package.version
$exeVersion = if ($version.Split('.').Count -eq 3) { "$version.0" } else { $version }

Write-Host "Assembling Instara Crew $version - by LUC4N3X"

$copyDirs = @(".next", "node_modules", "prisma", "public", "scripts", "src")
foreach ($dir in $copyDirs) {
  $source = Join-Path $ProjectRoot $dir
  if (-not (Test-Path $source)) { throw "Missing build input: $source" }
  $destination = Join-Path $AppStage $dir
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  & robocopy $source $destination /E /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed for $dir with code $LASTEXITCODE" }
}

$copyFiles = @("package.json", "next.config.ts", ".env.example", "requirements-android.txt")
foreach ($file in $copyFiles) {
  Copy-Item (Join-Path $ProjectRoot $file) (Join-Path $AppStage $file) -Force
}

$nodeExe = (Get-Command node.exe).Source
Copy-Item $nodeExe (Join-Path $NodeStage "node.exe") -Force

Write-Host "Packing embedded PostgreSQL..."
$pgTemp = Join-Path $env:RUNNER_TEMP "instara-postgres-package"
Remove-Item $pgTemp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $pgTemp | Out-Null
& npm install --prefix $pgTemp --no-save --package-lock=false "@embedded-postgres/windows-x64@18.4.0-beta.17"
if ($LASTEXITCODE -ne 0) { throw "Failed to install embedded PostgreSQL package" }
$pgPackageRoot = Join-Path $pgTemp "node_modules\@embedded-postgres\windows-x64"
$native = Join-Path $pgPackageRoot "native"
if (-not (Test-Path (Join-Path $native "bin\postgres.exe"))) { throw "Embedded PostgreSQL package is incomplete" }
& robocopy $native $PostgresStage /E /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Failed to copy embedded PostgreSQL" }
Copy-Item (Join-Path $pgPackageRoot "LICENSE.md") (Join-Path $PostgresStage "LICENSE.md") -Force -ErrorAction SilentlyContinue

Write-Host "Packing Android Platform Tools..."
$platformToolsZip = Join-Path $env:RUNNER_TEMP "platform-tools.zip"
$platformToolsExtract = Join-Path $env:RUNNER_TEMP "platform-tools-extract"
Remove-Item $platformToolsExtract -Recurse -Force -ErrorAction SilentlyContinue
Invoke-WebRequest -Uri "https://dl.google.com/android/repository/platform-tools-latest-windows.zip" -OutFile $platformToolsZip
Expand-Archive -Path $platformToolsZip -DestinationPath $platformToolsExtract -Force
& robocopy (Join-Path $platformToolsExtract "platform-tools") $AdbStage /E /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Failed to copy Android Platform Tools" }

Write-Host "Packing Python + uiautomator2..."
$pythonBase = (& python -c "import sys; print(sys.base_prefix)").Trim()
if (-not (Test-Path (Join-Path $pythonBase "python.exe"))) { throw "Python base runtime not found" }
& robocopy $pythonBase $PythonStage /E /NFL /NDL /NJH /NJS /NP /XD "__pycache__" | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Failed to copy Python runtime" }
& (Join-Path $PythonStage "python.exe") -m pip install --disable-pip-version-check --no-warn-script-location -r (Join-Path $ProjectRoot "requirements-android.txt")
if ($LASTEXITCODE -ne 0) { throw "Failed to install Android Python dependencies" }

Write-Host "Creating Windows icon..."
Add-Type -AssemblyName System.Drawing
$bitmap = [System.Drawing.Bitmap]::FromFile((Join-Path $ProjectRoot "public\logo.png"))
$iconHandle = $bitmap.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$iconPath = Join-Path $StageRoot "Instara-Crew.ico"
$stream = [System.IO.File]::Open($iconPath, [System.IO.FileMode]::Create)
try {
  $icon.Save($stream)
} finally {
  $stream.Dispose()
  $icon.Dispose()
  $bitmap.Dispose()
}

Write-Host "Compiling native launcher..."
Set-PSRepository -Name PSGallery -InstallationPolicy Trusted
Install-Module ps2exe -Scope CurrentUser -Force -AllowClobber
Import-Module ps2exe
Invoke-ps2exe `
  -inputFile (Join-Path $PSScriptRoot "launcher.ps1") `
  -outputFile (Join-Path $StageRoot "Instara-Crew.exe") `
  -iconFile $iconPath `
  -title "Instara Crew" `
  -product "Instara Crew" `
  -company "LUC4N3X" `
  -copyright "Copyright (c) LUC4N3X" `
  -version $exeVersion `
  -noConsole `
  -STA

Write-Host "Compiling installer..."
$iscc = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $iscc)) {
  choco install innosetup --no-progress -y
}
if (-not (Test-Path $iscc)) { throw "Inno Setup compiler not found" }

$iss = Join-Path $PSScriptRoot "installer.iss"
& $iscc "/DMyAppVersion=$version" "/DStageDir=$StageRoot" "/DOutputDir=$OutputDir" $iss
if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed" }

$portable = Join-Path $OutputDir "Instara-Crew-Portable-$version-by-LUC4N3X.zip"
Compress-Archive -Path (Join-Path $StageRoot "*") -DestinationPath $portable -CompressionLevel Optimal -Force

Write-Host "Standalone Windows artifacts ready in $OutputDir"
