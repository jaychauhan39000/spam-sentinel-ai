import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Shield, Zap, Brain, BarChart3, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpamShield AI — Detect Spam Email & SMS Instantly" },
      { name: "description", content: "Paste any email or SMS and SpamShield AI tells you if it's spam, the confidence, the risk, and the keywords that triggered the model." },
      { property: "og:title", content: "SpamShield AI — Detect Spam Email & SMS Instantly" },
      { property: "og:description", content: "Hybrid TF-IDF + Logistic Regression with AI fallback. Real predictions, not rules." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} aria-hidden />
        <div className="absolute inset-0 -z-10 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)", backgroundSize: "48px 48px" }} aria-hidden />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-24 lg:pt-32 lg:pb-32">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              <Lock className="h-3.5 w-3.5" /> Hybrid ML + AI · Real-time threat detection
            </div>
            <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
              Stop spam &amp; phishing<br />
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">before it reaches you.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              SpamShield AI classifies any email or SMS in milliseconds using a real TF-IDF + Logistic Regression model, with an AI fallback for the tricky cases.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90">
                <Link to="/detect">Try the detector <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/analytics">View analytics</Link>
              </Button>
            </div>
            <div className="mt-16 grid grid-cols-3 gap-6 w-full max-w-2xl">
              {[{ value: "97.4%", label: "Model accuracy" },{ value: "<200ms", label: "Avg. response" },{ value: "Hybrid", label: "ML + AI fallback" }].map((s) => (
                <div key={s.label} className="rounded-xl border border-border/60 bg-card/60 backdrop-blur p-5">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">{s.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight">How it protects you</h2>
            <p className="mt-3 text-muted-foreground">Four layers of defense, packed into a single API call.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Brain, title: "Real ML model", desc: "TF-IDF vectorizer + Logistic Regression, trained on a curated spam corpus — not a list of banned words." },
              { icon: Zap, title: "AI fallback", desc: "When the model isn't confident, we escalate to Lovable AI for a second opinion." },
              { icon: Shield, title: "Risk scoring", desc: "Every prediction comes with a confidence score, risk level, and trigger keywords." },
              { icon: BarChart3, title: "Live analytics", desc: "Every check is logged — search, paginate, and visualize spam-vs-ham trends." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border/60 bg-background/40 p-6 hover:border-primary/40 hover:shadow-[var(--shadow-glow)] transition">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">What we catch</h2>
            <p className="mt-3 text-muted-foreground">SpamShield AI recognizes the patterns scammers use most.</p>
            <ul className="mt-6 space-y-3">
              {["Phishing links pretending to be banks, Apple, PayPal, Amazon","Prize-claim and lottery scams","Fake delivery and package-rescheduling notices","Crypto and stock-pump scams","IRS / tax / arrest-warrant intimidation","Loan and credit pre-approval traps"].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button asChild className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                <Link to="/detect">Scan a message now <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/10 blur-2xl rounded-3xl" aria-hidden />
            <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur p-6 shadow-[var(--shadow-elegant)]">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <div className="h-2 w-2 rounded-full bg-warning" />
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="ml-2 font-mono">inbox / message-87234.eml</span>
              </div>
              <pre className="mt-4 text-xs sm:text-sm font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed">From: rewards@apple-id-verify.support{"\n"}Subject: URGENT: Confirm your Apple ID{"\n\n"}Your Apple ID will be disabled in 24 hours.{"\n"}Click here to verify your account:{"\n"}https://apple-id-verify.support/login</pre>
              <div className="mt-5 flex items-center gap-3">
                <span className="rounded-full bg-destructive/20 px-3 py-1 text-xs font-semibold text-destructive">Spam · High risk</span>
                <span className="text-xs text-muted-foreground">Confidence 98.6%</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
