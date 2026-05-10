-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_categories" (
    "id" TEXT NOT NULL,
    "trophyCount" INTEGER NOT NULL DEFAULT 1,
    "customName" TEXT,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_awards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "special_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_awards" (
    "id" TEXT NOT NULL,
    "customName" TEXT,
    "eventId" TEXT NOT NULL,
    "specialAwardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "event_categories_eventId_idx" ON "event_categories"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_categories_eventId_categoryId_key" ON "event_categories"("eventId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "special_awards_name_key" ON "special_awards"("name");

-- CreateIndex
CREATE INDEX "event_awards_eventId_idx" ON "event_awards"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_awards_eventId_specialAwardId_key" ON "event_awards"("eventId", "specialAwardId");

-- AddForeignKey
ALTER TABLE "event_categories" ADD CONSTRAINT "event_categories_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_categories" ADD CONSTRAINT "event_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_awards" ADD CONSTRAINT "event_awards_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_awards" ADD CONSTRAINT "event_awards_specialAwardId_fkey" FOREIGN KEY ("specialAwardId") REFERENCES "special_awards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
