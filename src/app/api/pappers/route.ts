import { NextRequest } from "next/server";

const PAPPERS_BASE_URL = "https://api.pappers.fr/v2/entreprise";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siret = (searchParams.get("siret") || "").replace(/\D/g, "");
    if (!siret || siret.length !== 14) {
      return new Response(
        JSON.stringify({ error: "Paramètre siret invalide (14 chiffres)." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const apiKey = process.env.PAPPERS_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Clé API PAPPERS_API_KEY manquante." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const url = `${PAPPERS_BASE_URL}?api_token=${encodeURIComponent(
      apiKey,
    )}&siret=${encodeURIComponent(siret)}`;

    const resp = await fetch(url, { next: { revalidate: 0 } });
    const data = await resp.json();

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: data?.message || "Erreur Pappers" }),
        {
          status: resp.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Normalisation minimale côté serveur pour le front
    const companyName = data?.nom_entreprise || data?.denomination || "";
    const directorName = data?.representants?.[0]?.nom_complet || "";
    const siege = data?.siege || {};
    const addressParts = [
      siege?.adresse_ligne_1,
      siege?.adresse_ligne_2,
      siege?.code_postal,
      siege?.ville,
      siege?.pays,
    ].filter(Boolean);
    const address = addressParts.join(", ");
    const legalForm =
      data?.forme_juridique || data?.libelle_forme_juridique || "";
    const creationDate =
      data?.date_creation || data?.date_creation_formate || "";
    const city = siege?.ville || "";
    const postalCode = siege?.code_postal || "";
    const codeNaf = data?.code_naf || "";

    return new Response(
      JSON.stringify({
        companyName,
        siret,
        address,
        legalForm,
        creationDate,
        directorName,
        city,
        postalCode,
        codeNaf,
        raw: data,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Erreur serveur" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
