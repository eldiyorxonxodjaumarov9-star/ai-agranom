import type { AgentMeta } from "./types";
import { sanitizeDisplayText } from "@/lib/agronom/display-sanitize";

const META_RE = /---AGRO_META---\s*([\s\S]*?)\s*---END---/i;

/**
 * Legacy marker protocol extractor.
 * New responses use Structured Outputs — this remains for old history only.
 */
export function stripAgentMeta(answer: string): {
  text: string;
  meta: AgentMeta | null;
} {
  const match = answer.match(META_RE);
  let meta: AgentMeta | null = null;
  if (match) {
    try {
      meta = JSON.parse(match[1].trim()) as AgentMeta;
    } catch {
      meta = null;
    }
  }
  const text = sanitizeDisplayText(answer);
  return { text, meta };
}

export function growthDelta(imageCount: number, healthScore: number): number {
  if (imageCount < 2) return 0;
  return Math.round(
    Math.min(35, Math.max(5, (healthScore - 60) * 0.6 + imageCount * 2))
  );
}
