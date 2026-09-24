# Full local verification, the same checks CI runs before it deploys:
#   Node save/audio regressions, syntax, the one-hour soak, then every browser
#   suite through tools/run-suites.js (fresh browser context per suite).
# Development tooling only; the shipped café has no dependencies.
# Requires Node 24+ and Google Chrome. First run installs playwright-core
# (pinned in tools/package.json, no browser download) into tools/node_modules.
param(
    # Suite names, as an array or one comma-separated string (works with -File too).
    [string[]]$Suite = @(),
    [ValidatePattern('^[a-zA-Z0-9_-]+$')][string]$Label = 'project-check',
    [int]$Jobs = 3,
    # Optional: test an already running server instead of the runner's own.
    [string]$Url = '',
    [switch]$SkipSoak
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent

function Invoke-Checked([string]$What, [scriptblock]$Command) {
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "$What failed." }
}

Invoke-Checked 'Save/isolation regressions' { node (Join-Path $PSScriptRoot 'test-save.js') }
Invoke-Checked 'Audio settings regressions' { node (Join-Path $PSScriptRoot 'test-audio-settings.js') }
$scripts = @(Get-ChildItem (Join-Path $repo 'js/*.js')) + @(Get-ChildItem (Join-Path $PSScriptRoot '*.js'))
foreach ($script in $scripts) { Invoke-Checked "Syntax check of $($script.Name)" { node --check $script.FullName } }
Write-Output "Syntax: $($scripts.Count) scripts passed."
if (!$SkipSoak) { Invoke-Checked 'Soak' { node (Join-Path $PSScriptRoot 'test-soak.js') 1 } }

if (!(Test-Path (Join-Path $PSScriptRoot 'node_modules/playwright-core'))) {
    Invoke-Checked 'Installing pinned dev tools' { npm ci --prefix $PSScriptRoot }
}
$runnerArgs = @((Join-Path $PSScriptRoot 'run-suites.js'), '--label', $Label, '--jobs', $Jobs)
$names = @($Suite | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($names.Count) { $runnerArgs += @('--suite', ($names -join ',')) }
if ($Url) { $runnerArgs += @('--url', $Url) }
Invoke-Checked 'Browser suites' { node @runnerArgs }
