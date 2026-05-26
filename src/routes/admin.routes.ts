import { UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { getCurrentUserId } from "../utils/request-context.js";

export const adminRouter = Router();

const statusSchema = z.object({
  status: z.string().trim().min(2).max(32),
});

async function requireAdminUserId(req: Parameters<typeof getCurrentUserId>[0]) {
  const userId = await getCurrentUserId(req);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role !== UserRole.ADMIN) {
    throw new AppError("Admin permission is required.", 403);
  }

  return userId;
}

adminRouter.get(
  "/moderation",
  asyncHandler(async (req, res) => {
    await requireAdminUserId(req);

    const [userCount, creatorCount, openTicketCount, openReportCount, recentTickets, recentReports, recentTransactions, recentMatchRequests] =
      await Promise.all([
        prisma.user.count(),
        prisma.creatorProfile.count(),
        prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
        prisma.userReport.count({ where: { status: { in: ["RECEIVED", "IN_REVIEW"] } } }),
        prisma.supportTicket.findMany({
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, username: true, displayName: true, role: true } },
          },
        }),
        prisma.userReport.findMany({
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            reporter: { select: { id: true, username: true, displayName: true, role: true } },
            targetUser: { select: { id: true, username: true, displayName: true, role: true } },
          },
        }),
        prisma.transaction.findMany({
          take: 12,
          orderBy: { createdAt: "desc" },
          include: {
            buyer: { select: { id: true, username: true, displayName: true, role: true } },
            project: { select: { id: true, title: true, slug: true } },
          },
        }),
        prisma.matchRequest.findMany({
          take: 12,
          orderBy: { createdAt: "desc" },
          include: {
            requester: { select: { id: true, username: true, displayName: true } },
            targetUser: { select: { id: true, username: true, displayName: true } },
          },
        }),
      ]);

    res.json({
      success: true,
      data: {
        summary: {
          users: userCount,
          creators: creatorCount,
          openTickets: openTicketCount,
          openReports: openReportCount,
        },
        playReviewChecklist: [
          { title: "개인정보처리방침 URL", status: "READY", detail: "/privacy-policy.html" },
          { title: "계정 삭제 안내 URL", status: "READY", detail: "/account-deletion.html" },
          { title: "사용자 신고/문의 접수", status: "READY", detail: "DB 저장형 티켓/신고 운영" },
          { title: "콘텐츠 등급 기준", status: "READY", detail: "만 12세 이상 기준 운영" },
          { title: "운영자 모니터링", status: "READY", detail: "문의, 신고, 거래, 매칭 기록 확인" },
        ],
        tickets: recentTickets,
        reports: recentReports,
        transactions: recentTransactions,
        matchRequests: recentMatchRequests,
      },
    });
  }),
);

adminRouter.patch(
  "/support/tickets/:ticketId/status",
  asyncHandler(async (req, res) => {
    await requireAdminUserId(req);
    const payload = statusSchema.parse(req.body);
    const ticket = await prisma.supportTicket.update({
      where: { id: String(req.params.ticketId) },
      data: { status: payload.status },
    });

    res.json({ success: true, data: ticket });
  }),
);

adminRouter.patch(
  "/reports/:reportId/status",
  asyncHandler(async (req, res) => {
    await requireAdminUserId(req);
    const payload = statusSchema.parse(req.body);
    const report = await prisma.userReport.update({
      where: { id: String(req.params.reportId) },
      data: { status: payload.status },
    });

    res.json({ success: true, data: report });
  }),
);
