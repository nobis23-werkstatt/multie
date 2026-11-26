# multie — Lokales Multi-CLI Orchester (`Claude × Grok × AGY`)

Zero-Dependency Multi-Agenten-Orchestrator für deine lokal installierten und angemeldeten Coding-CLIs (**`claude`**, **`grok`**, **`agy`**) in **Node.js (`≥ 18`)** und **PowerShell 7 (`pwsh`)** – gekoppelt an den Kollusions- und Sicherheitswächter des **Souveränen Integrals (`si-algo`)**.

- **Live-Werkbank & Befehls-Generator (`0,00 €`):** <https://nobis23-werkstatt.github.io/multie/>
- **Schwester-Projekt (3D Live-World Studio):** [`nobis23-werkstatt/si-algo`](https://github.com/nobis23-werkstatt/si-algo) (<https://nobis23-werkstatt.github.io/si-algo/>)
- **NOBIS23 Werkstatt:** <https://nobis23-werkstatt.netlify.app/>

---

## Warum `multie`?

Statt fremden Wrappern deine Zugangsdaten anzuvertrauen oder riesige Frameworks zu installieren, nutzt `multie` direkt den offiziellen Headless-Modus deiner bereits lokal angemeldeten CLIs:

1. **Epistemische 4-Stufen-Triade (`debate`)**
   - **Stufe 1 – Entwurf (`claude`):** Erstellt im entschlackten `--bare`-Modus die strukturierte Erstfassung.
   - **Stufe 2 – *Syzygos*-Kritik (`grok`):** Greift den Entwurf gezielt als Skeptiker an (Fehler, Lücken, Seitenkanäle, Schönfärberei).
   - **Stufe 3 – Unabhängige Prüfung (`agy`):** Prüft im `--mode plan` nüchtern, welche Kritikpunkte technisch zutreffen und welche Fehlalarme sind.
   - **Stufe 4 – Souveräne Endfassung (`claude`) + `si-algo`-Gate:** Übernimmt ausschließlich bestätigte Kritik und prüft per Jaccard-Überlappung (`< 0.72`), dass keine Echo-Kammer vorliegt (`SOVEREIGN_COMMIT` vs. `VETO_REJECT`).
2. **Parallel-Blitz (`parallel`)**
   - **`agy`** (Architektur & Invarianten) und **`grok`** (laterale Gegenhypothesen) laufen gleichzeitig (`Promise.all`), danach synthetisiert **`claude`** beide Ströme.
3. **Zero-Bloat & harte Sicherheits-Invarianten (`efficient++`)**
   - Alle drei CLIs laufen ohne Tool-/Hook-/Plugin-Ballast (`--bare`, `--tools ""`, `--mode plan`).
   - **Kein Dateischreibrecht für Sub-Prozesse:** Berechtigungs-Bypässe wie `--dangerously-skip-permissions`, `--always-approve` oder `--yolo` werden durch `assertSafeArgs()` hart mit `SECURITY_VETO` blockiert.
   - **Windows-sichere Übergabe:** Mehrzeilige Prompts mit Anführungszeichen oder `%` laufen über UTF-8-Stdin bzw. BOM-freie Temp-Dateien statt über kaputtes `cmd.exe`-Quoting.

---

## Schnellstart

### A. Mit Node.js (`≥ 18`, Windows / macOS / Linux)

```bash
# 1. Prüfen, welche lokalen CLIs (claude, grok, agy) im PATH bereitstehen
npm run doctor

# 2. Sofortiger 0-€-Trockenlauf (ohne API-/CLI-Aufruf) + Test-Suite (100 % grün)
npm test
npm run demo:debate

# 3. Echte 4-Stufen-Debatte mit deinen lokalen CLIs starten
node bin/multie.mjs debate "Würde ein Air-Gap mit Kill-Switch RSI sicher machen?"

# 4. Echter Parallel-Blitz (AGY || Grok -> Claude Synthese)
node bin/multie.mjs parallel "Entwirf einen latenzfreien 4-Pol-Dioden-Ladder-Filter in C++20"
```

### B. Direkt in PowerShell 7 (`pwsh`)

> **Wichtig unter Windows:** Immer **PowerShell 7 (`pwsh`)** statt dem alten Windows PowerShell 5.1 verwenden (`winget install Microsoft.PowerShell`), damit mehrzeilige Prompts und UTF-8-Sonderzeichen sauber übergeben werden.

```powershell
# 1. Antwort- und Pipe-Test für alle drei CLIs (oder mit -DryRun trocken prüfen)
pwsh ./scripts/orchestra.ps1 -Mode Ping -DryRun
pwsh ./scripts/orchestra.ps1 -Mode Ping

# 2. 4-Stufen-Debatte starten (legt automatisch runs/orchestra-YYYYMMDD-HHMMSS.md an)
pwsh ./scripts/orchestra.ps1 -Mode Debate -Aufgabe "Würde ein Air-Gap mit Kill-Switch RSI sicher machen?"

# 3. Struktur + Gegenkritik zusammenführen
pwsh ./scripts/orchestra.ps1 -Mode Parallel -Aufgabe "Wie bauen wir Prepaid World-Coins ohne ungedecktes Backend-Kostenrisiko?"
```

---

## Einordnung im Ökosystem (`npm run compare`)

| Werkzeug | Abdeckung | Arbeitsweise | Ehrliches Urteil |
|---|---|---|---|
| **`multie` (dieses Repo)** | `claude`, `grok`, `agy` | 4-Stufen-Triade & Parallel-Blitz + `si-algo`-Gate (Node ≥ 18 & `pwsh`) | **Stufe 1 & 2:** 0 Abhängigkeiten, volle Code-Transparenz, keine fremden Logins, strikt Read-Only. |
| **Claw Orchestrator** | Claude Code, Codex, Antigravity, Grok Build, OpenCode (ACP) | Dauerhafte Sitzungen hinter einer gemeinsamen Schnittstelle (Node 22+) | Deckt als externes Tool alle großen CLIs als persistente Sessions ab (vor Installation Code prüfen). |
| **Orca** | Claude Code, Codex, Grok, Antigravity, OpenCode | Isolierte Git-Worktrees nebeneinander (macOS, Windows, Linux) | Stark für parallele Feature-Worktrees, aber die Agenten debattieren dort nicht direkt miteinander. |
| **MCP-Brücke** | Antigravity & Grok als Sub-Agenten aus Claude Code | Punktuelle MCP-Tool-Aufrufe aus einer interaktiven Haupt-CLI | Ideal, wenn Claude interaktiv der Chef bleibt und Zweitmeinungen als Sub-Tool abruft. |

---

## Projektstruktur

```text
multie/
├── bin/
│   └── multie.mjs             # Plattformübergreifende CLI (doctor, debate, parallel, compare)
├── src/
│   ├── orchestrator.mjs       # Zero-Bloat Prozess-Runner, SHA-256-Cache & Markdown-Protokolle
│   └── sovereign-check.mjs    # Sicherheits-Veto (assertSafeArgs) & si-algo Jaccard-Triaden-Gate
├── scripts/
│   └── orchestra.ps1          # Eigenständiges PowerShell-7-Orchester (Debate, Parallel, Ping)
├── docs/
│   └── index.html             # Interaktive 0-€-Werkbank & Befehls-Generator (GitHub Pages)
├── test/
│   └── multie.test.mjs        # Automatisierte Invarianten-, Gate- & CLI-Tests
└── .github/workflows/
    ├── ci.yml                 # Node + PowerShell Test-Pipeline
    └── pages.yml              # GitHub-Pages-Deployment (upload-pages-artifact@v4)
```

---

## Lizenz

Public Domain / [Unlicense](LICENSE) — gebaut in der **NOBIS23 Werkstatt**.
