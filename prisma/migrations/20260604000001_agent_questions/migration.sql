-- AlterEnum
ALTER TYPE "ItemStatus" ADD VALUE 'AWAITING_INPUT';

-- AlterTable
ALTER TABLE "AgentRun" ADD COLUMN "pendingQuestions" TEXT;
