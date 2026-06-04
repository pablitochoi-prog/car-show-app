-- AlterTable
ALTER TABLE "judge_ballot_categories" ADD COLUMN "eventAwardId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "judge_ballot_categories_eventAwardId_key" ON "judge_ballot_categories"("eventAwardId");

-- AddForeignKey
ALTER TABLE "judge_ballot_categories" ADD CONSTRAINT "judge_ballot_categories_eventAwardId_fkey" FOREIGN KEY ("eventAwardId") REFERENCES "event_awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
