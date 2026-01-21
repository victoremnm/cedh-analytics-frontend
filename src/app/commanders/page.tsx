import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-[#a1a1aa] hover:text-[#fafafa] text-sm mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#c9a227] to-[#8b5cf6] bg-clip-text text-transparent">
            Commander Rankings
          </h1>
          <p className="text-[#a1a1aa] mt-2">
            Performance data for {commanders.length} commanders with 5+ tournament entries
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Commanders"
            value={commanders.length.toString()}
            color="#c9a227"
          />
          <StatCard
            label="Total Entries"
            value={commanders
              .reduce((sum, c) => sum + c.total_entries, 0)
              .toLocaleString()}
            color="#8b5cf6"
          />
          <StatCard
            label="Avg Win Rate"
            value={`${(
              (commanders.reduce(
                (sum, c) => sum + parseFloat(c.avg_win_rate),
                0
              ) /
                commanders.length) *
              100
            ).toFixed(1)}%`}
            color="#22c55e"
          />
          <StatCard
            label="Avg Top 16 Rate"
            value={`${(
              (commanders.reduce(
                (sum, c) => sum + parseFloat(c.conversion_rate_top_16),
                0
              ) /
                commanders.length) *
              100
            ).toFixed(1)}%`}
            color="#f59e0b"
          />
        </div>

        {/* Commander Table */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-[#fafafa]">All Commanders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <TableHead className="text-[#a1a1aa]">Rank</TableHead>
                    <TableHead className="text-[#a1a1aa]">Commander</TableHead>
                    <TableHead className="text-[#a1a1aa]">Colors</TableHead>
                    <TableHead className="text-[#a1a1aa] text-right">
                      Entries
                    </TableHead>
                    <TableHead className="text-[#a1a1aa] text-right">
                      Tournaments
                    </TableHead>
                    <TableHead className="text-[#a1a1aa] text-right">
                      Win Rate
                    </TableHead>
                    <TableHead className="text-[#a1a1aa] text-right">
                      Top 16 Rate
                    </TableHead>
                    <TableHead className="text-[#a1a1aa] text-right">
                      Top Cut Rate
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commanders.map((commander, index) => (
                    <TableRow
                      key={commander.commander_id}
                      className="border-[#2a2a2a] hover:bg-[#252525] cursor-pointer"
                    >
                      <TableCell className="font-mono text-[#a1a1aa]">
                        #{index + 1}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/commanders/${commander.commander_id}`}
                          className="hover:text-[#c9a227] transition-colors"
                        >
                          <span className="font-medium">
                            {commander.commander_name}
                          </span>
                          {commander.archetype && (
                            <span className="text-[#a1a1aa] text-sm ml-2">
                              ({commander.archetype})
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {commander.color_identity?.map((color) => (
                            <ColorBadge key={color} color={color} />
                          )) || <span className="text-[#a1a1aa]">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {commander.total_entries.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[#a1a1aa]">
                        {commander.tournaments_played}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <WinRateBadge rate={parseFloat(commander.avg_win_rate)} />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="text-[#f59e0b]">
                          {(parseFloat(commander.conversion_rate_top_16) * 100).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="text-[#8b5cf6]">
                          {(parseFloat(commander.conversion_rate_top_cut) * 100).toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
      <CardContent className="pt-6">
        <p className="text-[#a1a1aa] text-sm">{label}</p>
        <p className="text-2xl font-bold font-mono" style={{ color }}>
          {value}
        </p>
      </CardContent>
    </Card>
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

function WinRateBadge({ rate }: { rate: number }) {
  const percentage = rate * 100;
  // 25% is expected in 4-player pods
  const isAboveExpected = percentage > 25;
  const color = isAboveExpected ? "#22c55e" : percentage < 20 ? "#ef4444" : "#a1a1aa";

  return (
    <span style={{ color }} className="font-mono">
      {percentage.toFixed(1)}%
    </span>
  );
}
