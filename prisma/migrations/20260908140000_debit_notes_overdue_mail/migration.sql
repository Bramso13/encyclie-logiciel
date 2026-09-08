-- Tables neuves uniquement. Aucune modification des échéanciers / devis existants.

CREATE TABLE IF NOT EXISTS "debit_notes" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "contract_number" TEXT,
    "director_name" TEXT,
    "client_name" TEXT,
    "client_address" TEXT,
    "client_city" TEXT,
    "intermediary" TEXT,
    "broker_code" TEXT,
    "company_name" TEXT,
    "annual_amount" DOUBLE PRECISION NOT NULL,
    "total_commission" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debit_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "debit_notes_quote_id_idx" ON "debit_notes"("quote_id");

CREATE TABLE IF NOT EXISTS "debit_note_lines" (
    "id" TEXT NOT NULL,
    "debit_note_id" TEXT NOT NULL,
    "installment_id" TEXT NOT NULL,
    "period_date" TIMESTAMP(3) NOT NULL,
    "amount_ttc" DOUBLE PRECISION NOT NULL,
    "prime_rcd_ht" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL,
    "net_hors_com" DOUBLE PRECISION NOT NULL,
    "payment_date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debit_note_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "debit_note_lines_installment_id_key" ON "debit_note_lines"("installment_id");
CREATE INDEX IF NOT EXISTS "debit_note_lines_debit_note_id_idx" ON "debit_note_lines"("debit_note_id");

CREATE TABLE IF NOT EXISTS "overdue_threshold_mails" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overdue_count" INTEGER NOT NULL,

    CONSTRAINT "overdue_threshold_mails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "overdue_threshold_mails_quote_id_key" ON "overdue_threshold_mails"("quote_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'debit_notes_quote_id_fkey'
  ) THEN
    ALTER TABLE "debit_notes"
      ADD CONSTRAINT "debit_notes_quote_id_fkey"
      FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'debit_note_lines_debit_note_id_fkey'
  ) THEN
    ALTER TABLE "debit_note_lines"
      ADD CONSTRAINT "debit_note_lines_debit_note_id_fkey"
      FOREIGN KEY ("debit_note_id") REFERENCES "debit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'debit_note_lines_installment_id_fkey'
  ) THEN
    ALTER TABLE "debit_note_lines"
      ADD CONSTRAINT "debit_note_lines_installment_id_fkey"
      FOREIGN KEY ("installment_id") REFERENCES "payment_installments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
