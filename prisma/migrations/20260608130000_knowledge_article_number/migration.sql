-- AlterTable
ALTER TABLE "knowledge_articles" ADD COLUMN "articleNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_articles_articleNumber_key" ON "knowledge_articles"("articleNumber");
