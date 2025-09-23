-- CreateTable
CREATE TABLE "document_requests" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "requested_by_id" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFulfilled" BOOLEAN NOT NULL DEFAULT false,
    "fulfilledAt" TIMESTAMP(3),
    "fulfilled_by_document_id" TEXT,
    "adminNotes" TEXT,
    "brokerNotes" TEXT,

    CONSTRAINT "document_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_fulfilled_by_document_id_fkey" FOREIGN KEY ("fulfilled_by_document_id") REFERENCES "quote_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
