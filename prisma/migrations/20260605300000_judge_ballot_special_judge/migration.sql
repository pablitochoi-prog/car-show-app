-- CreateEnum
CREATE TYPE "JudgeBallotVoteStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- AlterTable
ALTER TABLE "judge_ballot_categories" ADD COLUMN "requiresSpecialJudge" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "judge_ballot_votes" ADD COLUMN "starRating" INTEGER,
ADD COLUMN "status" "JudgeBallotVoteStatus" NOT NULL DEFAULT 'SUBMITTED';

-- CreateTable
CREATE TABLE "judge_ballot_special_judges" (
    "categoryId" TEXT NOT NULL,
    "judgeUserId" TEXT NOT NULL,

    CONSTRAINT "judge_ballot_special_judges_pkey" PRIMARY KEY ("categoryId","judgeUserId")
);

-- AddForeignKey
ALTER TABLE "judge_ballot_special_judges" ADD CONSTRAINT "judge_ballot_special_judges_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "judge_ballot_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judge_ballot_special_judges" ADD CONSTRAINT "judge_ballot_special_judges_judgeUserId_fkey" FOREIGN KEY ("judgeUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
