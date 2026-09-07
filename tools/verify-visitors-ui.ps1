param([string]$Url='http://127.0.0.1:8137/',[string]$Label='visitors-ui')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-visitors-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function Eval-Visitor([string]$Code) {
  $payload=$Code | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'Visitor evaluation failed'}
  return ($payload | ConvertFrom-Json)
}
function Reload-Visitor {
  & $browser --session $testSession reload
  if($LASTEXITCODE -ne 0){throw 'Reload failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
  & $browser --session $testSession click '#cafe'
  if($LASTEXITCODE -ne 0){throw 'Entry click failed'}
}
function Click-Visitor([string]$Selector) {
  & $browser --session $testSession click $Selector
  if($LASTEXITCODE -ne 0){throw "Click failed: $Selector"}
}
try {
  & $browser --session $testSession --init-script (Join-Path $PSScriptRoot 'life-browser-init.js') open ($Url+'?dev=life-test')
  if($LASTEXITCODE -ne 0){throw 'Launch failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Boot failed'}
  & $browser --session $testSession set viewport 1440 900
  if($LASTEXITCODE -ne 0){throw 'Viewport failed'}
  foreach($id in @('keira','tomas')) {
    Eval-Visitor "(()=>{const w=__dev.modestWorld();w.memory.life.daysCompleted=1;w.memory.life.mode='game';w.memory.life.hour=10;w.memory.life.projects.table.stage='scheduled';w.memory.life.projects.window.stage='scheduled';MEMORY.state=JSON.parse(MEMORY.codec.encode(w.memory));MEMORY.saveNow();return true;})()" | Out-Null
    Reload-Visitor
    for($line=0;$line -lt 5;$line++) {
      Eval-Visitor "(()=>{const w=__world;for(let n=0;n<6000&&!SIM.visitorInvites(w).some(a=>a.visitorId==='$id');n++)SIM.update(w,.25);if(!SIM.visitorInvites(w).some(a=>a.visitorId==='$id'))throw Error('missing invitation');lifeTestFrame(performance.now());return true;})()" | Out-Null
      Click-Visitor "#meet-$id"
      Eval-Visitor "(()=>{const w=__world;for(let n=0;n<2000&&w.moment.phase!=='talk';n++)SIM.update(w,.25);if(w.moment.index!==$line)throw Error('wrong restored cursor');w.moment.visible=999;lifeTestFrame(performance.now());return true;})()" | Out-Null
      if($line -eq 0) {
        foreach($width in @(1440,1600)) {
          & $browser --session $testSession set viewport $width 900
          if($LASTEXITCODE -ne 0){throw 'Viewport failed'}
          Eval-Visitor 'lifeTestFrame(performance.now());true' | Out-Null
          & $browser --session $testSession screenshot (Join-Path $output "$id-dialogue-$width.png")
          if($LASTEXITCODE -ne 0){throw 'Capture failed'}
        }
      }
      Click-Visitor '#conversation-answers button:first-child'
      Eval-Visitor 'MEMORY.saveNow();true' | Out-Null
      Reload-Visitor
    }
    Eval-Visitor "if(!__world.memory.flags['$id-introduced'])throw Error('completion missing');true" | Out-Null
  }
  foreach($stage in @('scheduled','arrived','working','installed')) {
    Eval-Visitor "(()=>{const w=__dev.modestWorld();w.memory.life.daysCompleted=1;w.memory.life.mode='game';const p=w.memory.life.projects.table;p.stage='$stage';p.step='$stage'==='installed'?6:'$stage'==='working'?2:0;p.time='$stage'==='working'?4.5:0;MEMORY.state=JSON.parse(MEMORY.codec.encode(w.memory));MEMORY.saveNow();return true;})()" | Out-Null
    Reload-Visitor
    $before=Eval-Visitor 'JSON.stringify(__world.memory.life.projects.table)'
    Eval-Visitor 'SIM._.commitLife(__world);true' | Out-Null
    Reload-Visitor
    $after=Eval-Visitor 'JSON.stringify(__world.memory.life.projects.table)'
    if($before -cne $after){throw 'Actual reload lost project checkpoint'}
    Eval-Visitor "SIM.update(__world,.25);if('$stage'!=='scheduled'&&__world.deliveryVisitor)throw Error('duplicate kit');if(__dev.audit().length)throw Error('audit');true" | Out-Null
  }
  $pageErrors=& $browser --session $testSession errors
  if($LASTEXITCODE -ne 0 -or $pageErrors){throw "Browser errors: $pageErrors"}
  'Both actual invitation buttons, ten acknowledged-line reloads, completed greetings, four exact kit checkpoints and zero audits: PASS' | Tee-Object (Join-Path $output 'result.txt')
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
