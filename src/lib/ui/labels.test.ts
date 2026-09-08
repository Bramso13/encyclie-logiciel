import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  quoteStatusLabel,
  roleLabel,
  versionActionLabel,
} from "./labels";

describe("libellés métier", () => {
  it("traduit les rôles techniques", () => {
    expect(roleLabel("ADMIN")).toBe("Administrateur");
    expect(roleLabel("BROKER")).toBe("Courtier");
    expect(roleLabel("UNDERWRITER")).toBe("Souscripteur");
  });

  it("traduit les statuts de devis sans jargon", () => {
    expect(quoteStatusLabel("OFFER_READY")).toBe("Offre prête");
    expect(quoteStatusLabel("INCOMPLETE")).toBe("À compléter");
    expect(quoteStatusLabel("UNKNOWN_STATUS")).toBe("UNKNOWN_STATUS");
  });

  it("traduit les actions d'historique", () => {
    expect(versionActionLabel("ADMIN_CORRECTION")).toBe(
      "Correction administrateur",
    );
  });

  it("fixe la pagination par défaut à 25", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(25);
  });
});
