param(
    [ValidateSet('art', 'pathing', 'nora-routing', 'hours', 'animations', 'animation-journeys', 'waterfront', 'ship', 'life', 'projects', 'c0', 'first-opening')]
    [string[]]$Suite = @('art', 'pathing', 'nora-routing', 'hours', 'animations', 'animation-journeys', 'waterfront', 'ship', 'life', 'projects', 'c0', 'first-opening'),
    [string]$Url = 'http://127.0.0.1:8137/?dev',
    [ValidatePattern('^[a-zA-Z0-9_-]+$')][string]$Label = 'project-check'
)
# Optional development tooling; the shipped café still has no dependencies.
# Requires a server serving this checkout, Node.js and agent-browser on PATH.
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Text.UTF8Encoding]::new($false)
# The npm PowerShell shim does not forward piped input to its native child.
# Use its command shim on Windows so eval --stdin receives the actual source.
$browser = (Get-Command agent-browser -ErrorAction Stop).Source
if ([IO.Path]::GetExtension($browser) -eq '.ps1') {
    $browser = (Get-Command agent-browser.cmd -ErrorAction Stop).Source
}
$repo = Split-Path $PSScriptRoot -Parent
$output = Join-Path $repo ".art-review/$Label"
$testSession = 'hygge-check-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$reports = @()
New-Item -ItemType Directory -Force -Path $output | Out-Null

node (Join-Path $PSScriptRoot 'test-save.js')
if ($LASTEXITCODE -ne 0) { throw 'Save/isolation regressions failed.' }
node (Join-Path $PSScriptRoot 'test-audio-settings.js')
if ($LASTEXITCODE -ne 0) { throw 'Audio settings regressions failed.' }

# Check the actual script-tag list, including newly added production scripts.
$html = [IO.File]::ReadAllText((Join-Path $repo 'index.html'))
$scripts = [regex]::Matches($html, '<script\s+src="([^"]+)"')
foreach ($script in $scripts) {
    $path = Join-Path $repo (($script.Groups[1].Value -split '\?')[0])
    node --check $path
    if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $path" }
}
Write-Output "Syntax: $($scripts.Count) shipped scripts passed."

# Refuse a server from an unrelated checkout before mutating disposable saves.
$page = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 15
# Python's static server omits the charset header; Windows PowerShell 5.1
# otherwise decodes the UTF-8 café title as a different encoding.
$servedHtml = [Text.Encoding]::UTF8.GetString($page.RawContentStream.ToArray())
if (($servedHtml -replace "`r`n", "`n") -cne ($html -replace "`r`n", "`n")) {
    throw 'The server HTML does not match this checkout. Check the URL and server directory.'
}

try {
    # Keep launch output attached: piping the Windows daemon's first launch
    # through Out-Null can keep that pipeline open for the daemon's lifetime.
    & $browser --session $testSession open $Url
    if ($LASTEXITCODE -ne 0) { throw 'Browser launch failed.' }
    foreach ($name in $Suite) {
        # Suites use private worlds. Reload also isolates dev controls, audio
        # settings and the normal production boot between browser suites.
        & $browser --session $testSession wait --fn '!!(window.__dev && window.__world)' | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Dev harness did not become ready.' }
        "MEMORY.reset(); localStorage.removeItem('cafe-hygge-audio'); true" | & $browser --session $testSession eval --stdin | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Disposable save reset failed.' }
        & $browser --session $testSession open $Url | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Fresh page navigation failed.' }
        & $browser --session $testSession wait --fn '!!(window.__dev && window.__world)' | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Fresh harness did not become ready.' }

        $code = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot "verify-$name.js")
        # Return thrown assertions as structured failures, while also detecting
        # CLI failures. Keep PNGs out of terminal output; export them separately.
        $wrapped = "(() => { try { return { ok: true, result: $($code.Trim().TrimEnd(';')) }; } catch (e) { return { ok: false, error: String(e.stack || e) }; } })()"
        # stdin preserves JS quotes under Windows PowerShell's native argument
        # parsing as well as PowerShell 7; UTF-8 preserves captions and names.
        $payload = $wrapped | & $browser --session $testSession eval --stdin
        if ($LASTEXITCODE -ne 0) { throw "Browser evaluation failed: $name" }
        $result = $payload | ConvertFrom-Json
        $payload | Set-Content (Join-Path $output "$name.json") -Encoding UTF8

        $frameCode = @'
(() => {
  const frames = {};
  for (const key of ['hoursFrames', 'noraFrames', 'waterfrontFrames', 'shipFrames', 'lifeFrames', 'projectFrames', 'c0Frames', 'firstFrames']) {
    if (window[key]) Object.assign(frames, window[key]);
  }
  return frames;
})()
'@
        $framePayload = $frameCode | & $browser --session $testSession eval --stdin
        if ($LASTEXITCODE -ne 0) { throw "Frame export failed: $name" }
        $frames = $framePayload | ConvertFrom-Json
        foreach ($frame in $frames.PSObject.Properties) {
            if ($frame.Name -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_.-]*$') { throw 'Unexpected frame name.' }
            [IO.File]::WriteAllBytes((Join-Path $output "$name-$($frame.Name).png"),
                [Convert]::FromBase64String(($frame.Value -split ',')[1]))
        }
        if ($result.ok -and $result.result.sheet) {
            [IO.File]::WriteAllBytes((Join-Path $output "$name-sheet.png"),
                [Convert]::FromBase64String(($result.result.sheet -split ',')[1]))
        }
        $errors = & $browser --session $testSession errors
        if ($LASTEXITCODE -ne 0) { throw 'Browser error read failed.' }
        $passed = $result.ok -and !$errors
        $reports += [pscustomobject]@{ suite = $name; passed = $passed; error = $result.error; browserErrors = $errors }
        Write-Output "$name`: $(@{ $true = 'PASS'; $false = 'FAIL' }[[bool]$passed])"
        $reports | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $output 'summary.json') -Encoding UTF8
    }
} catch {
    ($_ | Out-String) | Set-Content (Join-Path $output 'runner-error.txt') -Encoding UTF8
    throw
} finally {
    & $browser --session $testSession close
    $closed = $LASTEXITCODE -eq 0
    # The browser can close just before its daemon removes the session entry.
    # Allow that brief teardown to complete before declaring cleanup failed.
    for ($attempt = 0; $attempt -lt 10; $attempt++) {
        $sessions = & $browser session list
        $listed = $LASTEXITCODE -eq 0
        if ($listed -and !($sessions -match [regex]::Escape($testSession))) { break }
        Start-Sleep -Milliseconds 200
    }
    Write-Output $sessions
    if (!$closed -or !$listed -or ($sessions -match [regex]::Escape($testSession))) {
        throw "Browser cleanup not confirmed for $testSession. Inspect before starting another session."
    }
}
if ($reports | Where-Object { !$_.passed }) { throw "Verification failures; see $output/summary.json" }
Write-Output "All selected suites passed. Results: $output"
