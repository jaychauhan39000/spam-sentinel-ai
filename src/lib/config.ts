// Shared application constants. Keep magic numbers, model identifiers, and
// prompt strings here so UI components and server logic stay declarative.

export const DETECTION_LIMITS = {
  /** Maximum number of characters accepted in a single classification request. */
  MAX_MESSAGE_LENGTH: 5000,
} as const;

export const ML_CONFIG = {
  /**
   * If the local TF-IDF + Logistic Regression model's probability is within
   * this margin of 0.5, we escalate to the AI model for a second opinion.
   */
  AI_ESCALATION_MARGIN: 0.2,
  /** Confidence (0-100) at or above which Spam is treated as High risk. */
  HIGH_RISK_CONFIDENCE: 85,
  /** Confidence (0-100) at or above which Spam is treated as Medium risk. */
  MEDIUM_RISK_CONFIDENCE: 65,
} as const;

export const AI_GATEWAY = {
  BASE_URL: "https://ai.gateway.lovable.dev/v1",
  CHAT_COMPLETIONS_PATH: "/chat/completions",
  DEFAULT_MODEL: "google/gemini-3-flash-preview",
} as const;

export const SPAM_CLASSIFIER_SYSTEM_PROMPT =
  "You are a spam/phishing classifier for email and SMS. Respond with ONLY valid JSON matching the schema. Be strict: marketing scams, prize-claim fraud, phishing links, fake delivery notices, account-verification scams are Spam. Personal/work messages are Ham.";

export const SPAM_CLASSIFIER_USER_PROMPT = (message: string): string =>
  `Classify this message and return JSON:\n\nMessage: """${message}"""\n\nSchema: {"prediction":"Spam"|"Ham","confidence":0-100,"keywords":string[],"reasoning":short string}`;

export const EXAMPLE_MESSAGES: readonly string[] = [
  "Congratulations! You've won a $1000 Amazon gift card. Click here to claim: http://amzn-rewards.co",
  "Hey, are we still on for dinner tomorrow at 7? Let me know.",
  "URGENT: Your account has been compromised. Verify your identity at https://secure-verify.support immediately.",
  "Final reminder: dentist appointment Monday 10am. Reply C to confirm.",
] as const;