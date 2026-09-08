-- Additif uniquement : aucune ligne de payment_schedules n'est supprimée ni réécrite.
-- vintage_year = 2026 par défaut pour tous les échéanciers existants (1:1 aujourd'hui).

ALTER TABLE "payment_schedules" ADD COLUMN IF NOT EXISTS "vintage_year" INTEGER NOT NULL DEFAULT 2026;

-- Levée de l'unicité quote_id (contrainte, pas les lignes) pour autoriser un 2e échéancier 2027.
DROP INDEX IF EXISTS "payment_schedules_quote_id_key";

-- Index de lecture uniquement — PAS de UNIQUE sur (quote_id, vintage_year).
CREATE INDEX IF NOT EXISTS "payment_schedules_quote_id_idx" ON "payment_schedules"("quote_id");
CREATE INDEX IF NOT EXISTS "payment_schedules_quote_id_vintage_year_idx" ON "payment_schedules"("quote_id", "vintage_year");

-- Table neuve, vide : aucun impact sur les devis / échéanciers existants.
CREATE TABLE IF NOT EXISTS "quote_vintages" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "chiffre_affaires" TEXT NOT NULL,
    "activities" JSONB NOT NULL,
    "calculated_premium" JSONB,
    "created_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_vintages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "quote_vintages_quote_id_year_key" ON "quote_vintages"("quote_id", "year");
CREATE INDEX IF NOT EXISTS "quote_vintages_quote_id_idx" ON "quote_vintages"("quote_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quote_vintages_quote_id_fkey'
  ) THEN
    ALTER TABLE "quote_vintages"
      ADD CONSTRAINT "quote_vintages_quote_id_fkey"
      FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
