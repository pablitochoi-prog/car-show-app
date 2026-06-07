-- CreateTable
CREATE TABLE "knowledge_articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedWebsitePages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedArticleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whoThisIsFor" TEXT NOT NULL,
    "whatThisHelpsYouDo" TEXT NOT NULL,
    "beforeYouStart" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stepByStepInstructions" JSONB NOT NULL,
    "whatHappensNext" TEXT NOT NULL,
    "frequentlyAskedQuestions" JSONB NOT NULL,
    "articleBody" TEXT NOT NULL,
    "chatbotSummary" TEXT NOT NULL,
    "chatbotKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "lastReviewedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_articles_slug_key" ON "knowledge_articles"("slug");

-- CreateIndex
CREATE INDEX "knowledge_articles_category_sortOrder_idx" ON "knowledge_articles"("category", "sortOrder");

-- CreateIndex
CREATE INDEX "knowledge_articles_audience_idx" ON "knowledge_articles"("audience");

-- CreateIndex
CREATE INDEX "knowledge_articles_published_idx" ON "knowledge_articles"("published");

-- CreateIndex
CREATE INDEX "knowledge_articles_archivedAt_idx" ON "knowledge_articles"("archivedAt");

-- AddForeignKey
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
