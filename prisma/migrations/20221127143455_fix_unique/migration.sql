/*
  Warnings:

  - A unique constraint covering the columns `[debtor]` on the table `Creditor` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Creditor_creditor_key";

-- CreateIndex
CREATE UNIQUE INDEX "Creditor_debtor_key" ON "Creditor"("debtor");
