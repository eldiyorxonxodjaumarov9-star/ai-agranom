import { CatalogSourceAdapter } from "./catalog-adapter";

export class FAOAdapter extends CatalogSourceAdapter {
  readonly id = "fao";
  protected catalogFile = "fao.json";
}
