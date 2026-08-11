-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "soundName" TEXT NOT NULL DEFAULT 'ping',
    "soundVolume" INTEGER NOT NULL DEFAULT 70,
    "vibrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "soundInOpenChat" BOOLEAN NOT NULL DEFAULT false,
    "soundOnSend" BOOLEAN NOT NULL DEFAULT false,
    "quietEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietFrom" INTEGER NOT NULL DEFAULT 1320,
    "quietTo" INTEGER NOT NULL DEFAULT 420,
    "notifyMessages" BOOLEAN NOT NULL DEFAULT true,
    "notifyTasks" BOOLEAN NOT NULL DEFAULT true,
    "notifyChangeOrders" BOOLEAN NOT NULL DEFAULT true,
    "notifyPunch" BOOLEAN NOT NULL DEFAULT true,
    "notifyPhotos" BOOLEAN NOT NULL DEFAULT false,
    "textScale" INTEGER NOT NULL DEFAULT 100,
    "adsPersonalized" BOOLEAN NOT NULL DEFAULT false,
    "adsConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
