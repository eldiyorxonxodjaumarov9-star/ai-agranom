import type { AgentMeta } from "./types";

const META_RE = /---AGRO_META---\s*([\s\S]*?)\s*---END---/i;

export function stripAgentMeta(answer: string): { text: string; meta: AgentMeta | null } {
  const match = answer.match(META_RE);
  if (!match) return { text: answer.trim(), meta: null };
  let meta: AgentMeta | null = null;
  try {
    meta = JSON.parse(match[1].trim()) as AgentMeta;
  } catch {
    meta = null;
  }
  const text = answer.replace(META_RE, "").trim();
  return { text, meta };
}

export function growthDelta(imageCount: number, healthScore: number): number {
  if (imageCount < 2) return 0;
  return Math.round(Math.min(35, Math.max(5, (healthScore - 60) * 0.6 + imageCount * 2)));
}
