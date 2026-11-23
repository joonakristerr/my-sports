$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw 'Asenna ensin Node.js 22.12+ ja avaa tama kaynnistin uudelleen.' }
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
$localNpm = Join-Path (Get-Location) 'work\package\bin\npm-cli.js'
function Invoke-ProjectNpm {
    param([string[]]$Arguments)
    if ($npmCommand) { & $npmCommand.Source @Arguments }
    elseif (Test-Path -LiteralPath $localNpm) { & $nodeCommand.Source $localNpm @Arguments }
    else { throw 'npm puuttuu. Asenna Node.js LTS, joka sisaltaa npm:n.' }
    if ($LASTEXITCODE -ne 0) { throw 'Projektikomennon suoritus epaonnistui.' }
}
function Open-ExistingSports {
    $existingUrl = & $nodeCommand.Source 'scripts\local-server.mjs' '--find'
    if ($LASTEXITCODE -ne 0) { throw 'Kaynnissa olevan sovelluksen tarkistus epaonnistui.' }
    if ($existingUrl) {
        Write-Host "My Sports on jo kaynnissa: $existingUrl"
        Start-Process -FilePath ([string]$existingUrl)
        return $true
    }
    return $false
}
# A project-specific mutex prevents two concurrent launches from starting servers.
$hashProvider = [System.Security.Cryptography.SHA256]::Create()
try { $projectHash = [BitConverter]::ToString($hashProvider.ComputeHash([Text.Encoding]::UTF8.GetBytes((Get-Location).Path.ToLowerInvariant()))).Replace('-','') }
finally { $hashProvider.Dispose() }
$launchMutex = New-Object System.Threading.Mutex($false, "Local\MySports-$projectHash")
$ownsMutex = $false
try {
    try { $ownsMutex = $launchMutex.WaitOne(0) }
    catch [System.Threading.AbandonedMutexException] { $ownsMutex = $true }
    if (-not $ownsMutex) {
        Write-Host 'My Sports kaynnistyy jo toisessa ikkunassa. Odotetaan...'
        $deadline = [DateTime]::UtcNow.AddMinutes(3)
        while ([DateTime]::UtcNow -lt $deadline) {
            if (Open-ExistingSports) { exit 0 }
            try { $ownsMutex = $launchMutex.WaitOne(0) }
            catch [System.Threading.AbandonedMutexException] { $ownsMutex = $true }
            if ($ownsMutex) { break }
            Start-Sleep -Milliseconds 700
        }
        if (-not $ownsMutex) { throw 'Ensimmainen kaynnistys ei valmistunut. Tarkista sen komentorivi-ikkuna.' }
    }
    if (Open-ExistingSports) { exit 0 }
    if (-not (Test-Path -LiteralPath 'node_modules\vite')) { Invoke-ProjectNpm -Arguments @('ci') }
    Write-Host 'Paivitetaan ESPN-tilannekuva...'
    try { Invoke-ProjectNpm -Arguments @('run','update:data') }
    catch { Write-Warning 'Tilannekuvaa ei voitu paivittaa. Viimeisin onnistunut versio sailytetaan; hakuaika nakyy sovelluksessa.' }
    Invoke-ProjectNpm -Arguments @('run','build')
    Write-Host 'My Sports avautuu selaimeen. Varatulle portille valitaan vapaa vaihtoehto.'
    Write-Host 'Kaytossa oleva osoite nakyy alla. Sulje palvelin painamalla Ctrl+C.'
    & $nodeCommand.Source 'scripts\local-server.mjs'
    if ($LASTEXITCODE -ne 0) { throw 'Sovelluksen kaynnistys epaonnistui. Tarkista ylla oleva virheilmoitus.' }
}
finally {
    if ($ownsMutex) { $launchMutex.ReleaseMutex() }
    $launchMutex.Dispose()
}
