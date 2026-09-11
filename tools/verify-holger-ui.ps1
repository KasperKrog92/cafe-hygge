param([string]$Label='holger-ui',[string]$Url='http://127.0.0.1:8137/')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-holger-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function Eval-H([string]$Code) {
 $payload=$Code | & $browser --session $testSession eval --stdin
 if($LASTEXITCODE -ne 0){throw 'Conversation evaluation failed'}
 return ($payload | ConvertFrom-Json)
}
try {
 & $browser --session $testSession --init-script (Join-Path $PSScriptRoot 'life-browser-init.js') open ($Url+'?life-test')
 if($LASTEXITCODE -ne 0){throw 'Launch failed'}
 & $browser --session $testSession wait --fn '!!window.__world'
 if($LASTEXITCODE -ne 0){throw 'Boot failed'}
 & $browser --session $testSession find role button click --name 'step inside'
 if($LASTEXITCODE -ne 0){throw 'Entry failed'}
 Eval-H (Get-Content -Raw (Join-Path $PSScriptRoot 'verify-holger.js')) | ConvertTo-Json | Set-Content (Join-Path $output 'report.json')
 Eval-H @'
(()=>{const w=__world;SIM.skipIntro(w);for(let n=0;n<8000&&w.shop.phase==='settling';n++)SIM.update(w,.25);
for(let n=0;n<1000&&!SIM.holgerAvailable(w);n++)SIM.update(w,.1);
window.uiNow=performance.now();lifeTestFrame(uiNow);return !!SIM.holgerAvailable(w);})()
'@ | Out-Null
 & $browser --session $testSession click '#meet-holger'
 if($LASTEXITCODE -ne 0){throw 'Invitation click failed'}
 Eval-H "(()=>{const w=__world;for(let n=0;n<3000&&w.moment.index<6;n++){if(w.moment.phase==='talk')SIM.advanceMoment(w);else SIM.update(w,.05);}if(w.moment.index!==6)throw Error('choice not reached');lifeTestFrame(uiNow+=2000);return true})()" | Out-Null
 & $browser --session $testSession set viewport 1440 900
 if($LASTEXITCODE -ne 0){throw 'Viewport failed'}
 for($i=0;$i -lt 20;$i++){ Start-Sleep -Milliseconds 100; Eval-H 'lifeTestFrame(uiNow+=100);true' | Out-Null }
 & $browser --session $testSession screenshot (Join-Path $output 'choice.png')
 if($LASTEXITCODE -ne 0){throw 'Capture failed'}
 & $browser --session $testSession set viewport 1600 900
 if($LASTEXITCODE -ne 0){throw 'Wide viewport failed'}
 Eval-H 'lifeTestFrame(uiNow+=100);true' | Out-Null
 & $browser --session $testSession screenshot (Join-Path $output 'choice-wide.png')
 if($LASTEXITCODE -ne 0){throw 'Wide capture failed'}
 & $browser --session $testSession click '#conversation-answers button:first-child'
 if($LASTEXITCODE -ne 0){throw 'Choice click failed'}
 # Reload an actual v13 file at a chosen-but-unacknowledged reply, proving
 # browser boot migration as well as the private codec tests.
 Eval-H @'
(()=>{
  const old=JSON.parse(MEMORY.exportText());old.version=13;
  CAST.holgerIntroduction.forEach((line,index)=>{
    const key='holger-introduction-node-'+line.id;
    if(Object.prototype.hasOwnProperty.call(old.flags,key)) {
      old.flags['holger-introduction-line-'+index]=old.flags[key];delete old.flags[key];
    }
  });
  localStorage.setItem('cafe-hygge-save',JSON.stringify(old));MEMORY.readOnly=true;return true;
})()
'@ | Out-Null
 & $browser --session $testSession reload
 if($LASTEXITCODE -ne 0){throw 'Reload failed'}
 & $browser --session $testSession wait --fn '!!window.__world'
 if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
 & $browser --session $testSession find role button click --name 'step inside'
 if($LASTEXITCODE -ne 0){throw 'Reload entry failed'}
 Eval-H @'
(()=>{const w=__world;window.uiNow=performance.now();lifeTestFrame(uiNow);document.getElementById('meet-holger').click();
if(w.patrons[0].state!=='ordering'||w.moment.phase!=='talk')throw Error('mandatory hello did not return to counter');
SIM.advanceMoment(w);lifeTestFrame(uiNow+=50);return true;})()
'@ | Out-Null
 for($i=0;$i -lt 16;$i++){ Start-Sleep -Milliseconds 100; Eval-H 'lifeTestFrame(uiNow+=100);true' | Out-Null }
 & $browser --session $testSession screenshot (Join-Path $output 'counter-reload.png')
 if($LASTEXITCODE -ne 0){throw 'Counter capture failed'}
 Eval-H @'
(()=>{const w=__world;
if(SIM.momentLine(w).text!==CAST.holgerIntroduction[6].choices[0].reply)throw Error('real reload lost reply');
if(w.memory.version!==14||!w.memory.flags['holger-introduction-node-why-cafe']||Object.keys(w.memory.flags).some(k=>k.startsWith('holger-introduction-line-')))throw Error('legacy node migration failed');
for(let n=0;n<3000&&w.moment;n++){if(w.moment.phase==='talk')SIM.advanceMoment(w,SIM.momentLine(w).choices?1:undefined);else SIM.update(w,.1);}lifeTestFrame(uiNow+=30);
const problems=__dev.audit();if(problems.length)throw Error(JSON.stringify(problems));return {reload:true,audit:problems};})()
'@ | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $output 'reload.json')
 # An established cafe: accept the real invitation during a real drink.
 Eval-H "Object.assign(__world.memory,__dev.furnishedWorld().memory);MEMORY.saveNow();true" | Out-Null
 & $browser --session $testSession reload
 if($LASTEXITCODE -ne 0){throw 'Established reload failed'}
 & $browser --session $testSession wait --fn '!!window.__world'
 if($LASTEXITCODE -ne 0){throw 'Established boot failed'}
 & $browser --session $testSession find role button click --name 'step inside'
 if($LASTEXITCODE -ne 0){throw 'Established entry failed'}
 Eval-H @'
(()=>{const w=__world;w.spawnT=1e9;w.barista.idleT=999;
const p=SIM._.makePatron(w,'Signe');p.wantsBook=false;p.ownBook=true;p.outdoor=false;
SIM._.enqueueArrival(w,p,0,true);window.invitationCustomer=p;
for(let n=0;n<2400&&w.barista.state!=='prepping';n++)SIM.update(w,.05);
if(w.barista.state!=='prepping')throw Error('no active drink');
window.uiNow=performance.now();lifeTestFrame(uiNow);
if(!SIM.holgerAvailable(w))throw Error('no seated invitation');return true;})()
'@ | Out-Null
 & $browser --session $testSession click '#meet-holger'
 if($LASTEXITCODE -ne 0){throw 'Queued invitation click failed'}
 Eval-H "if(!__world.moment||__world.moment.phase!=='waiting'||__world.barista.state!=='prepping')throw Error('click interrupted drink');lifeTestFrame(uiNow);true" | Out-Null
 & $browser --session $testSession screenshot (Join-Path $output 'finishing-drink.png')
 if($LASTEXITCODE -ne 0){throw 'Drink capture failed'}
 Eval-H @'
(()=>{const w=__world;
for(let n=0;n<2400&&w.moment.phase!=='talk';n++)SIM.update(w,.05);
if(w.moment.phase!=='talk'||w.barista.orders.some(o=>o.patron===invitationCustomer)||w.barista.holding)throw Error('approach before drink completion');
const p=SIM._.makePatron(w,'Mikkel');p.wantsBook=false;p.outdoor=false;SIM._.enqueueArrival(w,p,0,true);
w.moment.visible=999;
for(let n=0;n<240;n++)SIM.update(w,.25);
if(p.state!=='queueing'||p.path&&p.path.length)throw Error('background queue did not move');
window.uiNow=performance.now();for(let n=0;n<20;n++)lifeTestFrame(uiNow+=50);
return {queued:p.state,phase:w.moment.phase};})()
'@ | ConvertTo-Json | Set-Content (Join-Path $output 'queued-invitation.json')
 & $browser --session $testSession screenshot (Join-Path $output 'conversation-background.png')
 if($LASTEXITCODE -ne 0){throw 'Background capture failed'}
 & $browser --session $testSession press Escape
 if($LASTEXITCODE -ne 0){throw 'Dismissal failed'}
 Eval-H "for(let n=0;n<2400&&__world.moment;n++)SIM.update(__world,.05);if(__dev.audit().length)throw Error('final audit');true" | Out-Null
 $pageErrors=& $browser --session $testSession errors
 if($LASTEXITCODE -ne 0){throw 'Error inspection failed'}
 if($pageErrors){throw "Browser errors: $pageErrors"}
} finally {
 & $browser --session $testSession close
 if($LASTEXITCODE -ne 0){throw "Cleanup failed for $testSession"}
 for($attempt=0;$attempt -lt 10;$attempt++) {
   $sessions=& $browser session list
   if($LASTEXITCODE -ne 0){throw 'Session inspection failed'}
   if(($sessions -join "`n") -notmatch [regex]::Escape($testSession)){break}
   Start-Sleep -Milliseconds 150
 }
 if(($sessions -join "`n") -match [regex]::Escape($testSession)){throw "Session remains: $testSession"}
 Write-Output $sessions
}
