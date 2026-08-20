/**
 * Sanitize user-facing agronom text.
 * Removes legacy AGRO_META, Manbalar sections, URLs, and raw JSON leaks.
 */

const META_COMPLETE_RE = /---AGRO_META---\s*[\s\S]*?\s*---END---/gi;
const META_INCOMPLETE_RE = /---AGRO_META---[\s\S]*$/gi;
const MANBALAR_RE =
  /\n{0,2}\s*#{0,3}\s*Manbalar\s*:?\s*\n[\s\S]*?(?=\n#{1,3}\s|\n---|\s*$)/gi;
const URL_RE = /https?:\/\/[^\s)\]>"']+/gi;
const MARKDOWN_LINK_RE = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/gi;
const AGRO_META_TOKEN_RE = /---?\s*AGRO_META\s*---?/gi;
const END_TOKEN_RE = /---?\s*END\s*---?/gi;
const JSON_FENCE_RE = /```(?:json)?\s*[\s\S]*?```/gi;
const RAW_JSON_OBJECT_RE =
  /\{[\s\S]*"(?:products|confidence|sources|displayText|calendar)"[\s\S]*\}/g;

export function sanitizeDisplayText(input: string): string {
  let text = input ?? "";

  text = text.replace(META_COMPLETE_RE, "");
  text = text.replace(META_INCOMPLETE_RE, "");
  text = text.replace(AGRO_META_TOKEN_RE, "");
  text = text.replace(END_TOKEN_RE, "");
  text = text.replace(MANBALAR_RE, "\n");
  text = text.replace(MARKDOWN_LINK_RE, "$1");
  text = text.replace(URL_RE, "");
  text = text.replace(JSON_FENCE_RE, "");
  text = text.replace(RAW_JSON_OBJECT_RE, "");

  // Collapse leftover blank lines
  text = text
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

export function assertNoUserFacingLeakage(text: string): string[] {
  const leaks: string[] = [];
  if (/https?:\/\//i.test(text)) leaks.push("url");
  if (/AGRO_META/i.test(text)) leaks.push("AGRO_META");
  if (/\b---END---\b/i.test(text)) leaks.push("END");
  if (/^\s*Manbalar\s*:/im.test(text) || /\nManbalar\s*:/i.test(text)) {
    leaks.push("Manbalar");
  }
  if (/```/.test(text)) leaks.push("code_fence");
  if (/"products"\s*:/.test(text) && /"confidence"\s*:/.test(text)) {
    leaks.push("raw_json");
  }
  return leaks;
}
