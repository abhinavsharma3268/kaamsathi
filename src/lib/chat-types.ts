import { z } from "zod";
import type { ComplaintPortalResult } from "./complaint-router";

export const ChatIntentSchema = z.enum([
  "safety",
  "rights",
  "documents",
  "grievance",
  "complaint_portal",
  "earnings",
  "general",
]);

export type ChatIntent = z.infer<typeof ChatIntentSchema>;

export const ChatKindSchema = z.enum([
  "message",
  "follow_up",
  "safety",
  "rights",
  "documents",
  "grievance",
  "portal",
  "earnings",
  "error",
]);

export type ChatKind = z.infer<typeof ChatKindSchema>;

export type ChatEarningsResult = {
  gross: number;
  incentives: number;
  hours: number;
  fuel: number;
  maintenance: number;
  otherExpenses: number;
  net: number;
  perHour: number;
};

export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResult = {
  kind: ChatKind;
  intent: ChatIntent;
  text: string;
  simpleAnswer?: string;
  followUpQuestion?: string;
  nextSteps?: string[];
  disclaimer?: string;
  sources?: { title: string; url: string }[];
  isEmergency?: boolean;
  draft?: string;
  earnings?: ChatEarningsResult;
  portal?: Omit<ComplaintPortalResult, "meta"> & {
    meta?: ComplaintPortalResult["meta"];
  };
  deepLink?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  result?: ChatResult;
};

export type ChatConversation = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  status: "in_progress" | "draft_ready" | "waiting_user" | "completed";
  messages: ChatMessage[];
  savedDraft?: string;
  lastIntent?: ChatIntent;
};
