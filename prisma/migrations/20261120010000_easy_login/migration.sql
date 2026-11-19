CREATE TABLE "EasyLoginIdentity" (
  "id" TEXT PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "subjectHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE ("provider", "subjectHash"),
  UNIQUE ("userId", "provider")
);

CREATE TABLE "EasyLoginFlow" (
  "id" TEXT PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "proofHash" TEXT NOT NULL,
  "configScope" TEXT NOT NULL,
  "linkSessionHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "subjectHash" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "EasyLoginFlow_expiresAt_idx" ON "EasyLoginFlow"("expiresAt");
