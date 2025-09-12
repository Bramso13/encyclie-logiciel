/*
  Warnings:

  - The `calculatedPremium` column on the `quotes` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "quotes" DROP COLUMN "calculatedPremium",
ADD COLUMN     "calculatedPremium" JSONB;
