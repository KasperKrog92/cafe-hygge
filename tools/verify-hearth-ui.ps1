param([string]$Url='http://127.0.0.1:8137/',[string]$Label='hearth-ui')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-hearth-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function Eval-Hearth([string]$Code) {
  $payload=$Code | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'Hearth evaluation failed'}
  return ($payload | ConvertFrom-Json)
}
function Click-Hearth([string]$Selector) {
  & $browser --session $testSession click $Selector
  if($LASTEXITCODE -ne 0){throw "Click failed: $Selector"}
}
function Reload-Hearth {
  & $browser --session $testSession reload
  if($LASTEXITCODE -ne 0){throw 'Reload failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
  Click-Hearth '#cafe'
}
function Capture-Hearth([string]$Name) {
  foreach($width in @(1440,1600)) {
    & $browser --session $testSession set viewport $width 900
    if($LASTEXITCODE -ne 0){throw 'Viewport failed'}
    Eval-Hearth 'lifeTestFrame(performance.now());true' | Out-Null
    & $browser --session $testSession screenshot (Join-Path $output "$Name-$width.png")
    if($LASTEXITCODE -ne 0){throw 'Capture failed'}
  }
}
function Talk-Hearth {
  Eval-Hearth @'
(()=>{const w=__world;w.spawnT=1e8;Object.values(w.regulars).forEach(r=>{r.lastDay=SIM._.dayIndex(w);r.force=false;});
w.regulars.gerda.force=true;SIM._.updateRegulars(w);for(let n=0;n<2400&&!SIM.gerdaAvailable(w);n++)SIM.update(w,.25);
if(!SIM.gerdaAvailable(w))throw Error('missing Gerda');lifeTestFrame(performance.now());return true;})()
'@ | Out-Null
  Click-Hearth '#meet-gerda'
  Eval-Hearth "(()=>{const w=__world;for(let n=0;n<2400&&w.moment.phase!=='talk';n++)SIM.update(w,.25);w.moment.visible=999;lifeTestFrame(performance.now());return true;})()" | Out-Null
}
try {
  & $browser --session $testSession --init-script (Join-Path $PSScriptRoot 'life-browser-init.js') open ($Url+'?dev=life-test')
  if($LASTEXITCODE -ne 0){throw 'Launch failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Boot failed'}
  Eval-Hearth "(()=>{const w=__dev.modestWorld();w.memory.life.daysCompleted=2;w.memory.life.mode='game';w.memory.life.hour=9;w.memory.life.savings=200;w.memory.life.projects.window={stage:'installed',step:4,time:0};w.memory.flags['gerda-introduced']=true;MEMORY.state=JSON.parse(MEMORY.codec.encode(w.memory));MEMORY.saveNow();return true;})()" | Out-Null
  Reload-Hearth
  Capture-Hearth 'boarded'
  Talk-Hearth
  Eval-Hearth "if(__world.moment.memoryPrefix!=='gerda-hearth-')throw Error('old intro not recognized');true" | Out-Null
  Capture-Hearth 'gerda-hope'
  Click-Hearth '#conversation-answers button:first-child'
  Eval-Hearth 'MEMORY.saveNow();true' | Out-Null
  Reload-Hearth
  Talk-Hearth
  Eval-Hearth "if(__world.moment.index!==1||__world.memory.flags['fireplace-unlocked'])throw Error('hearth cursor/unlock');true" | Out-Null
  Click-Hearth '#conversation-answers button:first-child'
  Eval-Hearth "(()=>{const w=__world;for(let n=0;n<2400&&w.moment;n++)SIM.update(w,.25);if(!w.memory.flags['fireplace-unlocked'])throw Error('no unlock');return true;})()" | Out-Null
  foreach($id in @('fireplace','mantel')) {
    Eval-Hearth @'
(()=>{const w=__world;w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;
for(let n=0;n<6000&&w.shop.phase!=='home';n++)SIM.update(w,.25);
if(w.shop.phase!=='home')throw Error('no evening');SIM.plan(w,true);lifeTestFrame(performance.now());return true;})()
'@ | Out-Null
    if($id -eq 'fireplace') {
      Eval-Hearth "if(!document.getElementById('buy-mantel').hidden||document.getElementById('buy-fireplace').hidden)throw Error('purchase order UI');true" | Out-Null
    }
    Capture-Hearth "$id-plan"
    $before=Eval-Hearth '__world.memory.life.savings'
    $price=if($id -eq 'fireplace'){30}else{40}
    $expected=$before-$price
    Click-Hearth "#buy-$id"
    Eval-Hearth "if(__world.memory.life.projects['$id'].stage!=='purchased'||__world.memory.life.savings!==$expected)throw Error('purchase');MEMORY.saveNow();true" | Out-Null
    Reload-Hearth
    Eval-Hearth "if(__world.memory.life.savings!==$expected)throw Error('balance lost');lifeTestFrame(performance.now());true" | Out-Null
    Click-Hearth '#btn-sleep'
    Eval-Hearth "(()=>{const w=__world;for(let n=0;n<6000&&w.shop.phase!=='open';n++)SIM.update(w,.25);if(w.shop.phase!=='open')throw Error('no morning');w.spawnT=1e8;return true;})()" | Out-Null
    $steps=if($id -eq 'fireplace'){4}else{3}
    for($step=0;$step -lt $steps;$step++) {
      Eval-Hearth "(()=>{const w=__world;w.spawnT=1e8;for(let n=0;n<6000&&!(w.memory.life.projects['$id'].step===$step&&w.memory.life.projects['$id'].time>=6);n++)SIM.update(w,.25);if(w.memory.life.projects['$id'].step!==$step)throw Error('missed work');SIM._.commitLife(w);lifeTestFrame(performance.now());return true;})()" | Out-Null
      if($step -eq 1){Capture-Hearth "$id-work"}
      $jobBefore=Eval-Hearth "JSON.stringify(__world.memory.life.projects['$id'])"
      Reload-Hearth
      $jobAfter=Eval-Hearth "JSON.stringify(__world.memory.life.projects['$id'])"
      if($jobBefore -cne $jobAfter){throw "Actual reload lost $id/$step"}
    }
    Eval-Hearth "(()=>{const w=__world;w.spawnT=1e8;for(let n=0;n<6000&&(w.memory.life.projects['$id'].stage!=='installed'||w.windowWorker);n++)SIM.update(w,.25);if(w.memory.life.projects['$id'].stage!=='installed'||__dev.audit().length)throw Error('completion/audit');lifeTestFrame(performance.now());return true;})()" | Out-Null
    if($id -eq 'fireplace') {
      Eval-Hearth "if(SCENE.mantelShelf(__world)||SCENE.fireplaceBoards(__world)||SCENE.hearthWork(__world))throw Error('bare working fire');true" | Out-Null
    } else {
      Eval-Hearth "if(!SCENE.hasFurniture(__world,'mantel-decor'))throw Error('missing later decoration');true" | Out-Null
    }
    Capture-Hearth "$id-installed"
  }
  $errors=& $browser --session $testSession errors
  if($LASTEXITCODE -ne 0 -or $errors){throw "Browser errors: $errors"}
  'Saved Gerda addition, actual unlock/30-coin reopening/40-coin mantel/sleep clicks, retained balances, seven exact work reloads, desktop 16:10/16:9, zero audits: PASS' | Tee-Object (Join-Path $output 'result.txt')
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
  if(!$closed -or !$listed -or ($sessions -match [regex]::Escape($testSession))){throw "Cleanup not confirmed: $testSession"}
}
