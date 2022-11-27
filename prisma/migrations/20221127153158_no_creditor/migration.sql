/*
  Warnings:

  - You are about to drop the `Creditor` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Creditor";
PRAGMA foreign_keys=on;
