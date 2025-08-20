-- AlterTable
ALTER TABLE "quote_documents" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validated_by_id" TEXT,
ADD COLUMN     "validationNotes" TEXT;

-- AddForeignKey
ALTER TABLE "quote_documents" ADD CONSTRAINT "quote_documents_validated_by_id_fkey" FOREIGN KEY ("validated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
