import { createHash } from "crypto";
import type { KnowledgeChunk, KbStatus } from "../types";
import { CROPS, type LangMap } from "./crops";
import { DISEASES } from "./diseases";
import { DISEASES_EXTRA } from "./diseases-extra";
import { DISEASES_PHASE4 } from "./diseases-phase4";
import { PESTS } from "./pests";
import { PESTS_EXTRA } from "./pests-extra";
import { PESTS_PHASE4 } from "./pests-phase4";
import { ACTIVE_INGREDIENTS } from "./products";

const ALL_DISEASES = [...DISEASES, ...DISEASES_EXTRA, ...DISEASES_PHASE4];
const ALL_PESTS = [...PESTS, ...PESTS_EXTRA, ...PESTS_PHASE4];

const NOW = "2026-07-30T00:00:00.000Z";

function checksum(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function qualityScore(input: {
  reliability: number;
  verified: boolean;
  completeness: number;
  sourceCount: number;
}): number {
  const base =
    input.reliability * 40 +
    (input.verified ? 30 : 10) +
    input.completeness * 20 +
    Math.min(input.sourceCount, 3) * 5;
  return Math.round(Math.min(100, Math.max(0, base)));
}

function chunk(partial: {
  id: string;
  entityType: KnowledgeChunk["entityType"];
  entityId: string;
  language: KnowledgeChunk["language"];
  title: string;
  content: string;
  keywords: string[];
  cropIds?: string[];
  plantParts?: string[];
  regions?: string[];
  sourceUrl: string;
  sourceTitle: string;
  organization: string;
  reliabilityScore: number;
  status: KbStatus;
  qualityScore: number;
}): KnowledgeChunk {
  return {
    ...partial,
    sourceId: `src-corpus-${createHash("sha256").update(partial.sourceUrl).digest("hex").slice(0, 8)}`,
    version: 1,
    updatedAt: NOW,
    checksum: checksum(partial.content),
  };
}

function langs(): (keyof LangMap)[] {
  return ["uz", "ru", "kk", "ky", "en"];
}

function disclaimer(lang: keyof LangMap): string {
  const map: LangMap = {
    uz: " Kimyoviy doza faqat rasmiy yorliq va mahalliy reyestr bo‘yicha. O‘ylab topilgan doza berilmaydi.",
    ru: " Химические дозы — только по официальной этикетке и местному реестру. Дозы не выдумываются.",
    kk: " Химиялық доза тек ресми этикетка және жергілікті тізілім бойынша. Доза ойдан шығарылмайды.",
    ky: " Химиялык доза расмий энбелги жана жергиликтүү реестр боюнча гана. Доза ойлоп табылбайт.",
    en: " Chemical rates only from official labels and local registration. Doses are never invented.",
  };
  return map[lang];
}

export function buildCorpusChunks(): KnowledgeChunk[] {
  const out: KnowledgeChunk[] = [];

  for (const crop of CROPS) {
    for (const lang of langs()) {
      const title = `${crop.names[lang]} (${crop.scientificName})`;
      const content = [
        `${title}.`,
        `Group: ${crop.group}.`,
        `Temp: ${crop.tempC}°C; humidity: ${crop.humidity}; soil: ${crop.soil}; pH: ${crop.ph}.`,
        `Irrigation: ${crop.irrigation}.`,
        `Regions: ${crop.regions.join(", ")}.`,
        `Common disease ids: ${crop.commonDiseaseIds.join(", ") || "n/a"}.`,
        `Common pest ids: ${crop.commonPestIds.join(", ") || "n/a"}.`,
        `Scientific name is not translated: ${crop.scientificName}.`,
        `Provenance: curated agronomic summary aligned with FAO crop production guidance principles.`,
        disclaimer(lang),
      ].join(" ");

      out.push(
        chunk({
          id: `corp-crop-${crop.id}-${lang}`,
          entityType: "crop",
          entityId: `crop-${crop.id}`,
          language: lang,
          title,
          content,
          keywords: [
            crop.id,
            crop.scientificName,
            crop.names.uz,
            crop.names.ru,
            crop.names.kk,
            crop.names.ky,
            crop.names.en,
            crop.group,
          ],
          cropIds: [crop.id],
          regions: crop.regions,
          sourceUrl: "https://www.fao.org/crops/en/",
          sourceTitle: "FAO Crops (curated summary)",
          organization: "FAO",
          reliabilityScore: 0.9,
          status: "VERIFIED",
          qualityScore: qualityScore({
            reliability: 0.9,
            verified: true,
            completeness: 0.85,
            sourceCount: 1,
          }),
        })
      );
    }
  }

  for (const d of ALL_DISEASES) {
    for (const lang of langs()) {
      const name = d.names[lang];
      const title = `${name} (${d.scientificName})`;
      const overview = [
        title,
        d.eppoCode ? `EPPO: ${d.eppoCode}.` : "",
        `Pathogen type: ${d.pathogenType}; severity: ${d.severity}.`,
        `Crops: ${d.cropIds.join(", ")}.`,
        `Early: ${d.earlySymptoms[lang]}`,
        `Late: ${d.lateSymptoms[lang]}`,
        `Conditions: ${d.conditions[lang]}`,
        `Prevention/cultural: ${d.prevention[lang]}`,
        d.confusedWith?.length
          ? `Differential: may be confused with ${d.confusedWith.join(", ")}.`
          : "",
        `Source org: ${d.organization}.`,
        disclaimer(lang),
      ]
        .filter(Boolean)
        .join(" ");

      out.push(
        chunk({
          id: `corp-dis-${d.id}-${lang}`,
          entityType: "disease",
          entityId: `disease-${d.id}`,
          language: lang,
          title,
          content: overview,
          keywords: [
            d.id,
            d.scientificName,
            d.eppoCode || "",
            d.names.uz,
            d.names.ru,
            d.names.en,
            d.pathogenType,
            ...d.cropIds,
          ].filter(Boolean),
          cropIds: d.cropIds,
          plantParts: ["leaf", "stem", "fruit", "root"],
          sourceUrl: d.sourceUrl,
          sourceTitle: `${d.organization} — ${d.scientificName}`,
          organization: d.organization,
          reliabilityScore: d.organization === "EPPO" ? 0.96 : 0.92,
          status: "VERIFIED",
          qualityScore: qualityScore({
            reliability: 0.94,
            verified: true,
            completeness: 0.9,
            sourceCount: 1,
          }),
        })
      );

      // Symptom-focused chunk
      out.push(
        chunk({
          id: `corp-sym-${d.id}-${lang}`,
          entityType: "symptom",
          entityId: `symptom-${d.id}`,
          language: lang,
          title: `Symptoms: ${name}`,
          content: [
            `Early-stage symptoms for ${name} (${d.scientificName}): ${d.earlySymptoms[lang]}`,
            `Late-stage: ${d.lateSymptoms[lang]}`,
            `Do not give a single 100% diagnosis from one photo; compare differentials.`,
            disclaimer(lang),
          ].join(" "),
          keywords: [d.id, "symptom", "belgi", "симптом", ...d.cropIds],
          cropIds: d.cropIds,
          plantParts: ["leaf"],
          sourceUrl: d.sourceUrl,
          sourceTitle: `${d.organization} symptoms — ${d.scientificName}`,
          organization: d.organization,
          reliabilityScore: 0.9,
          status: "VERIFIED",
          qualityScore: qualityScore({
            reliability: 0.9,
            verified: true,
            completeness: 0.8,
            sourceCount: 1,
          }),
        })
      );

      // Prevention / cultural treatment (verified, no invented dose)
      out.push(
        chunk({
          id: `corp-prev-${d.id}-${lang}`,
          entityType: "treatment",
          entityId: `treatment-cultural-${d.id}`,
          language: lang,
          title: `Prevention: ${name}`,
          content: [
            `Cultural/biological prevention for ${name}: ${d.prevention[lang]}`,
            `Prefer IPM: sanitation, resistant varieties, ventilation, drip irrigation, crop rotation.`,
            `If chemical control is needed, use only products registered for the crop and target in the country; follow the label.`,
            disclaimer(lang),
          ].join(" "),
          keywords: [d.id, "prevention", "profilaktika", "IPM", ...d.cropIds],
          cropIds: d.cropIds,
          sourceUrl: "https://www.fao.org/pest-and-pesticide-management/ipm/integrated-pest-management/en/",
          sourceTitle: "FAO IPM + disease-specific curated notes",
          organization: "FAO",
          reliabilityScore: 0.93,
          status: "VERIFIED",
          qualityScore: qualityScore({
            reliability: 0.93,
            verified: true,
            completeness: 0.85,
            sourceCount: 2,
          }),
        })
      );

      // Favorable conditions (epidemiology)
      out.push(
        chunk({
          id: `corp-cond-${d.id}-${lang}`,
          entityType: "disease",
          entityId: `disease-conditions-${d.id}`,
          language: lang,
          title: `Conditions: ${name}`,
          content: [
            `Favorable conditions for ${name} (${d.scientificName}): ${d.conditions[lang]}`,
            `Use this to time scouting and cultural prevention; do not invent spray calendars.`,
            disclaimer(lang),
          ].join(" "),
          keywords: [d.id, "conditions", "sharoit", "влажность", ...d.cropIds],
          cropIds: d.cropIds,
          sourceUrl: d.sourceUrl,
          sourceTitle: `${d.organization} conditions — ${d.scientificName}`,
          organization: d.organization,
          reliabilityScore: 0.9,
          status: "VERIFIED",
          qualityScore: 78,
        })
      );

      // Differential diagnosis
      out.push(
        chunk({
          id: `corp-diff-${d.id}-${lang}`,
          entityType: "symptom",
          entityId: `diff-${d.id}`,
          language: lang,
          title: `Differential: ${name}`,
          content: [
            `Differential diagnosis notes for ${name} (${d.scientificName}).`,
            d.confusedWith?.length
              ? `May be confused with: ${d.confusedWith.join(", ")}. Compare lesion pattern, sporulation, and crop history.`
              : `Compare with nutrient disorders and lookalikes; ask clarifying questions before asserting a single diagnosis.`,
            `Early: ${d.earlySymptoms[lang]} Late: ${d.lateSymptoms[lang]}`,
            disclaimer(lang),
          ].join(" "),
          keywords: [d.id, "differential", "farqlash", ...d.cropIds],
          cropIds: d.cropIds,
          sourceUrl: d.sourceUrl,
          sourceTitle: `${d.organization} differential — ${d.scientificName}`,
          organization: d.organization,
          reliabilityScore: 0.88,
          status: "VERIFIED",
          qualityScore: 76,
        })
      );

      // Scouting timing (derived from conditions + early symptoms; no invented spray calendar)
      out.push(
        chunk({
          id: `corp-scout-${d.id}-${lang}`,
          entityType: "disease",
          entityId: `scout-${d.id}`,
          language: lang,
          title: `Scouting: ${name}`,
          content: [
            `Scouting guidance for ${name} (${d.scientificName}).`,
            `Watch when: ${d.conditions[lang]}`,
            `First signs to record: ${d.earlySymptoms[lang]}`,
            `Increase scouting frequency after rain, irrigation events, or canopy closure; photograph lesions with crop and plant-part context.`,
            `Do not invent spray calendars or doses from this note.`,
            disclaimer(lang),
          ].join(" "),
          keywords: [d.id, "scouting", "monitoring", "kuzatuv", ...d.cropIds],
          cropIds: d.cropIds,
          sourceUrl: d.sourceUrl,
          sourceTitle: `${d.organization} scouting — ${d.scientificName}`,
          organization: d.organization,
          reliabilityScore: 0.87,
          status: "VERIFIED",
          qualityScore: 74,
        })
      );
    }
  }

  for (const p of ALL_PESTS) {
    for (const lang of langs()) {
      const name = p.names[lang];
      const title = `${name} (${p.scientificName})`;
      out.push(
        chunk({
          id: `corp-pest-${p.id}-${lang}`,
          entityType: "pest",
          entityId: `pest-${p.id}`,
          language: lang,
          title,
          content: [
            title,
            p.eppoCode ? `EPPO: ${p.eppoCode}.` : "",
            `Type: ${p.pestType}. Crops: ${p.cropIds.join(", ")}.`,
            `Lifecycle: ${p.lifecycle[lang]}`,
            `Damage: ${p.damage[lang]}`,
            `Prevention: ${p.prevention[lang]}`,
            `Biological: ${p.biological[lang]}`,
            disclaimer(lang),
          ]
            .filter(Boolean)
            .join(" "),
          keywords: [
            p.id,
            p.scientificName,
            p.eppoCode || "",
            p.names.uz,
            p.names.ru,
            p.names.en,
            ...p.cropIds,
          ].filter(Boolean),
          cropIds: p.cropIds,
          sourceUrl: p.sourceUrl,
          sourceTitle: `${p.organization} — ${p.scientificName}`,
          organization: p.organization,
          reliabilityScore: 0.94,
          status: "VERIFIED",
          qualityScore: qualityScore({
            reliability: 0.94,
            verified: true,
            completeness: 0.88,
            sourceCount: 1,
          }),
        })
      );

      out.push(
        chunk({
          id: `corp-pest-sym-${p.id}-${lang}`,
          entityType: "symptom",
          entityId: `symptom-pest-${p.id}`,
          language: lang,
          title: `Damage signs: ${name}`,
          content: `Observed damage for ${name}: ${p.damage[lang]} Scout regularly; confirm identity before any pesticide. ${disclaimer(lang)}`,
          keywords: [p.id, "damage", "zarar", ...p.cropIds],
          cropIds: p.cropIds,
          sourceUrl: p.sourceUrl,
          sourceTitle: `${p.organization} damage — ${p.scientificName}`,
          organization: p.organization,
          reliabilityScore: 0.9,
          status: "VERIFIED",
          qualityScore: 82,
        })
      );
    }
  }

  for (const ai of ACTIVE_INGREDIENTS) {
    for (const lang of ["ru", "en"] as const) {
      out.push(
        chunk({
          id: `corp-ai-${ai.id}-${lang}`,
          entityType: "product",
          entityId: `ai-${ai.id}`,
          language: lang,
          title: `Active ingredient class: ${ai.name}`,
          content: [
            `${ai.name} (${ai.type}).`,
            `Possible targets (general class, not a product registration): ${ai.targets.join(", ")}.`,
            `Crop hints: ${ai.cropsHint.join(", ")}.`,
            ai.safetyNotes[lang],
            `NOT a purchase recommendation. Use only nationally registered formulated products with valid registration numbers.`,
            `Dose/PHI must come from the product label. Status: NEEDS_REVIEW until agronom verifies KZ registry match.`,
            disclaimer(lang),
          ].join(" "),
          keywords: [ai.id, ai.name, ai.type, ...ai.targets],
          cropIds: ai.cropsHint,
          sourceUrl: ai.sourceUrl,
          sourceTitle: `Active ingredient class — ${ai.name}`,
          organization: "Agro Olam curated / official label required",
          reliabilityScore: 0.7,
          status: "NEEDS_REVIEW",
          qualityScore: 55,
        })
      );
    }
  }

  return out;
}

export function corpusStats(chunks: KnowledgeChunk[] = buildCorpusChunks()) {
  const byType: Record<string, number> = {};
  for (const c of chunks) {
    byType[c.entityType] = (byType[c.entityType] || 0) + 1;
  }
  return {
    totalChunks: chunks.length,
    crops: CROPS.length,
    diseases: ALL_DISEASES.length,
    pests: ALL_PESTS.length,
    activeIngredients: ACTIVE_INGREDIENTS.length,
    verified: chunks.filter((c) => c.status === "VERIFIED").length,
    needsReview: chunks.filter((c) => c.status === "NEEDS_REVIEW").length,
    byType,
  };
}
