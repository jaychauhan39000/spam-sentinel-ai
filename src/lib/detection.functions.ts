import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { classifyWithTfidfLr, warmModel } from "./ml/tfidf-lr";

warmModel();

const MAX_LEN = 5000;

const ClassifyInput = z.object({
  message: z.string().trim().min(1, "Message cannot be empty").max(MAX_LEN, `Max ${MAX_LEN} characters`),
});

export interface ClassifyResponse {
  prediction: "Spam" | "Ham";
  confidence: number; // 0-100
  risk_level: "Low" | "Medium" | "High";
  keywords: string[];
  model: "tfidf-lr" | "tfidf-lr+ai";
  reasoning?: string;
}

function riskLevel(prediction: "Spam" | "Ham", confidence: number): "Low" | "Medium" | "High" {
  if (prediction === "Ham") return "Low";
  if (confidence >= 85) return "High";
  if (confidence >= 65) return "Medium";
  return "Low";
}

async function aiClassify(message: string): Promise<{
  prediction: "Spam" | "Ham";
  confidence: number;
  keywords: string[];
  reasoning: string;
} | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a spam/phishing classifier for email and SMS. Respond with ONLY valid JSON matching the schema. Be strict: marketing scams, prize-claim fraud, phishing links, fake delivery notices, account-verification scams are Spam. Personal/work messages are Ham.",
          },
          {
            role: "user",
            content: `Classify this message and return JSON:\n\nMessage: """${message}"""\n\nSchema: {"prediction":"Spam"|"Ham","confidence":0-100,"keywords":string[],"reasoning":short string}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const pred = parsed.prediction === "Spam" ? "Spam" : "Ham";
    const conf = Math.max(0, Math.min(100, Number(parsed.confidence) || 70));
    const kws = Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 8).map(String) : [];
    return {
      prediction: pred,
      confidence: conf,
      keywords: kws,
      reasoning: String(parsed.reasoning ?? ""),
    };
  } catch (err) {
    console.error("[aiClassify] failed", err);
    return null;
  }
}

export const classifyMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ClassifyInput.parse(input))
  .handler(async ({ data }): Promise<ClassifyResponse> => {
    const message = data.message;

    // 1) Run local TF-IDF + Logistic Regression
    const local = classifyWithTfidfLr(message);
    const localProb = local.probability;
    const localConfidencePct = Math.round((localProb >= 0.5 ? localProb : 1 - localProb) * 1000) / 10;
    const localMargin = Math.abs(localProb - 0.5);

    let final: ClassifyResponse;

    // 2) Escalate to Lovable AI when local model is uncertain (margin from 0.5 small)
    const AI_ESCALATION_MARGIN = 0.2; // confidence below ~70%
    if (localMargin < AI_ESCALATION_MARGIN) {
      const ai = await aiClassify(message);
      if (ai) {
        const prediction = ai.prediction;
        const confidence = Math.round(ai.confidence * 10) / 10;
        final = {
          prediction,
          confidence,
          risk_level: riskLevel(prediction, confidence),
          keywords: ai.keywords.length ? ai.keywords : local.keywords,
          model: "tfidf-lr+ai",
          reasoning: ai.reasoning,
        };
      } else {
        final = {
          prediction: local.label,
          confidence: localConfidencePct,
          risk_level: riskLevel(local.label, localConfidencePct),
          keywords: local.keywords,
          model: "tfidf-lr",
        };
      }
    } else {
      final = {
        prediction: local.label,
        confidence: localConfidencePct,
        risk_level: riskLevel(local.label, localConfidencePct),
        keywords: local.keywords,
        model: "tfidf-lr",
      };
    }

    // 3) Log to Cloud (best-effort)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("detections").insert({
        message: message.slice(0, MAX_LEN),
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
  .inputValidator((input: unknown) => HistoryInput.parse(input ?? {}))
  .handler(async ({ data }): Promise<HistoryResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("detections")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.search) {
      query = query.ilike("message", `%${data.search}%`);
    }
    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);

    const { count: spam } = await supabaseAdmin
      .from("detections")
      .select("id", { count: "exact", head: true })
      .eq("prediction", "Spam");
    const { count: ham } = await supabaseAdmin
      .from("detections")
      .select("id", { count: "exact", head: true })
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