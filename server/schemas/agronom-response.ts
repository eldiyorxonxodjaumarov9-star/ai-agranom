import { z } from "zod";

const ConditionType = z.enum([
  "disease",
  "pest",
  "abiotic",
  "nutrient",
  "unknown",
]);

export const CandidateConditionSchema = z.object({
  conditionId: z.string().max(128).optional().nullable(),
  type: ConditionType,
  name: z.string().min(1).max(200),
  scientificName: z.string().max(200).optional().nullable(),
  confidence: z.number().min(0).max(0.99),
  supportingEvidence: z.array(z.string().max(400)).max(8).default([]),
  contradictingEvidence: z.array(z.string().max(400)).max(8).default([]),
});

export const DiagnosisSchema = z.object({
  crop: z.string().max(120).optional().nullable(),
  plantPart: z.string().max(80).optional().nullable(),
  imageQuality: z
    .enum(["good", "fair", "poor", "unknown"])
    .default("unknown"),
  observations: z.array(z.string().max(400)).max(12).default([]),
  candidateConditions: z.array(CandidateConditionSchema).max(8).default([]),
  overallConfidence: z.number().min(0).max(0.99).default(0),
  requiresExpertReview: z.boolean().default(false),
});

export const ActionsSchema = z.object({
  immediate: z.array(z.string().max(400)).max(8).default([]),
  monitor: z.array(z.string().max(400)).max(8).default([]),
  nextImages: z.array(z.string().max(200)).max(8).default([]),
});

export const CalendarItemSchema = z.object({
  title: z.string().max(200),
  daysFromNow: z.number().int().min(0).max(365),
  crop: z.string().max(120).optional().nullable(),
});

export const ReminderItemSchema = z.object({
  title: z.string().max(200),
  hoursFromNow: z.number().int().min(0).max(24 * 90),
});

export const HealthSchema = z.object({
  crop: z.string().max(120),
  score: z.number().min(0).max(100),
  pros: z.array(z.string().max(200)).max(6).default([]),
  cons: z.array(z.string().max(200)).max(6).default([]),
});

/**
 * Internal structured agronom response.
 * displayText is the only user-facing string — no URLs, JSON, IDs, or Manbalar.
 */
export const AgronomStructuredResponseSchema = z.object({
  displayText: z.string().min(1).max(8000),
  diagnosis: DiagnosisSchema.optional().nullable(),
  actions: ActionsSchema.optional().nullable(),
  productCandidates: z.array(z.string().max(128)).max(12).default([]),
  calendar: z.array(CalendarItemSchema).max(12).default([]),
  reminders: z.array(ReminderItemSchema).max(12).default([]),
  health: HealthSchema.optional().nullable(),
  sourceIds: z.array(z.string().max(128)).max(20).default([]),
  confidence: z.number().min(0).max(0.99).optional().nullable(),
  requiresExpertReview: z.boolean().default(false),
});

export type AgronomStructuredResponse = z.infer<
  typeof AgronomStructuredResponseSchema
>;

/** OpenAI json_schema for Structured Outputs (strict-ish). */
export const AGRONOM_RESPONSE_JSON_SCHEMA = {
  name: "agronom_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "displayText",
      "productCandidates",
      "calendar",
      "reminders",
      "sourceIds",
      "requiresExpertReview",
    ],
    properties: {
      displayText: { type: "string" },
      diagnosis: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: [
              "imageQuality",
              "observations",
              "candidateConditions",
              "overallConfidence",
              "requiresExpertReview",
            ],
            properties: {
              crop: { anyOf: [{ type: "string" }, { type: "null" }] },
              plantPart: { anyOf: [{ type: "string" }, { type: "null" }] },
              imageQuality: {
                type: "string",
                enum: ["good", "fair", "poor", "unknown"],
              },
              observations: {
                type: "array",
                items: { type: "string" },
              },
              candidateConditions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "type",
                    "name",
                    "confidence",
                    "supportingEvidence",
                    "contradictingEvidence",
                  ],
                  properties: {
                    conditionId: {
                      anyOf: [{ type: "string" }, { type: "null" }],
                    },
                    type: {
                      type: "string",
                      enum: [
                        "disease",
                        "pest",
                        "abiotic",
                        "nutrient",
                        "unknown",
                      ],
                    },
                    name: { type: "string" },
                    scientificName: {
                      anyOf: [{ type: "string" }, { type: "null" }],
                    },
                    confidence: { type: "number" },
                    supportingEvidence: {
                      type: "array",
                      items: { type: "string" },
                    },
                    contradictingEvidence: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
              overallConfidence: { type: "number" },
              requiresExpertReview: { type: "boolean" },
            },
          },
        ],
      },
      actions: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: ["immediate", "monitor", "nextImages"],
            properties: {
              immediate: { type: "array", items: { type: "string" } },
              monitor: { type: "array", items: { type: "string" } },
              nextImages: { type: "array", items: { type: "string" } },
            },
          },
        ],
      },
      productCandidates: { type: "array", items: { type: "string" } },
      calendar: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "daysFromNow"],
          properties: {
            title: { type: "string" },
            daysFromNow: { type: "integer" },
            crop: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
        },
      },
      reminders: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "hoursFromNow"],
          properties: {
            title: { type: "string" },
            hoursFromNow: { type: "integer" },
          },
        },
      },
      health: {
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: ["crop", "score", "pros", "cons"],
            properties: {
              crop: { type: "string" },
              score: { type: "number" },
              pros: { type: "array", items: { type: "string" } },
              cons: { type: "array", items: { type: "string" } },
            },
          },
        ],
      },
      sourceIds: { type: "array", items: { type: "string" } },
      confidence: { anyOf: [{ type: "number" }, { type: "null" }] },
      requiresExpertReview: { type: "boolean" },
    },
  },
} as const;

export function safeParseAgronomResponse(
  raw: unknown
): AgronomStructuredResponse | null {
  const parsed = AgronomStructuredResponseSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function fallbackAgronomResponse(message?: string): AgronomStructuredResponse {
  return {
    displayText:
      message?.trim() ||
      "Hozir aniq tashxis qo'yib bo'lmadi. Iltimos, ekin nomini, qaysi organ zararlanganini va qo'shimcha rasm yuboring.",
    diagnosis: null,
    actions: {
      immediate: [],
      monitor: [],
      nextImages: ["Barg oldi", "Barg orqa", "Butun o'simlik"],
    },
    productCandidates: [],
    calendar: [],
    reminders: [],
    health: null,
    sourceIds: [],
    confidence: 0.2,
    requiresExpertReview: true,
  };
}
