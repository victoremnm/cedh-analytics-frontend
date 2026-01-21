import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { notFound } from "next/navigation";

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

interface CardReport {
  commander: string;
  commander_id: string;
  card_name: string;
  deck_count: number;
  total_decks: number;
  inclusion_rate: string;
  tier: string;
  global_rate: string;
  synergy_score: string;
}

async function getCommanderDetails(id: string) {
  const { data, error } = await supabase
    .from("commander_stats")
    .select("*")
    .eq("commander_id", id)
    .single();

  if (error || !data) {
    return null;
  }
  return data as CommanderStat;
}

async function getCardReport(commanderId: string) {
  const { data, error } = await supabase
    .from("commander_card_report")
    .select("*")
    .eq("commander_id", commanderId)
    .order("inclusion_rate", { ascending: false });

  if (error) {
    console.error("Error fetching card report:", error);
    return [];
  }
  return data as CardReport[];
}

export default async function CommanderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const commander = await getCommanderDetails(id);

  if (!commander) {
    notFound();
  }

  const cardReport = await getCardReport(id);

  // Group cards by tier
  const cardsByTier = {
    core: cardReport.filter((c) => c.tier === "core"),
    essential: cardReport.filter((c) => c.tier === "essential"),
    common: cardReport.filter((c) => c.tier === "common"),
    flex: cardReport.filter((c) => c.tier === "flex"),
    spice: cardReport.filter((c) => c.tier === "spice"),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/commanders"
            className="text-[#a1a1aa] hover:text-[#fafafa] text-sm"
          >
            ← Back to Commanders
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {commander.color_identity?.map((color) => (
              <ColorBadge key={color} color={color} size="lg" />
            ))}
          </div>
          <h1 className="text-4xl font-bold text-[#fafafa]">
            {commander.commander_name}
          </h1>
          {commander.archetype && (
            <p className="text-[#a1a1aa] mt-1">{commander.archetype}</p>
          )}
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            label="Total Entries"
            value={commander.total_entries.toLocaleString()}
            color="#c9a227"
          />
          <StatCard
            label="Tournaments"
            value={commander.tournaments_played.toString()}
            color="#8b5cf6"
          />
          <StatCard
            label="Win Rate"
            value={`${(parseFloat(commander.avg_win_rate) * 100).toFixed(1)}%`}
            color={parseFloat(commander.avg_win_rate) > 0.25 ? "#22c55e" : "#a1a1aa"}
          />
          <StatCard
            label="Top 16 Rate"
            value={`${(parseFloat(commander.conversion_rate_top_16) * 100).toFixed(1)}%`}
            color="#f59e0b"
          />
          <StatCard
            label="Total Wins"
            value={commander.total_wins.toLocaleString()}
            color="#22c55e"
          />
          <StatCard
            label="W/L/D"
            value={`${commander.total_wins}/${commander.total_losses}/${commander.total_draws}`}
            color="#a1a1aa"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-[#1a1a1a] border border-[#2a2a2a]">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-[#fafafa]"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="cards"
              className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-[#fafafa]"
            >
              Card Frequencies ({cardReport.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Summary */}
              <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-[#fafafa]">
                    Performance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[#a1a1aa]">Expected Win Rate (4-player)</span>
                    <span className="font-mono">25.0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#a1a1aa]">Actual Win Rate</span>
                    <span
                      className="font-mono font-bold"
                      style={{
                        color:
                          parseFloat(commander.avg_win_rate) > 0.25
                            ? "#22c55e"
                            : parseFloat(commander.avg_win_rate) < 0.2
                            ? "#ef4444"
                            : "#a1a1aa",
                      }}
                    >
                      {(parseFloat(commander.avg_win_rate) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#a1a1aa]">Win Rate Delta</span>
                    <span
                      className="font-mono"
                      style={{
                        color:
                          parseFloat(commander.avg_win_rate) > 0.25
                            ? "#22c55e"
                            : "#ef4444",
                      }}
                    >
                      {parseFloat(commander.avg_win_rate) > 0.25 ? "+" : ""}
                      {((parseFloat(commander.avg_win_rate) - 0.25) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <hr className="border-[#2a2a2a]" />
                  <div className="flex justify-between items-center">
                    <span className="text-[#a1a1aa]">Top 16 Finishes</span>
                    <span className="font-mono text-[#f59e0b]">
                      {commander.top_16_count}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#a1a1aa]">Top Cut Finishes</span>
                    <span className="font-mono text-[#8b5cf6]">
                      {commander.top_cut_count}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Tier Breakdown */}
              <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-[#fafafa]">
                    Card Tier Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TierRow
                    tier="Core"
                    count={cardsByTier.core.length}
                    description="80%+ inclusion"
                    color="#22c55e"
                  />
                  <TierRow
                    tier="Essential"
                    count={cardsByTier.essential.length}
                    description="60-79% inclusion"
                    color="#84cc16"
                  />
                  <TierRow
                    tier="Common"
                    count={cardsByTier.common.length}
                    description="30-59% inclusion"
                    color="#f59e0b"
                  />
                  <TierRow
                    tier="Flex"
                    count={cardsByTier.flex.length}
                    description="10-29% inclusion"
                    color="#8b5cf6"
                  />
                  <TierRow
                    tier="Spice"
                    count={cardsByTier.spice.length}
                    description="<10% inclusion"
                    color="#ef4444"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cards" className="mt-6">
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-[#fafafa]">
                  Card Frequencies for {commander.commander_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#2a2a2a] hover:bg-[#1a1a1a]">
                        <TableHead className="text-[#a1a1aa]">Card Name</TableHead>
                        <TableHead className="text-[#a1a1aa]">Tier</TableHead>
                        <TableHead className="text-[#a1a1aa] text-right">
                          Inclusion
                        </TableHead>
                        <TableHead className="text-[#a1a1aa] text-right">
                          Global Rate
                        </TableHead>
                        <TableHead className="text-[#a1a1aa] text-right">
                          Synergy
                        </TableHead>
                        <TableHead className="text-[#a1a1aa] text-right">
                          Decks
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cardReport.slice(0, 100).map((card) => (
                        <TableRow
                          key={card.card_name}
                          className="border-[#2a2a2a] hover:bg-[#252525]"
                        >
                          <TableCell className="font-medium">
                            {card.card_name}
                          </TableCell>
                          <TableCell>
                            <TierBadge tier={card.tier} />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(parseFloat(card.inclusion_rate) * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-[#a1a1aa]">
                            {(parseFloat(card.global_rate) * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <SynergyBadge score={parseFloat(card.synergy_score)} />
                          </TableCell>
                          <TableCell className="text-right font-mono text-[#a1a1aa]">
                            {card.deck_count}/{card.total_decks}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {cardReport.length > 100 && (
                    <p className="text-[#a1a1aa] text-sm mt-4 text-center">
                      Showing 100 of {cardReport.length} cards
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
      <CardContent className="pt-4 pb-4">
        <p className="text-[#a1a1aa] text-xs">{label}</p>
        <p className="text-xl font-bold font-mono" style={{ color }}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function ColorBadge({ color, size = "sm" }: { color: string; size?: "sm" | "lg" }) {
  const colors: Record<string, string> = {
    W: "bg-amber-100 text-amber-900",
    U: "bg-blue-500 text-white",
    B: "bg-purple-900 text-purple-100",
    R: "bg-red-500 text-white",
    G: "bg-green-600 text-white",
  };

  const sizeClass = size === "lg" ? "w-8 h-8 text-sm" : "w-5 h-5 text-xs";

  return (
    <span
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold ${
        colors[color] || "bg-gray-500"
      }`}
    >
      {color}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const tierColors: Record<string, string> = {
    core: "bg-green-500/20 text-green-400 border-green-500/30",
    essential: "bg-lime-500/20 text-lime-400 border-lime-500/30",
    common: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    flex: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    spice: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <Badge
      variant="outline"
      className={tierColors[tier] || "bg-gray-500/20 text-gray-400"}
    >
      {tier}
    </Badge>
  );
}

function SynergyBadge({ score }: { score: number }) {
  const percentage = score * 100;
  const isPositive = percentage > 0;
  const color = isPositive ? "#22c55e" : percentage < -10 ? "#ef4444" : "#a1a1aa";

  return (
    <span style={{ color }}>
      {isPositive ? "+" : ""}
      {percentage.toFixed(1)}%
    </span>
  );
}

function TierRow({
  tier,
  count,
  description,
  color,
}: {
  tier: string;
  count: number;
  description: string;
  color: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <span className="font-medium" style={{ color }}>
          {tier}
        </span>
        <span className="text-[#a1a1aa] text-sm ml-2">({description})</span>
      </div>
      <span className="font-mono font-bold" style={{ color }}>
        {count}
      </span>
    </div>
  );
}
