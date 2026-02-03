-- AlterTable Bordereau: v2 deux feuilles (polices + quittances)
ALTER TABLE "bordereaux" ADD COLUMN "csvDataPolices" JSONB;
ALTER TABLE "bordereaux" ADD COLUMN "csvDataQuittances" JSONB;
ALTER TABLE "bordereaux" ADD COLUMN "fileNamePolices" TEXT;
ALTER TABLE "bordereaux" ADD COLUMN "fileNameQuittances" TEXT;

-- Migrer données existantes
UPDATE "bordereaux" SET "csvDataPolices" = "csvData", "csvDataQuittances" = '[]', "fileNamePolices" = "fileName", "fileNameQuittances" = '' WHERE "csvData" IS NOT NULL;

-- Valeurs par défaut pour lignes sans csvData
UPDATE "bordereaux" SET "csvDataPolices" = '[]', "csvDataQuittances" = '[]', "fileNamePolices" = '', "fileNameQuittances" = '' WHERE "csvDataPolices" IS NULL;

ALTER TABLE "bordereaux" ALTER COLUMN "csvDataPolices" SET NOT NULL;
ALTER TABLE "bordereaux" ALTER COLUMN "csvDataQuittances" SET NOT NULL;
ALTER TABLE "bordereaux" ALTER COLUMN "fileNamePolices" SET NOT NULL;
ALTER TABLE "bordereaux" ALTER COLUMN "fileNameQuittances" SET NOT NULL;

ALTER TABLE "bordereaux" DROP COLUMN "csvData";
ALTER TABLE "bordereaux" DROP COLUMN "fileName";

-- AlterTable Quote: code NAF
ALTER TABLE "quotes" ADD COLUMN "codeNAF" TEXT;
