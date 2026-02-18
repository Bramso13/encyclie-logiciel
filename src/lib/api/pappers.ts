export interface PappersCompanyData {
  companyName: string;
  siret: string;
  address: string;
  legalForm: string;
  creationDate: string; // ISO yyyy-mm-dd attendu si dispo
  directorName: string;
  city?: string;
  postalCode?: string;
  codeNaf?: string;
  raw?: any;
}

export async function fetchCompanyBySiret(
  siret: string,
): Promise<PappersCompanyData> {
  const clean = (siret || "").replace(/\D/g, "");
  const resp = await fetch(`/api/pappers?siret=${encodeURIComponent(clean)}`);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || `Erreur Pappers (${resp.status})`);
  }
  return resp.json();
}
