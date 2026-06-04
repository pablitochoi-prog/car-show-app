-- CreateTable
CREATE TABLE "vehicle_manual_awards" (
    "id" TEXT NOT NULL,
    "awardName" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "organizationName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "vehicle_manual_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_manual_awards_vehicleId_eventDate_idx" ON "vehicle_manual_awards"("vehicleId", "eventDate");

-- CreateIndex
CREATE INDEX "vehicle_manual_awards_userId_idx" ON "vehicle_manual_awards"("userId");

-- AddForeignKey
ALTER TABLE "vehicle_manual_awards" ADD CONSTRAINT "vehicle_manual_awards_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_manual_awards" ADD CONSTRAINT "vehicle_manual_awards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
