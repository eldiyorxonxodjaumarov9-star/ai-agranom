import { FAOAdapter } from "./fao";
import { EPPOAdapter } from "./eppo";
import { USDAAdapter } from "./usda";
import { KazakhstanOfficialRegistryAdapter } from "./kz-registry";
import { UzbekistanOfficialRegistryAdapter } from "./uz-registry";
import type { SourceAdapter } from "./types";

export function getAllAdapters(): SourceAdapter[] {
  return [
    new FAOAdapter(),
    new EPPOAdapter(),
    new USDAAdapter(),
    new KazakhstanOfficialRegistryAdapter(),
    new UzbekistanOfficialRegistryAdapter(),
  ];
}

export function getAdapterById(id: string): SourceAdapter | undefined {
  return getAllAdapters().find((a) => a.id === id);
}

export {
  FAOAdapter,
  EPPOAdapter,
  USDAAdapter,
  KazakhstanOfficialRegistryAdapter,
  UzbekistanOfficialRegistryAdapter,
};
export type { SourceAdapter, AdapterRunResult } from "./types";
