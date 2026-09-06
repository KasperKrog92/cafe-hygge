param([string]$Url='http://127.0.0.1:8137/?dev',[string]$Label='settings')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-settings-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function BrowserCommand([string[]]$Arguments) {
  $result=& $browser --session $testSession @Arguments
  if($LASTEXITCODE -ne 0){throw "Browser command failed: $Arguments"}
  return $result
}
function Evaluate([string]$Code) {
  $result=$Code | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){
    & $browser --session $testSession errors
    & $browser --session $testSession snapshot -i
    throw 'Settings assertion failed'
  }
  return $result
}
try {
  # Keep the daemon's first launch attached (capturing its stdout can hang
  # Windows PowerShell until the browser closes).
  & $browser --session $testSession open $Url
  if($LASTEXITCODE -ne 0){throw 'Browser launch failed'}
  BrowserCommand @('wait','--fn','!!window.__world')
  BrowserCommand @('set','viewport','1280','900')
  Evaluate "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))"
  BrowserCommand @('click','#cafe')
  BrowserCommand @('click','#btn-settings')
  Evaluate @'
(() => {
  if(!document.querySelector('#settings').open)throw Error('settings closed');
  if(document.activeElement.id!=='close-settings')throw Error('opening focus');
  const s=document.querySelector('#setting-music');s.focus();s.value=27;s.dispatchEvent(new Event('input',{bubbles:true}));
  if(SND.settings.musicVolume!==.27)throw Error('slider did not apply');
  if(JSON.parse(localStorage.getItem('cafe-hygge-audio')).musicVolume!==.27)throw Error('mix not saved');
  document.querySelector('#setting-mute').click();
  if(!SND.settings.muted)throw Error('mute not set');
  return true;
})()
'@
  BrowserCommand @('open',$Url)
  BrowserCommand @('wait','--fn','!!window.__world')
  BrowserCommand @('click','#cafe')
  BrowserCommand @('click','#btn-settings')
  Evaluate "if(SND.settings.musicVolume!==.27||!SND.settings.muted)throw Error('preferences lost on reload'); true"
  BrowserCommand @('click','#reset-sound')
  Evaluate "if(SND.settings.musicVolume!==1||SND.settings.volume!==.7||SND.settings.muted)throw Error('defaults failed');true"
  BrowserCommand @('click','#setting-weather')
  Evaluate "const rain=document.querySelector('#setting-rain');rain.value=45;rain.dispatchEvent(new Event('input'));if(SND.settings.rain||SND.settings.rainVolume!==.45)throw Error('rain volume changed weather');true"
  BrowserCommand @('click','#reset-sound')
  Evaluate "if(SND.settings.rain||SND.settings.rainVolume!==1)throw Error('sound defaults changed weather');true"
  BrowserCommand @('click','#setting-weather')
  BrowserCommand @('screenshot',(Join-Path $output 'settings.png'))
  BrowserCommand @('click','#start-over')
  Evaluate "if(document.activeElement.id!=='cancel-reset')throw Error('safe confirmation focus');true"
  BrowserCommand @('screenshot',(Join-Path $output 'confirmation.png'))
  BrowserCommand @('press','Escape')
  Evaluate "if(!document.querySelector('#settings').open||!document.querySelector('#reset-confirmation').hidden)throw Error('escape should cancel reset');true"
  BrowserCommand @('press','Escape')
  Evaluate "if(document.querySelector('#settings').open||document.activeElement.id!=='btn-settings')throw Error('close focus');true"
  # Seed only this disposable browser, including a pending save timer.
  Evaluate @'
(() => {
  MEMORY.state.life.savings=123;MEMORY.state.life.plant.stage='installed';MEMORY.state.flags.settingsTest=true;MEMORY.save();
  SND.settings.cafeVolume=.36;SND.save();localStorage.setItem('unrelated-settings-test','keep');
  document.querySelector('#btn-settings').click();document.querySelector('#start-over').click();document.querySelector('#cancel-reset').click();
  if(MEMORY.state.life.savings!==123)throw Error('cancel erased progress');
  document.querySelector('#start-over').click();
  window.originalRemove=Storage.prototype.removeItem;
  Storage.prototype.removeItem=function(){throw Error('storage unavailable')};
  document.querySelector('#confirm-reset').click();
  Storage.prototype.removeItem=window.originalRemove;
  if(document.querySelector('#reset-error').hidden||MEMORY.state.life.savings!==123)throw Error('failed reset lost live save');
  return true;
})()
'@
  BrowserCommand @('click','#confirm-reset')
  BrowserCommand @('wait','--fn',"!!window.__world && !location.search")
  Evaluate @'
(() => {
  if(MEMORY.state.life.savings!==30||MEMORY.state.life.plant.stage!=='available'||MEMORY.state.flags.settingsTest)throw Error('old progress survived');
  if(SND.settings.cafeVolume!==.36)throw Error('reset erased audio preferences');
  if(localStorage.getItem('unrelated-settings-test')!=='keep')throw Error('unrelated storage erased');
  if(document.querySelector('#overlay').classList.contains('gone'))throw Error('fresh entry missing');
  return true;
})()
'@
  BrowserCommand @('click','#enter')
  Evaluate "if(!SND.ready())throw Error('fresh audio unavailable');true"
  BrowserCommand @('open',$Url)
  BrowserCommand @('wait','--fn','!!window.__world')
  Evaluate "if(MEMORY.state.life.savings!==30||MEMORY.state.flags.settingsTest)throw Error('stale save returned');const problems=__dev.audit();if(problems.length)throw Error(problems.join(';'));true"
  # Check a compact desktop window still scrolls to the destructive action.
  BrowserCommand @('set','viewport','1280','720')
  BrowserCommand @('click','#cafe')
  BrowserCommand @('click','#btn-settings')
  BrowserCommand @('click','#start-over')
  BrowserCommand @('click','#cancel-reset')
  $errors=BrowserCommand @('errors')
  if($errors){throw "Browser errors: $errors"}
  Write-Output 'Settings, defaults, reload, confirmation/cancel, storage failure, fresh restart, audio and audit: PASS'
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
