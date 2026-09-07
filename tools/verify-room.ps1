param([string]$Label='compact-after')
$ErrorActionPreference='Stop'
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-room-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function Eval-Room([string]$Code) {
 $result=$Code | & $browser --session $testSession eval --stdin
 if($LASTEXITCODE -ne 0){throw 'Evaluation failed'}
 return $result
}
try {
 & $browser --session $testSession --init-script (Join-Path $PSScriptRoot 'life-browser-init.js') open 'http://127.0.0.1:8137/?dev=life-test'
 if($LASTEXITCODE -ne 0){throw 'Launch failed'}
 & $browser --session $testSession set viewport 1440 810
 if($LASTEXITCODE -ne 0){throw 'Viewport failed'}
 & $browser --session $testSession wait --fn '!!window.__world'
 if($LASTEXITCODE -ne 0){throw 'Boot failed'}
 Eval-Room '(()=>{for(let i=0;i<5000&&__world.shop.phase==="settling";i++)SIM.update(__world,.25);__world.activeCaption=null;lifeTestFrame(performance.now());const a=__dev.audit();if(a.length)throw Error(a.join(";"));if(cafe.width!==1664||cafe.height!==936)throw Error("small viewport");MEMORY.saveNow();return true})()'
 & $browser --session $testSession reload
 if($LASTEXITCODE -ne 0){throw 'Reload failed'}
 & $browser --session $testSession wait --fn '!!window.__world'
 if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
 Eval-Room 'if(__world.memory.life.room!=="small")throw Error("room lost on reload");__world.patrons=[];__world.seats.forEach(s=>s.taken=false);lifeTestFrame(performance.now());true'
 & $browser --session $testSession screenshot (Join-Path $output 'viewport-small.png')
 if($LASTEXITCODE -ne 0){throw 'Capture failed'}
 Eval-Room '__world.memory.life.room="full";lifeTestFrame(performance.now());if(cafe.width!==1920||cafe.height!==1080)throw Error("expanded viewport");true'
 & $browser --session $testSession screenshot (Join-Path $output 'viewport-expanded.png')
 if($LASTEXITCODE -ne 0){throw 'Expanded capture failed'}
 Eval-Room '__world.memory.life.room="small";__dev.home();lifeTestFrame(performance.now());if(cafe.width!==1920||cafe.height!==1080)throw Error("home crop");true'
 $errors=& $browser --session $testSession errors
 if($LASTEXITCODE -ne 0 -or $errors){throw "Browser errors: $errors"}
 Write-Output 'Small room reload, expanded framing and apartment framing: PASS'
} finally {
 & $browser --session $testSession close
 if($LASTEXITCODE -ne 0){throw 'Close failed'}
 for($i=0;$i -lt 10;$i++) {
  $sessions=& $browser session list
  if($LASTEXITCODE -eq 0 -and !($sessions -match $testSession)){break}
  Start-Sleep -Milliseconds 200
 }
 if($LASTEXITCODE -ne 0 -or ($sessions -match $testSession)){throw 'Cleanup failed'}
 Write-Output $sessions
}