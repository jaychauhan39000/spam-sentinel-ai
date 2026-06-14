// Spam-detection service layer.
//
// Contains all classification logic: local ML inference, AI escalation,
// and risk scoring. Server functions in `src/lib/detection.functions.ts`
// are thin wrappers that validate input, call into this service, and
// persist the result. UI components must NOT import from this file
// directly — they call the server function instead.

import {
  AI_GATEWAY,
  ML_CONFIG,
  SPAM_CLASSIFIER_SYSTEM_PROMPT,
  SPAM_CLASSIFIER_USER_PROMPT,
} from "@/lib/config";
import { classifyWithTfidfLr } from "@/lib/ml/tfidf-lr";

export type SpamPrediction = "Spam" | "Ham";
export type RiskLevel = "Low" | "Medium" | "High";
export type ClassifierModel = "tfidf-lr" | "tfidf-lr+ai";

export interface ClassifyResponse {
  prediction: SpamPrediction;
  /** 0-100, one decimal place */
  confidence: number;
  risk_level: RiskLevel;
  keywords: string[];
  model: ClassifierModel;
  reasoning?: string;
}

/** Strict shape returned by the AI classifier. */
export interface AiClassification {
  prediction: SpamPrediction;
  confidence: number;
  keywords: string[];
  reasoning: string;
}

export function riskLevel(prediction: SpamPrediction, confidence: number): RiskLevel {
  if (prediction === "Ham") return "Low";
  if (confidence >= ML_CONFIG.HIGH_RISK_CONFIDENCE) return "High";
  if (confidence >= ML_CONFIG.MEDIUM_RISK_CONFIDENCE) return "Medium";
  return "Low";
}

interface RawAiResponse {
  prediction?: unknown;
  confidence?: unknown;
  keywords?: unknown;
  reasoning?: unknown;
}

function parseAiResponse(raw: string): AiClassification | null {
  let parsed: RawAiResponse;
  try {
    parsed = JSON.parse(raw) as RawAiResponse;
  } catch {
    return null;
  }
  const prediction: SpamPrediction = parsed.prediction === "Spam" ? "Spam" : "Ham";
  const confidenceNum = Number(parsed.confidence);
  const confidence = Math.max(0, Math.min(100, Number.isFinite(confidenceNum) ? confidenceNum : 70));
  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.slice(0, 8).map((k) => String(k))
    : [];
  return {
    prediction,
    confidence,
    keywords,
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
  };
}

export async function aiClassify(message: string): Promise<AiClassification | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${AI_GATEWAY.BASE_URL}${AI_GATEWAY.CHAT_COMPLETIONS_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: AI_GATEWAY.DEFAULT_MODEL,
        messages: [
          { role: "system", content: SPAM_CLASSIFIER_SYSTEM_PROMPT },
          { role: "user", content: SPAM_CLASSIFIER_USER_PROMPT(message) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    return parseAiResponse(raw);
  } catch (err) {
    console.error("[aiClassify] failed", err);
    return null;
  }
}

/**
 * Classify a message with the hybrid pipeline: run the local TF-IDF + LR
 * model first, then escalate to the AI model when the local model is
 * uncertain (probability close to 0.5).
 */
export async function classifyHybrid(message: string): Promise<ClassifyResponse> {
  const local = classifyWithTfidfLr(message);
  const localConfidencePct =
    Math.round((local.probability >= 0.5 ? local.probability : 1 - local.probability) * 1000) / 10;
  const localMargin = Math.abs(local.probability - 0.5);

  if (localMargin < ML_CONFIG.AI_ESCALATION_MARGIN) {
    const ai = await aiClassify(message);
    if (ai) {
      const confidence = Math.round(ai.confidence * 10) / 10;
      return {
        prediction: ai.prediction,
        confidence,
        risk_level: riskLevel(ai.prediction, confidence),
        keywords: ai.keywords.length ? ai.keywords : local.keywords,
        model: "tfidf-lr+ai",
        reasoning: ai.reasoning,
      };
    }
  }

  return {
    prediction: local.label,
    confidence: localConfidencePct,
    risk_level: riskLevel(local.label, localConfidencePct),
    keywords: local.keywords,
    model: "tfidf-lr",
  };
}