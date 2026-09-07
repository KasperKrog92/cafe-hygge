param([string]$Url='http://127.0.0.1:8137/',[string]$Label='first-days-ui')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-first-days-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function Eval-Day([string]$Code) {
  $payload=$Code | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'First-days evaluation failed'}
  return ($payload | ConvertFrom-Json)
}
function Click-Day([string]$Selector) {
  & $browser --session $testSession click $Selector
  if($LASTEXITCODE -ne 0){
    Eval-Day '({phase:__world.shop.phase,mode:__world.memory.life.mode,controls:document.getElementById("controls").outerHTML,style:getComputedStyle(document.getElementById("controls")).cssText,active:document.activeElement.id})' | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $output 'ui-error.json')
    & $browser --session $testSession screenshot (Join-Path $output 'ui-error.png')
    if($LASTEXITCODE -ne 0){throw 'Error capture failed'}
    throw "Click failed: $Selector"
  }
}
function Reload-Day {
  & $browser --session $testSession reload
  if($LASTEXITCODE -ne 0){throw 'Reload failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
  # Dev URLs still need the first real click to enable audio and the control bar.
  Click-Day '#cafe'
}
function Frame-Day {
  Eval-Day 'window.uiNow=performance.now();lifeTestFrame(uiNow);if(__world.shop.phase==="home")document.getElementById("btn-mode").focus();true' | Out-Null
}
try {
  & $browser --session $testSession --init-script (Join-Path $PSScriptRoot 'life-browser-init.js') open ($Url+'?dev=life-test')
  if($LASTEXITCODE -ne 0){throw 'Launch failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Boot failed'}
  & $browser --session $testSession set viewport 1440 900
  if($LASTEXITCODE -ne 0){throw 'Viewport failed'}
  Eval-Day @'
(()=>{const w=__world;SIM.skipUnpacking(w);
for(let n=0;n<2000&&!SIM.holgerAvailable(w);n++)SIM.update(w,.25);
if(!SIM.holgerAvailable(w))throw Error('no invitation');
const p=w.patrons[0],time=w.t,hour=w.hour;
p.animT=0;const bright=SIM.entityDrawables(w).bubbles.find(b=>b.icon==='dots').alpha;
SIM.update(w,1);const dim=SIM.entityDrawables(w).bubbles.find(b=>b.icon==='dots').alpha;
if(bright-dim<.5)throw Error('invitation not blinking');
for(let n=0;n<2400;n++)SIM.update(w,.25);
if(w.t!==time||w.hour!==hour||p.state!=='ordering'||w.patrons.length!==1)throw Error('unattended tutorial escaped');
w.reducedMotion=true;if(SIM.entityDrawables(w).bubbles.find(b=>b.icon==='dots').alpha!==1)throw Error('reduced motion');
MEMORY.saveNow();return true;})()
'@ | Out-Null
  Reload-Day
  Frame-Day
  Eval-Day "if(__world.patrons[0].state!=='ordering'||!SIM.holgerRequired(__world))throw Error('greeting reload');true" | Out-Null
  & $browser --session $testSession screenshot (Join-Path $output 'holger-waiting.png')
  if($LASTEXITCODE -ne 0){throw 'Invitation capture failed'}
  Click-Day '#meet-holger'
  Eval-Day "if(!__world.moment||!__world.memory.flags['holger-invitation-opened'])throw Error('invitation click');true" | Out-Null
  Click-Day '#conversation-later'
  Eval-Day "if(SIM.entityDrawables(__world).bubbles.find(b=>b.icon==='dots').alpha!==1)throw Error('blink continued after click');true" | Out-Null
  Click-Day '#meet-holger'
  # Every line and both choices are advanced through the actual dialogue buttons.
  for($n=0;$n -lt 100;$n++) {
    $active=Eval-Day '!!__world.moment'
    if(!$active){break}
    Eval-Day 'if(__world.moment.phase==="talk")SIM.advanceMoment(__world);lifeTestFrame(uiNow+=10);true' | Out-Null
    if(!(Eval-Day '!!__world.moment')){break}
    Click-Day '#conversation-answers button:first-child'
  }
  Eval-Day @'
(()=>{const w=__world;if(SIM.holgerRequired(w)||w.moment)throw Error('dialogue unfinished');
SIM.setMode(w,'game');for(let n=0;n<6000&&w.shop.phase!=='home';n++)SIM.update(w,.25);
if(w.shop.phase!=='home'||w.memory.life.savings<90)throw Error('first evening funds');
window.firstFunds=w.memory.life.savings;MEMORY.saveNow();lifeTestFrame(uiNow+=10);return true;})()
'@ | Out-Null
  $funds=Eval-Day '__world.memory.life.savings'
  Click-Day '#btn-plan'
  & $browser --session $testSession screenshot (Join-Path $output 'first-evening.png')
  if($LASTEXITCODE -ne 0){throw 'Planner capture failed'}
  Click-Day '#buy-window'
  Eval-Day "if(document.getElementById('buy-table').disabled)throw Error('table locked after window');MEMORY.saveNow();true" | Out-Null
  Reload-Day
  Frame-Day
  Click-Day '#btn-plan'
  Click-Day '#buy-table'
  Eval-Day "if(__world.memory.life.savings!==$funds-90||!document.getElementById('buy-window').disabled||!document.getElementById('buy-table').disabled)throw Error('paired debit');true" | Out-Null
  Click-Day '#close-plan'
  Click-Day '#btn-sleep'
  $reloads=@()
  foreach($step in 0..3) {
    $before=Eval-Day "(()=>{const w=__world,p=w.memory.life.projects.window;for(let n=0;n<6000&&!(p.stage==='working'&&p.step===$step&&p.time>=4);n++)SIM.update(w,.25);if(p.stage!=='working'||p.step!==$step)throw Error('repair stage');MEMORY.saveNow();return {project:JSON.stringify(p),savings:w.memory.life.savings};})()"
    Reload-Day
    $after=Eval-Day '({project:JSON.stringify(__world.memory.life.projects.window),savings:__world.memory.life.savings})'
    if($before.project -cne $after.project -or $before.savings -ne $after.savings){throw 'Repair reload changed progress or funds'}
    $reloads+=$after
  }
  Eval-Day @'
(()=>{const w=__world;for(let n=0;n<6500&&!(w.memory.life.projects.window.stage==='installed'&&w.memory.life.projects.table.stage==='installed'&&!w.windowWorker);n++)SIM.update(w,.25);
if(w.seats.length!==6||!SCENE.windowOpen(w,SCENE.L.win)||SCENE.windowOpen(w,SCENE.L.win2))throw Error('installed result');
if(__dev.audit().length)throw Error('final audit');MEMORY.saveNow();return true;})()
'@ | Out-Null
  Reload-Day
  Eval-Day 'if(__world.seats.length!==6||!SCENE.windowOpen(__world,SCENE.L.win)||SIM.holgerRequired(__world))throw Error("installed reload");true' | Out-Null
  foreach($width in @(1440,1600)) {
    & $browser --session $testSession set viewport $width 900
    if($LASTEXITCODE -ne 0){throw 'Result viewport failed'}
    Frame-Day
    & $browser --session $testSession screenshot (Join-Path $output "improved-$width.png")
    if($LASTEXITCODE -ne 0){throw 'Result capture failed'}
  }
  $reloads | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $output 'reloads.json') -Encoding UTF8
  $pageErrors=& $browser --session $testSession errors
  if($LASTEXITCODE -ne 0 -or $pageErrors){throw "Browser errors: $pageErrors"}
  Write-Output 'Mandatory invitation, actual dialogue/planner buttons, paired purchases, seven page reloads and desktop captures: PASS'
} finally {
  & $browser --session $testSession close
  if($LASTEXITCODE -ne 0){throw "Cleanup failed: $testSession"}
  for($attempt=0;$attempt -lt 10;$attempt++) {
    $sessions=& $browser session list
    if($LASTEXITCODE -ne 0){throw 'Session inspection failed'}
    if(!($sessions -match $testSession)){break}
    Start-Sleep -Milliseconds 150
  }
  if($sessions -match $testSession){throw 'Cleanup not confirmed'}
  Write-Output $sessions
}
