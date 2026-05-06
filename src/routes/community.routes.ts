import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.js";
import { getCurrentUserId } from "../utils/request-context.js";

const communityRouter = Router();

const donations: unknown[] = [];
const subscriptions: unknown[] = [];
const unlocks: unknown[] = [];
const reviews: unknown[] = [];
const tickets: unknown[] = [];
const reports: unknown[] = [];
const chatMessages: unknown[] = [];
const matchRequests: unknown[] = [];

const donationSchema = z.object({
  amount: z.number().int().min(100).max(100000),
  message: z.string().optional(),
});

const subscriptionSchema = z.object({
  tierName: z.string().min(1),
  priceCoins: z.number().int().positive(),
});

const unlockSchema = z.object({
  priceCoins: z.number().int().min(0),
});

const reviewSchema = z.object({
  workId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(2),
});

const ticketSchema = z.object({
  category: z.string().min(1),
  body: z.string().min(3),
});

const reportSchema = z.object({
  targetUserId: z.string().optional(),
  reason: z.string().min(3),
  context: z.string().optional(),
});

const chatMessageSchema = z.object({
  receiverUserId: z.string().min(1),
  body: z.string().min(2),
});

const matchRequestSchema = z.object({
  targetUserId: z.string().min(1),
  projectType: z.string().optional(),
  message: z.string().optional(),
});

communityRouter.post(
  "/creators/:creatorUserId/donations",
  asyncHandler(async (req, res) => {
    const supporterId = await getCurrentUserId(req);
    const payload = donationSchema.parse(req.body);
    const donation = {
      id: `donation-${Date.now()}`,
      supporterId,
      creatorUserId: String(req.params.creatorUserId),
      ...payload,
      createdAt: new Date().toISOString(),
    };
    donations.push(donation);
    res.status(201).json({ success: true, data: donation });
  }),
);

communityRouter.post(
  "/creators/:creatorUserId/subscriptions",
  asyncHandler(async (req, res) => {
    const subscriberId = await getCurrentUserId(req);
    const payload = subscriptionSchema.parse(req.body);
    const subscription = {
      id: `sub-${Date.now()}`,
      subscriberId,
      creatorUserId: String(req.params.creatorUserId),
      status: "ACTIVE",
      ...payload,
      startedAt: new Date().toISOString(),
    };
    subscriptions.push(subscription);
    res.status(201).json({ success: true, data: subscription });
  }),
);

communityRouter.post(
  "/fan-posts/:postId/unlock",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const payload = unlockSchema.parse(req.body);
    const unlock = {
      id: `unlock-${Date.now()}`,
      userId,
      postId: String(req.params.postId),
      ...payload,
      unlockedAt: new Date().toISOString(),
    };
    unlocks.push(unlock);
    res.status(201).json({ success: true, data: unlock });
  }),
);

communityRouter.get(
  "/content/reviews",
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: reviews });
  }),
);

communityRouter.post(
  "/content/reviews",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const payload = reviewSchema.parse(req.body);
    const review = {
      id: `review-${Date.now()}`,
      userId,
      authorName: "로그인 사용자",
      ...payload,
      createdAt: new Date().toISOString(),
    };
    reviews.unshift(review);
    res.status(201).json({ success: true, data: review });
  }),
);

communityRouter.post(
  "/support/tickets",
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId(req);
    const payload = ticketSchema.parse(req.body);
    const ticket = {
      id: `ticket-${Date.now()}`,
      userId,
      status: "OPEN",
      ...payload,
      createdAt: new Date().toISOString(),
    };
    tickets.push(ticket);
    res.status(201).json({ success: true, data: ticket });
  }),
);

communityRouter.post(
  "/reports",
  asyncHandler(async (req, res) => {
    const reporterId = await getCurrentUserId(req);
    const payload = reportSchema.parse(req.body);
    const report = {
      id: `report-${Date.now()}`,
      reporterId,
      status: "RECEIVED",
      ...payload,
      createdAt: new Date().toISOString(),
    };
    reports.push(report);
    res.status(201).json({ success: true, data: report });
  }),
);

communityRouter.post(
  "/chats/messages",
  asyncHandler(async (req, res) => {
    const senderId = await getCurrentUserId(req);
    const payload = chatMessageSchema.parse(req.body);
    const message = {
      id: `chat-${Date.now()}`,
      senderId,
      ...payload,
      createdAt: new Date().toISOString(),
    };
    chatMessages.push(message);
    res.status(201).json({ success: true, data: message });
  }),
);

communityRouter.post(
  "/matching/requests",
  asyncHandler(async (req, res) => {
    const requesterId = await getCurrentUserId(req);
    const payload = matchRequestSchema.parse(req.body);
    const matchRequest = {
      id: `match-${Date.now()}`,
      requesterId,
      status: "PENDING",
      ...payload,
      createdAt: new Date().toISOString(),
    };
    matchRequests.push(matchRequest);
    res.status(201).json({ success: true, data: matchRequest });
  }),
);

export { communityRouter };
