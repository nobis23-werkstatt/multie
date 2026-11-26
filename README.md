Ja, es gibt fertige Software. Für dich würde ich trotzdem mit einem eigenen Skript von etwa 30 Zeilen anfangen: Du verstehst jeden Schritt und gibst keinem fremden Tool deine Logins.

## Fertige Software

| Tool | Was es macht | Mein Urteil |
| --- | --- | --- |
| **Claw Orchestrator** | Läuft mit Claude Code, Codex, Antigravity, Grok Build, OpenCode und jedem ACP-Agenten als dauerhafte Sitzungen hinter einer Schnittstelle. Braucht Node 22+ und mindestens eine installierte und angemeldete Engine-CLI (claude, codex, agy, grok oder opencode). | Deckt als einziges alle drei ab. Der beste Kandidat für Stufe 2. |
| **Orca** | Lässt Claude Code, Codex, Grok, Antigravity oder OpenCode nebeneinander laufen, jedes in einem eigenen Arbeitsordner (Worktree). Gibt es für macOS, Windows und Linux. | Eine Oberfläche mit Fenstern nebeneinander. Die Agenten reden dort nicht miteinander. |
| **MCP-Brücke** (SinanTufekci) | Steuert externe Coding-CLIs, darunter Antigravity und Grok Build, als Sub-Agenten aus Claude Code heraus. | Passt zu dir, weil Claude der Chef bleibt. |

Alle drei sind kleine Projekte von Einzelpersonen und laufen mit deinen Konten. Vor der Installation solltest du den Code ansehen.

## Step-by-Step: eigenes Skript in einem PowerShell-Fenster

Alle drei CLIs haben einen Modus ohne Bedienoberfläche (Headless-Modus), in dem sie eine Frage beantworten und sich wieder beenden:

- **agy:** Mit `-p` führt agy einen einzelnen Prompt ohne Rückfragen aus und gibt die Antwort aus. Vorher musst du dich einmal in einer normalen, interaktiven agy-Sitzung anmelden.
- **grok:** Neben `-p` starten auch `--prompt-json` und `--prompt-file` diesen Modus.
- **claude:** `claude -p`.

**Schritt 1: PowerShell 7 verwenden** (`pwsh`, nicht das alte Windows PowerShell 5.1, das lange Texte mit Anführungszeichen kaputt übergibt):

```
winget install Microsoft.PowerShell

```

**Schritt 2: Testen, ob jeder Agent antwortet** (in `pwsh`):

```
claude -p "Antworte nur: PONG"
agy -p "Antworte nur: PONG"
grok --no-auto-update -p "Antworte nur: PONG"

```

Bei agy gab es einen Fehler: Die Ausgabe blieb in Pipes oder Unterprozessen leer. Laut einer Projektbeschreibung ist das unter Windows behoben, `-p` schreibt die Antwort jetzt sauber in die Ausgabe. Teste deshalb auch:

```
$x = agy -p "Antworte nur: PONG"; "[$x]"

```

Wenn dabei `[]` herauskommt, sag Bescheid.

**Schritt 3: `orchestra.ps1` in deinem Claude-Ordner anlegen.** Claude schreibt einen Entwurf, Grok greift ihn als Skeptiker (Syzygos) an, agy prüft unabhängig, welche Kritik wirklich stimmt, und Claude baut die Endfassung:

```
param([Parameter(Mandatory)][string]$Aufgabe)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$OutputEncoding = [Text.Encoding]::UTF8
$log = "orchestra-$(Get-Date -f yyyyMMdd-HHmmss).md"

function Ask([string]$agent, [string]$prompt) {
  $tmp = New-TemporaryFile
  Set-Content $tmp $prompt -Encoding utf8
  Write-Host ">> $agent denkt..." -ForegroundColor Cyan
  switch ($agent) {
    'claude' { $out = Get-Content $tmp -Raw | claude -p }
    'agy'    { $out = agy -p (Get-Content $tmp -Raw) }
    'grok'   { $out = grok --no-auto-update --prompt-file $tmp }
  }
  Remove-Item $tmp
  if ($LASTEXITCODE -ne 0) { throw "$agent: Exit-Code $LASTEXITCODE" }
  $text = ($out -join "`n").Trim()
  if (-not $text) { throw "$agent hat leer geantwortet" }
  Add-Content $log "## $agent`n$text`n" -Encoding utf8
  return $text
}

$entwurf = Ask 'claude' "Löse diese Aufgabe:`n$Aufgabe"
$kritik  = Ask 'grok'   "Du bist Syzygos, der Skeptiker. Finde Fehler, Lücken und Schönfärberei.`nAufgabe: $Aufgabe`n`nEntwurf:`n$entwurf"
$pruef   = Ask 'agy'    "Prüfe unabhängig: Welche Kritikpunkte sind berechtigt, welche nicht? Begründe kurz.`n`nEntwurf:`n$entwurf`n`nKritik:`n$kritik"
$final   = Ask 'claude' "Überarbeite den Entwurf. Übernimm nur Kritik, die die Prüfung bestätigt.`n`nEntwurf:`n$entwurf`n`nKritik:`n$kritik`n`nPrüfung:`n$pruef"

Write-Host "`n===== ERGEBNIS =====" -ForegroundColor Green
$final
Write-Host "`nProtokoll: $log"

```

**Schritt 4: Starten.**

```
cd C:\Users\paulf\Downloads\Herzensprojekt\Claude
.\orchestra.ps1 "Würde ein Air-Gap mit Kill-Switch RSI sicher machen?"

```

**Zur Sicherheit:** Das Skript gibt keinem Agenten Freigaben wie `--dangerously-skip-permissions`. Die drei tauschen also nur Text aus und können nichts an deinen Dateien ändern. Die headless agy-Läufe zählen zum selben Google-AI-Kontingent wie dein normales Antigravity.

**Ehrlicher Stand:** Ich konnte das Skript hier nicht laufen lassen, weil die drei CLIs nur auf deinem PC sind. Das Skript bricht deshalb absichtlich laut ab, wenn ein Agent leer antwortet oder mit Fehler aussteigt. Schick mir die Ausgabe von Schritt 2, dann passe ich es an.

Wofür willst du die drei hauptsächlich einsetzen: Code in einem Projekt bauen, wo sie Dateien ändern dürfen, oder Debatte und Zweitmeinung wie oben? Dafür würde ich das Skript unterschiedlich aufbauen."