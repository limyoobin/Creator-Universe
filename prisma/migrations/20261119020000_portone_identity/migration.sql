CREATE TABLE "SignupIdentityChallenge" (
    "id" TEXT NOT NULL,
    "proofHash" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "channelKey" TEXT NOT NULL,
    "live" BOOLEAN NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    CONSTRAINT "SignupIdentityChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SignupIdentityChallenge_expiresAt_idx" ON "SignupIdentityChallenge"("expiresAt");
ALTER TABLE "User" ADD COLUMN "identityVerifiedAt" TIMESTAMP(3),
                   ADD COLUMN "identityVerificationLive" BOOLEAN;
