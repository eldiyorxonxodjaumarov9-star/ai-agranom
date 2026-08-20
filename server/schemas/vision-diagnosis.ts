import { z } from "zod";
import {
  arr,
  bool,
  num,
  strictObject,
  str,
  strOrNull,
} from "./strict-json-schema";

export const VisualFeaturesSchema = z.object({
  isPlantImage: z.boolean(),
  imageQuality: z.enum(["good", "fair", "poor", "unknown"]),
  qualityIssues: z.array(z.string().max(200)).max(8),
  cropGuess: z.string().max(120).nullable(),
  cropCertainty: z.number().min(0).max(0.99),
  plantPart: z.string().max(80).nullable(),
  colors: z.array(z.string().max(80)).max(12),
  patterns: z.array(z.string().max(120)).max(12),
  lesionEdges: z.array(z.string().max(120)).max(8),
  veinRelation: z.string().max(200).nullable(),
  necrosis: z.boolean(),
  chlorosis: z.boolean(),
  powderOrMycelium: z.boolean(),
  insectSigns: z.boolean(),
  holesOrChewing: z.boolean(),
  deformation: z.boolean(),
  distribution: z.string().max(200).nullable(),
  observations: z.array(z.string().max(400)).max(16),
});

export type VisualFeatures = z.infer<typeof VisualFeaturesSchema>;

export const DifferentialCandidateSchema = z.object({
  conditionId: z.string().max(128).nullable(),
  type: z.enum(["disease", "pest", "abiotic", "nutrient", "unknown"]),
  name: z.string().min(1).max(200),
  scientificName: z.string().max(200).nullable(),
  confidence: z.number().min(0).max(0.99),
  supportingEvidence: z.array(z.string().max(400)).max(8),
  contradictingEvidence: z.array(z.string().max(400)).max(8),
});

export const VisionDifferentialSchema = z.object({
  displayText: z.string().min(1).max(8000),
  summary: z.string().max(1000),
  overallConfidence: z.number().min(0).max(0.99),
  requiresExpertReview: z.boolean(),
  possibleDiseases: z.array(DifferentialCandidateSchema).max(8),
  possiblePests: z.array(DifferentialCandidateSchema).max(8),
  abioticOrNutrient: z.array(DifferentialCandidateSchema).max(8),
  recommendedNextImages: z.array(z.string().max(200)).max(8),
  productCandidates: z.array(z.string().max(128)).max(12),
  abstain: z.boolean(),
});

export type VisionDifferential = z.infer<typeof VisionDifferentialSchema>;

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

export const VISUAL_FEATURES_JSON_SCHEMA = {
  name: "visual_features",
  strict: true,
  schema: strictObject({
    isPlantImage: bool(),
    imageQuality: {
      type: "string",
      enum: ["good", "fair", "poor", "unknown"],
    },
    qualityIssues: arr(str()),
    cropGuess: strOrNull(),
    cropCertainty: num(),
    plantPart: strOrNull(),
    colors: arr(str()),
    patterns: arr(str()),
    lesionEdges: arr(str()),
    veinRelation: strOrNull(),
    necrosis: bool(),
    chlorosis: bool(),
    powderOrMycelium: bool(),
    insectSigns: bool(),
    holesOrChewing: bool(),
    deformation: bool(),
    distribution: strOrNull(),
    observations: arr(str()),
  }),
} as const;

export const VISION_DIFFERENTIAL_JSON_SCHEMA = {
  name: "vision_differential",
  strict: true,
  schema: strictObject({
    displayText: str(),
    summary: str(),
    overallConfidence: num(),
    requiresExpertReview: bool(),
    possibleDiseases: arr(candidateJson),
    possiblePests: arr(candidateJson),
    abioticOrNutrient: arr(candidateJson),
    recommendedNextImages: arr(str()),
    productCandidates: arr(str()),
    abstain: bool(),
  }),
} as const;
