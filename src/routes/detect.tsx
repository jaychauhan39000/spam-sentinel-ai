import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Sparkles, X, ShieldAlert, ShieldCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { classifyMessage, type ClassifyResponse } from "@/lib/detection.functions";
import { DETECTION_LIMITS, EXAMPLE_MESSAGES } from "@/lib/config";

export const Route = createFileRoute("/detect")({
  head: () => ({
    meta: [
      { title: "Detect — SpamShield AI" },
      { name: "description", content: "Paste any email or SMS and SpamShield AI will classify it as Spam or Ham with confidence, risk level, and trigger keywords." },
      { property: "og:title", content: "SpamShield AI — Spam Detector" },
      { property: "og:description", content: "Live spam & phishing classifier powered by ML + AI." },
    ],
  }),
  component: DetectPage,
});

const MAX_LEN = DETECTION_LIMITS.MAX_MESSAGE_LENGTH;

function DetectPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const classify = useServerFn(classifyMessage);

  const mutation = useMutation({
    mutationFn: (message: string) => classify({ data: { message } }),
    onSuccess: (data) => {
      setResult(data);
      toast.success(`${data.prediction} detected`, { description: `Confidence ${data.confidence}%` });
      router.invalidate();
    },
    onError: (err: Error) => toast.error("Detection failed", { description: err.message }),
  });

  const onAnalyze = () => {
    const trimmed = text.trim();
    if (!trimmed) return toast.warning("Enter a message to analyze");
    mutation.mutate(trimmed);
  };

  const onClear = () => { setText(""); setResult(null); };

  const onDownload = () => {
    if (!result) return;
    const payload = { timestamp: new Date().toISOString(), message: text, ...result };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `spamshield-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Spam Detection Dashboard</h1>
        <p className="mt-3 text-muted-foreground">Paste an email or SMS below. Our ML model will analyze it instantly.</p>
      </div>

      <Card className="mt-10 p-6 bg-card/60 backdrop-blur border-border/60">
        <label htmlFor="msg" className="text-sm font-medium">Email or SMS content</label>
        <Textarea id="msg" value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))} placeholder="Paste a suspicious email or SMS here…" className="mt-2 min-h-[180px] resize-y bg-background/60 font-mono text-sm" />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{text.length} / {MAX_LEN} characters</span>
          <span>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onAnalyze} disabled={mutation.isPending || !text.trim()} className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90">
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Analyze message
          </Button>
          <Button variant="outline" onClick={onClear} disabled={mutation.isPending}>
            <X className="mr-2 h-4 w-4" /> Clear
          </Button>
        </div>
        <div className="mt-6 border-t border-border/60 pt-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Try an example</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {EXAMPLE_MESSAGES.map((ex) => (
              <button key={ex} type="button" onClick={() => setText(ex)} className="text-left rounded-md border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition">
                {ex}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }} className="mt-8">
            <ResultCard result={result} onDownload={onDownload} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultCard({ result, onDownload }: { result: ClassifyResponse; onDownload: () => void }) {
  const isSpam = result.prediction === "Spam";
  const riskColors: Record<string, string> = {
    Low: "bg-success/20 text-success border-success/40",
    Medium: "bg-warning/20 text-warning border-warning/40",
    High: "bg-destructive/20 text-destructive border-destructive/40",
  };
  return (
    <Card className="p-6 border-border/60 bg-card/80 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isSpam ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"}`}>
            {isSpam ? <ShieldAlert className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <div>
            <div className="text-2xl font-bold">{isSpam ? "Spam" : "Legitimate (Ham)"}</div>
            <div className="text-xs text-muted-foreground">Model: {result.model}</div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" /> Export JSON
        </Button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-background/40 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Confidence</div>
          <div className="mt-1 text-xl font-bold">{result.confidence.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Risk level</div>
          <div className="mt-1">
            <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${riskColors[result.risk_level]}`}>{result.risk_level}</span>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Keywords</div>
          <div className="mt-1 text-xl font-bold">{result.keywords.length} flagged</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Confidence</div>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${isSpam ? "bg-gradient-to-r from-destructive to-warning" : "bg-gradient-to-r from-success to-primary"}`} style={{ width: `${result.confidence}%` }} />
        </div>
      </div>
      {result.keywords.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Trigger keywords</div>
          <div className="flex flex-wrap gap-2">
            {result.keywords.map((k) => (
              <span key={k} className="rounded-md bg-primary/10 border border-primary/30 px-2.5 py-1 text-xs font-mono text-primary">{k}</span>
            ))}
          </div>
        </div>
      )}
      {result.reasoning && (
        <div className="mt-6 rounded-lg border border-border/60 bg-background/40 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">AI reasoning</div>
          <p className="mt-2 text-sm">{result.reasoning}</p>
        </div>
      )}
      <div className="mt-6 rounded-lg border border-border/60 bg-background/40 p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Recommendation</div>
        <p className="mt-2 text-sm">{isSpam ? "Do not click any links, reply, or share personal information. Delete or report this message to your provider." : "This message looks safe based on the model's analysis. Still, always verify the sender if anything feels off."}</p>
      </div>
    </Card>
  );
}