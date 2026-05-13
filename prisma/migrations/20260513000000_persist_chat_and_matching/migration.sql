-- Persist creator direct messages and revenue-share matching proposals.
CREATE TYPE "MatchRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE TABLE "MatchRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "memberRole" "MemberRole" NOT NULL,
    "sharePercentage" DECIMAL(5,2) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "MatchRequestStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "matchRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchRequest_requesterId_createdAt_idx" ON "MatchRequest"("requesterId", "createdAt");
CREATE INDEX "MatchRequest_targetUserId_status_idx" ON "MatchRequest"("targetUserId", "status");
CREATE INDEX "MatchRequest_projectId_status_idx" ON "MatchRequest"("projectId", "status");

CREATE INDEX "ChatMessage_senderId_receiverUserId_createdAt_idx" ON "ChatMessage"("senderId", "receiverUserId", "createdAt");
CREATE INDEX "ChatMessage_receiverUserId_createdAt_idx" ON "ChatMessage"("receiverUserId", "createdAt");
CREATE INDEX "ChatMessage_matchRequestId_idx" ON "ChatMessage"("matchRequestId");

ALTER TABLE "MatchRequest" ADD CONSTRAINT "MatchRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchRequest" ADD CONSTRAINT "MatchRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchRequest" ADD CONSTRAINT "MatchRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_receiverUserId_fkey" FOREIGN KEY ("receiverUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_matchRequestId_fkey" FOREIGN KEY ("matchRequestId") REFERENCES "MatchRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
