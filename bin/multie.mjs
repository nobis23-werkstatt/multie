#!/usr/bin/env node
import {
  ECOSYSTEM_MATRIX,
  discoverAgents,
  runDebate,
  runParallel
} from "../src/orchestrator.mjs";

function parseCli(argv) {
  const flags = {
    dryRun: false,
    json: false,
    useCache: true,
    outFile: null,
    timeoutMs: 120_000
  };
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--json") flags.json = true;
    else if (arg === "--no-cache") flags.useCache = false;
    else if (arg === "--out" && argv[i + 1]) flags.outFile = argv[++i];
    else if (arg === "--timeout" && argv[i + 1]) flags.timeoutMs = Number(argv[++i]) * 1000;
    else if (arg === "-h" || arg === "--help") flags.help = true;
    else positional.push(arg);
  }
  return { command: positional[0] || "help", task: positional.slice(1).join(" "), flags };
}

function printHelp() {
  console.log(`multie v1.0.0 — Sovereign Local Multi-CLI Orchestra (Claude × Grok × AGY)

Verwendung:
  node bin/multie.mjs doctor                         Prüft lokale CLIs (claude, grok, agy) & Zero-Bloat-Flags
  node bin/multie.mjs compare                        Vergleicht Orchestrierungs-Ansätze (multie, Claw, Orca, MCP)
  node bin/multie.mjs debate   [Optionen] "<Aufgabe>"  4-Stufen-Triade (Entwurf -> Syzygos -> Prüfer -> Synthese)
  node bin/multie.mjs parallel [Optionen] "<Aufgabe>"  Parallel-Blitz (AGY || Grok -> Claude Synthese)

Optionen:
  --dry-run        Deterministische Simulation ohne lokale CLI-Aufrufe (0,00 €)
  --no-cache       SHA-256 Runden-Cache überspringen
  --out <Pfad>     Markdown-Protokoll in eigene Datei schreiben
  --timeout <Sek>  Zeitlimit pro Agent (Standard: 120)
  --json           Maschinenlesbare JSON-Ausgabe
`);
}

async function main() {
  const { command, task, flags } = parseCli(process.argv.slice(2));

  if (flags.help || command === "help") {
    printHelp();
    return;
  }

  if (command === "doctor") {
    const agents = discoverAgents();
    if (flags.json) {
      console.log(JSON.stringify({ version: "1.0.0", platform: process.platform, agents }, null, 2));
      return;
    }
    console.log("=== multie Doctor — Lokale CLI-Prüfung ===");
    for (const a of agents) {
      const badge = a.installed ? "[BEREIT]" : "[FEHLT] ";
      console.log(`${badge} ${a.id.padEnd(7)} -> ${a.path || "nicht im PATH gefunden"}`);
      console.log(`         Safe-Flags: ${a.safeFlags.map((f) => (f === "" ? '""' : f)).join(" ")}`);
    }
    const readyCount = agents.filter((a) => a.installed).length;
    console.log(`\nStatus: ${readyCount}/3 lokale CLIs installiert (Dry-Run jederzeit mit --dry-run verfügbar).`);
    return;
  }

  if (command === "compare") {
    if (flags.json) {
      console.log(JSON.stringify(ECOSYSTEM_MATRIX, null, 2));
      return;
    }
    console.log("=== Multi-CLI Orchestrierung im Vergleich ===\n");
    for (const row of ECOSYSTEM_MATRIX) {
      console.log(`* ${row.tool}`);
      console.log(`  Abdeckung : ${row.scope}`);
      console.log(`  Modus     : ${row.mode}`);
      console.log(`  Urteil    : ${row.verdict}\n`);
    }
    return;
  }

  if (command === "debate" || command === "parallel") {
    const runner = command === "debate" ? runDebate : runParallel;
    const res = await runner(task, flags);
    if (flags.json) {
      console.log(JSON.stringify(res, null, 2));
      return;
    }
    console.log(`\n===== multie ${res.mode.toUpperCase()} ERGEBNIS =====`);
    console.log(`Gate: ${res.gate.decision} (I_SI = ${res.gate.iSi}) — ${res.gate.reason}\n`);
    console.log(res.stages.synthesis);
    console.log(`\nProtokoll gespeichert: ${res.logFile}`);
    return;
  }

  throw new Error(`Unbekannter Befehl "${command}". Starte mit "--help" für Hilfe.`);
}

main().catch((err) => {
  console.error(`[multie Fehler] ${err.message}`);
  process.exit(1);
});
