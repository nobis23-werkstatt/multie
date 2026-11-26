<#
.SYNOPSIS
  multie orchestra.ps1 — Lokale 3-Agenten-Triade (Claude × Grok × AGY) für PowerShell 7+ (`pwsh`).

.DESCRIPTION
  Führt lokal installierte Coding-CLIs im Zero-Bloat-Headless-Modus aus, ohne Logins an Dritt-Tools
  weiterzugeben und strikt OHNE gefährliche Berechtigungs-Bypass-Flags:
    - Debate   : Claude (Entwurf) -> Grok (Syzygos-Kritik) -> AGY (Unabhängige Prüfung) -> Claude (Endfassung)
    - Parallel : AGY & Grok parallel -> Claude konsolidiert
    - Ping     : Prüft Antwort- und Pipe-Fähigkeit aller drei CLIs (bzw. im -DryRun-Modus deterministisch)

.EXAMPLE
  pwsh ./scripts/orchestra.ps1 -Aufgabe "Würde ein Air-Gap mit Kill-Switch RSI sicher machen?"
  pwsh ./scripts/orchestra.ps1 -Mode Ping -DryRun
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [string]$Aufgabe = "Würde ein Air-Gap mit Kill-Switch RSI sicher machen?",

  [ValidateSet("Debate", "Parallel", "Ping")]
  [string]$Mode = "Debate",

  [switch]$DryRun,

  [string]$OutDir = "runs"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

if ($PSVersionTable.PSVersion.Major -lt 7) {
  Write-Warning "Bitte PowerShell 7+ ('pwsh') verwenden! Windows PowerShell 5.1 beschädigt mehrzeilige Argumente mit Anführungszeichen."
}

function Invoke-LocalAgent {
  param(
    [Parameter(Mandatory)][ValidateSet("claude", "grok", "agy")][string]$Agent,
    [Parameter(Mandatory)][string]$Prompt,
    [string]$Stage = "run"
  )

  if ($DryRun) {
    switch ($Stage) {
      "ping"      { return "PONG ($Agent dry-run)" }
      "draft"     { return "Entwurf (Claude): Äußere Isolation durch Air-Gap + definierter Kill-Switch als Notbremse für '$Aufgabe'." }
      "critique"  { return "Syzygos-Kritik (Grok): Manueller Kill-Switch hat Reaktionslatenz; Air-Gaps werden über Update-/Log-Medien und menschliche Operatoren überbrückt." }
      "audit"     { return "Prüfung (AGY): Beide Kritikpunkte sind technisch valide. Air-Gap + Kill-Switch sind notwendig, brauchen aber automatische Millisekunden-Tripwires und Read-Only-Caps." }
      "synthesis" { return "Endfassung (Claude): Air-Gap + Kill-Switch allein reichen nicht; erst kombiniert mit automatischen Invarianten-Tripwires, Read-Only-Sandboxing und unabhängigem Mehr-Modell-Gate (si-algo) wird das Setup belastbar." }
      default     { return "OK ($Agent)" }
    }
  }

  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    [System.IO.File]::WriteAllText($tmp, $Prompt, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host ">> [$Agent] läuft ($Stage)..." -ForegroundColor Cyan

    $out = $null
    switch ($Agent) {
      "claude" {
        $out = Get-Content -LiteralPath $tmp -Raw -Encoding utf8 |
          claude -p --bare --no-session-persistence --tools ""
      }
      "grok" {
        $out = grok --no-auto-update --no-memory --no-subagents --no-plan --disable-web-search --tools "" --prompt-file $tmp
      }
      "agy" {
        $rawPrompt = Get-Content -LiteralPath $tmp -Raw -Encoding utf8
        $out = agy -p --disable-slash-commands --mode plan $rawPrompt
      }
    }

    if ($LASTEXITCODE -ne 0) {
      throw "$Agent beendet mit Exit-Code $LASTEXITCODE"
    }
    $text = ($out -join "`n").Trim()
    if (-not $text) {
      throw "$Agent hat leer geantwortet (Pipe-Ausgabe prüfen!)."
    }
    return $text
  }
  finally {
    if (Test-Path -LiteralPath $tmp) {
      Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
  }
}

if ($Mode -eq "Ping") {
  Write-Host "=== multie Ping-Check (Claude × Grok × AGY) ===" -ForegroundColor Green
  foreach ($a in @("claude", "grok", "agy")) {
    $res = Invoke-LocalAgent -Agent $a -Prompt "Antworte exakt und nur mit dem Wort: PONG" -Stage "ping"
    Write-Host ("  [{0}] -> [{1}]" -f $a, $res)
  }
  exit 0
}

if (-not (Test-Path -LiteralPath $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPath = Join-Path $OutDir "orchestra-$stamp.md"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$header = @(
  "# multie Protokoll ($Mode)",
  "",
  "- **Aufgabe:** $Aufgabe",
  "- **Zeitpunkt:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
  "- **Modus:** $Mode (DryRun=$DryRun)",
  ""
) -join "`n"
[System.IO.File]::WriteAllText($logPath, "$header`n", $utf8NoBom)

if ($Mode -eq "Debate") {
  $entwurf = Invoke-LocalAgent -Agent "claude" -Stage "draft" -Prompt "Löse diese Aufgabe präzise:`n$Aufgabe"
  $kritik  = Invoke-LocalAgent -Agent "grok"   -Stage "critique" -Prompt "Du bist Syzygos, der Skeptiker. Finde Fehler, Lücken und Schönfärberei.`nAufgabe: $Aufgabe`n`nEntwurf:`n$entwurf"
  $pruef   = Invoke-LocalAgent -Agent "agy"    -Stage "audit" -Prompt "Prüfe unabhängig: Welche Kritikpunkte sind technisch berechtigt, welche nicht? Begründe kurz.`n`nEntwurf:`n$entwurf`n`nKritik:`n$kritik"
  $final   = Invoke-LocalAgent -Agent "claude" -Stage "synthesis" -Prompt "Überarbeite den Entwurf. Übernimm nur Kritik, die die unabhängige Prüfung bestätigt.`n`nEntwurf:`n$entwurf`n`nKritik:`n$kritik`n`nPrüfung:`n$pruef"
}
else {
  $pruef   = Invoke-LocalAgent -Agent "agy"    -Stage "audit" -Prompt "Entwirf Architektur, Invarianten und Prüfkriterien für:`n$Aufgabe"
  $kritik  = Invoke-LocalAgent -Agent "grok"   -Stage "critique" -Prompt "Liefere laterale Gegenhypothesen und Edge-Case-Kritik (Syzygos) für:`n$Aufgabe"
  $entwurf = $pruef
  $final   = Invoke-LocalAgent -Agent "claude" -Stage "synthesis" -Prompt "Synthetisiere Struktur (AGY) und Kritik (Grok) zur Endfassung:`nAufgabe: $Aufgabe`n`nAGY:`n$pruef`n`nGrok:`n$kritik"
}

$body = @(
  "## 1. Entwurf / Struktur",
  $entwurf,
  "",
  "## 2. Syzygos-Kritik (Grok)",
  $kritik,
  "",
  "## 3. Unabhängige Prüfung (AGY)",
  $pruef,
  "",
  "## 4. Souveräne Endfassung (Claude)",
  $final,
  ""
) -join "`n"
[System.IO.File]::AppendAllText($logPath, $body, $utf8NoBom)

Write-Host "`n===== ERGEBNIS ($Mode) =====" -ForegroundColor Green
Write-Output $final
Write-Host "`nProtokoll gespeichert: $logPath" -ForegroundColor DarkGray
