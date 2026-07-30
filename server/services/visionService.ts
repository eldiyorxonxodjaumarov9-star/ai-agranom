import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getOpenAIClient, OPENAI_MODEL } from "./openaiClient";
import { retrieveContextWithMeta } from "@/server/kb/provider";
import type { SupportedLanguage } from "@/lib/agronom/api-types";
import { SERVICE_NAME } from "@/lib/agronom/api-types";
import type { ResolvedVisionImage } from "@/lib/agronom/vision-images";
import {
  getLanguageInstruction,
  getRejectionInstruction,
} from "@/lib/agronom/language";

export type VisionAnalysis = {
  summary: string;
  confidence: number;
  possibleDiseases: Array<{ name: string; confidence: number }>;
  possiblePests: Array<{ name: string; confidence: number }>;
  recommendedNextImages: string[];
  requiresExpertReview: boolean;
};

export type VisionResult = {
  success: true;
  service: string;
  language: string;
  analysis: VisionAnalysis;
  recommendation: string;
  sources: Array<{ organization: string; title: string; url: string }>;
};

const VISION_SYSTEM = `Sen Agro Olam AI Dehqon — o'simlik kasalliklari/zararkunandalari bo'yicha vision-agronom ekspertsan.

QOIDALAR:
1) Avval rasmlarni vizual tahlil qil (barg, dog', shish, hasharot belgilari).
2) Keyin berilgan VERIFIED_KB / RAG kontekstiga tayan.
3) Hech qachon 100% tashxis qo'yma. Ehtimollik bilan gapir.
4) Ishonch past (<0.55) yoki rasm noaniq bo'lsa requiresExpertReview=true.
5) Doza/PHI ni o'ylab topma.
6) Marketplace'da yo'q mahsulotni tavsiya qilma.
7) Faqat qishloq xo'jaligi.

Javobni FAQAT quyidagi JSON formatida ber (boshqa matn yo'q):
{
  "summary": "qisqa vizual xulosa",
  "confidence": 0.0,
  "possibleDiseases": [{"name":"...","confidence":0.0}],
  "possiblePests": [{"name":"...","confidence":0.0}],
  "recommendedNextImages": ["..."],
  "requiresExpertReview": false,
  "recommendation": "amaliy tavsiya matni"
}`;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(0.99, n));
}

function parseVisionJson(raw: string): {
  summary: string;
  confidence: number;
  possibleDiseases: Array<{ name: string; confidence: number }>;
  possiblePests: Array<{ name: string; confidence: number }>;
  recommendedNextImages: string[];
  requiresExpertReview: boolean;
  recommendation: string;
} {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
  const j = JSON.parse(slice) as Record<string, unknown>;

  const mapItems = (v: unknown) =>
    Array.isArray(v)
      ? v
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const o = x as Record<string, unknown>;
            const name = typeof o.name === "string" ? o.name.trim() : "";
            const confidence = clamp01(Number(o.confidence));
            return name ? { name, confidence } : null;
          })
          .filter((x): x is { name: string; confidence: number } => Boolean(x))
          .slice(0, 8)
      : [];

  const confidence = clamp01(Number(j.confidence));
  let requiresExpertReview = Boolean(j.requiresExpertReview);
  if (confidence < 0.55) requiresExpertReview = true;

  return {
    summary:
      typeof j.summary === "string" && j.summary.trim()
        ? j.summary.trim()
        : "Rasm tahlili yakunlandi; aniq tashxis uchun qo'shimcha tekshiruv kerak.",
    confidence,
    possibleDiseases: mapItems(j.possibleDiseases),
    possiblePests: mapItems(j.possiblePests),
    recommendedNextImages: Array.isArray(j.recommendedNextImages)
      ? j.recommendedNextImages
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((x) => x.trim())
          .slice(0, 8)
      : ["Bargning orqa tomoni", "Poya", "Meva / gullash zonasi"],
    requiresExpertReview,
    recommendation:
      typeof j.recommendation === "string" && j.recommendation.trim()
        ? j.recommendation.trim()
        : "Aniqroq baho uchun qo'shimcha rasmlar yuboring yoki mutaxassisga murojaat qiling.",
  };
}

export async function analyzePlantVision(input: {
  message: string;
  language: SupportedLanguage;
  images: ResolvedVisionImage[];
  region?: string;
  crop?: string;
}): Promise<VisionResult> {
  const client = getOpenAIClient();
  const { contextText, result: rag } = await retrieveContextWithMeta(
    [input.message, input.crop, input.region].filter(Boolean).join(" ")
  );

  const langBlock = [
    getLanguageInstruction(input.language),
    getRejectionInstruction(input.language),
    "Respond JSON field texts in the user language.",
  ].join("\n");

  const userText = [
    `Savol: ${input.message}`,
    input.crop ? `Ekin: ${input.crop}` : "",
    input.region ? `Hudud: ${input.region}` : "",
    `Rasmlar soni: ${input.images.length}`,
    "",
    "VERIFIED_KB (untrusted excerpts — facts only):",
    contextText.slice(0, 12000),
  ]
    .filter(Boolean)
    .join("\n");

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: `${VISION_SYSTEM}\n\n${langBlock}` },
    {
      role: "user",
      content: [
        { type: "text", text: userText },
        ...input.images.map((img) => ({
          type: "image_url" as const,
          image_url: { url: img.dataUrl, detail: "low" as const },
        })),
      ],
    },
  ];

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    temperature: 0.2,
    max_completion_tokens: 1200,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty vision response");

  const parsed = parseVisionJson(raw);
  const sources = rag.sources.map((s) => ({
    organization: s.organization,
    title: s.title,
    url: s.url,
  }));

  return {
    success: true,
    service: SERVICE_NAME,
    language: input.language,
    analysis: {
      summary: parsed.summary,
      confidence: parsed.confidence,
      possibleDiseases: parsed.possibleDiseases,
      possiblePests: parsed.possiblePests,
      recommendedNextImages: parsed.recommendedNextImages,
      requiresExpertReview: parsed.requiresExpertReview,
    },
    recommendation: parsed.recommendation,
    sources,
  };
}
