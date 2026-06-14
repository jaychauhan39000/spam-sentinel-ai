import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, ShieldAlert, ShieldCheck, Inbox, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getHistory, type HistoryRow } from "@/lib/detection.functions";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — SpamShield AI" },
      { name: "description", content: "Live spam vs ham analytics, history search, charts, and full detection log." },
      { property: "og:title", content: "SpamShield AI — Analytics" },
      { property: "og:description", content: "Real-time stats and history of every spam check." },
    ],
  }),
  component: AnalyticsPage,
});

const PAGE_SIZE = 10;

function AnalyticsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const fetchHistory = useServerFn(getHistory);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["history", search, page],
    queryFn: () => fetchHistory({ data: { search, limit: PAGE_SIZE, offset: page * PAGE_SIZE } }),
  });

  const totals = data ?? { rows: [], total: 0, spamCount: 0, hamCount: 0 };
  const pieData = useMemo(() => [{ name: "Spam", value: totals.spamCount }, { name: "Ham", value: totals.hamCount }], [totals.spamCount, totals.hamCount]);
  const dailyData = useMemo(() => {
    const buckets = new Map<string, { day: string; Spam: number; Ham: number }>();
    for (const r of totals.rows) {
      const day = new Date(r.created_at).toLocaleDateString();
      if (!buckets.has(day)) buckets.set(day, { day, Spam: 0, Ham: 0 });
      const b = buckets.get(day)!;
      if (r.prediction === "Spam") b.Spam += 1; else b.Ham += 1;
    }
    return Array.from(buckets.values()).reverse();
  }, [totals.rows]);
  const totalPages = Math.max(1, Math.ceil(totals.total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-2 text-muted-foreground">Detection history and live spam-vs-ham trends.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Refresh
        </Button>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total messages" value={totals.total} icon={<Inbox className="h-5 w-5" />} accent="text-primary" />
        <StatCard label="Spam detected" value={totals.spamCount} icon={<ShieldAlert className="h-5 w-5" />} accent="text-destructive" />
        <StatCard label="Legitimate (Ham)" value={totals.hamCount} icon={<ShieldCheck className="h-5 w-5" />} accent="text-success" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-6 border-border/60 bg-card/60">
          <h3 className="font-semibold">Spam vs Ham</h3>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  <Cell fill="oklch(0.65 0.24 25)" />
                  <Cell fill="oklch(0.72 0.18 155)" />
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6 border-border/60 bg-card/60">
          <h3 className="font-semibold">Recent activity</h3>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="Spam" fill="oklch(0.65 0.24 25)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ham" fill="oklch(0.72 0.18 155)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card className="mt-8 p-6 border-border/60 bg-card/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">History</h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search messages…" className="pl-9 bg-background/60" />
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Message</th>
                <th className="py-2 pr-3">Prediction</th>
                <th className="py-2 pr-3">Confidence</th>
                <th className="py-2 pr-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Loading…</td></tr>
              ) : totals.rows.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">No detections yet. Try the detector first.</td></tr>
              ) : (
                totals.rows.map((r) => <HistoryRowItem key={r.id} row={r} />)
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent: string }) {
  return (
    <Card className="p-5 border-border/60 bg-card/60">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={accent}>{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-bold">{value.toLocaleString()}</div>
    </Card>
  );
}

function HistoryRowItem({ row }: { row: HistoryRow }) {
  const isSpam = row.prediction === "Spam";
  const riskColors: Record<string, string> = {
    Low: "bg-success/15 text-success",
    Medium: "bg-warning/15 text-warning",
    High: "bg-destructive/15 text-destructive",
  };
  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-3 pr-3 whitespace-nowrap text-muted-foreground">{new Date(row.created_at).toLocaleString()}</td>
      <td className="py-3 pr-3 max-w-md"><p className="truncate">{row.message}</p></td>
      <td className="py-3 pr-3">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${isSpam ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"}`}>{row.prediction}</span>
      </td>
      <td className="py-3 pr-3 font-mono">{Number(row.confidence).toFixed(1)}%</td>
      <td className="py-3 pr-3">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskColors[row.risk_level]}`}>{row.risk_level}</span>
      </td>
    </tr>
  );
}