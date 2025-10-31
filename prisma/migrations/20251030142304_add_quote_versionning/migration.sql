-- CreateEnum
CREATE TYPE "VersionAction" AS ENUM ('STATUS_CHANGE', 'DATA_UPDATE', 'PREMIUM_UPDATE', 'OFFER_UPDATE', 'ADMIN_CORRECTION', 'BROKER_MODIFICATION');

-- CreateTable
CREATE TABLE "quote_versions" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "companyData" JSONB NOT NULL,
    "formData" JSONB NOT NULL,
    "calculatedPremium" JSONB,
    "offerData" JSONB,
    "validUntil" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "offerReadyAt" TIMESTAMP(3),
    "offerSentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "changed_by_id" TEXT NOT NULL,
    "changeReason" TEXT,
    "action" "VersionAction" NOT NULL,
    "changes" JSONB,
    "userRole" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_versions_quote_id_idx" ON "quote_versions"("quote_id");

-- CreateIndex
CREATE INDEX "quote_versions_createdAt_idx" ON "quote_versions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "quote_versions_quote_id_version_key" ON "quote_versions"("quote_id", "version");
