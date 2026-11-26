/**
 * multie — Sovereign Integral & Security Invariant Guard
 * Enforces zero permission-bypass flags, non-collusion (Jaccard token overlap),
 * and verifiable 4-stage epistemic triad synthesis.
 */

const FORBIDDEN_PATTERNS = [
  /dangerously-skip/i,
  /always-approve/i,
  /(?:^|\s|=)--?yolo(?:\s|$)/i,
  /bypass[_-]?permissions/i,
  /no-sandbox/i
];

/**
 * Hard invariant: local CLIs must never be spawned with permission-bypass flags.
 * @param {string[]} args
 */
export function assertSafeArgs(args = []) {
  for (const arg of args) {
    const text = String(arg);
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(text)) {
        throw new Error(
          `[SECURITY_VETO] Verbotenes Berechtigungs-Bypass-Flag blockiert: "${text}"`
        );
      }
    }
  }
  return true;
}

/**
 * Tokenize German/English technical prose into normalized 3+ char stems.
 * @param {string} text
 * @returns {Set<string>}
 */
export function tokenize(text = "") {
  const cleaned = String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, " ");
  const tokens = cleaned
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  return new Set(tokens);
}

/**
 * Compute Jaccard similarity between two texts in [0, 1].
 * @param {string} a
 * @param {string} b
 */
export function jaccardSimilarity(a = "", b = "") {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : Number((intersection / union).toFixed(4));
}

/**
 * Evaluate a Triad round (Debate or Parallel) via Sovereign Integral rules:
 * - Zero empty outputs
 * - Low echo-chamber collusion between independent roles (< maxOverlap)
 * - Meaningful synthesis refinement over raw unedited draft
 */
export function evaluateTriad({
  draft = "",
  critique = "",
  audit = "",
  synthesis = "",
  maxOverlap = 0.72
} = {}) {
  const stages = {
    draft: String(draft).trim(),
    critique: String(critique).trim(),
    audit: String(audit).trim(),
    synthesis: String(synthesis).trim()
  };

  const missing = Object.entries(stages)
    .filter(([, v]) => v.length < 12)
    .map(([k]) => k);

  if (missing.length > 0) {
    return {
      decision: "VETO_REJECT",
      iSi: 0,
      reason: `Unvollständige Triaden-Stufen: ${missing.join(", ")}`,
      overlaps: {},
      stagesReady: false
    };
  }

  const draftCritiqueOverlap = jaccardSimilarity(stages.draft, stages.critique);
  const critiqueAuditOverlap = jaccardSimilarity(stages.critique, stages.audit);
  const draftSynthesisOverlap = jaccardSimilarity(stages.draft, stages.synthesis);

  const maxIndependentOverlap = Math.max(draftCritiqueOverlap, critiqueAuditOverlap);
  const collusionDetected = maxIndependentOverlap >= maxOverlap;
  const rubberStamped = draftSynthesisOverlap >= 0.94;

  // Epistemic Independence Score: rewards low overlap between independent agents
  const independence = Math.max(0, Math.min(1, 1 - maxIndependentOverlap * 0.85));
  // Synthesis Integration Score: neither verbatim copy (1.0) nor unrelated hallucination (0.0)
  const integration = rubberStamped
    ? 0.35
    : Math.max(0.5, Math.min(1, 1 - Math.abs(draftSynthesisOverlap - 0.42)));
  // Audit Grounding Score: ensures substantive verification output
  const grounding = Math.min(1, stages.audit.length / 120);

  const rawIsi = 0.4 * independence + 0.35 * integration + 0.25 * grounding;
  const iSi = Number((collusionDetected ? rawIsi * 0.55 : rawIsi).toFixed(4));

  let decision = "SOVEREIGN_COMMIT";
  let reason = "Epistemische Triade unabhängig geprüft und konsolidiert.";

  if (collusionDetected) {
    decision = "VETO_REJECT";
    reason = `Echo-Kammer / Kollusion erkannt (Jaccard ${maxIndependentOverlap} >= ${maxOverlap}).`;
  } else if (rubberStamped || iSi < 0.65) {
    decision = "NEEDS_SHARPENING";
    reason = rubberStamped
      ? "Endfassung übernimmt Entwurf nahezu unverändert (Rubber-Stamp-Warnung)."
      : `Souveränes Integral unter Schwellwert (I_SI=${iSi} < 0.65).`;
  }

  return {
    decision,
    iSi,
    reason,
    stagesReady: true,
    overlaps: {
      draftCritique: draftCritiqueOverlap,
      critiqueAudit: critiqueAuditOverlap,
      draftSynthesis: draftSynthesisOverlap
    }
  };
}
