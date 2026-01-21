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

// Helper to convert string/number values from PostgreSQL NUMERIC to number
function toNumber(val: number | string | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return typeof val === "string" ? parseFloat(val) : val;
}

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

interface CardPerformance {
  commander_id: string;
  commander: string;
  card_name: string;
  deck_count: number;
  total_decks: number;
  inclusion_rate: string;
  avg_win_rate: string;
  baseline_win_rate: string;
  win_rate_delta: string;
  std_win_rate: string;
  top_16_count: number;
  top_16_rate: string;
  performance_tier: string;
}

interface NotablePlayer {
  player_name: string;
  topdeck_id: string | null;
  entries: number;
  total_wins: number;
  total_games: number;
  win_rate: string | null;
  top_16_count: number;
}

interface CommanderMatchup {
  opponent_commander_id: string;
  opponent_commander_name: string;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number | string;
  loss_rate: number | string;
  draw_rate: number | string;
  expected_win_rate: number | string;
  win_rate_vs_expected: number | string;
  is_statistically_significant: boolean;
  confidence_level: string;
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

async function getCardPerformance(commanderId: string) {
  const { data, error } = await supabase
    .from("card_performance_by_commander")
    .select("*")
    .eq("commander_id", commanderId)
    .gte("deck_count", 3)
    .order("win_rate_delta", { ascending: false });

  if (error) {
    console.error("Error fetching card performance:", error);
    return [];
  }
  return data as CardPerformance[];
}

async function getNotablePlayers(commanderId: string): Promise<NotablePlayer[]> {
  const { data, error } = await supabase.rpc("get_notable_players_for_commander", {
    p_commander_id: commanderId,
  });

  if (error) {
    // Fallback: the RPC might not exist yet, return empty
    console.error("Error fetching notable players:", error);
    return [];
  }
  return data as NotablePlayer[];
}

async function getCommanderMatchups(commanderId: string): Promise<CommanderMatchup[]> {
  const { data, error } = await supabase.rpc("get_commander_matchups", {
    p_commander_id: commanderId,
  });

  if (error) {
    // Fallback: the RPC might not exist yet, return empty
    console.error("Error fetching matchups:", error);
    return [];
  }
  return data as CommanderMatchup[];
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

  const [cardReport, cardPerformance, notablePlayers, matchups] = await Promise.all([
    getCardReport(id),
    getCardPerformance(id),
    getNotablePlayers(id),
    getCommanderMatchups(id),
  ]);

  // Get top performing and underperforming cards
  const topPerformingCards = cardPerformance
    .filter((c) => parseFloat(c.win_rate_delta) > 0)
    .slice(0, 20);
  const underperformingCards = cardPerformance
    .filter((c) => parseFloat(c.win_rate_delta) < 0)
    .sort((a, b) => parseFloat(a.win_rate_delta) - parseFloat(b.win_rate_delta))
    .slice(0, 20);

  // Create a map of card performance data for quick lookup
  const cardPerformanceMap = new Map(
    cardPerformance.map((cp) => [cp.card_name, cp])
  );

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
            {commander.color_identity?.filter(Boolean).map((color) => (
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
          <TabsList className="bg-[#1a1a1a] border border-[#2a2a2a] flex-wrap h-auto gap-1 p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-[#fafafa]"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-[#fafafa]"
            >
              Card Performance
            </TabsTrigger>
            <TabsTrigger
              value="cards"
              className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-[#fafafa]"
            >
              Card Frequencies ({cardReport.length})
            </TabsTrigger>
            {notablePlayers.length > 0 && (
              <TabsTrigger
                value="players"
                className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-[#fafafa]"
              >
                Notable Players ({notablePlayers.length})
              </TabsTrigger>
            )}
            {matchups.length > 0 && (
              <TabsTrigger
                value="matchups"
                className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-[#fafafa]"
              >
                Matchups
              </TabsTrigger>
            )}
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

          <TabsContent value="performance" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performing Cards */}
              <Card className="bg-[#1a1a1a] border-[#2a2a2a] border-l-4 border-l-[#22c55e]">
                <CardHeader>
                  <CardTitle className="text-[#22c55e] flex items-center gap-2">
                    <span>Top Performing Cards</span>
                  </CardTitle>
                  <p className="text-[#a1a1aa] text-sm">
                    Cards that correlate with higher win rates
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topPerformingCards.length === 0 ? (
                      <p className="text-[#a1a1aa] text-sm">Insufficient data for analysis</p>
                    ) : (
                      topPerformingCards.map((card) => (
                        <PerformanceCardRow key={card.card_name} card={card} />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Underperforming Cards */}
              <Card className="bg-[#1a1a1a] border-[#2a2a2a] border-l-4 border-l-[#ef4444]">
                <CardHeader>
                  <CardTitle className="text-[#ef4444] flex items-center gap-2">
                    <span>Underperforming Cards</span>
                  </CardTitle>
                  <p className="text-[#a1a1aa] text-sm">
                    Cards that correlate with lower win rates
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {underperformingCards.length === 0 ? (
                      <p className="text-[#a1a1aa] text-sm">Insufficient data for analysis</p>
                    ) : (
                      underperformingCards.map((card) => (
                        <PerformanceCardRow key={card.card_name} card={card} isNegative />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Methodology Note */}
            <Card className="bg-[#1a1a1a] border-[#2a2a2a] mt-6">
              <CardContent className="pt-6">
                <p className="text-[#a1a1aa] text-sm">
                  <strong className="text-[#fafafa]">Note:</strong> Win rate delta shows the
                  difference between average win rate of decks running this card vs the commander&apos;s
                  baseline. Cards with higher standard deviation have less certainty.
                  Requires minimum 3 deck appearances.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {notablePlayers.length > 0 && (
            <TabsContent value="players" className="mt-6">
              <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-[#fafafa]">
                    Notable {commander.commander_name} Players
                  </CardTitle>
                  <p className="text-[#a1a1aa] text-sm">
                    Players with 2+ tournament entries using this commander
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#2a2a2a] hover:bg-[#1a1a1a]">
                          <TableHead className="text-[#a1a1aa]">Player</TableHead>
                          <TableHead className="text-[#a1a1aa] text-right">Entries</TableHead>
                          <TableHead className="text-[#a1a1aa] text-right">Games</TableHead>
                          <TableHead className="text-[#a1a1aa] text-right">Win Rate</TableHead>
                          <TableHead className="text-[#a1a1aa] text-right">Top 16s</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notablePlayers.map((player) => (
                          <TableRow
                            key={player.player_name}
                            className="border-[#2a2a2a] hover:bg-[#252525]"
                          >
                            <TableCell className="font-medium">
                              {player.topdeck_id ? (
                                <a
                                  href={`https://topdeck.gg/profile/${player.topdeck_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-[#c9a227] transition-colors"
                                >
                                  {player.player_name}
                                  <span className="ml-1 text-[#a1a1aa] text-xs">↗</span>
                                </a>
                              ) : (
                                player.player_name
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[#c9a227]">
                              {player.entries}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[#a1a1aa]">
                              {player.total_games}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {player.win_rate ? (
                                <span
                                  style={{
                                    color:
                                      parseFloat(player.win_rate) > 0.25
                                        ? "#22c55e"
                                        : parseFloat(player.win_rate) < 0.2
                                        ? "#ef4444"
                                        : "#a1a1aa",
                                  }}
                                >
                                  {(parseFloat(player.win_rate) * 100).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-[#a1a1aa]">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[#f59e0b]">
                              {player.top_16_count}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {matchups.length > 0 && (
            <TabsContent value="matchups" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tough Matchups - sorted by lowest win rate */}
                <Card className="bg-[#1a1a1a] border-[#2a2a2a] border-l-4 border-l-[#ef4444]">
                  <CardHeader>
                    <CardTitle className="text-[#ef4444]">
                      Tough Matchups
                    </CardTitle>
                    <p className="text-[#a1a1aa] text-sm">
                      Lowest win rate against these commanders
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {matchups
                        .filter((m) => m.is_statistically_significant)
                        .sort((a, b) => toNumber(a.win_rate) - toNumber(b.win_rate))
                        .slice(0, 20)
                        .map((matchup) => (
                          <MatchupRow
                            key={matchup.opponent_commander_id}
                            matchup={matchup}
                            type="tough"
                          />
                        ))}
                      {matchups.filter((m) => m.is_statistically_significant).length === 0 && (
                        <p className="text-[#a1a1aa] text-sm">Insufficient statistically significant data</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Favorable Matchups - sorted by highest win rate */}
                <Card className="bg-[#1a1a1a] border-[#2a2a2a] border-l-4 border-l-[#22c55e]">
                  <CardHeader>
                    <CardTitle className="text-[#22c55e]">
                      Favorable Matchups
                    </CardTitle>
                    <p className="text-[#a1a1aa] text-sm">
                      Highest win rate against these commanders
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {matchups
                        .filter((m) => m.is_statistically_significant)
                        .sort((a, b) => toNumber(b.win_rate) - toNumber(a.win_rate))
                        .slice(0, 20)
                        .map((matchup) => (
                          <MatchupRow
                            key={matchup.opponent_commander_id}
                            matchup={matchup}
                            type="favorable"
                          />
                        ))}
                      {matchups.filter((m) => m.is_statistically_significant).length === 0 && (
                        <p className="text-[#a1a1aa] text-sm">Insufficient statistically significant data</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-[#1a1a1a] border-[#2a2a2a] mt-6">
                <CardContent className="pt-6">
                  <p className="text-[#a1a1aa] text-sm">
                    <strong className="text-[#fafafa]">Note:</strong> Matchup data shows win rates when
                    both commanders appear in the same pod. Requires minimum 20 encounters for statistical
                    significance. In 4-player pods, only direct wins against that opponent are counted.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

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
                          Win Rate Δ
                        </TableHead>
                        <TableHead className="text-[#a1a1aa] text-right">
                          Decks
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cardReport.map((card) => {
                        const perf = cardPerformanceMap.get(card.card_name);
                        const winRateDelta = perf ? parseFloat(perf.win_rate_delta) * 100 : null;
                        return (
                          <TableRow
                            key={card.card_name}
                            className="border-[#2a2a2a] hover:bg-[#252525]"
                          >
                            <TableCell className="font-medium">
                              <a
                                href={`https://scryfall.com/search?q=${encodeURIComponent(card.card_name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-[#c9a227] transition-colors"
                              >
                                {card.card_name}
                              </a>
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
                            <TableCell className="text-right font-mono">
                              {winRateDelta !== null ? (
                                <span
                                  style={{
                                    color: winRateDelta > 0 ? "#22c55e" : winRateDelta < 0 ? "#ef4444" : "#a1a1aa",
                                  }}
                                >
                                  {winRateDelta > 0 ? "+" : ""}
                                  {winRateDelta.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-[#525252]">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[#a1a1aa]">
                              {card.deck_count}/{card.total_decks}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <p className="text-[#a1a1aa] text-sm mt-4 text-center">
                    Showing all {cardReport.length} cards ·{" "}
                    {cardPerformance.length} have win rate data (min 3 decks)
                  </p>
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

function PerformanceCardRow({
  card,
  isNegative = false,
}: {
  card: CardPerformance;
  isNegative?: boolean;
}) {
  const delta = parseFloat(card.win_rate_delta) * 100;
  const stdDev = parseFloat(card.std_win_rate) * 100;
  const winRate = parseFloat(card.avg_win_rate) * 100;
  const inclusionRate = parseFloat(card.inclusion_rate) * 100;

  // Calculate if statistically significant (rough heuristic: delta > 2*std/sqrt(n))
  const isSignificant = Math.abs(delta) > (stdDev / Math.sqrt(card.deck_count)) * 1.96;

  return (
    <div className="flex items-center justify-between p-2 rounded bg-[#0a0a0a]">
      <div className="flex-1 min-w-0">
        <a
          href={`https://scryfall.com/search?q=${encodeURIComponent(card.card_name)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium hover:text-[#c9a227] transition-colors truncate block"
        >
          {card.card_name}
        </a>
        <p className="text-xs text-[#a1a1aa]">
          {card.deck_count} decks · {inclusionRate.toFixed(0)}% inclusion
        </p>
      </div>
      <div className="text-right ml-4">
        <div className="flex items-center gap-2 justify-end">
          <span
            className="font-mono font-bold"
            style={{ color: isNegative ? "#ef4444" : "#22c55e" }}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
          {isSignificant && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: isNegative ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                color: isNegative ? "#ef4444" : "#22c55e",
              }}
            >
              sig
            </span>
          )}
        </div>
        <p className="text-xs text-[#a1a1aa]">
          {winRate.toFixed(1)}% WR · ±{stdDev.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

function MatchupRow({
  matchup,
  type,
}: {
  matchup: CommanderMatchup;
  type: "favorable" | "tough";
}) {
  const winRate = toNumber(matchup.win_rate) * 100;
  const lossRate = toNumber(matchup.loss_rate) * 100;
  const drawRate = toNumber(matchup.draw_rate) * 100;
  const vsExpected = toNumber(matchup.win_rate_vs_expected) * 100;
  const color = type === "favorable" ? "#22c55e" : "#ef4444";

  return (
    <div className="flex items-center justify-between p-2 rounded bg-[#0a0a0a]">
      <div className="flex-1 min-w-0">
        <Link
          href={`/commanders/${matchup.opponent_commander_id}`}
          className="font-medium hover:text-[#c9a227] transition-colors truncate block"
        >
          {matchup.opponent_commander_name}
        </Link>
        <p className="text-xs text-[#a1a1aa]">
          {matchup.games_played} games · {matchup.wins}W/{matchup.losses}L/{matchup.draws}D
          {matchup.is_statistically_significant && (
            <span className="ml-1 text-[#c9a227]">★</span>
          )}
        </p>
      </div>
      <div className="text-right ml-4">
        <span className="font-mono font-bold" style={{ color }}>
          {winRate.toFixed(1)}% WR
        </span>
        <p className="text-xs text-[#a1a1aa]">
          {vsExpected > 0 ? "+" : ""}{vsExpected.toFixed(1)}% vs expected
        </p>
      </div>
    </div>
  );
}
