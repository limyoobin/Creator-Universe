CREATE TABLE "CreatorDonation" (
    "id" TEXT NOT NULL,
    "supporterId" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amountCoins" INTEGER NOT NULL,
    "message" TEXT,
    "platformFeeRate" DECIMAL(5,4) NOT NULL,
    "platformFeeAmount" DECIMAL(14,2) NOT NULL,
    "creatorAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorDonation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorSubscription" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "tierName" TEXT NOT NULL,
    "priceCoins" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "nextBillingAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FanPostUnlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorUserId" TEXT,
    "postId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "priceCoins" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FanPostUnlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorDonation_transactionId_key" ON "CreatorDonation"("transactionId");
CREATE INDEX "CreatorDonation_supporterId_createdAt_idx" ON "CreatorDonation"("supporterId", "createdAt");
CREATE INDEX "CreatorDonation_creatorUserId_createdAt_idx" ON "CreatorDonation"("creatorUserId", "createdAt");

CREATE UNIQUE INDEX "CreatorSubscription_transactionId_key" ON "CreatorSubscription"("transactionId");
CREATE INDEX "CreatorSubscription_subscriberId_status_idx" ON "CreatorSubscription"("subscriberId", "status");
CREATE INDEX "CreatorSubscription_creatorUserId_status_idx" ON "CreatorSubscription"("creatorUserId", "status");

CREATE UNIQUE INDEX "FanPostUnlock_transactionId_key" ON "FanPostUnlock"("transactionId");
CREATE UNIQUE INDEX "FanPostUnlock_userId_postId_key" ON "FanPostUnlock"("userId", "postId");
CREATE INDEX "FanPostUnlock_creatorUserId_unlockedAt_idx" ON "FanPostUnlock"("creatorUserId", "unlockedAt");

ALTER TABLE "CreatorDonation" ADD CONSTRAINT "CreatorDonation_supporterId_fkey" FOREIGN KEY ("supporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorDonation" ADD CONSTRAINT "CreatorDonation_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorDonation" ADD CONSTRAINT "CreatorDonation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorSubscription" ADD CONSTRAINT "CreatorSubscription_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorSubscription" ADD CONSTRAINT "CreatorSubscription_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorSubscription" ADD CONSTRAINT "CreatorSubscription_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FanPostUnlock" ADD CONSTRAINT "FanPostUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FanPostUnlock" ADD CONSTRAINT "FanPostUnlock_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
