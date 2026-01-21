import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

// Force dynamic rendering - fetch fresh data on each request
export const dynamic = "force-dynamic";

async function getStats() {
  const [
    { count: tournamentCount },
    { count: commanderCount },
    { data: topCommanders },
  ] = await Promise.all([
    supabase.from("tournaments").select("*", { count: "exact", head: true }),
    supabase.from("commanders").select("*", { count: "exact", head: true }),
    supabase
      .from("commander_stats")
      .select("commander_name, total_entries, avg_win_rate, color_identity")
      .gt("total_entries", 10)
      .order("total_entries", { ascending: false })
      .limit(5),
  ]);

  return {
    tournamentCount: tournamentCount ?? 0,
    commanderCount: commanderCount ?? 0,
    topCommanders: topCommanders ?? [],
  };
}

export default async function Home() {
  const { tournamentCount, commanderCount, topCommanders } = await getStats();

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

        {/* Top Commanders Preview */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] mb-16">
          <CardHeader>
            <CardTitle className="text-[#fafafa]">
              Top Commanders by Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCommanders.map(
                (
                  commander: {
                    commander_name: string;
                    total_entries: number;
                    avg_win_rate: number;
                    color_identity: string[];
                  },
                  index: number
                ) => (
                  <div
                    key={commander.commander_name}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0a]"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-[#a1a1aa] w-6">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{commander.commander_name}</p>
                        <div className="flex gap-1 mt-1">
                          {commander.color_identity?.map((color: string) => (
                            <ColorBadge key={color} color={color} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[#c9a227] font-mono">
                        {commander.total_entries} entries
                      </p>
                      <p className="text-sm text-[#a1a1aa]">
                        {(commander.avg_win_rate * 100).toFixed(1)}% win rate
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>
      </main>
    </div>
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
