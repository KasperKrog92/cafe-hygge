param([string]$Url='http://127.0.0.1:8137/',[string]$Label='home-ui')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-home-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function Eval-Home([string]$Code) {
  $payload=$Code | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'Home UI evaluation failed'}
  return ($payload | ConvertFrom-Json)
}
try {
  & $browser --session $testSession --init-script (Join-Path $PSScriptRoot 'life-browser-init.js') open ($Url+'?life-test')
  if($LASTEXITCODE -ne 0){throw 'Launch failed'}
  & $browser --session $testSession wait --fn '!!window.__world'
  if($LASTEXITCODE -ne 0){throw 'Boot failed'}
  & $browser --session $testSession find role button click --name 'step inside'
  if($LASTEXITCODE -ne 0){throw 'Entry failed'}
  Eval-Home @'
(async()=>{
  if(!SND.ready())throw Error('audio did not initialize');
  const w=__world;SIM.skipUnpacking(w);__dev.greetHolger(w);
  w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;
  for(let i=0;i<5000&&w.shop.phase!=='home';i++)SIM.update(w,.25);
  if(w.shop.phase!=='home')throw Error('home never arrived');
  window.homeNow=performance.now();SIM.update(w,.25);lifeTestFrame(homeNow);
  if(document.getElementById('intro-controls').hidden || !document.getElementById('intro-skip').hidden)throw Error('home controls');
  document.getElementById('intro-pause').click();
  const before=JSON.stringify(w.memory.life.homeStory);SIM.update(w,10);
  if(JSON.stringify(w.memory.life.homeStory)!==before)throw Error('pause failed');
  document.getElementById('intro-pause').click();
  document.getElementById('btn-settings').click();SIM.update(w,10);
  if(JSON.stringify(w.memory.life.homeStory)!==before)throw Error('settings hold failed');
  document.getElementById('close-settings').click();
  await new Promise(resolve=>setTimeout(resolve,50));
  for(let i=0;i<5000 && !SIM.homePlanRequired(w);i++)SIM.update(w,.25);
  lifeTestFrame(homeNow);
  if(!document.getElementById('planner').open || !document.getElementById('buy-plant').hidden || !document.getElementById('buy-fireplace').hidden)throw Error('planner choices');
  if(document.activeElement.id!=='buy-window')throw Error('planner focus');
  const cancel=new Event('cancel',{cancelable:true});document.getElementById('planner').dispatchEvent(cancel);
  if(!cancel.defaultPrevented || SIM.goToSleep(w))throw Error('planner bypass');
  return true;
})()
'@ | Out-Null
  Eval-Home 'new Promise(resolve=>setTimeout(()=>resolve(true),1100))' | Out-Null
  foreach($size in @(@(1440,900),@(1600,900))) {
    & $browser --session $testSession set viewport $size[0] $size[1]
    if($LASTEXITCODE -ne 0){throw 'Viewport failed'}
    Eval-Home 'lifeTestFrame(homeNow);true' | Out-Null
    & $browser --session $testSession screenshot (Join-Path $output "planner-$($size[0]).png")
    if($LASTEXITCODE -ne 0){throw 'Capture failed'}
  }
  & $browser --session $testSession click '#buy-window'
  if($LASTEXITCODE -ne 0){throw 'Window click failed'}
  Eval-Home "if(!document.getElementById('planner').open)throw Error('one click closed plan');MEMORY.saveNow();true" | Out-Null
  & $browser --session $testSession reload
  if($LASTEXITCODE -ne 0){throw 'Reload failed'}
  & $browser --session $testSession wait --fn '!!window.__world'
  if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
  & $browser --session $testSession find role button click --name 'step inside'
  if($LASTEXITCODE -ne 0){throw 'Reload entry failed'}
  Eval-Home 'window.homeNow=performance.now();lifeTestFrame(homeNow);if(!document.getElementById("planner").open || !document.getElementById("buy-window").disabled || document.activeElement.id!=="buy-table")throw Error("partial planner reload");true' | Out-Null
  & $browser --session $testSession click '#buy-table'
  if($LASTEXITCODE -ne 0){throw 'Table click failed'}
  Eval-Home @'
(()=>{
  const w=__world;
  if(document.getElementById('planner').open || !w.memory.life.homeStory.planned)throw Error('pair did not finish');
  for(let i=0;i<2400;i++)SIM.update(w,.25);
  if(w.shop.phase!=='home')throw Error('first idle evening left');
  lifeTestFrame(homeNow);return true;
})()
'@ | Out-Null
  & $browser --session $testSession click '#btn-sleep'
  if($LASTEXITCODE -ne 0){throw 'Sleep click failed'}
  $saves=Eval-Home @'
(()=>{
  const saves={},w=__world;
  for(let i=0;i<4000 && w.shop.phase==='home';i++) {
    SIM.update(w,.25);const h=w.memory.life.homeStory;
    if(h.sleepStep>=0 && w.homeActionTime>1 && !saves[h.sleepStep]) {SIM._.saveLife(w,0);saves[h.sleepStep]=MEMORY.codec.encode(w.memory);}
  }
  if(w.shop.phase!=='dawn')throw Error('bedtime did not finish');return saves;
})()
'@
  foreach($save in $saves.PSObject.Properties) {
    $raw=$save.Value | ConvertTo-Json -Compress
    Eval-Home "MEMORY.state=MEMORY.codec.decode($raw).state;MEMORY.saveNow();true" | Out-Null
    & $browser --session $testSession open ($Url+'?life-test')
    if($LASTEXITCODE -ne 0){throw 'Reload capture failed'}
    & $browser --session $testSession wait --fn '!!window.__world'
    if($LASTEXITCODE -ne 0){throw 'Capture boot failed'}
    Eval-Home 'const before=JSON.stringify(__world.memory.life.homeStory);SIM.update(__world,10);if(before!==JSON.stringify(__world.memory.life.homeStory))throw Error("scene ran under entry overlay");true' | Out-Null
    & $browser --session $testSession find role button click --name 'step inside'
    if($LASTEXITCODE -ne 0){throw 'Bedtime reload entry failed'}
    Eval-Home 'new Promise(resolve=>setTimeout(()=>resolve(true),1100))' | Out-Null
    Eval-Home "if(__world.memory.life.homeStory.sleepStep!==$($save.Name))throw Error('bedtime cursor lost');SIM.update(__world,.01);if(__world.dialogue)__world.dialogue.visible=__world.dialogue.text.length;window.homeNow=performance.now();lifeTestFrame(homeNow);true" | Out-Null
    & $browser --session $testSession screenshot (Join-Path $output "bedtime-$($save.Name).png")
    if($LASTEXITCODE -ne 0){throw 'Bedtime screenshot failed'}
  }
  $errors=& $browser --session $testSession errors
  if($LASTEXITCODE -ne 0 -or $errors){throw "Browser errors: $errors"}
  Write-Output 'PASS: entry audio, dialogue/pause/settings, desktop planner, real selection/reload, explicit sleep and bedtime reloads.'
} finally {
  & $browser --session $testSession close
  if($LASTEXITCODE -ne 0){throw 'Home browser cleanup failed'}
  Start-Sleep -Milliseconds 300
  $sessions=& $browser session list
  Write-Output $sessions
  if($sessions -match [regex]::Escape($testSession)){throw 'Home session still active'}
  if($LASTEXITCODE -ne 0){throw 'Session inventory failed'}
}
