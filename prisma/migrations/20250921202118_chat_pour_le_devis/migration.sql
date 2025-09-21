-- CreateTable
CREATE TABLE "quote_messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_message_attachments" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_message_attachments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "quote_messages" ADD CONSTRAINT "quote_messages_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_messages" ADD CONSTRAINT "quote_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_messages" ADD CONSTRAINT "quote_messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_message_attachments" ADD CONSTRAINT "quote_message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "quote_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
