param(
    [ValidatePattern('^[a-zA-Z0-9_-]+$')][string]$Label = 'review',
    [string]$Session = ('hygge-art-' + [guid]::NewGuid().ToString('N').Substring(0, 8)),
    [string]$Url = 'http://127.0.0.1:8137/?dev',
    [switch]$Verify
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$output = Join-Path $repo ".art-review/$Label"
New-Item -ItemType Directory -Force -Path $output | Out-Null
# Use a fresh review session: reload alone can retain cached script tags.
# This session belongs to this tool, never the owner's everyday café tab.
try {
agent-browser --session $Session open $Url
if ($LASTEXITCODE -ne 0) { throw 'Start the local HTTP server first (see docs/art-workflow.md).' }
agent-browser --session $Session wait --fn '!!(window.__dev && window.__dev.review && window.__world)' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Dev harness did not become ready.' }
$payload = agent-browser --session $Session eval @'
(() => {
  const problems = __dev.audit().concat(__dev.audit(__dev.study()), __dev.audit(__dev.study({hour:20})));
  const memory = JSON.stringify(MEMORY.state), time = __world.t;
  const shots = __dev.review();
  if (memory !== JSON.stringify(MEMORY.state) || time !== __world.t)
    throw new Error('Art review changed live simulation or memory');
  return { problems, shots };
})()
'@
if ($LASTEXITCODE -ne 0) { throw 'Browser art review failed.' }
$result = $payload | ConvertFrom-Json
foreach ($shot in $result.shots.PSObject.Properties) {
    $path = Join-Path $output ($shot.Name + '.png')
    [IO.File]::WriteAllBytes($path, [Convert]::FromBase64String($shot.Value.Split(',')[1]))
}
ConvertTo-Json -InputObject @($result.problems) | Set-Content (Join-Path $output 'audit.json')
if ($result.problems.Count) { throw ($result.problems -join "`n") }
if ($Verify) {
    $code = Get-Content -Raw (Join-Path $PSScriptRoot 'verify-art.js')
    $verification = agent-browser --session $Session eval $code
    if ($LASTEXITCODE -ne 0) { throw 'Art verification failed.' }
    $verification | Set-Content (Join-Path $output 'verification.json')
    Write-Output $verification
}
Write-Output "Saved day, night, empty scene, people and six detail crops to $output; audit: 0 problems."
} finally {
    agent-browser --session $Session close
}
