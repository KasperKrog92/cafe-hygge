param([string]$Url='http://127.0.0.1:8137/',[string]$Label='life-reloads')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$repo=Split-Path $PSScriptRoot -Parent
$output=Join-Path $repo ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-life-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function Eval-Life([string]$Code) {
  $payload=$Code | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'Browser evaluation failed'}
  return ($payload | ConvertFrom-Json)
}
try {
  & $browser --session $testSession --init-script (Join-Path $PSScriptRoot 'life-browser-init.js') open ($Url+'?dev=life-test')
  if($LASTEXITCODE -ne 0){throw 'Launch failed'}
  & $browser --session $testSession wait --fn '!!window.__world'
  if($LASTEXITCODE -ne 0){throw 'Boot failed'}
  $code=Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'verify-life.js')
  $result=Eval-Life $code
  $saves=Eval-Life 'window.lifeSaves'
  foreach($stage in @('home-reading','purchased','scheduled','carry','unpack','place','installed')) {
    $raw=$saves.$stage | ConvertTo-Json -Compress
    Eval-Life "MEMORY.state=MEMORY.codec.decode($raw).state; MEMORY.saveNow(); true" | Out-Null
    & $browser --session $testSession reload
    if($LASTEXITCODE -ne 0){throw 'Reload failed'}
    & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
    if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
    $check=Eval-Life @'
(()=>{
 const w=__world,l=w.memory.life,stage=l.plant.stage,funds=l.savings,phase=w.shop.phase;
 MEMORY.codec.validate(w.memory);
 const a=__dev.audit();if(a.length)throw Error(a.join(';'));
 if(phase==='home') {
   for(let i=0;i<1200;i++)SIM.update(w,.25);
   if(w.shop.phase!=='home')throw Error('reload lost evening wait');
   if(stage!=='available'&&!SIM.goToSleep(w))throw Error('reload sleep failed');
 }
 if(stage!=='available') {
   for(let i=0;i<6000 && !(w.shop.phase==='open'&&l.plant.stage==='installed');i++)SIM.update(w,.25);
   if(l.plant.stage!=='installed'||w.shop.phase!=='open')throw Error('not installed after reload');
   if(l.savings!==funds)throw Error('charged again');
   if(SCENE.plantDrawables(w).length!==1)throw Error('duplicate plant');
 }
 return {stage,phase,funds,installed:l.plant.stage==='installed'};
})()
'@
    $check | ConvertTo-Json | Set-Content (Join-Path $output "$stage.json") -Encoding UTF8
    Write-Output "Real reload: $stage PASS"
  }
  $raw=$saves.'home-reading' | ConvertTo-Json -Compress
  Eval-Life "MEMORY.state=MEMORY.codec.decode($raw).state; MEMORY.saveNow(); true" | Out-Null
  & $browser --session $testSession reload
  if($LASTEXITCODE -ne 0){throw 'Planner reload failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Planner boot failed'}
  Eval-Life "document.getElementById('enter').click(); lifeTestFrame(performance.now()); true" | Out-Null
  & $browser --session $testSession find role button click --name 'evening plan'
  if($LASTEXITCODE -ne 0){throw 'Planner did not open'}
  Eval-Life 'lifeTestFrame(performance.now()); true' | Out-Null
  & $browser --session $testSession screenshot (Join-Path $output 'evening-planner.png')
  if($LASTEXITCODE -ne 0){throw 'Screenshot failed'}
  & $browser --session $testSession find role button click --name 'A plant by the window, 30 coins'
  if($LASTEXITCODE -ne 0){throw 'Purchase UI failed'}
  Eval-Life "(()=>{let s=__world.memory.life.savings;document.getElementById('buy-plant').click();if(s!==__world.memory.life.savings)throw Error('double charge');lifeTestFrame(performance.now());return true})()" | Out-Null
  & $browser --session $testSession press Escape
  if($LASTEXITCODE -ne 0){throw 'Escape failed'}
  Eval-Life "(()=>{if(__world.plannerOpen)throw Error('planner stuck');SIM.setMode(__world,'idle');lifeTestFrame(performance.now());if(!document.getElementById('btn-plan').hidden)throw Error('idle controls');return true})()" | Out-Null
  Eval-Life "SIM.setMode(__world,'game');for(let i=0;i<1200;i++)SIM.update(__world,.25);if(__world.shop.phase!=='home')throw Error('closed notebook advanced day');lifeTestFrame(performance.now());true" | Out-Null
  & $browser --session $testSession mouse move 700 700
  if($LASTEXITCODE -ne 0){throw 'Reveal controls failed'}
  & $browser --session $testSession screenshot (Join-Path $output 'go-to-sleep.png')
  if($LASTEXITCODE -ne 0){throw 'Sleep screenshot failed'}
  & $browser --session $testSession find role button click --name 'go to sleep'
  if($LASTEXITCODE -ne 0){throw 'Sleep UI failed'}
  Eval-Life "if(__world.shop.phase!=='dawn'||Math.abs(__world.hour-7.5)>1e-8)throw Error('sleep did not start morning');lifeTestFrame(performance.now());if(!document.getElementById('btn-sleep').hidden)throw Error('sleep visible in cafe');true" | Out-Null
  & $browser --session $testSession reload
  if($LASTEXITCODE -ne 0){throw 'Morning reload failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Morning boot failed'}
  Eval-Life "if(__world.shop.phase!=='dawn')throw Error('sleep not persisted');SIM.update(__world,2);if(__world.shop.phase!=='entering')throw Error('morning entrance missing');true" | Out-Null
  & $browser --session $testSession tab new ($Url+'?life-test')
  if($LASTEXITCODE -ne 0){throw 'Second tab failed'}
  Eval-Life "(()=>{if(window.__world)throw Error('second writer');if(!document.getElementById('enter').disabled)throw Error('waiting UI');MEMORY.state.life.savings=777;MEMORY.saveNow();if(JSON.parse(localStorage.getItem('cafe-hygge-save')).life.savings===777)throw Error('waiting tab overwrote active save');return true})()" | Out-Null
  & $browser --session $testSession tab t1
  if($LASTEXITCODE -ne 0){throw 'First tab selection failed'}
  & $browser --session $testSession open 'about:blank'
  if($LASTEXITCODE -ne 0){throw 'First tab release failed'}
  & $browser --session $testSession tab t2
  if($LASTEXITCODE -ne 0){throw 'Second tab selection failed'}
  & $browser --session $testSession wait --fn '!!window.__world'
  if($LASTEXITCODE -ne 0){throw 'Second tab did not take over'}
  Eval-Life "(()=>{if(__world.memory.life.plant.stage!=='scheduled')throw Error('takeover lost scheduled purchase');return true})()" | Out-Null
  $errors=& $browser --session $testSession errors
  if($LASTEXITCODE -ne 0 -or $errors){throw "Browser errors: $errors"}
  Write-Output 'Planner, duplicate-click, Escape, mode UI and two-tab takeover: PASS'
} catch {
  & $browser --session $testSession errors
  & $browser --session $testSession tab
  throw
} finally {
  & $browser --session $testSession close
  if($LASTEXITCODE -ne 0){throw "Cleanup failed: $testSession"}
  for($attempt=0;$attempt -lt 10;$attempt++) {
    $sessions=& $browser session list
    if($LASTEXITCODE -eq 0 -and !($sessions -match $testSession)){break}
    Start-Sleep -Milliseconds 200
  }
  if($LASTEXITCODE -ne 0 -or ($sessions -match $testSession)){throw 'Cleanup not confirmed'}
  Write-Output $sessions
}
