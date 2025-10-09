-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('OFFER_LETTER', 'BROKER_INVITATION', 'PAYMENT_REMINDER', 'DOCUMENT_REQUEST', 'GENERAL');

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "cc" TEXT,
    "subject" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "htmlContent" TEXT,
    "textContent" TEXT,
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "attachmentNames" TEXT,
    "related_quote_id" TEXT,
    "related_user_id" TEXT,
    "messageId" TEXT,
    "errorMessage" TEXT,
    "sent_by_id" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);
