param([string]$Url='http://127.0.0.1:8137/',[string]$Label='entry-smoke')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-entry-'+[guid]::NewGuid().ToString('N').Substring(0,8)
try {
  & $browser --session $testSession open $Url
  if($LASTEXITCODE -ne 0){throw 'Launch failed'}
  & $browser --session $testSession wait --fn '!!window.__world'
  if($LASTEXITCODE -ne 0){throw 'Boot failed'}
  '(()=>{const w=__world;if(w.firstEntryReady||w.memory.life.firstOpening.step!==0)throw Error("setup started behind splash");const before=JSON.stringify(w.memory);SIM.update(w,60);if(before!==JSON.stringify(w.memory))throw Error("splash advanced setup");return true})()' | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'First entry pause failed'}
  & $browser --session $testSession find role button click --name 'step inside'
  if($LASTEXITCODE -ne 0){throw 'Entry failed'}
  $code=@'
(()=>{
  if(!SND.ready())throw Error('audio not initialized');
  if(!__world.firstEntryReady)throw Error('entry did not release setup');
  for(let i=0;i<5000&&__world.shop.phase==='settling';i++)SIM.update(__world,.25);
  if(__world.shop.phase!=='open'||__world.tables.length!==2)throw Error('first setup failed');
  __world.spawnT=999;
  __dev.spawn({drink:'cappuccino',wantsBook:false,ownBook:true});
  const p=__world.patrons[__world.patrons.length-1], w=__world;
  window.entrySmoke={states:[],brew:[],start:performance.now(),funds:w.memory.life.savings,done:false};
  const timer=setInterval(()=>{
    const s=entrySmoke;
    if(!s.states.includes(p.state))s.states.push(p.state);
    const step=w.barista.steps&&w.barista.steps[w.barista.stepIdx];
    if(w.barista.state==='prepping'&&step&&!s.brew.includes(step.act))s.brew.push(step.act);
    if(p.state==='seated'||p.state==='terraceSeated') {
      s.done=true;s.seconds=(performance.now()-s.start)/1000;s.earned=w.memory.life.savings-s.funds;clearInterval(timer);
    }
  },100);
  return true;
})()
'@
  $code | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'Smoke setup failed'}
  for($i=0;$i -lt 24;$i++) {
    Start-Sleep -Seconds 5
    $payload='window.entrySmoke' | & $browser --session $testSession eval --stdin
    if($LASTEXITCODE -ne 0){throw 'Smoke observation failed'}
    $result=$payload | ConvertFrom-Json
    if($result.done){break}
  }
  $payload | Set-Content (Join-Path $output 'entry.json') -Encoding UTF8
  if(!$result.done -or $result.earned -lt 1 -or !($result.brew -contains 'steam')){throw 'Order did not complete with earnings and steam'}
  $night=@'
(()=>{__dev.hour(20);const a=__dev.audit();if(a.length)throw Error(a.join(';'));return __dev.shot()})()
'@ | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'Night audit failed'}
  [IO.File]::WriteAllBytes((Join-Path $output 'night.png'),[Convert]::FromBase64String((($night|ConvertFrom-Json)-split ',')[1]))
  $errors=& $browser --session $testSession errors
  if($LASTEXITCODE -ne 0 -or $errors){throw "Browser errors: $errors"}
  Write-Output "Normal entry, audio, real-time cappuccino cycle ($($result.seconds) seconds), savings, night and audit: PASS"
} finally {
  & $browser --session $testSession close
  if($LASTEXITCODE -ne 0){throw 'Browser close failed'}
  for($i=0;$i -lt 10;$i++) {
    $sessions=& $browser session list
    if($LASTEXITCODE -eq 0 -and !($sessions -match $testSession)){break}
    Start-Sleep -Milliseconds 200
  }
  if($LASTEXITCODE -ne 0 -or ($sessions -match $testSession)){throw 'Cleanup not confirmed'}
  Write-Output $sessions
}
