param([string]$Url='http://127.0.0.1:8137/',[string]$Label='intro-ui')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-intro-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function Eval-Intro([string]$Code) {
  $payload=$Code | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'Intro UI evaluation failed'}
  return ($payload | ConvertFrom-Json)
}
try {
  & $browser --session $testSession --init-script (Join-Path $PSScriptRoot 'life-browser-init.js') open ($Url+'?life-test')
  if($LASTEXITCODE -ne 0){throw 'Launch failed'}
  & $browser --session $testSession wait --fn '!!window.__world'
  if($LASTEXITCODE -ne 0){throw 'Boot failed'}
  & $browser --session $testSession find role button click --name 'step inside'
  if($LASTEXITCODE -ne 0){throw 'Entry click failed'}
  Eval-Intro @'
(async()=>{
  window.uiNow=performance.now();
  const w=__world;SIM.update(w,.25);lifeTestFrame(uiNow);
  if(!SND.ready()||!w.dialogue||document.getElementById('intro-controls').hidden)throw Error('intro UI absent');
  if(!document.getElementById('intro-transcript').textContent.includes(w.dialogue.text))throw Error('accessible line missing');
  document.getElementById('intro-pause').click();
  const before=JSON.stringify(w.memory),visible=w.dialogue.visible;
  SIM.update(w,10);if(JSON.stringify(w.memory)!==before||w.dialogue.visible!==visible)throw Error('UI pause did not hold');
  document.getElementById('intro-pause').click();
  document.getElementById('intro-next').click();
  if(w.dialogue.visible!==w.dialogue.text.length)throw Error('UI reveal failed');
  Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
  SIM.update(w,10);if(JSON.stringify(w.memory)!==before)throw Error('hidden intro advanced');
  Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));
  delete document.hidden;
  document.getElementById('btn-settings').click();
  SIM.update(w,10);if(JSON.stringify(w.memory)!==before)throw Error('settings advanced dialogue');
  const instant=document.getElementById('setting-instant');instant.checked=true;instant.dispatchEvent(new Event('change'));
  const volume=document.getElementById('setting-dialogue');volume.value=0;volume.dispatchEvent(new Event('input'));
  if(!SND.settings.instantText||SND.settings.dialogueVolume!==0)throw Error('dialogue settings failed');
  instant.checked=false;instant.dispatchEvent(new Event('change'));volume.value=70;volume.dispatchEvent(new Event('input'));
  document.getElementById('close-settings').click();
  await new Promise(resolve=>setTimeout(resolve,50));
  window.introUISaves={};
  for(let n=0;n<16000&&w.shop.phase==='settling';n++) {
    SIM.update(w,.05);const i=w.memory.life.intro;
    if(w.memory.life.firstOpening.step===11 && i.time>=1 && !introUISaves[i.finale]) {
      SIM._.saveLife(w,0);introUISaves[i.finale]=MEMORY.codec.encode(w.memory);
    }
  }
  if(w.shop.phase!=='open')throw Error('live intro did not complete');
  return true;
})()
'@ | Out-Null
  $saves=Eval-Intro 'introUISaves'
  foreach($save in $saves.PSObject.Properties) {
    $raw=$save.Value | ConvertTo-Json -Compress
    Eval-Intro "MEMORY.state=MEMORY.codec.decode($raw).state;MEMORY.saveNow();true" | Out-Null
    & $browser --session $testSession reload
    if($LASTEXITCODE -ne 0){throw 'Reload failed'}
    & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
    if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
    Eval-Intro "(()=>{const before=JSON.parse($raw).life,after=__world.memory.life;if(JSON.stringify(before.intro)!==JSON.stringify(after.intro)||before.firstOpening.time!==after.firstOpening.time)throw Error('reload lost intro');return true})()" | Out-Null
    Eval-Intro @'
(()=>{
  const w=__world;w.firstEntryReady=true;
  SIM.skipIntro(w);
  for(let n=0;n<5000&&w.shop.phase==='settling';n++)SIM.update(w,.25);
  if(w.shop.phase!=='open'||w.memory.life.intro.sign!=='outside'||w.tables.length!==2||__dev.audit().length)throw Error('reloaded finale failed');
  return true;
})()
'@ | Out-Null
  }
  $raw=$saves.'1' | ConvertTo-Json -Compress
  Eval-Intro "MEMORY.state=MEMORY.codec.decode($raw).state;MEMORY.saveNow();true" | Out-Null
  & $browser --session $testSession open ($Url+'?dev=life-test')
  if($LASTEXITCODE -ne 0){throw 'Capture page failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Capture boot failed'}
  Eval-Intro 'SIM.update(__world,.05);SIM.advanceIntro(__world);window.uiNow=performance.now();lifeTestFrame(uiNow);true' | Out-Null
  foreach($size in @(@(1440,900),@(1600,900))) {
    & $browser --session $testSession set viewport $size[0] $size[1]
    if($LASTEXITCODE -ne 0){throw 'Viewport failed'}
    Eval-Intro 'lifeTestFrame(uiNow);true' | Out-Null
    & $browser --session $testSession screenshot (Join-Path $output "intro-$($size[0]).png")
    if($LASTEXITCODE -ne 0){throw 'Screenshot failed'}
  }
  & $browser --session $testSession click '#intro-unpack'
  if($LASTEXITCODE -ne 0){throw 'Skip unpacking click failed'}
  Eval-Intro '(()=>{const w=__world;lifeTestFrame(uiNow);if(w.shop.phase!=="open"||w.tables.length!==2||w.memory.life.intro.sign!=="outside"||__dev.audit().length)throw Error("skip unpacking failed");MEMORY.saveNow();return true})()' | Out-Null
  & $browser --session $testSession reload
  if($LASTEXITCODE -ne 0){throw 'Skip reload failed'}
  & $browser --session $testSession wait --fn '!!window.__world' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Skip reload boot failed'}
  Eval-Intro '(()=>{if(__world.shop.phase!=="open"||!__world.memory.life.intro.complete)throw Error("skip did not persist");SIM.update(__world,.25);if(__world.patrons[0].regularId!=="holger")throw Error("first customer changed");return true})()' | Out-Null
  $errors=& $browser --session $testSession errors
  if($LASTEXITCODE -ne 0 -or $errors){throw "Browser errors: $errors"}
  @{reloads=$saves.PSObject.Properties.Name.Count;passed=$true} | ConvertTo-Json | Set-Content (Join-Path $output 'report.json')
  Write-Output 'Intro UI, text/voice settings, visibility, reloads and both desktop crops: PASS'
} finally {
  & $browser --session $testSession close
  if($LASTEXITCODE -ne 0){throw 'Intro browser close failed'}
  for($attempt=0;$attempt -lt 10;$attempt++) {
    $sessions=& $browser session list
    if($LASTEXITCODE -eq 0 -and !($sessions -match [regex]::Escape($testSession))){break}
    Start-Sleep -Milliseconds 200
  }
  if($LASTEXITCODE -ne 0 -or ($sessions -match [regex]::Escape($testSession))){throw 'Intro browser cleanup unconfirmed'}
  Write-Output $sessions
}
