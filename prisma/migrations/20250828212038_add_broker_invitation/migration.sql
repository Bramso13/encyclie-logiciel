-- CreateTable
CREATE TABLE "broker_invitations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "siretNumber" TEXT,
    "brokerCode" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "broker_invitations_email_key" ON "broker_invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "broker_invitations_brokerCode_key" ON "broker_invitations"("brokerCode");

-- CreateIndex
CREATE UNIQUE INDEX "broker_invitations_token_key" ON "broker_invitations"("token");
