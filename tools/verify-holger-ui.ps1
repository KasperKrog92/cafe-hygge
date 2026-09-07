param([string]$Label='holger-ui')
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
 & $browser --session $testSession --init-script (Join-Path $PSScriptRoot 'life-browser-init.js') open 'http://127.0.0.1:8137/?life-test'
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
 Eval-H "(()=>{while(__world.moment.index<6)SIM.advanceMoment(__world);lifeTestFrame(uiNow+=2000);return true})()" | Out-Null
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
 Eval-H 'MEMORY.saveNow();true' | Out-Null
 & $browser --session $testSession reload
 if($LASTEXITCODE -ne 0){throw 'Reload failed'}
 & $browser --session $testSession wait --fn '!!window.__world'
 if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
 Eval-H @'
(()=>{const w=__world;window.uiNow=performance.now();lifeTestFrame(uiNow);document.getElementById('meet-holger').click();
if(SIM.momentLine(w).text!==CAST.holgerIntroduction[6].choices[0].reply)throw Error('real reload lost reply');
while(w.moment)SIM.advanceMoment(w,SIM.momentLine(w).choices?1:undefined);lifeTestFrame(uiNow+=30);
const problems=__dev.audit();if(problems.length)throw Error(JSON.stringify(problems));return {reload:true,audit:problems};})()
'@ | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $output 'reload.json')
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
