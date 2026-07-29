import { CatalogSourceAdapter } from "./catalog-adapter";

export class EPPOAdapter extends CatalogSourceAdapter {
  readonly id = "eppo";
  protected catalogFile = "eppo.json";
}
