param([string]$Url='http://127.0.0.1:8137/',[string]$Label='dinner-ui')
$ErrorActionPreference='Stop'
$OutputEncoding=[Text.UTF8Encoding]::new($false)
$browser=(Get-Command agent-browser.cmd).Source
$output=Join-Path (Split-Path $PSScriptRoot -Parent) ".art-review/$Label"
New-Item -ItemType Directory -Force $output | Out-Null
$testSession='hygge-dinner-'+[guid]::NewGuid().ToString('N').Substring(0,8)
function Eval-Dinner([string]$Code) {
  $payload=$Code | & $browser --session $testSession eval --stdin
  if($LASTEXITCODE -ne 0){throw 'Dinner UI evaluation failed'}
  return ($payload | ConvertFrom-Json)
}
try {
  & $browser --session $testSession --init-script (Join-Path $PSScriptRoot 'life-browser-init.js') open ($Url+'?life-test')
  if($LASTEXITCODE -ne 0){throw 'Launch failed'}
  & $browser --session $testSession wait --fn '!!window.__world'
  if($LASTEXITCODE -ne 0){throw 'Boot failed'}
  Eval-Dinner (Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'verify-dinner.js')) | Out-Null
  $saves=Eval-Dinner 'window.dinnerSaves'
  $results=@()
  foreach($save in $saves.PSObject.Properties) {
    $raw=$save.Value | ConvertTo-Json -Compress
    Eval-Dinner "MEMORY.state=MEMORY.codec.decode($raw).state;MEMORY.saveNow();true" | Out-Null
    & $browser --session $testSession reload
    if($LASTEXITCODE -ne 0){throw 'Reload failed'}
    & $browser --session $testSession wait --fn '!!window.__world'
    if($LASTEXITCODE -ne 0){throw 'Reload boot failed'}
    $results+=Eval-Dinner @"
(()=>{
  const expected=JSON.parse($raw),w=__world;
  if(JSON.stringify(w.memory.life.homeDinner)!==JSON.stringify(expected.life.homeDinner))throw Error('dinner cursor lost');
  const p=expected.life.checkpoint.nora;
  if(Math.hypot(w.barista.x-p.x,w.barista.y-p.y)>.001)throw Error('reload moved her');
  if(__dev.audit(w).length)throw Error('reload audit');
  window.dinnerNow=performance.now();lifeTestFrame(dinnerNow);
  return {time:w.memory.life.homeDinner.time,pose:w.barista.pose,lit:SCENE.homeKitchenLit(w)};
})()
"@
    & $browser --session $testSession find role button click --name 'step inside'
    if($LASTEXITCODE -ne 0){throw 'Entry failed'}
    & $browser --session $testSession wait --fn "getComputedStyle(document.getElementById('overlay')).opacity === '0'"
    if($LASTEXITCODE -ne 0){throw 'Entry fade did not finish'}
    Eval-Dinner 'lifeTestFrame(dinnerNow);true' | Out-Null
    if($save.Name -in @('0-supperPrep','1-supperEat')) {
      foreach($size in @(@(1440,900),@(1600,900))) {
        & $browser --session $testSession set viewport $size[0] $size[1]
        if($LASTEXITCODE -ne 0){throw 'Viewport failed'}
        Eval-Dinner 'lifeTestFrame(dinnerNow);true' | Out-Null
        & $browser --session $testSession screenshot (Join-Path $output "$($save.Name)-$($size[0]).png")
        if($LASTEXITCODE -ne 0){throw 'Capture failed'}
      }
      & $browser --session $testSession click '#btn-sleep'
      if($LASTEXITCODE -ne 0){throw 'Sleep click failed'}
      Eval-Dinner 'if(!SIM.homeBedtimeActive(__world))throw Error("sleep did not interrupt supper");true' | Out-Null
    }
  }
  $errors=& $browser --session $testSession errors
  if($LASTEXITCODE -ne 0 -or $errors){throw "Browser errors: $errors"}
  $results | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $output 'reloads.json') -Encoding UTF8
} finally {
  & $browser --session $testSession close
  if($LASTEXITCODE -ne 0){throw 'Browser cleanup failed'}
  for($attempt=0;$attempt -lt 10;$attempt++) {
    $sessions=& $browser session list
    if($LASTEXITCODE -eq 0 -and !($sessions -match [regex]::Escape($testSession))){break}
    Start-Sleep -Milliseconds 200
  }
  if($LASTEXITCODE -ne 0 -or $sessions -match [regex]::Escape($testSession)){throw 'Browser cleanup unconfirmed'}
  Write-Output $sessions
}
Write-Output "Dinner UI/reloads passed: $output"
