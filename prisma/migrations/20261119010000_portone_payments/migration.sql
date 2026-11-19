CREATE TABLE "WalletTopUpOrder" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "productId" TEXT NOT NULL,
  "amountKrw" INTEGER NOT NULL CHECK ("amountKrw" > 0),
  "coins" INTEGER NOT NULL CHECK ("coins" > 0),
  "storeId" TEXT NOT NULL,
  "channelKey" TEXT NOT NULL,
  "live" BOOLEAN NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "cancelledKrw" INTEGER NOT NULL DEFAULT 0 CHECK ("cancelledKrw" BETWEEN 0 AND "amountKrw"),
  "creditedCoins" INTEGER NOT NULL DEFAULT 0 CHECK ("creditedCoins" BETWEEN 0 AND "coins"),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "WalletTopUpOrder_userId_createdAt_idx" ON "WalletTopUpOrder"("userId", "createdAt");
ALTER TABLE "Project" ADD COLUMN "storefrontSalesEnabled" BOOLEAN NOT NULL DEFAULT false;
