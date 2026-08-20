/**
 * Vision diagnosis calibration unit tests (no live OpenAI).
 * Run: npx tsx scripts/test-vision-diagnosis.ts
 */
import { __visionTestUtils } from "../server/services/visionService";
import type { VisualFeatures } from "../server/schemas/vision-diagnosis";

let passed = 0;
let failed = 0;
function ok(n: string) {
  console.log(`PASS: ${n}`);
  passed++;
}
function fail(n: string, d?: string) {
  console.error(`FAIL: ${n}${d ? " — " + d : ""}`);
  failed++;
}

const baseFeatures: VisualFeatures = {
  isPlantImage: true,
  imageQuality: "good",
  qualityIssues: [],
  cropGuess: "Pomidor",
  cropCertainty: 0.8,
  plantPart: "barg",
  colors: ["sariq"],
  patterns: ["dog'"],
  lesionEdges: ["aniq"],
  veinRelation: null,
  necrosis: false,
  chlorosis: true,
  powderOrMycelium: false,
  insectSigns: false,
  holesOrChewing: false,
  deformation: false,
  distribution: "pastki barglar",
  observations: ["sariq dog'"],
};

{
  const r = __visionTestUtils.calibrateConfidence({
    modelConfidence: 0.9,
    features: { ...baseFeatures, imageQuality: "poor" },
    ragConfidence: 0.7,
    candidateCount: 1,
    topGap: 1,
    hasKbCandidates: true,
  });
  if (r.confidence <= 0.4 && r.requiresExpertReview) ok("poor image caps confidence");
  else fail("poor image caps confidence", JSON.stringify(r));
}

{
  const r = __visionTestUtils.calibrateConfidence({
    modelConfidence: 0.85,
    features: { ...baseFeatures, cropCertainty: 0.2 },
    ragConfidence: 0.6,
    candidateCount: 2,
    topGap: 0.05,
    hasKbCandidates: true,
  });
  if (r.requiresExpertReview && r.confidence <= 0.55) ok("close candidates + unknown crop");
  else fail("close candidates + unknown crop", JSON.stringify(r));
}

{
  const r = __visionTestUtils.calibrateConfidence({
    modelConfidence: 0.8,
    features: baseFeatures,
    ragConfidence: 0.2,
    candidateCount: 0,
    topGap: 1,
    hasKbCandidates: false,
  });
  if (r.abstain && r.requiresExpertReview) ok("no KB abstain");
  else fail("no KB abstain", JSON.stringify(r));
}

{
  const q = __visionTestUtils.buildRagQuery(
    "nima bo'ldi",
    baseFeatures,
    "Pomidor",
    "Toshkent"
  );
  if (q.includes("Pomidor") && q.includes("chlorosis")) ok("rag query includes features");
  else fail("rag query includes features", q);
}

{
  const c = __visionTestUtils.clamp01(1.2);
  if (c === 0.99) ok("never 100% confidence");
  else fail("never 100% confidence", String(c));
}

console.log(`\n=== Vision diagnosis: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
