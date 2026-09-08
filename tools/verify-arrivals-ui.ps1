param([string]$Url='http://127.0.0.1:8137/?dev',[string]$Label='arrivals-reloads')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-arrivals-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function Eval-Arrival([string]$code) {
    $result=$code | & $browser --session $testSession eval --stdin
    if($LASTEXITCODE -ne 0){throw 'Arrival browser assertion failed'}
    return $result
}
try {
    & $browser --session $testSession open $Url
    if($LASTEXITCODE -ne 0){throw 'Launch failed'}
    & $browser --session $testSession wait --fn '!!window.__dev'
    if($LASTEXITCODE -ne 0){throw 'Boot failed'}
    # Setup stays still while the page reloads; no artificial offline time.
    Eval-Arrival "(()=>{const s=MEMORY.codec.fresh();s.life.openSeconds=417.25;s.life.savings=71;s.flags.kept=true;MEMORY.state=s;MEMORY.saveNow();return true;})()" | Out-Null
    & $browser --session $testSession open $Url
    if($LASTEXITCODE -ne 0){throw 'Reload failed'}
    & $browser --session $testSession wait --fn '!!window.__dev'
    if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
    Eval-Arrival "(()=>{const s=__world.memory;if(s.life.openSeconds!==417.25||s.life.savings!==71||!s.flags.kept)throw Error('Reload lost saved popularity/history');return true;})()" | Out-Null
    Eval-Arrival "(()=>{const s=MEMORY.codec.fresh();s.version=12;delete s.life.openSeconds;s.life.daysCompleted=5;s.life.savings=71;s.flags.kept=true;localStorage.setItem('cafe-hygge-save',JSON.stringify(s));MEMORY.readOnly=true;return true;})()" | Out-Null
    & $browser --session $testSession open $Url
    if($LASTEXITCODE -ne 0){throw 'Migration reload failed'}
    & $browser --session $testSession wait --fn '!!window.__dev'
    if($LASTEXITCODE -ne 0){throw 'Migration boot failed'}
    Eval-Arrival "(()=>{const s=__world.memory;if(s.version!==13||s.life.openSeconds!==3360||s.life.savings!==71||!s.flags.kept)throw Error('Browser migration lost history');return {version:s.version,openSeconds:s.life.openSeconds,savings:s.life.savings,audit:__dev.audit()};})()" |
      Set-Content (Join-Path $output 'reloads.json') -Encoding UTF8
    $errors=& $browser --session $testSession errors
    if($LASTEXITCODE -ne 0 -or $errors){throw "Browser errors: $errors"}
    Write-Output 'PASS saved partial popularity and v12 migration across actual page reloads'
} finally {
    & $browser --session $testSession close
    $closed=$LASTEXITCODE -eq 0
    for($attempt=0;$attempt -lt 10;$attempt++) {
        $sessions=& $browser session list
        $listed=$LASTEXITCODE -eq 0
        if($listed -and !($sessions -match [regex]::Escape($testSession))){break}
        Start-Sleep -Milliseconds 200
    }
    Write-Output $sessions
    if(!$closed -or !$listed -or ($sessions -match [regex]::Escape($testSession))){throw 'Browser cleanup not confirmed'}
}
