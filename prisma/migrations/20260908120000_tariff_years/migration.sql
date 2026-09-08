-- Table neuve uniquement. Aucune modification des échéanciers / devis existants.

CREATE TABLE IF NOT EXISTS "tariff_years" (
    "year" INTEGER NOT NULL,
    "activity_rates" JSONB NOT NULL,
    "territory_taxes" JSONB NOT NULL,
    "territory_pj_taxes" JSONB NOT NULL,
    "degressivity" JSONB NOT NULL,
    "created_from_year" INTEGER,
    "increase_percent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tariff_years_pkey" PRIMARY KEY ("year")
);
