import type { CropAdviceEntry, CropId, CropImageEntry, CropRecord } from "./types";

const STORAGE_KEY = "agro-olam-crop-memory-v1";

export const DEFAULT_CROPS: { id: CropId; name: string }[] = [
  { id: "pomidor", name: "Pomidor" },
  { id: "bodring", name: "Bodring" },
  { id: "kartoshka", name: "Kartoshka" },
  { id: "bugdoy", name: "Bug'doy" },
  { id: "olma", name: "Olma" },
  { id: "uzum", name: "Uzum" },
];

function emptyCrop(id: string, name: string): CropRecord {
  return {
    id,
    name,
    advice: [],
    diseases: [],
    irrigation: [],
    fertilizers: [],
    images: [],
    chats: [],
    healthScore: 75,
    healthPros: [],
    healthCons: [],
    updatedAt: new Date().toISOString(),
  };
}

export function loadCropMemory(): CropRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = DEFAULT_CROPS.map((c) => emptyCrop(c.id, c.name));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as CropRecord[];
  } catch {
    return DEFAULT_CROPS.map((c) => emptyCrop(c.id, c.name));
  }
}

export function saveCropMemory(crops: CropRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(crops));
  } catch {
    // quota
  }
}

export function detectCropFromText(text: string): { id: string; name: string } | null {
  const lower = text.toLowerCase();
  const map: [RegExp, CropId, string][] = [
    [/pomidor|tomato/i, "pomidor", "Pomidor"],
    [/bodring|cucumber/i, "bodring", "Bodring"],
    [/kartoshka|potato/i, "kartoshka", "Kartoshka"],
    [/bug'?doy|bugdoy|wheat/i, "bugdoy", "Bug'doy"],
    [/olma|apple/i, "olma", "Olma"],
    [/uzum|grape/i, "uzum", "Uzum"],
  ];
  for (const [re, id, name] of map) {
    if (re.test(lower)) return { id, name };
  }
  return null;
}

export function getCropContextBlock(crops: CropRecord[], focusCropId?: string | null): string {
  const relevant = focusCropId
    ? crops.filter((c) => c.id === focusCropId)
    : crops.filter((c) => c.chats.length > 0 || c.advice.length > 0);

  if (relevant.length === 0) return "";

  return relevant
    .map((c) => {
      const recentChats = c.chats.slice(-6)
        .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
        .join("\n");
      const diseases = c.diseases.slice(-3).map((d) => d.title).join("; ");
      const fert = c.fertilizers.slice(-3).map((d) => d.title).join("; ");
      return `EKIN: ${c.name} (id:${c.id})
Health: ${c.healthScore}/100
Pros: ${c.healthPros.join(", ") || "—"}
Cons: ${c.healthCons.join(", ") || "—"}
Kasalliklar: ${diseases || "—"}
O'g'itlar: ${fert || "—"}
Oxirgi suhbatlar:
${recentChats || "(yo'q)"}`;
    })
    .join("\n\n");
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertCropChat(
  crops: CropRecord[],
  crop: { id: string; name: string },
  userMsg: string,
  assistantMsg: string
): CropRecord[] {
  const next = [...crops];
  let idx = next.findIndex((c) => c.id === crop.id);
  if (idx < 0) {
    next.push(emptyCrop(crop.id, crop.name));
    idx = next.length - 1;
  }
  const record = { ...next[idx] };
  record.chats = [
    ...record.chats,
    { role: "user" as const, content: userMsg, at: new Date().toISOString() },
    {
      role: "assistant" as const,
      content: assistantMsg,
      at: new Date().toISOString(),
    },
  ].slice(-40);
  record.updatedAt = new Date().toISOString();

  // classify simple tags from assistant reply
  const advice: CropAdviceEntry = {
    id: uid(),
    type: "advice",
    title: userMsg.slice(0, 60),
    content: assistantMsg.slice(0, 800),
    createdAt: new Date().toISOString(),
  };
  record.advice = [advice, ...record.advice].slice(0, 30);

  if (/kasallik|fitoftora|fung|zararkunanda|qurt/i.test(assistantMsg)) {
    record.diseases = [
      { ...advice, type: "disease" as const, id: uid() },
      ...record.diseases,
    ].slice(0, 20);
  }
  if (/sug.?or|irrigation|suv/i.test(assistantMsg)) {
    record.irrigation = [
      { ...advice, type: "irrigation" as const, id: uid() },
      ...record.irrigation,
    ].slice(0, 20);
  }
  if (/o.?g.?it|npk|azot|kaliy|fosfor/i.test(assistantMsg)) {
    record.fertilizers = [
      { ...advice, type: "fertilizer" as const, id: uid() },
      ...record.fertilizers,
    ].slice(0, 20);
  }

  next[idx] = record;
  saveCropMemory(next);
  return next;
}

export function addCropImages(
  crops: CropRecord[],
  crop: { id: string; name: string },
  images: string[]
): CropRecord[] {
  const next = [...crops];
  let idx = next.findIndex((c) => c.id === crop.id);
  if (idx < 0) {
    next.push(emptyCrop(crop.id, crop.name));
    idx = next.length - 1;
  }
  const week = Math.ceil(
    (Date.now() - new Date(next[idx].updatedAt || Date.now()).getTime()) /
      (7 * 86400000)
  );
  const entries: CropImageEntry[] = images.map((dataUrl, i) => ({
    id: uid(),
    dataUrl,
    weekLabel: `${Math.max(1, week + i)}-hafta`,
    createdAt: new Date().toISOString(),
  }));
  next[idx] = {
    ...next[idx],
    images: [...entries, ...next[idx].images].slice(0, 60),
    updatedAt: new Date().toISOString(),
  };
  saveCropMemory(next);
  return next;
}

export function updateCropHealth(
  crops: CropRecord[],
  cropId: string,
  score: number,
  pros: string[],
  cons: string[]
): CropRecord[] {
  const next = crops.map((c) =>
    c.id === cropId
      ? {
          ...c,
          healthScore: Math.max(0, Math.min(100, score)),
          healthPros: pros,
          healthCons: cons,
          updatedAt: new Date().toISOString(),
        }
      : c
  );
  saveCropMemory(next);
  return next;
}
