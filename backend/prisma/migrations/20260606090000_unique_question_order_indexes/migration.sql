-- DropIndex
DROP INDEX "Question_quizId_orderIndex_idx";

-- DropIndex
DROP INDEX "AnswerOption_questionId_orderIndex_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Question_quizId_orderIndex_key" ON "Question"("quizId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerOption_questionId_orderIndex_key" ON "AnswerOption"("questionId", "orderIndex");
