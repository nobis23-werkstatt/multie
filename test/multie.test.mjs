import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  AGENT_PROFILES,
  ECOSYSTEM_MATRIX,
  discoverAgents,
  runDebate,
  runParallel
} from "../src/orchestrator.mjs";
import {
  assertSafeArgs,
  evaluateTriad,
  jaccardSimilarity
} from "../src/sovereign-check.mjs";

test("Security Invariant: alle Standard-Agentenprofile sind 100 % frei von Bypass-Flags", () => {
  for (const profile of Object.values(AGENT_PROFILES)) {
    assert.equal(assertSafeArgs(profile.args), true);
    assert.ok(profile.args.includes("-p"), `${profile.id} nutzt Headless-Flag -p`);
  }
});

test("Security Invariant: assertSafeArgs blockiert gefährliche Berechtigungs-Flags sofort", () => {
  const forbiddenSamples = [
    ["-p", "--dangerously" + "-skip-permissions"],
    ["--always" + "-approve"],
    ["--yo" + "lo"],
    ["--mode", "bypass" + "Permissions"]
  ];
  for (const bad of forbiddenSamples) {
    assert.throws(() => assertSafeArgs(bad), /SECURITY_VETO/);
  }
});

test("Jaccard & Sovereign Gate erkennen Echo-Kammern und bestätigen echte Triaden", () => {
  const identical = jaccardSimilarity(
    "Air-Gap und Kill-Switch sichern jedes System vollständig ab",
    "Air-Gap und Kill-Switch sichern jedes System vollständig ab"
  );
  assert.equal(identical, 1);

  const veto = evaluateTriad({
    draft: "Ein Air-Gap mit manuellem Kill-Switch reicht völlig für sichere Systeme aus.",
    critique: "Ein Air-Gap mit manuellem Kill-Switch reicht völlig für sichere Systeme aus.",
    audit: "Prüfung bestätigt die identische Aussage ohne weitere Einwände im Detail.",
    synthesis: "Ein Air-Gap mit manuellem Kill-Switch reicht völlig für sichere Systeme aus."
  });
  assert.equal(veto.decision, "VETO_REJECT");

  const valid = evaluateTriad({
    draft: "Architektur trennt Ausführung vom Netzwerk durch physischen Air-Gap sowie Not-Aus-Schalter.",
    critique: "Syzygos bemängelt hohe menschliche Reaktionslatenz und verdeckte Update-Seitenkanäle durch Wechselmedien.",
    audit: "Unabhängige Prüfung bestätigt Latenzproblem und Wechselmedien-Risiko; fordert automatische Millisekunden-Tripwires.",
    synthesis: "Konsolidierte Lösung kombiniert äußeren Air-Gap mit automatischen Invarianten-Tripwires, Read-Only-Caps und Mehr-Modell-Gate."
  });
  assert.equal(valid.decision, "SOVEREIGN_COMMIT");
  assert.ok(valid.iSi >= 0.65, `Erwartet I_SI >= 0.65, erhalten: ${valid.iSi}`);
});

test("runDebate & runParallel liefern im Dry-Run deterministisch SOVEREIGN_COMMIT + Protokoll", async () => {
  const tmpDebateLog = join(process.cwd(), "runs", "test-debate.md");
  const tmpParallelLog = join(process.cwd(), "runs", "test-parallel.md");

  const debate = await runDebate("Würde ein Air-Gap mit Kill-Switch RSI sicher machen?", {
    dryRun: true,
    useCache: false,
    outFile: tmpDebateLog
  });
  assert.equal(debate.gate.decision, "SOVEREIGN_COMMIT");
  assert.ok(existsSync(tmpDebateLog));

  const parallel = await runParallel("Entwirf einen 4-Pol-Dioden-Ladder-Filter", {
    dryRun: true,
    useCache: false,
    outFile: tmpParallelLog
  });
  assert.equal(parallel.gate.decision, "SOVEREIGN_COMMIT");
  assert.ok(existsSync(tmpParallelLog));

  rmSync(tmpDebateLog, { force: true });
  rmSync(tmpParallelLog, { force: true });
});

test("CLI bin/multie.mjs doctor & compare liefern valides JSON", () => {
  const doc = spawnSync(process.execPath, ["bin/multie.mjs", "doctor", "--json"], {
    encoding: "utf8"
  });
  assert.equal(doc.status, 0);
  const parsedDoc = JSON.parse(doc.stdout);
  assert.equal(parsedDoc.agents.length, 3);

  const cmp = spawnSync(process.execPath, ["bin/multie.mjs", "compare", "--json"], {
    encoding: "utf8"
  });
  assert.equal(cmp.status, 0);
  assert.equal(JSON.parse(cmp.stdout).length, ECOSYSTEM_MATRIX.length);
});

test("discoverAgents meldet exakt drei Profile (claude, grok, agy)", () => {
  const found = discoverAgents();
  assert.deepEqual(
    found.map((a) => a.id),
    ["claude", "grok", "agy"]
  );
});

test("PowerShell 7 orchestra.ps1 DryRun funktioniert fehlerfrei (falls pwsh vorhanden)", () => {
  const checkPwsh = spawnSync("pwsh", ["--version"], { encoding: "utf8" });
  if (checkPwsh.status !== 0) return; // skip cleanly if pwsh is absent on minimal runner

  const ping = spawnSync(
    "pwsh",
    ["-NoProfile", "-File", "scripts/orchestra.ps1", "-Mode", "Ping", "-DryRun"],
    { encoding: "utf8" }
  );
  assert.equal(ping.status, 0, ping.stderr);
  assert.match(ping.stdout, /PONG \(claude dry-run\)/);
  assert.match(ping.stdout, /PONG \(grok dry-run\)/);
  assert.match(ping.stdout, /PONG \(agy dry-run\)/);
});
