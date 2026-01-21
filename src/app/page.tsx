import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

// Force dynamic rendering - fetch fresh data on each request
export const dynamic = "force-dynamic";

interface TopCommander {
  commander_id: string;
  commander_name: string;
  total_entries: number;
  avg_win_rate: number;
  conversion_rate_top_16: number;
  color_identity: string[] | null;
}

async function getStats() {
  try {
    const [tournamentResult, commanderResult, topCommandersResult, topWinRateResult] =
      await Promise.all([
        supabase.from("tournaments").select("*", { count: "exact", head: true }),
        supabase.from("commanders").select("*", { count: "exact", head: true }),
        supabase
          .from("commander_stats")
          .select("commander_id, commander_name, total_entries, avg_win_rate, conversion_rate_top_16, color_identity")
          .gt("total_entries", 20)
          .order("total_entries", { ascending: false })
          .limit(10),
        supabase
          .from("commander_stats")
          .select("commander_id, commander_name, total_entries, avg_win_rate, conversion_rate_top_16, color_identity")
          .gt("total_entries", 30)
          .order("avg_win_rate", { ascending: false })
          .limit(10),
      ]);

    // Log errors for debugging
    if (tournamentResult.error) {
      console.error("Tournament query error:", tournamentResult.error);
    }
    if (commanderResult.error) {
      console.error("Commander query error:", commanderResult.error);
    }
    if (topCommandersResult.error) {
      console.error("Top commanders query error:", topCommandersResult.error);
    }

    return {
      tournamentCount: tournamentResult.count ?? 0,
      commanderCount: commanderResult.count ?? 0,
      topCommanders: (topCommandersResult.data ?? []) as TopCommander[],
      topWinRate: (topWinRateResult.data ?? []) as TopCommander[],
    };
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return {
      tournamentCount: 0,
      commanderCount: 0,
      topCommanders: [],
      topWinRate: [],
    };
  }
}

export default async function Home() {
  const { tournamentCount, commanderCount, topCommanders, topWinRate } = await getStats();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#c9a227] to-[#8b5cf6] bg-clip-text text-transparent">
            cEDH Analytics
          </h1>
          <p className="text-xl text-[#a1a1aa] max-w-2xl mx-auto">
            Data-driven insights for competitive Commander. Track commander
            performance, card frequencies, and meta trends.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-[#a1a1aa] text-sm font-medium">
                Tournaments Tracked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-[#c9a227]">
                {tournamentCount}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-[#a1a1aa] text-sm font-medium">
                Unique Commanders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-[#8b5cf6]">
                {commanderCount}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-[#a1a1aa] text-sm font-medium">
                Data Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-[#22c55e]">Live</p>
            </CardContent>
          </Card>
        </div>

        {/* Commander Rankings - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
          {/* Most Popular */}
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[#fafafa]">Most Popular</CardTitle>
                <p className="text-sm text-[#a1a1aa] mt-1">By tournament entries</p>
              </div>
              <Link
                href="/commanders"
                className="text-sm text-[#c9a227] hover:text-[#d4af37] transition-colors"
              >
                View All →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCommanders.map((commander, index) => (
                  <CommanderRow
                    key={commander.commander_id}
                    commander={commander}
                    rank={index + 1}
                    metric="entries"
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Highest Win Rate */}
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[#fafafa]">Highest Win Rate</CardTitle>
                <p className="text-sm text-[#a1a1aa] mt-1">30+ entries minimum</p>
              </div>
              <Link
                href="/commanders"
                className="text-sm text-[#22c55e] hover:text-[#4ade80] transition-colors"
              >
                View All →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topWinRate.map((commander, index) => (
                  <CommanderRow
                    key={commander.commander_id}
                    commander={commander}
                    rank={index + 1}
                    metric="winrate"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <FeatureCard
            href="/commanders"
            title="Commander Rankings"
            description="Sortable performance data for all commanders"
            color="#c9a227"
          />
          <FeatureCard
            href="/cards"
            title="Card Frequency"
            description="Global card inclusion rates and tiers"
            color="#8b5cf6"
          />
          <FeatureCard
            href="/turn-order"
            title="Turn Order Fairness"
            description="Statistical analysis of seat position advantage"
            color="#22c55e"
          />
          <FeatureCard
            href="/trap-spice"
            title="Trap & Spice Cards"
            description="Find overrated and underrated cards"
            color="#ef4444"
          />
          <FeatureCard
            href="/survival"
            title="Survival Analysis"
            description="Track survival probability through tournament rounds"
            color="#06b6d4"
          />
          <FeatureCard
            href="/about"
            title="Methodology"
            description="Statistics, formulas, and how it all works"
            color="#a1a1aa"
          />
        </div>
      </main>
    </div>
  );
}

function CommanderRow({
  commander,
  rank,
  metric,
}: {
  commander: TopCommander;
  rank: number;
  metric: "entries" | "winrate";
}) {
  const winRate = (commander.avg_win_rate * 100).toFixed(1);
  const isAboveExpected = commander.avg_win_rate > 0.25;

  return (
    <Link
      href={`/commanders/${commander.commander_id}`}
      className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0a] hover:bg-[#151515] transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span className="text-[#a1a1aa] w-6 font-mono text-sm">#{rank}</span>
        <div className="flex gap-1">
          {commander.color_identity?.filter(Boolean).map((color: string) => (
            <ColorBadge key={color} color={color} />
          ))}
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate group-hover:text-[#c9a227] transition-colors">
            {commander.commander_name}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        {metric === "entries" ? (
          <>
            <p className="text-[#c9a227] font-mono font-bold">
              {commander.total_entries}
            </p>
            <p className="text-xs text-[#a1a1aa]">entries</p>
          </>
        ) : (
          <>
            <p
              className="font-mono font-bold"
              style={{ color: isAboveExpected ? "#22c55e" : "#a1a1aa" }}
            >
              {winRate}%
            </p>
            <p className="text-xs text-[#a1a1aa]">{commander.total_entries} entries</p>
          </>
        )}
      </div>
    </Link>
  );
}

function ColorBadge({ color }: { color: string }) {
  const colors: Record<string, string> = {
    W: "bg-amber-100 text-amber-900",
    U: "bg-blue-500 text-white",
    B: "bg-purple-900 text-purple-100",
    R: "bg-red-500 text-white",
    G: "bg-green-600 text-white",
  };

  return (
    <span
      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
        colors[color] || "bg-gray-500"
      }`}
    >
      {color}
    </span>
  );
}

function FeatureCard({
  href,
  title,
  description,
  color,
}: {
  href: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors cursor-pointer h-full">
        <CardHeader>
          <div
            className="w-2 h-2 rounded-full mb-2"
            style={{ backgroundColor: color }}
          />
          <CardTitle className="text-[#fafafa] text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[#a1a1aa] text-sm">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
