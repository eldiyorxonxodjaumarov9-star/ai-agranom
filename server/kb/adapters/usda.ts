import { CatalogSourceAdapter } from "./catalog-adapter";

export class USDAAdapter extends CatalogSourceAdapter {
  readonly id = "usda-nifa";
  protected catalogFile = "usda.json";
}
