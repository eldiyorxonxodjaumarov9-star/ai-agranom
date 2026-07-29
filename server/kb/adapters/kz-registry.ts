import { CatalogSourceAdapter } from "./catalog-adapter";

/** Kazakhstan official plant protection product registry adapter (Phase 2 bootstrap). */
export class KazakhstanOfficialRegistryAdapter extends CatalogSourceAdapter {
  readonly id = "kz-ppp-registry";
  protected catalogFile = "kz-ppp.json";
}
