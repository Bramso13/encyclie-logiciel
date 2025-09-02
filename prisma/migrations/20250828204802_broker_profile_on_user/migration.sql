-- CreateTable
CREATE TABLE "broker_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "broker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "broker_profiles_user_id_key" ON "broker_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "broker_profiles" ADD CONSTRAINT "broker_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
