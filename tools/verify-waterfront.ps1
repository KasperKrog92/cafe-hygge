param([switch]$Regression)
$ErrorActionPreference = 'Stop'
$testSession = 'hygge-waterfront-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$repo = Split-Path $PSScriptRoot -Parent
$output = Join-Path $repo '.art-review/waterfront-motion'
New-Item -ItemType Directory -Force $output | Out-Null
try {
    agent-browser --session $testSession open 'http://127.0.0.1:8137/?dev'
    if ($LASTEXITCODE -ne 0) { throw 'Browser launch failed' }
    agent-browser --session $testSession wait --fn '!!window.__world'
    if ($LASTEXITCODE -ne 0) { throw 'Dev harness not ready' }
    $code = Get-Content -Raw (Join-Path $PSScriptRoot 'verify-waterfront.js')
    $result = agent-browser --session $testSession eval $code
    $verified = $LASTEXITCODE -eq 0
    $payload = agent-browser --session $testSession eval 'window.waterfrontFrames'
    if ($LASTEXITCODE -ne 0) { throw 'Frame export failed' }
    $frames = $payload | ConvertFrom-Json
    foreach ($shot in $frames.PSObject.Properties) {
        [IO.File]::WriteAllBytes((Join-Path $output ($shot.Name + '.png')), [Convert]::FromBase64String($shot.Value.Split(',')[1]))
    }
    if (!$verified) { throw 'Waterfront verification failed; inspect the exported frames' }
    $result | Set-Content (Join-Path $output 'verification.json')
    Write-Output $result
    if ($Regression) {
        foreach ($name in @('verify-nora-routing', 'verify-hours')) {
            $code = Get-Content -Raw (Join-Path $PSScriptRoot ($name + '.js'))
            $result = agent-browser --session $testSession eval $code
            if ($LASTEXITCODE -ne 0) { throw "$name failed" }
            $result | Set-Content (Join-Path $output ($name + '.json'))
            Write-Output $result
        }
    }
    $errors = agent-browser --session $testSession errors
    if ($LASTEXITCODE -ne 0) { throw 'Browser error read failed' }
    if ($errors) { throw "Browser errors: $errors" }
} finally {
    agent-browser --session $testSession close
    if ($LASTEXITCODE -ne 0) { Write-Warning "Cleanup failed for $testSession" }
    agent-browser session list
    if ($LASTEXITCODE -ne 0) { Write-Warning 'Cannot verify browser cleanup' }
}
