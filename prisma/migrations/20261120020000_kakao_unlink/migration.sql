ALTER TABLE "EasyLoginIdentity" ADD COLUMN "kakaoUserId" TEXT;
ALTER TABLE "EasyLoginFlow" ADD COLUMN "kakaoUserId" TEXT;
CREATE TABLE "KakaoUnlinkRequest" (
  "subjectHash" TEXT PRIMARY KEY,
  "kakaoUserId" TEXT NOT NULL,
  "retryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "KakaoUnlinkRequest_retryAt_idx" ON "KakaoUnlinkRequest"("retryAt");
