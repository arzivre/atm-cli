-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "debtor" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "creditor" TEXT NOT NULL,
    CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Creditor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "debtor" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "creditor" TEXT NOT NULL,
    CONSTRAINT "Creditor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Debt_creditor_key" ON "Debt"("creditor");

-- CreateIndex
CREATE UNIQUE INDEX "Creditor_creditor_key" ON "Creditor"("creditor");
