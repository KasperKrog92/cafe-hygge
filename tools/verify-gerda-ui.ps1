param([string]$Url='http://127.0.0.1:8137/',[string]$Label='gerda-ui')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-gerda-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function Eval-Gerda([string]$Code) {
  $payload=$Code | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'Gerda evaluation failed'}
  return ($payload | ConvertFrom-Json)
}
function Click-Gerda([string]$Selector) {
  & $browser --session $testSession click $Selector
  if($LASTEXITCODE -ne 0){throw "Click failed: $Selector"}
}
function Reload-Gerda {
  & $browser --session $testSession reload
  if($LASTEXITCODE -ne 0){throw 'Reload failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
  Click-Gerda '#cafe'
}
function Invite-Gerda {
  Eval-Gerda @'
(()=>{const w=__world;w.spawnT=1e8;Object.values(w.regulars).forEach(r=>{r.lastDay=SIM._.dayIndex(w);r.force=false;});
w.regulars.gerda.force=true;SIM._.updateRegulars(w);
for(let n=0;n<2400&&!SIM.gerdaAvailable(w);n++)SIM.update(w,.25);
if(!SIM.gerdaAvailable(w))throw Error('missing invitation');lifeTestFrame(performance.now());return true;})()
'@ | Out-Null
  Click-Gerda '#meet-gerda'
  Eval-Gerda "(()=>{for(let n=0;n<2000&&__world.moment.phase!=='talk';n++)SIM.update(__world,.25);if(__world.moment.phase!=='talk')throw Error('no conversation');return true;})()" | Out-Null
}
function Capture-Gerda([string]$Name) {
  foreach($width in @(1440,1600)) {
    & $browser --session $testSession set viewport $width 900
    if($LASTEXITCODE -ne 0){throw 'Viewport failed'}
    Eval-Gerda 'lifeTestFrame(performance.now());true' | Out-Null
    & $browser --session $testSession screenshot (Join-Path $output "$Name-$width.png")
    if($LASTEXITCODE -ne 0){throw 'Capture failed'}
  }
}
try {
  & $browser --session $testSession --init-script (Join-Path $PSScriptRoot 'life-browser-init.js') open ($Url+'?dev=life-test')
  if($LASTEXITCODE -ne 0){throw 'Launch failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Boot failed'}
  Eval-Gerda "(()=>{const w=__dev.modestWorld();w.memory.life.daysCompleted=2;w.memory.life.mode='game';w.memory.life.hour=9;w.memory.life.projects.window={stage:'installed',step:4,time:0};MEMORY.state=JSON.parse(MEMORY.codec.encode(w.memory));MEMORY.saveNow();return true;})()" | Out-Null
  Reload-Gerda
  Invite-Gerda
  Eval-Gerda "(()=>{const w=__world;while(!SIM.momentLine(w).choices){w.moment.visible=999;SIM.advanceMoment(w);}w.moment.visible=999;lifeTestFrame(performance.now());return true;})()" | Out-Null
  Capture-Gerda 'pillow-offer'
  Click-Gerda '#conversation-answers button:first-child'
  Eval-Gerda "if(!__world.memory.flags['gerda-hello-yes']||__world.memory.flags['gerda-pillows-accepted'])throw Error('choice/unlock boundary');MEMORY.saveNow();true" | Out-Null
  Reload-Gerda
  Invite-Gerda
  Eval-Gerda "if(SIM.momentLine(__world).speaker!=='Gerda'||SIM.momentLine(__world).text!==CAST.gerdaWindow.hello.find(l=>l.choices).choices[0].reply)throw Error('chosen reply lost');__world.moment.visible=999;lifeTestFrame(performance.now());true" | Out-Null
  Click-Gerda '#conversation-answers button:first-child'
  Eval-Gerda '__world.moment.visible=999;lifeTestFrame(performance.now());true' | Out-Null
  Click-Gerda '#conversation-answers button:first-child'
  Eval-Gerda @'
(()=>{const w=__world;for(let n=0;n<2000&&w.moment;n++)SIM.update(w,.25);
if(!w.memory.flags['gerda-pillows-accepted'])throw Error('no unlock');w.memory.life.savings=150;
w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;for(let n=0;n<6000&&w.shop.phase!=='home';n++)SIM.update(w,.25);
if(w.shop.phase!=='home')throw Error('no evening');SIM.plan(w,true);lifeTestFrame(performance.now());return true;})()
'@ | Out-Null
  Capture-Gerda 'planner'
  Click-Gerda '#buy-windowSeat'
  Eval-Gerda "if(__world.memory.life.projects.windowSeat.stage!=='purchased')throw Error('no purchase');window.gerdaBalance=__world.memory.life.savings;MEMORY.saveNow();true" | Out-Null
  $balance=Eval-Gerda '__world.memory.life.savings'
  Reload-Gerda
  Eval-Gerda "if(__world.memory.life.savings!==$balance||__world.memory.life.projects.windowSeat.stage!=='purchased')throw Error('purchase reload');lifeTestFrame(performance.now());true" | Out-Null
  Click-Gerda '#btn-sleep'
  Eval-Gerda "(()=>{const w=__world;for(let n=0;n<6000&&w.shop.phase!=='open';n++)SIM.update(w,.25);if(w.shop.phase!=='open')throw Error('no next morning');w.spawnT=1e8;return true;})()" | Out-Null
  for($step=0;$step -lt 4;$step++) {
    Eval-Gerda "(()=>{const w=__world;w.spawnT=1e8;for(let n=0;n<6000&&!(w.memory.life.projects.windowSeat.step===$step&&w.memory.life.projects.windowSeat.time>=3);n++)SIM.update(w,.25);if(w.memory.life.projects.windowSeat.step!==$step)throw Error('missed work');SIM._.commitLife(w);return true;})()" | Out-Null
    $before=Eval-Gerda 'JSON.stringify(__world.memory.life.projects.windowSeat)'
    Reload-Gerda
    $after=Eval-Gerda 'JSON.stringify(__world.memory.life.projects.windowSeat)'
    if($before -cne $after){throw 'Actual reload lost table work'}
  }
  Eval-Gerda @'
(()=>{const w=__world;w.spawnT=1e8;for(let n=0;n<6000&&w.memory.life.projects.windowSeat.stage!=='installed';n++)SIM.update(w,.25);
Object.values(w.regulars).forEach(r=>{r.lastDay=SIM._.dayIndex(w);r.force=false;});SIM._.updateRegulars(w);
for(let n=0;n<2000&&!w.memory.flags['gerda-pillow-left'];n++)SIM.update(w,.25);
if(!w.memory.flags['gerda-pillow-left']||w.memory.flags['gerda-pillow-right'])throw Error('first placement boundary');MEMORY.saveNow();return true;})()
'@ | Out-Null
  Reload-Gerda
  Eval-Gerda "if(!__world.memory.flags['gerda-pillow-left']||__world.memory.flags['gerda-pillow-right'])throw Error('gift reload');true" | Out-Null
  Invite-Gerda
  Eval-Gerda "(()=>{const w=__world;for(let n=0;n<6;n++){w.moment.visible=999;SIM.advanceMoment(w);}w.moment.visible=999;lifeTestFrame(performance.now());return true;})()" | Out-Null
  Capture-Gerda 'warm-window'
  Eval-Gerda 'MEMORY.saveNow();true' | Out-Null
  Reload-Gerda
  Invite-Gerda
  Eval-Gerda "if(__world.moment.index!==6)throw Error('thanks cursor');(()=>{const w=__world;while(w.moment.phase==='talk'){w.moment.visible=999;SIM.advanceMoment(w);}for(let n=0;n<2000&&w.moment;n++)SIM.update(w,.25);if(!w.memory.flags['gerda-window-thanked']||__dev.audit().length)throw Error('completion/audit');return true;})()" | Out-Null
  $errors=& $browser --session $testSession errors
  if($LASTEXITCODE -ne 0 -or $errors){throw "Browser errors: $errors"}
  'Actual invitation/choice/planner/sleep clicks, selected reply reload, four exact assembly reloads, first pillow reload, thank-you cursor, desktop 16:10/16:9 and zero audits: PASS' | Tee-Object (Join-Path $output 'result.txt')
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
