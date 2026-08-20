import { z } from "zod";
import {
  arr,
  bool,
  int,
  num,
  numOrNull,
  strictObject,
  str,
  strOrNull,
} from "./strict-json-schema";

const ConditionType = z.enum([
  "disease",
  "pest",
  "abiotic",
  "nutrient",
  "unknown",
]);

export const CandidateConditionSchema = z.object({
  conditionId: z.string().max(128).nullable(),
  type: ConditionType,
  name: z.string().min(1).max(200),
  scientificName: z.string().max(200).nullable(),
  confidence: z.number().min(0).max(0.99),
  supportingEvidence: z.array(z.string().max(400)).max(8),
  contradictingEvidence: z.array(z.string().max(400)).max(8),
});

export const DiagnosisSchema = z.object({
  crop: z.string().max(120).nullable(),
  plantPart: z.string().max(80).nullable(),
  imageQuality: z.enum(["good", "fair", "poor", "unknown"]),
  observations: z.array(z.string().max(400)).max(12),
  candidateConditions: z.array(CandidateConditionSchema).max(8),
  overallConfidence: z.number().min(0).max(0.99),
  requiresExpertReview: z.boolean(),
});

export const ActionsSchema = z.object({
  immediate: z.array(z.string().max(400)).max(8),
  monitor: z.array(z.string().max(400)).max(8),
  nextImages: z.array(z.string().max(200)).max(8),
});

export const CalendarItemSchema = z.object({
  title: z.string().max(200),
  daysFromNow: z.number().int().min(0).max(365),
  crop: z.string().max(120).nullable(),
});

export const ReminderItemSchema = z.object({
  title: z.string().max(200),
  hoursFromNow: z.number().int().min(0).max(24 * 90),
});

export const HealthSchema = z.object({
  crop: z.string().max(120),
  score: z.number().min(0).max(100),
  pros: z.array(z.string().max(200)).max(6),
  cons: z.array(z.string().max(200)).max(6),
});

/** Model may only propose internal product IDs — never trade names for gating. */
export const AgronomStructuredResponseSchema = z.object({
  displayText: z.string().min(1).max(8000),
  diagnosis: DiagnosisSchema.nullable(),
  actions: ActionsSchema.nullable(),
  productCandidates: z.array(z.string().max(128)).max(12),
  calendar: z.array(CalendarItemSchema).max(12),
  reminders: z.array(ReminderItemSchema).max(12),
  health: HealthSchema.nullable(),
  sourceIds: z.array(z.string().max(128)).max(20),
  confidence: z.number().min(0).max(0.99).nullable(),
  requiresExpertReview: z.boolean(),
});

export type AgronomStructuredResponse = z.infer<
  typeof AgronomStructuredResponseSchema
>;

const candidateJson = strictObject({
  conditionId: strOrNull(),
  type: {
    type: "string",
    enum: ["disease", "pest", "abiotic", "nutrient", "unknown"],
  },
  name: str(),
  scientificName: strOrNull(),
  confidence: num(),
  supportingEvidence: arr(str()),
  contradictingEvidence: arr(str()),
});

const diagnosisJson = strictObject({
  crop: strOrNull(),
  plantPart: strOrNull(),
  imageQuality: {
    type: "string",
    enum: ["good", "fair", "poor", "unknown"],
  },
  observations: arr(str()),
  candidateConditions: arr(candidateJson),
  overallConfidence: num(),
  requiresExpertReview: bool(),
});

const actionsJson = strictObject({
  immediate: arr(str()),
  monitor: arr(str()),
  nextImages: arr(str()),
});

const calendarItemJson = strictObject({
  title: str(),
  daysFromNow: int(),
  crop: strOrNull(),
});

const reminderJson = strictObject({
  title: str(),
  hoursFromNow: int(),
});

const healthJson = strictObject({
  crop: str(),
  score: num(),
  pros: arr(str()),
  cons: arr(str()),
});

export const AGRONOM_RESPONSE_JSON_SCHEMA = {
  name: "agronom_response",
  strict: true,
  schema: strictObject({
    displayText: str(),
    diagnosis: { anyOf: [{ type: "null" }, diagnosisJson] },
    actions: { anyOf: [{ type: "null" }, actionsJson] },
    productCandidates: arr(str()),
    calendar: arr(calendarItemJson),
    reminders: arr(reminderJson),
    health: { anyOf: [{ type: "null" }, healthJson] },
    sourceIds: arr(str()),
    confidence: numOrNull(),
    requiresExpertReview: bool(),
  }),
} as const;

export function safeParseAgronomResponse(
  raw: unknown
): AgronomStructuredResponse | null {
  const parsed = AgronomStructuredResponseSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function fallbackAgronomResponse(
  message?: string
): AgronomStructuredResponse {
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
