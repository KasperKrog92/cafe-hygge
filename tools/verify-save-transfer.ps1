param([string]$Url='http://127.0.0.1:8137/?dev',[string]$Label='save-transfer')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-transfer-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function BrowserCommand([string[]]$Arguments) {
  $result=& $browser --session $testSession @Arguments
  if($LASTEXITCODE -ne 0){throw "Browser command failed: $Arguments"}
  return $result
}
function Evaluate([string]$Code) {
  $result=$Code | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'Save transfer assertion failed'}
  return $result
}
try {
  & $browser --session $testSession open $Url
  if($LASTEXITCODE -ne 0){throw 'Browser launch failed'}
  BrowserCommand @('wait','--fn','!!window.__world')
  BrowserCommand @('set','viewport','1280','900')
  Evaluate @'
(() => {
  __world.paused=true;
  MEMORY.state.life.savings=173;MEMORY.state.flags.transferTest=true;
  MEMORY.state.life.projects.table={stage:'working',step:2,time:4.5};
  MEMORY.state.bonds.holger={known:true,warmth:3,visits:2};
  MEMORY.save();SND.settings.cafeVolume=.36;SND.save();
  const create=URL.createObjectURL;
  URL.createObjectURL=function(blob){window.exportedBlob=blob;return create.call(URL,blob)};
  document.querySelector('#btn-settings').click();return true;
})()
'@
  BrowserCommand @('click','#export-save')
  $backup=(Join-Path $output 'backup.json').Replace('\','/')
  BrowserCommand @('wait','--download',$backup)
  # This Windows CLI reports the download but does not copy its bytes to the
  # requested path. Read the actual Blob supplied to the native download.
  $bytes=Evaluate 'window.exportedBlob.text()'
  [IO.File]::WriteAllText($backup,($bytes | ConvertFrom-Json))
  $saved=Get-Content $backup -Raw | ConvertFrom-Json
  if($saved.life.savings -ne 173 -or $saved.life.projects.table.time -ne 4.5){throw 'Download lost progress'}
  BrowserCommand @('screenshot',(Join-Path $output 'settings.png'))
  Evaluate "MEMORY.state.life.savings=222;MEMORY.state.flags.transferTest=false;MEMORY.saveNow();true"
  $bad=Join-Path $output 'invalid.json'
  [IO.File]::WriteAllText($bad,'{"version":999}')
  BrowserCommand @('upload','#save-file',$bad)
  BrowserCommand @('wait','--fn',"document.querySelector('#save-status').textContent.includes('could not be opened')")
  Evaluate "if(MEMORY.state.life.savings!==222||!document.querySelector('#import-confirmation').hidden)throw Error('invalid import changed cafe');true"
  BrowserCommand @('upload','#save-file',$backup)
  BrowserCommand @('wait','--fn',"!document.querySelector('#import-confirmation').hidden")
  Evaluate "if(document.activeElement.id!=='cancel-import')throw Error('unsafe focus');true"
  BrowserCommand @('screenshot',(Join-Path $output 'confirmation.png'))
  BrowserCommand @('press','Escape')
  Evaluate "if(!document.querySelector('#settings').open||MEMORY.state.life.savings!==222||document.activeElement.id!=='import-save')throw Error('cancel failed');true"
  BrowserCommand @('upload','#save-file',$backup)
  BrowserCommand @('wait','--fn',"!document.querySelector('#import-confirmation').hidden")
  Evaluate @'
(() => {
  window.originalSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(){throw Error('blocked')};
  document.querySelector('#confirm-import').click();
  Storage.prototype.setItem=window.originalSet;
  if(document.querySelector('#import-error').hidden||MEMORY.state.life.savings!==222||JSON.parse(localStorage.getItem('cafe-hygge-save')).life.savings!==222)throw Error('failed import replaced cafe');
  MEMORY.save();return true;
})()
'@
  BrowserCommand @('click','#confirm-import')
  BrowserCommand @('wait','--fn',"!!window.__world && !location.search")
  Evaluate @'
(() => {
  if(MEMORY.state.life.savings!==173||!MEMORY.state.flags.transferTest||MEMORY.state.life.projects.table.time!==4.5||MEMORY.state.bonds.holger.warmth!==3)throw Error('import lost history');
  if(SND.settings.cafeVolume!==.36)throw Error('import changed audio');
  if(!document.querySelector('.overlay-card .sub').textContent.includes('welcome back'))throw Error('missing success');
  return true;
})()
'@
  BrowserCommand @('open',$Url)
  BrowserCommand @('wait','--fn','!!window.__world')
  Evaluate "if(MEMORY.state.life.savings!==173||!MEMORY.state.flags.transferTest)throw Error('old cafe overwrote import');const a=__dev.audit();if(a.length)throw Error(a.join(';'));true"
  BrowserCommand @('set','viewport','1280','720')
  Evaluate "document.querySelector('#btn-settings').click();true"
  BrowserCommand @('upload','#save-file',$backup)
  BrowserCommand @('wait','--fn',"!document.querySelector('#import-confirmation').hidden")
  BrowserCommand @('click','#cancel-import')
  $errors=BrowserCommand @('errors')
  if($errors){throw "Browser errors: $errors"}
  Write-Output 'Download, upload, validation, cancel, blocked storage, replacement, reload, audio preservation and audit: PASS'
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
