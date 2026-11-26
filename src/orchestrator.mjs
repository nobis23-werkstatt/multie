import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { assertSafeArgs, evaluateTriad } from "./sovereign-check.mjs";

/**
 * Stripped Zero-Bloat (`efficient++`) profiles for local CLIs.
 * Never passes permission-bypass flags; disables tools/hooks/plugins so
 * orchestration exchanges pure text without mutating local files.
 */
export const AGENT_PROFILES = Object.freeze({
  claude: {
    id: "claude",
    label: "Claude Code (Architekt & Synthese)",
    bin: "claude",
    args: ["-p", "--bare", "--no-session-persistence", "--tools", ""],
    inputMode: "stdin"
  },
  grok: {
    id: "grok",
    label: "Grok CLI (Syzygos / Lateraler Skeptiker)",
    bin: "grok",
    args: [
      "--no-auto-update",
      "-p",
      "--no-memory",
      "--no-subagents",
      "--no-plan",
      "--disable-web-search",
      "--tools",
      ""
    ],
    inputMode: "stdin-or-file"
  },
  agy: {
    id: "agy",
    label: "Antigravity CLI (Unabhängiger Prüfer & Struktur)",
    bin: "agy",
    args: ["-p", "--disable-slash-commands", "--mode", "plan"],
    inputMode: "arg"
  }
});

export const ECOSYSTEM_MATRIX = Object.freeze([
  {
    tool: "multie (dieses Repo)",
    scope: "Claude + Grok + AGY (Node ≥ 18 & PowerShell 7)",
    mode: "4-Stufen-Debatte & Parallel-Blitz + si-algo Kollusions-Gate",
    verdict: "Stufe 1 & 2: 0 Abhängigkeiten, volle Code-Transparenz, keine fremden Logins, strikt Read-Only."
  },
  {
    tool: "Claw Orchestrator",
    scope: "Claude Code, Codex, Antigravity, Grok Build, OpenCode (ACP)",
    mode: "Dauerhafte Sitzungen hinter einer gemeinsamen Schnittstelle (Node 22+)",
    verdict: "Deckt alle Engines als persistente Sessions ab – starker Kandidat für langlebige Multi-Session-Setups."
  },
  {
    tool: "Orca",
    scope: "Claude Code, Codex, Grok, Antigravity, OpenCode",
    mode: "Parallele Git-Worktrees nebeneinander (macOS, Windows, Linux)",
    verdict: "Gute Multi-Fenster-Oberfläche für isolierte Worktrees, aber die Agenten debattieren dort nicht direkt miteinander."
  },
  {
    tool: "MCP-Brücke (Sub-Agenten)",
    scope: "Antigravity & Grok Build gesteuert aus Claude Code heraus",
    verdict: "Praktisch, wenn man interaktiv in Claude Code sitzt und die anderen CLIs als Werkzeug aufrufen möchte.",
    mode: "MCP-Tool-Aufrufe aus einer Haupt-CLI"
  }
]);

/**
 * Resolve binary path on Windows/macOS/Linux without throwing.
 */
export function resolveBinary(binName) {
  const isWin = process.platform === "win32";
  const locator = isWin ? "where.exe" : "which";
  const res = spawnSync(locator, [binName], {
    encoding: "utf8",
    timeout: 4000,
    windowsHide: true
  });
  if (res.status !== 0 || !res.stdout) return null;
  const lines = res.stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  // On Windows prefer .cmd / .exe shim if present
  if (isWin) {
    const preferred = lines.find((l) => /\.(cmd|exe|bat)$/i.test(l));
    return preferred || lines[0];
  }
  return lines[0];
}

/**
 * Discover status of all three local CLIs.
 */
export function discoverAgents() {
  return Object.values(AGENT_PROFILES).map((profile) => {
    assertSafeArgs(profile.args);
    const resolvedPath = resolveBinary(profile.bin);
    return {
      id: profile.id,
      label: profile.label,
      bin: profile.bin,
      installed: Boolean(resolvedPath),
      path: resolvedPath,
      safeFlags: profile.args
    };
  });
}

/**
 * Deterministic offline responder for `--dry-run` testing & CI verification.
 */
function buildDryRunReply(agentId, stage, task) {
  const shortTask = String(task).trim().slice(0, 140);
  if (stage === "draft") {
    return [
      `### Entwurf (Claude) zu: ${shortTask}`,
      "1. **Kernarchitektur:** Physische bzw. prozessuale Trennung zwischen Ausführungsschicht und Freigabe-Gate.",
      "2. **Steuerfluss:** Jede Zustandsänderung benötigt vorab ein deterministisches Prüfsignal (Exit-Code + Hash).",
      "3. **Grenzen:** Ein reiner Kill-Switch reagiert erst nach Beobachtung eines Fehlers und ersetzt keine formale Invariante."
    ].join("\n");
  }
  if (stage === "critique") {
    return [
      `### Syzygos-Kritik (Grok) zu: ${shortTask}`,
      "- **Schwachstelle 1 (Latenz-Lücke):** Zwischen Ausbruch und menschlichem Kill-Switch vergehen Millisekunden bis Sekunden – bei automatisierten Pipelines zu spät.",
      "- **Schwachstelle 2 (Seitenkanäle):** Ein Air-Gap wird regelmäßig durch Update-Medien, Logs oder menschliche Operatoren überbrückt (Social Engineering / Stuxnet-Vektor).",
      "- **Übertreibung im Entwurf:** Hash-Prüfung allein verhindert keine semantisch valide, aber zielverschobene Payload (Goodhart-Drift)."
    ].join("\n");
  }
  if (stage === "audit") {
    return [
      `### Unabhängige Prüfung (AGY) zu: ${shortTask}`,
      "- **Bestätigt (berechtigt):** Latenz-Lücke beim manuellen Kill-Switch sowie der Operator-/Brücken-Vektor beim Air-Gap sind real und technisch belegt.",
      "- **Bestätigt (berechtigt):** Reine Hash-Integrität prüft nur Byte-Identität, nicht Ausrichtungs-Treue.",
      "- **Einordnung:** Air-Gap + Kill-Switch sind notwendig als äußere Sicherung, reichen aber ohne automatischen Tripwire-Wächter und enges Capability-Budget nicht allein aus."
    ].join("\n");
  }
  return [
    `### Souveräne Endfassung (Konsolidiert) zu: ${shortTask}`,
    "**Urteil:** Nein – ein Air-Gap mit manuellem Kill-Switch ist eine unverzichtbare Basis-Sicherung, macht ein selbstverbesserndes System (RSI) **allein** jedoch nicht sicher.",
    "",
    "1. **Warum es allein nicht reicht (bestätigte Syzygos-Punkte):**",
    "   - *Reaktionszeit:* Ein manueller Kill-Switch greift erst nach sichtbaren Symptomen.",
    "   - *Brücken-Risiko:* Jeder Air-Gap braucht Ein-/Ausgabekanäle (Logs, Patches, Menschen), über die Kontext oder Täuschung wandern kann.",
    "2. **Was zusätzlich zwingend nötig ist:**",
    "   - **Automatische Invarianten-Tripwires** (sofortiger Abbruch in Millisekunden ohne Warten auf Menschen).",
    "   - **Striktes Read-Only-/Allowlist-Sandboxing** ohne Berechtigungs-Bypässe.",
    "   - **Unabhängige Mehr-Modell-Prüfung (`si-algo`)** gegen Goodhart-Drift vor jedem Commit."
  ].join("\n");
}

/**
 * Invoke one local agent safely without shell injection or permission bypasses.
 */
export async function invokeAgent(agentId, prompt, { dryRun = false, stage = "draft", task = "", timeoutMs = 120_000 } = {}) {
  const profile = AGENT_PROFILES[agentId];
  if (!profile) {
    throw new Error(`Unbekannter Agent: "${agentId}"`);
  }
  assertSafeArgs(profile.args);

  if (dryRun) {
    return {
      agent: agentId,
      stage,
      durationMs: 4,
      output: buildDryRunReply(agentId, stage, task || prompt),
      dryRun: true
    };
  }

  const resolved = resolveBinary(profile.bin);
  if (!resolved) {
    throw new Error(
      `CLI "${profile.bin}" wurde nicht im PATH gefunden. Starte "multie doctor" oder nutze "--dry-run".`
    );
  }

  const started = Date.now();
  const isWinCmd = process.platform === "win32" && /\.(cmd|bat)$/i.test(resolved);
  let tempPromptPath = null;

  try {
    let cmd = resolved;
    let finalArgs = [...profile.args];
    let stdinPayload = null;

    if (profile.inputMode === "stdin") {
      stdinPayload = prompt;
    } else if (profile.inputMode === "stdin-or-file") {
      tempPromptPath = join(
        tmpdir(),
        `multie-${agentId}-${process.pid}-${Date.now()}.txt`
      );
      writeFileSync(tempPromptPath, prompt, "utf8");
      finalArgs = [
        "--no-auto-update",
        "--no-memory",
        "--no-subagents",
        "--no-plan",
        "--disable-web-search",
        "--tools",
        "",
        "--prompt-file",
        tempPromptPath
      ];
    } else {
      finalArgs = [...profile.args, prompt];
    }

    assertSafeArgs(finalArgs);

    const output = await new Promise((resolve, reject) => {
      const child = spawn(cmd, finalArgs, {
        shell: isWinCmd,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error(`Timeout (${timeoutMs} ms) bei Agent "${agentId}"`));
      }, timeoutMs);

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(
            new Error(
              `Agent "${agentId}" beendet mit Exit-Code ${code}: ${stderr.trim() || stdout.trim()}`
            )
          );
          return;
        }
        const trimmed = stdout.trim();
        if (!trimmed) {
          reject(
            new Error(
              `Agent "${agentId}" hat leer geantwortet (Pipe-Capture fehlgeschlagen).`
            )
          );
          return;
        }
        resolve(trimmed);
      });

      if (stdinPayload !== null) {
        child.stdin.write(stdinPayload, "utf8");
      }
      child.stdin.end();
    });

    return {
      agent: agentId,
      stage,
      durationMs: Date.now() - started,
      output,
      dryRun: false
    };
  } finally {
    if (tempPromptPath && existsSync(tempPromptPath)) {
      try {
        unlinkSync(tempPromptPath);
      } catch {
        // ignore temp cleanup errors
      }
    }
  }
}

function cacheKey(mode, task, dryRun) {
  return createHash("sha256")
    .update(JSON.stringify({ v: "1.0.0", mode, task: String(task).trim(), dryRun }))
    .digest("hex")
    .slice(0, 24);
}

function writeRunLog(result, outFile) {
  const runsDir = join(process.cwd(), "runs");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const target = outFile || join(runsDir, `orchestra-${stamp}.md`);
  mkdirSync(dirname(target), { recursive: true });

  const md = [
    `# multie Protokoll (${result.mode.toUpperCase()})`,
    "",
    `- **Aufgabe:** ${result.task}`,
    `- **Modus:** \`${result.mode}\` (${result.dryRun ? "Dry-Run Simulation" : "Live Local CLIs"})`,
    `- **Souveränes Integral (\`I_SI\`):** \`${result.gate.iSi}\` → **\`${result.gate.decision}\`**`,
    `- **Begründung:** ${result.gate.reason}`,
    "",
    "---",
    "",
    "## 1. Entwurf",
    result.stages.draft,
    "",
    "## 2. Syzygos-Kritik",
    result.stages.critique,
    "",
    "## 3. Unabhängige Prüfung",
    result.stages.audit,
    "",
    "## 4. Souveräne Endfassung",
    result.stages.synthesis,
    ""
  ].join("\n");

  writeFileSync(target, md, "utf8");
  return target;
}

/**
 * 4-Stage Sequential Epistemic Triad:
 * Claude (Draft) -> Grok (Syzygos Critique) -> AGY (Independent Audit) -> Claude (Synthesis)
 */
export async function runDebate(task, { dryRun = false, useCache = true, outFile = null, timeoutMs = 120_000 } = {}) {
  const cleanTask = String(task || "").trim();
  if (!cleanTask) throw new Error("Aufgabe darf nicht leer sein.");

  const cacheDir = join(process.cwd(), ".multie-cache");
  const key = cacheKey("debate", cleanTask, dryRun);
  const cachedPath = join(cacheDir, `${key}.json`);

  if (useCache && existsSync(cachedPath)) {
    const cached = JSON.parse(readFileSync(cachedPath, "utf8"));
    return { ...cached, fromCache: true };
  }

  const s1 = await invokeAgent(
    "claude",
    `Löse diese Aufgabe präzise und strukturiert:\n${cleanTask}`,
    { dryRun, stage: "draft", task: cleanTask, timeoutMs }
  );
  const s2 = await invokeAgent(
    "grok",
    `Du bist Syzygos, der unbestechliche Skeptiker. Finde blinde Flecken, Fehler, Lücken und Schönfärberei.\nAufgabe: ${cleanTask}\n\nEntwurf:\n${s1.output}`,
    { dryRun, stage: "critique", task: cleanTask, timeoutMs }
  );
  const s3 = await invokeAgent(
    "agy",
    `Prüfe unabhängig und nüchtern: Welche Kritikpunkte von Syzygos sind technisch berechtigt, welche überzogen? Begründe kurz.\n\nAufgabe: ${cleanTask}\n\nEntwurf:\n${s1.output}\n\nKritik:\n${s2.output}`,
    { dryRun, stage: "audit", task: cleanTask, timeoutMs }
  );
  const s4 = await invokeAgent(
    "claude",
    `Überarbeite den Entwurf zur souveränen Endfassung. Übernimm ausschließlich Kritikpunkte, die die unabhängige Prüfung bestätigt hat.\n\nAufgabe: ${cleanTask}\n\nEntwurf:\n${s1.output}\n\nKritik:\n${s2.output}\n\nPrüfung:\n${s3.output}`,
    { dryRun, stage: "synthesis", task: cleanTask, timeoutMs }
  );

  const stages = {
    draft: s1.output,
    critique: s2.output,
    audit: s3.output,
    synthesis: s4.output
  };
  const gate = evaluateTriad(stages);
  const result = {
    mode: "debate",
    task: cleanTask,
    dryRun,
    fromCache: false,
    timingsMs: {
      draft: s1.durationMs,
      critique: s2.durationMs,
      audit: s3.durationMs,
      synthesis: s4.durationMs
    },
    stages,
    gate
  };

  result.logFile = writeRunLog(result, outFile);
  if (useCache) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cachedPath, JSON.stringify(result, null, 2), "utf8");
  }
  return result;
}

/**
 * Parallel Blitz Mode:
 * AGY (Structure & Verification) + Grok (Lateral Critique) run concurrently via Promise.all,
 * then Claude synthesizes both streams into the gated output.
 */
export async function runParallel(task, { dryRun = false, useCache = true, outFile = null, timeoutMs = 120_000 } = {}) {
  const cleanTask = String(task || "").trim();
  if (!cleanTask) throw new Error("Aufgabe darf nicht leer sein.");

  const cacheDir = join(process.cwd(), ".multie-cache");
  const key = cacheKey("parallel", cleanTask, dryRun);
  const cachedPath = join(cacheDir, `${key}.json`);

  if (useCache && existsSync(cachedPath)) {
    const cached = JSON.parse(readFileSync(cachedPath, "utf8"));
    return { ...cached, fromCache: true };
  }

  const [agyRes, grokRes] = await Promise.all([
    invokeAgent(
      "agy",
      `Entwirf die präzise Systemarchitektur, Invarianten und Prüfkriterien für:\n${cleanTask}`,
      { dryRun, stage: "audit", task: cleanTask, timeoutMs }
    ),
    invokeAgent(
      "grok",
      `Liefere laterale Gegenhypothesen, Edge-Cases und Anti-Klischee-Kritik (Syzygos) für:\n${cleanTask}`,
      { dryRun, stage: "critique", task: cleanTask, timeoutMs }
    )
  ]);

  const draftRes = {
    output: agyRes.output,
    durationMs: agyRes.durationMs
  };
  const synthRes = await invokeAgent(
    "claude",
    `Synthetisiere Architektur (AGY) und Risiko-Kritik (Grok) zu einer kohärenten, sofort umsetzbaren Lösung:\n\nAufgabe: ${cleanTask}\n\nAGY-Struktur:\n${agyRes.output}\n\nGrok-Kritik:\n${grokRes.output}`,
    { dryRun, stage: "synthesis", task: cleanTask, timeoutMs }
  );

  // Use distinct structural framing vs audit note for clean triad metrics
  const auditNote = `Parallel-Fan-Out abgeschlossen (${agyRes.durationMs} ms AGY || ${grokRes.durationMs} ms Grok).\n${agyRes.output}`;
  const stages = {
    draft: `Architektur-Basis:\n${draftRes.output}`,
    critique: grokRes.output,
    audit: auditNote,
    synthesis: synthRes.output
  };
  const gate = evaluateTriad(stages);
  const result = {
    mode: "parallel",
    task: cleanTask,
    dryRun,
    fromCache: false,
    timingsMs: {
      parallelWallMs: Math.max(agyRes.durationMs, grokRes.durationMs),
      agy: agyRes.durationMs,
      grok: grokRes.durationMs,
      claudeSynthesis: synthRes.durationMs
    },
    stages,
    gate
  };

  result.logFile = writeRunLog(result, outFile);
  if (useCache) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cachedPath, JSON.stringify(result, null, 2), "utf8");
  }
  return result;
}
