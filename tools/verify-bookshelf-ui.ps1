param([string]$Url='http://127.0.0.1:8137/',[string]$Label='bookshelf-ui')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-shelf-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function Eval-Shelf([string]$Code) {
  $payload=$Code | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'Shelf evaluation failed'}
  return ($payload | ConvertFrom-Json)
}
function Reload-Shelf {
  & $browser --session $testSession reload
  if($LASTEXITCODE -ne 0){throw 'Reload failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
  & $browser --session $testSession click '#cafe'
  if($LASTEXITCODE -ne 0){throw 'Entry click failed'}
}
try {
  & $browser --session $testSession --init-script (Join-Path $PSScriptRoot 'life-browser-init.js') open ($Url+'?dev=life-test')
  if($LASTEXITCODE -ne 0){throw 'Launch failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Boot failed'}
  Eval-Shelf @'
(()=>{const w=__dev.modestWorld();SIM.setMode(w,'game');w.memory.life.savings=150;
w.clockOffset+=(21.5-w.hour)/24*SIM._.DAY_SECONDS;
for(let n=0;n<10000&&w.shop.phase!=='home';n++)SIM.update(w,.25);
if(w.shop.phase!=='home')throw Error('no home');SIM._.saveLife(w,0);
MEMORY.state=JSON.parse(MEMORY.codec.encode(w.memory));MEMORY.saveNow();return true;})()
'@ | Out-Null
  Reload-Shelf
  $funds=Eval-Shelf '__world.memory.life.savings'
  $expectedFunds=$funds-40
  Eval-Shelf 'SIM.plan(__world,true);lifeTestFrame(performance.now());true' | Out-Null
  & $browser --session $testSession click '#buy-bookshelf'
  if($LASTEXITCODE -ne 0){throw 'Actual shelf purchase failed'}
  Eval-Shelf "if(__world.memory.life.projects.bookshelf.stage!=='purchased'||__world.memory.life.savings!==$expectedFunds)throw Error('purchase');MEMORY.saveNow();true" | Out-Null
  Reload-Shelf
  Eval-Shelf "if(__world.memory.life.projects.bookshelf.stage!=='purchased'||__world.memory.life.savings!==$expectedFunds)throw Error('purchase reload');true" | Out-Null
  foreach($phase in @('scheduled','arrived','working-0','working-1','working-2','working-3','working-4','installed')) {
    $stage=($phase -split '-')[0]
    $step=if($stage -eq 'installed'){5}elseif($stage -eq 'working'){[int]($phase -split '-')[1]}else{0}
    $time=if($stage -eq 'working'){4.5}else{0}
    Eval-Shelf "(()=>{const w=__dev.modestWorld();w.memory.life.daysCompleted=2;w.memory.life.mode='game';w.memory.life.projects.bookshelf={stage:'$stage',step:$step,time:$time};w.memory.flags['keira-introduced']=true;MEMORY.state=JSON.parse(MEMORY.codec.encode(w.memory));MEMORY.saveNow();return true;})()" | Out-Null
    Reload-Shelf
    $before=Eval-Shelf 'JSON.stringify(__world.memory.life.projects.bookshelf)'
    Eval-Shelf 'SIM._.commitLife(__world);true' | Out-Null
    Reload-Shelf
    $after=Eval-Shelf 'JSON.stringify(__world.memory.life.projects.bookshelf)'
    if($before -cne $after){throw "Actual reload lost $phase"}
    Eval-Shelf "SIM.update(__world,.25);if('$stage'!=='scheduled'&&__world.shelfVisitor&&__world.shelfVisitor.shelfParcel)throw Error('duplicate shelf');if(__dev.audit().length)throw Error('audit');true" | Out-Null
    if($stage -eq 'working') {
      Eval-Shelf "(()=>{for(let n=0;n<5000&&(!__world.shelfVisitor||__world.shelfVisitor.state!=='working');n++)SIM.update(__world,.25);lifeTestFrame(performance.now());return true;})()" | Out-Null
    }
    if($stage -eq 'installed' -or $phase -eq 'working-1') {
      foreach($width in @(1440,1600)) {
        & $browser --session $testSession set viewport $width 900
        if($LASTEXITCODE -ne 0){throw 'Viewport failed'}
        Eval-Shelf 'lifeTestFrame(performance.now());true' | Out-Null
        & $browser --session $testSession screenshot (Join-Path $output "$phase-$width.png")
        if($LASTEXITCODE -ne 0){throw 'Capture failed'}
      }
    }
  }
  $errors=& $browser --session $testSession errors
  if($LASTEXITCODE -ne 0 -or $errors){throw "Browser errors: $errors"}
  'Actual planner purchase, retained balance, eight exact job reloads, 16:10/16:9 unpacking and empty shelf, zero audits: PASS' | Tee-Object (Join-Path $output 'result.txt')
} finally {
  & $browser --session $testSession close
  $closed=$LASTEXITCODE -eq 0
  for($attempt=0;$attempt -lt 10;$attempt++) {
    $sessions=& $browser session list
    if($LASTEXITCODE -eq 0 -and !($sessions -match [regex]::Escape($testSession))){break}
    Start-Sleep -Milliseconds 200
  }
  Write-Output $sessions
  if(!$closed -or $LASTEXITCODE -ne 0 -or ($sessions -match [regex]::Escape($testSession))){throw "Cleanup not confirmed: $testSession"}
}
