import { z } from "zod";

export const VisualFeaturesSchema = z.object({
  isPlantImage: z.boolean(),
  imageQuality: z.enum(["good", "fair", "poor", "unknown"]),
  qualityIssues: z.array(z.string().max(200)).max(8).default([]),
  cropGuess: z.string().max(120).optional().nullable(),
  cropCertainty: z.number().min(0).max(0.99).default(0),
  plantPart: z.string().max(80).optional().nullable(),
  colors: z.array(z.string().max(80)).max(12).default([]),
  patterns: z.array(z.string().max(120)).max(12).default([]),
  lesionEdges: z.array(z.string().max(120)).max(8).default([]),
  veinRelation: z.string().max(200).optional().nullable(),
  necrosis: z.boolean().default(false),
  chlorosis: z.boolean().default(false),
  powderOrMycelium: z.boolean().default(false),
  insectSigns: z.boolean().default(false),
  holesOrChewing: z.boolean().default(false),
  deformation: z.boolean().default(false),
  distribution: z.string().max(200).optional().nullable(),
  observations: z.array(z.string().max(400)).max(16).default([]),
});

export type VisualFeatures = z.infer<typeof VisualFeaturesSchema>;

export const DifferentialCandidateSchema = z.object({
  conditionId: z.string().max(128).optional().nullable(),
  type: z.enum(["disease", "pest", "abiotic", "nutrient", "unknown"]),
  name: z.string().min(1).max(200),
  scientificName: z.string().max(200).optional().nullable(),
  confidence: z.number().min(0).max(0.99),
  supportingEvidence: z.array(z.string().max(400)).max(8).default([]),
  contradictingEvidence: z.array(z.string().max(400)).max(8).default([]),
});

export const VisionDifferentialSchema = z.object({
  displayText: z.string().min(1).max(8000),
  summary: z.string().max(1000),
  overallConfidence: z.number().min(0).max(0.99),
  requiresExpertReview: z.boolean(),
  possibleDiseases: z.array(DifferentialCandidateSchema).max(8).default([]),
  possiblePests: z.array(DifferentialCandidateSchema).max(8).default([]),
  abioticOrNutrient: z.array(DifferentialCandidateSchema).max(8).default([]),
  recommendedNextImages: z.array(z.string().max(200)).max(8).default([]),
  abstain: z.boolean().default(false),
});

export type VisionDifferential = z.infer<typeof VisionDifferentialSchema>;

export const VISUAL_FEATURES_JSON_SCHEMA = {
  name: "visual_features",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "isPlantImage",
      "imageQuality",
      "qualityIssues",
      "cropCertainty",
      "colors",
      "patterns",
      "lesionEdges",
      "necrosis",
      "chlorosis",
      "powderOrMycelium",
      "insectSigns",
      "holesOrChewing",
      "deformation",
      "observations",
    ],
    properties: {
      isPlantImage: { type: "boolean" },
      imageQuality: {
        type: "string",
        enum: ["good", "fair", "poor", "unknown"],
      },
      qualityIssues: { type: "array", items: { type: "string" } },
      cropGuess: { anyOf: [{ type: "string" }, { type: "null" }] },
      cropCertainty: { type: "number" },
      plantPart: { anyOf: [{ type: "string" }, { type: "null" }] },
      colors: { type: "array", items: { type: "string" } },
      patterns: { type: "array", items: { type: "string" } },
      lesionEdges: { type: "array", items: { type: "string" } },
      veinRelation: { anyOf: [{ type: "string" }, { type: "null" }] },
      necrosis: { type: "boolean" },
      chlorosis: { type: "boolean" },
      powderOrMycelium: { type: "boolean" },
      insectSigns: { type: "boolean" },
      holesOrChewing: { type: "boolean" },
      deformation: { type: "boolean" },
      distribution: { anyOf: [{ type: "string" }, { type: "null" }] },
      observations: { type: "array", items: { type: "string" } },
    },
  },
} as const;

export const VISION_DIFFERENTIAL_JSON_SCHEMA = {
  name: "vision_differential",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "displayText",
      "summary",
      "overallConfidence",
      "requiresExpertReview",
      "possibleDiseases",
      "possiblePests",
      "abioticOrNutrient",
      "recommendedNextImages",
      "abstain",
    ],
    properties: {
      displayText: { type: "string" },
      summary: { type: "string" },
      overallConfidence: { type: "number" },
      requiresExpertReview: { type: "boolean" },
      possibleDiseases: {
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
            conditionId: { anyOf: [{ type: "string" }, { type: "null" }] },
            type: {
              type: "string",
              enum: ["disease", "pest", "abiotic", "nutrient", "unknown"],
            },
            name: { type: "string" },
            scientificName: { anyOf: [{ type: "string" }, { type: "null" }] },
            confidence: { type: "number" },
            supportingEvidence: { type: "array", items: { type: "string" } },
            contradictingEvidence: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
      possiblePests: {
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
            conditionId: { anyOf: [{ type: "string" }, { type: "null" }] },
            type: {
              type: "string",
              enum: ["disease", "pest", "abiotic", "nutrient", "unknown"],
            },
            name: { type: "string" },
            scientificName: { anyOf: [{ type: "string" }, { type: "null" }] },
            confidence: { type: "number" },
            supportingEvidence: { type: "array", items: { type: "string" } },
            contradictingEvidence: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
      abioticOrNutrient: {
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
            conditionId: { anyOf: [{ type: "string" }, { type: "null" }] },
            type: {
              type: "string",
              enum: ["disease", "pest", "abiotic", "nutrient", "unknown"],
            },
            name: { type: "string" },
            scientificName: { anyOf: [{ type: "string" }, { type: "null" }] },
            confidence: { type: "number" },
            supportingEvidence: { type: "array", items: { type: "string" } },
            contradictingEvidence: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
      recommendedNextImages: { type: "array", items: { type: "string" } },
      abstain: { type: "boolean" },
    },
  },
} as const;
