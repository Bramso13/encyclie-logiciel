/*
  Warnings:

  - Changed the type of `documentType` on the `quote_documents` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "quote_documents" DROP COLUMN "documentType",
ADD COLUMN     "documentType" TEXT NOT NULL;
