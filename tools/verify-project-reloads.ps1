param([string]$Url='http://127.0.0.1:8137/',[string]$Label='project-reloads')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-projects-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function Eval-Project([string]$Code) {
  $payload=$Code | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'Browser evaluation failed'}
  return ($payload | ConvertFrom-Json)
}
try {
  & $browser --session $testSession --init-script (Join-Path $PSScriptRoot 'life-browser-init.js') open ($Url+'?dev=life-test')
  if($LASTEXITCODE -ne 0){throw 'Launch failed'}
  & $browser --session $testSession wait --fn '!!window.__world'
  if($LASTEXITCODE -ne 0){throw 'Boot failed'}
  Eval-Project (Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'verify-projects.js')) | Out-Null
  $saves=Eval-Project 'window.projectSaves'
  foreach($fixture in $saves.PSObject.Properties) {
    $raw=$fixture.Value | ConvertTo-Json -Compress
    Eval-Project "MEMORY.state=MEMORY.codec.decode($raw).state; MEMORY.saveNow(); true" | Out-Null
    & $browser --session $testSession reload
    if($LASTEXITCODE -ne 0){throw 'Reload failed'}
    & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
    if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
    Eval-Project "(()=>{const old=JSON.parse($raw).life,l=__world.memory.life;if(JSON.stringify(l.projects)!==JSON.stringify(old.projects)||l.savings!==old.savings)throw Error('reload changed jobs or balance');return true})()" | Out-Null
    $result=Eval-Project @'
(()=>{
 const w=__world,l=w.memory.life,initial=JSON.parse(JSON.stringify(l.projects));
 const before=l.savings;
 SIM.setMode(w,'idle');SIM.setMode(w,'game');SIM.setMode(w,'idle');
 if(l.savings!==before)throw Error('mode charged');
 let funds=l.savings;
 for(let i=0;i<28000;i++) {
   SIM.update(w,.25);
   if(l.savings<funds)throw Error('charged while resuming');funds=l.savings;
   if(Object.keys(initial).every(id=>initial[id].stage==='available'||l.projects[id].stage==='installed'))break;
 }
 Object.keys(initial).forEach(id=>{
   if(initial[id].stage==='available' ? l.projects[id].stage!=='available' : l.projects[id].stage!=='installed')throw Error('resumption failed '+id);
 });
 const installed=l.projects.table.stage==='installed';
 if(w.tables.filter(t=>t.project==='table').length!==(installed?1:0)||w.seats.filter(s=>s.project==='table').length!==(installed?2:0))throw Error('duplicate table or seats');
 MEMORY.codec.validate(w.memory);
 const a=__dev.audit();if(a.length)throw Error(a.join(';'));
 return {before,after:funds,projects:l.projects};
})()
'@
    $result | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $output ($fixture.Name+'.json')) -Encoding UTF8
    Write-Output "Real reload: $($fixture.Name) PASS"
  }
  # Genuine planner clicks for each new choice, using the same waiting evening.
  foreach($id in @('table','fireplace')) {
    $raw=$saves.'table-purchased' | ConvertTo-Json -Compress
    Eval-Project "(()=>{let s=JSON.parse($raw);s.life.projects.table={stage:'available',step:0,time:0};s.life.plannedTonight=false;s.life.savings=180;MEMORY.state=s;MEMORY.saveNow();return true})()" | Out-Null
    & $browser --session $testSession reload
    if($LASTEXITCODE -ne 0){throw 'Planner reload failed'}
    & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
    if($LASTEXITCODE -ne 0){throw 'Planner boot failed'}
    Eval-Project "document.getElementById('enter').click();lifeTestFrame(performance.now());true" | Out-Null
    & $browser --session $testSession find role button click --name 'evening plan'
    if($LASTEXITCODE -ne 0){throw 'Planner open failed'}
    Eval-Project 'lifeTestFrame(performance.now());true' | Out-Null
    if($id -eq 'fireplace') {
      & $browser --session $testSession scroll down 300 --selector '#planner'
      if($LASTEXITCODE -ne 0){throw 'Planner scroll failed'}
    }
    & $browser --session $testSession screenshot (Join-Path $output ('planner-'+$id+'.png'))
    if($LASTEXITCODE -ne 0){throw 'Planner capture failed'}
    & $browser --session $testSession click ('#buy-'+$id)
    if($LASTEXITCODE -ne 0){throw 'Purchase click failed'}
    Eval-Project "(()=>{const w=__world,l=w.memory.life;if(l.projects['$id'].stage!=='purchased'||l.savings!==180-SIM.projects['$id'].price)throw Error('UI purchase '+JSON.stringify({life:l,phase:w.shop.phase,planner:w.plannerOpen}));document.getElementById('buy-$id').click();if(l.savings!==180-SIM.projects['$id'].price)throw Error('duplicate UI charge');return true})()" | Out-Null
    & $browser --session $testSession press Escape
    if($LASTEXITCODE -ne 0){throw 'Escape failed'}
  }
  $errors=& $browser --session $testSession errors
  if($LASTEXITCODE -ne 0 -or $errors){throw "Browser errors: $errors"}
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
