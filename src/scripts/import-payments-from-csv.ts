/**
 * Script d'import des paiements depuis un fichier CSV
 *
 * Usage:
 *   npx tsx src/scripts/import-payments-from-csv.ts <chemin_vers_csv>
 *   npx tsx src/scripts/import-payments-from-csv.ts "reglement - RCD.csv" --dry-run
 *
 * Le CSV doit contenir les colonnes:
 *   - Nom Client
 *   - bordereau
 *   - DATE DE REGLEMENT
 *   - prime reglee
 *   - NUMERO DE POLICE RCD
 *   - NUMERO SIRET
 *   - PERIODE REGLEE (avec dates au format "01/01/2026 AU 31/03/2026")
 *
 * Identification des échéances: par SIRET (dans companyData/formData) + période
 * Montant payé: colonne "prime reglee"
 * Validation: par le premier admin trouvé dans la base
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { importCSV } from "@/lib/payment-csv-import";

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Trouve l'admin pour la validation
 */
async function findAdminForValidation(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return admin?.id || null;
}

/**
 * Fonction principale
 */
async function main() {
  const csvPath = process.argv.find((arg) => arg.endsWith(".csv"));

  if (!csvPath) {
    console.error("Usage: npx tsx src/scripts/import-payments-from-csv.ts <chemin_vers_csv> [--dry-run]");
    console.error("Exemple: npx tsx src/scripts/import-payments-from-csv.ts \"reglement - RCD.csv\"");
    process.exit(1);
  }

  const absolutePath = path.resolve(csvPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Fichier non trouvé: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log("IMPORT DES PAIEMENTS DEPUIS CSV");
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN (simulation)" : "APPLY (modifications en base)"}`);
  console.log(`Fichier: ${absolutePath}`);
  console.log(`${"=".repeat(80)}\n`);

  // Lire le contenu du fichier
  const content = fs.readFileSync(absolutePath, "utf-8");

  // Trouver l'admin pour validation
  const adminId = await findAdminForValidation();
  if (!adminId) {
    console.error("ERREUR: Aucun admin trouvé dans la base pour la validation");
    process.exit(1);
  }
  console.log(`Admin pour validation: ${adminId}\n`);

  // Importer les paiements
  const { results, stats } = await importCSV(prisma, content, adminId, DRY_RUN);

  // Afficher les résultats
  console.log("\n--- Détails ---\n");
  for (const result of results) {
    const prefix = result.success
      ? result.created
        ? "[CRÉÉ] "
        : "[OK] "
      : result.message.includes("déjà payée")
      ? "[IGNORÉ] "
      : "[ERREUR] ";
    console.log(`${prefix}Ligne ${result.rowIndex + 1}: ${result.message}`);
  }

  // Résumé
  console.log(`\n${"=".repeat(80)}`);
  console.log("RÉSUMÉ");
  console.log(`${"=".repeat(80)}`);
  console.log(`Total lignes traitées: ${stats.total}`);
  console.log(`Importés (existant):   ${stats.imported}`);
  console.log(`Échéances créées:      ${stats.created}`);
  console.log(`Déjà payés (ignorés):  ${stats.skipped}`);
  console.log(`Erreurs:               ${stats.errors}`);

  if (!DRY_RUN) {
    console.log("\nModifications appliquées en base de données.");
  } else {
    console.log("\n[DRY-RUN] Aucune modification n'a été faite.");
    console.log("Pour appliquer les modifications, retirez l'option --dry-run");
  }

  console.log(`\n${"=".repeat(80)}`);
}

main()
  .catch((e) => {
    console.error("Erreur fatale:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
