-- CreateTable
CREATE TABLE "ShortcutToken" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "groupId" INTEGER,
    "friendId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ShortcutToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortcutExpense" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "expenseId" UUID NOT NULL,
    "rawMerchant" TEXT NOT NULL,
    "suggestedCategory" TEXT NOT NULL,
    "categoryOverridden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortcutExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShortcutToken_tokenHash_key" ON "ShortcutToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ShortcutToken_userId_idx" ON "ShortcutToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortcutExpense_expenseId_key" ON "ShortcutExpense"("expenseId");

-- CreateIndex
CREATE INDEX "ShortcutExpense_userId_createdAt_idx" ON "ShortcutExpense"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShortcutExpense_userId_idempotencyKey_key" ON "ShortcutExpense"("userId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "ShortcutToken" ADD CONSTRAINT "ShortcutToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortcutToken" ADD CONSTRAINT "ShortcutToken_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortcutExpense" ADD CONSTRAINT "ShortcutExpense_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "ShortcutToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortcutExpense" ADD CONSTRAINT "ShortcutExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortcutExpense" ADD CONSTRAINT "ShortcutExpense_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
