import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CommandersTable from "@/components/commanders/commanders-table";

export const dynamic = "force-dynamic";

interface CommanderStat {
  commander_id: string;
  commander_name: string;
  archetype: string | null;
  color_identity: string[] | null;
  total_entries: number;
  tournaments_played: number;
  total_wins: number;
  total_losses: number;
  total_draws: number;
  avg_win_rate: string;
  top_16_count: number;
  conversion_rate_top_16: string;
  top_cut_count: number;
  conversion_rate_top_cut: string;
}

async function getCommanders() {
  const { data, error } = await supabase
    .from("commander_stats")
    .select("*")
    .gt("total_entries", 5)
    .order("total_entries", { ascending: false });

  if (error) {
    console.error("Error fetching commanders:", error);
    return [];
  }
  return data as CommanderStat[];
}

export default async function CommandersPage() {
  const commanders = await getCommanders();
  const filteredCommanders = commanders.filter(
    (commander) => commander.commander_name?.toLowerCase() !== "unknown commander"
  );

  const totalEntries = filteredCommanders.reduce((sum, c) => sum + c.total_entries, 0);
  const avgWinRate =
    filteredCommanders.reduce((sum, c) => sum + parseFloat(c.avg_win_rate), 0) /
    Math.max(filteredCommanders.length, 1);
  const avgTop16 =
    filteredCommanders.reduce((sum, c) => sum + parseFloat(c.conversion_rate_top_16), 0) /
    Math.max(filteredCommanders.length, 1);

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-border/70 bg-card/60 px-6 py-6">
          <div className="knd-watermark absolute inset-0" />
          <div className="relative">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to Home
            </Link>
            <h1 className="mt-4 text-3xl font-semibold text-foreground md:text-4xl">
              Commander Rankings
            </h1>
            <p className="text-muted-foreground mt-2">
              Performance data for {filteredCommanders.length} commanders with 5+ tournament entries.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-8">
          <StatCard label="Total Commanders" value={filteredCommanders.length.toString()} tone="primary" />
          <StatCard label="Total Entries" value={totalEntries.toLocaleString()} tone="amber" />
          <StatCard label="Avg Win Rate" value={`${(avgWinRate * 100).toFixed(1)}%`} tone="primary" />
          <StatCard label="Avg Top 16 Rate" value={`${(avgTop16 * 100).toFixed(1)}%`} tone="neutral" />
        </div>

        <CommandersTable commanders={filteredCommanders} />
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "amber" | "neutral";
}) {
  const toneMap: Record<typeof tone, string> = {
    primary: "text-primary",
    amber: "text-[hsl(var(--knd-amber))]",
    neutral: "text-muted-foreground",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground text-sm uppercase tracking-[0.2em]">{label}</p>
        <p className={`text-2xl font-semibold ${toneMap[tone]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
