import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { warmModel } from "./ml/tfidf-lr";
import { DETECTION_LIMITS } from "./config";
import { classifyHybrid, type ClassifyResponse } from "@/services/spam-detection";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type { ClassifyResponse } from "@/services/spam-detection";

warmModel();

const { MAX_MESSAGE_LENGTH } = DETECTION_LIMITS;

const ClassifyInput = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(MAX_MESSAGE_LENGTH, `Max ${MAX_MESSAGE_LENGTH} characters`),
});

export const classifyMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClassifyInput.parse(input))
  .handler(async ({ data, context }): Promise<ClassifyResponse> => {
    const message = data.message;
    const final = await classifyHybrid(message);

    // Log to Cloud (best-effort). Use the user-scoped client so RLS applies.
    try {
      await context.supabase.from("detections").insert({
        user_id: context.userId,
        message: message.slice(0, MAX_MESSAGE_LENGTH),
        prediction: final.prediction,
        confidence: final.confidence,
        risk_level: final.risk_level,
        keywords: final.keywords,
        model: final.model,
      });
    } catch (err) {
      console.error("[classifyMessage] log failed", err);
    }

    return final;
  });

export interface HistoryRow {
  id: string;
  message: string;
  prediction: "Spam" | "Ham";
  confidence: number;
  risk_level: "Low" | "Medium" | "High";
  keywords: string[];
  model: string;
  created_at: string;
}

export interface HistoryResponse {
  rows: HistoryRow[];
  total: number;
  spamCount: number;
  hamCount: number;
}

const HistoryInput = z.object({
  search: z.string().optional().default(""),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export const getHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HistoryInput.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<HistoryResponse> => {
    const { supabase, userId } = context;
    let query = supabase
      .from("detections")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.search) {
      query = query.ilike("message", `%${data.search}%`);
    }
    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);

    const { count: spam } = await supabase
      .from("detections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("prediction", "Spam");
    const { count: ham } = await supabase
      .from("detections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("prediction", "Ham");

    return {
      rows: (rows ?? []).map((r) => ({
        id: r.id,
        message: r.message,
        prediction: r.prediction as "Spam" | "Ham",
        confidence: Number(r.confidence),
        risk_level: r.risk_level as "Low" | "Medium" | "High",
        keywords: Array.isArray(r.keywords) ? (r.keywords as string[]) : [],
        model: r.model,
        created_at: r.created_at,
      })),
      total: count ?? 0,
      spamCount: spam ?? 0,
      hamCount: ham ?? 0,
    };
  });