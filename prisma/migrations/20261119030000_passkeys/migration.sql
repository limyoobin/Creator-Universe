CREATE TABLE "PasskeyChallenge" (
  "id" TEXT PRIMARY KEY,
  "challenge" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "accountId" TEXT,
  "accountDigest" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "PasskeyChallenge_expiresAt_idx" ON "PasskeyChallenge"("expiresAt");

CREATE TABLE "PasskeyCredential" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "rpId" TEXT NOT NULL,
  "publicKey" TEXT NOT NULL,
  "counter" BIGINT NOT NULL
);
CREATE INDEX "PasskeyCredential_userId_idx" ON "PasskeyCredential"("userId");
