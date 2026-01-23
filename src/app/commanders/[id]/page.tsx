import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { normalizeDisplayString } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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

export const dynamic = "force-dynamic";

function toNumber(val: number | string | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return typeof val === "string" ? parseFloat(val) : val;
}

function normalCdf(x: number) {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * absX);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) *
      Math.exp(-absX * absX);
  return 0.5 * (1 + sign * erf);
}

function formatPValue(pValue: number) {
  if (pValue < 0.001) return "<0.001";
  if (pValue < 0.01) return "<0.01";
  return pValue.toFixed(3);
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

interface RecentFinish {
  id: string;
  final_standing: number | null;
  made_top_cut: boolean;
  made_top_16: boolean;
  decklist_url: string | null;
  player_handle: string | null;
  tournament: {
    id: string;
    name: string;
    start_date: string;
    player_count: number;
    top_cut: number;
    topdeck_tid: string;
  };
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

async function getRecentFinishes(commanderId: string) {
  const { data, error } = await supabase
    .from("tournament_entries")
    .select(
      "id, final_standing, made_top_cut, made_top_16, decklist_url, tournaments ( id, name, start_date, player_count, top_cut, topdeck_tid ), players ( topdeck_handle )"
    )
    .eq("commander_id", commanderId)
    .or("made_top_16.eq.true,made_top_cut.eq.true,final_standing.eq.1")
    .order("start_date", { ascending: false, foreignTable: "tournaments" });

  if (error) {
    console.error("Error fetching recent finishes:", error);
    return [];
  }

  const finishes = (data || [])
    .map((row) => {
      const tournament = Array.isArray(row.tournaments)
        ? row.tournaments[0]
        : row.tournaments;
      const player = Array.isArray(row.players) ? row.players[0] : row.players;
      if (!tournament) return null;
      return {
        id: row.id,
        final_standing: row.final_standing,
        made_top_cut: row.made_top_cut,
        made_top_16: row.made_top_16,
        decklist_url: row.decklist_url,
        player_handle: player?.topdeck_handle ?? null,
        tournament,
      } as RecentFinish;
    })
    .filter((row): row is RecentFinish => row !== null);

  finishes.sort((a, b) => {
    const dateA = new Date(a.tournament.start_date).getTime();
    const dateB = new Date(b.tournament.start_date).getTime();
    return dateB - dateA;
  });

  const grouped = new Map<string, RecentFinish>();
  for (const finish of finishes) {
    const key = finish.decklist_url ?? finish.id;
    if (!grouped.has(key)) {
      grouped.set(key, finish);
    }
  }

  return Array.from(grouped.values()).slice(0, 8);
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

  const [cardReport, cardPerformance, notablePlayers, matchups, recentFinishes] = await Promise.all([
    getCardReport(id),
    getCardPerformance(id),
    getNotablePlayers(id),
    getCommanderMatchups(id),
    getRecentFinishes(id),
  ]);

  const topPerformingCards = cardPerformance
    .filter((c) => parseFloat(c.win_rate_delta) > 0)
    .slice(0, 20);
  const underperformingCards = cardPerformance
    .filter((c) => parseFloat(c.win_rate_delta) < 0)
    .sort((a, b) => parseFloat(a.win_rate_delta) - parseFloat(b.win_rate_delta))
    .slice(0, 20);

  const cardPerformanceMap = new Map(
    cardPerformance.map((cp) => [cp.card_name, cp])
  );

  const cardsByTier = {
    core: cardReport.filter((c) => c.tier === "core"),
    essential: cardReport.filter((c) => c.tier === "essential"),
    common: cardReport.filter((c) => c.tier === "common"),
    flex: cardReport.filter((c) => c.tier === "flex"),
    spice: cardReport.filter((c) => c.tier === "spice"),
  };

  const winRateValue = parseFloat(commander.avg_win_rate);

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-border/70 bg-card/60 px-6 py-6">
          <div className="knd-watermark absolute inset-0" />
          <div className="relative">
            <Link
              href="/commanders"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to Commanders
            </Link>
            <div className="mt-4 flex items-center gap-3">
              {commander.color_identity?.filter(Boolean).map((color) => (
                <ColorBadge key={color} color={color} size="lg" />
              ))}
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-foreground md:text-4xl">
              {normalizeDisplayString(commander.commander_name)}
            </h1>
            {commander.archetype && (
              <p className="text-muted-foreground mt-1">
                {normalizeDisplayString(commander.archetype)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6 mb-8">
          <StatCard label="Total Entries" value={commander.total_entries.toLocaleString()} tone="amber" />
          <StatCard label="Tournaments" value={commander.tournaments_played.toString()} tone="primary" />
          <StatCard
            label="Win Rate"
            value={`${(winRateValue * 100).toFixed(1)}%`}
            tone={winRateValue > 0.25 ? "primary" : "neutral"}
          />
          <StatCard
            label="Top 16 Rate"
            value={`${(parseFloat(commander.conversion_rate_top_16) * 100).toFixed(1)}%`}
            tone="amber"
          />
          <StatCard label="Total Wins" value={commander.total_wins.toLocaleString()} tone="primary" />
          <StatCard
            label="W/L/D"
            value={`${commander.total_wins}/${commander.total_losses}/${commander.total_draws}`}
            tone="neutral"
          />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap gap-1 rounded-xl border border-border/70 bg-card/60 p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-muted/60 data-[state=active]:text-foreground"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="data-[state=active]:bg-muted/60 data-[state=active]:text-foreground"
            >
              Card Performance
            </TabsTrigger>
            <TabsTrigger
              value="cards"
              className="data-[state=active]:bg-muted/60 data-[state=active]:text-foreground"
            >
              Card Frequencies ({cardReport.length})
            </TabsTrigger>
            {notablePlayers.length > 0 && (
              <TabsTrigger
                value="players"
                className="data-[state=active]:bg-muted/60 data-[state=active]:text-foreground"
              >
                Notable Players ({notablePlayers.length})
              </TabsTrigger>
            )}
            {matchups.length > 0 && (
              <TabsTrigger
                value="matchups"
                className="data-[state=active]:bg-muted/60 data-[state=active]:text-foreground"
              >
                Matchups
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="knd-panel-header">
                  <CardTitle className="text-lg">Performance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Expected Win Rate (4-player)</span>
                    <span className="font-mono text-foreground">25.0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Actual Win Rate</span>
                    <span
                      className={`font-mono font-semibold ${
                        winRateValue > 0.25
                          ? "text-primary"
                          : winRateValue < 0.2
                            ? "text-[hsl(var(--knd-amber))]"
                            : "text-muted-foreground"
                      }`}
                    >
                      {(winRateValue * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Win Rate Delta</span>
                    <span
                      className={`font-mono ${
                        winRateValue > 0.25
                          ? "text-primary"
                          : "text-[hsl(var(--knd-amber))]"
                      }`}
                    >
                      {winRateValue > 0.25 ? "+" : ""}
                      {((winRateValue - 0.25) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <hr className="border-border/60" />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Top 16 Finishes</span>
                    <span className="font-mono text-[hsl(var(--knd-amber))]">
                      {commander.top_16_count}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Top Cut Finishes</span>
                    <span className="font-mono text-muted-foreground">
                      {commander.top_cut_count}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="knd-panel-header">
                  <CardTitle className="text-lg">Card Tier Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <TierRow
                    tier="Core"
                    count={cardsByTier.core.length}
                    description="80%+ inclusion"
                    tone="primary"
                  />
                  <TierRow
                    tier="Essential"
                    count={cardsByTier.essential.length}
                    description="60-79% inclusion"
                    tone="primary"
                    muted
                  />
                  <TierRow
                    tier="Common"
                    count={cardsByTier.common.length}
                    description="30-59% inclusion"
                    tone="amber"
                  />
                  <TierRow
                    tier="Flex"
                    count={cardsByTier.flex.length}
                    description="10-29% inclusion"
                    tone="neutral"
                  />
                  <TierRow
                    tier="Spice"
                    count={cardsByTier.spice.length}
                    description="<10% inclusion"
                    tone="neutral"
                    muted
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-l-2 border-l-[hsl(var(--knd-cyan))]">
                <CardHeader className="knd-panel-header">
                  <CardTitle className="text-lg text-primary">Top Performing Cards</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Cards that correlate with higher win rates.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topPerformingCards.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Insufficient data for analysis.</p>
                    ) : (
                      topPerformingCards.map((card) => (
                        <PerformanceCardRow key={card.card_name} card={card} />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-2 border-l-[hsl(var(--knd-amber))]">
                <CardHeader className="knd-panel-header">
                  <CardTitle className="text-lg text-[hsl(var(--knd-amber))]">
                    Underperforming Cards
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Cards that correlate with lower win rates.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {underperformingCards.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Insufficient data for analysis.</p>
                    ) : (
                      underperformingCards.map((card) => (
                        <PerformanceCardRow key={card.card_name} card={card} isNegative />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> Win rate delta shows the
                  difference between average win rate of decks running this card vs the commander&apos;s
                  baseline. Cards with higher standard deviation have less certainty. Requires minimum
                  3 deck appearances.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {notablePlayers.length > 0 && (
            <TabsContent value="players" className="mt-6">
              <Card>
                <CardHeader className="knd-panel-header">
                  <CardTitle className="text-lg">
                    Notable {normalizeDisplayString(commander.commander_name)} Players
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Players with 2+ tournament entries using this commander.
                  </p>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        <TableHead>Player</TableHead>
                        <TableHead className="text-right">Entries</TableHead>
                        <TableHead className="text-right">Games</TableHead>
                        <TableHead className="text-right">Win Rate</TableHead>
                        <TableHead className="text-right">Top 16s</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notablePlayers.map((player) => (
                        <TableRow key={player.player_name} className="border-border/60">
                          <TableCell className="font-medium">
                            {player.topdeck_id ? (
                              <a
                                href={`https://topdeck.gg/profile/${player.topdeck_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-foreground hover:text-primary"
                              >
                                {player.player_name}
                                <span className="ml-1 text-muted-foreground text-xs">↗</span>
                              </a>
                            ) : (
                              player.player_name
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[hsl(var(--knd-amber))]">
                            {player.entries}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {player.total_games}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {player.win_rate ? (
                              <span
                                className={`${parseFloat(player.win_rate) > 0.25
                                  ? "text-primary"
                                  : parseFloat(player.win_rate) < 0.2
                                    ? "text-[hsl(var(--knd-amber))]"
                                    : "text-muted-foreground"}`}
                              >
                                {(parseFloat(player.win_rate) * 100).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[hsl(var(--knd-amber))]">
                            {player.top_16_count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {matchups.length > 0 && (
            <TabsContent value="matchups" className="mt-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="border-l-2 border-l-[hsl(var(--knd-amber))]">
                  <CardHeader className="knd-panel-header">
                    <CardTitle className="text-lg text-[hsl(var(--knd-amber))]">Tough Matchups</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Lowest win rate against these commanders.
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
                        <p className="text-sm text-muted-foreground">Insufficient statistically significant data.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-2 border-l-[hsl(var(--knd-cyan))]">
                  <CardHeader className="knd-panel-header">
                    <CardTitle className="text-lg text-primary">Favorable Matchups</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Highest win rate against these commanders.
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
                        <p className="text-sm text-muted-foreground">Insufficient statistically significant data.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Note:</strong> Matchup data shows win rates when
                    both commanders appear in the same pod. Requires minimum 20 encounters for statistical
                    significance. In 4-player pods, only direct wins against that opponent are counted.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="cards" className="mt-6">
            <Card>
              <CardHeader className="knd-panel-header">
                <CardTitle className="text-lg">
                  Card Frequencies for {normalizeDisplayString(commander.commander_name)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      <TableHead>Card Name</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Inclusion</TableHead>
                      <TableHead className="text-right">Global Rate</TableHead>
                      <TableHead className="text-right">Win Rate Delta</TableHead>
                      <TableHead className="text-right">Decks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cardReport.map((card) => {
                      const perf = cardPerformanceMap.get(card.card_name);
                      const winRateDelta = perf ? parseFloat(perf.win_rate_delta) * 100 : null;
                      return (
                        <TableRow key={card.card_name} className="border-border/60">
                          <TableCell className="font-medium">
                            <a
                              href={`https://scryfall.com/search?q=${encodeURIComponent(
                                normalizeDisplayString(card.card_name)
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground hover:text-primary"
                            >
                              {normalizeDisplayString(card.card_name)}
                            </a>
                          </TableCell>
                          <TableCell>
                            <TierBadge tier={card.tier} />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(parseFloat(card.inclusion_rate) * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {(parseFloat(card.global_rate) * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {winRateDelta !== null && perf ? (
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className={`${winRateDelta > 0
                                    ? "text-primary"
                                    : winRateDelta < 0
                                      ? "text-[hsl(var(--knd-amber))]"
                                      : "text-muted-foreground"}`}
                                >
                                  {winRateDelta > 0 ? "+" : ""}
                                  {winRateDelta.toFixed(1)}%
                                </span>
                                {(() => {
                                  const stdDev = parseFloat(perf.std_win_rate) * 100;
                                  const zScore = winRateDelta / (stdDev / Math.sqrt(perf.deck_count));
                                  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));
                                  return (
                                    <span
                                      title="Two-sided p-value (normal approximation). Highlighted when p < 0.05."
                                      className={`rounded-full border px-2 py-0.5 text-[10px] ${
                                        pValue < 0.05
                                          ? "border-primary/40 text-primary"
                                          : "border-border/60 text-muted-foreground"
                                      }`}
                                    >
                                      p={formatPValue(pValue)}
                                    </span>
                                  );
                                })()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {card.deck_count}/{card.total_decks}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <p className="mt-3 text-xs text-muted-foreground">
                  P-values are two-sided (normal approximation). Highlighted when p &lt; 0.05.
                </p>
                <p className="text-muted-foreground text-sm mt-4 text-center">
                  Showing all {cardReport.length} cards · {cardPerformance.length} have win rate data (min 3 decks)
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {recentFinishes.length > 0 && (
          <Card className="mt-8">
            <CardHeader className="knd-panel-header">
              <CardTitle className="text-lg">Recent Top Finishes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Most recent Top 16, Top Cut, and 1st-place finishes for this commander.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentFinishes.map((finish) => (
                  <RecentFinishRow key={finish.id} finish={finish} commanderId={commander.commander_id} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
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
      <CardContent className="pt-4 pb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className={`text-xl font-semibold ${toneMap[tone]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ColorBadge({ color, size = "sm" }: { color: string; size?: "sm" | "lg" }) {
  const colors: Record<string, string> = {
    W: "bg-amber-200/80 text-amber-950",
    U: "bg-sky-500/90 text-white",
    B: "bg-purple-900/90 text-purple-100",
    R: "bg-red-500/90 text-white",
    G: "bg-emerald-500/90 text-white",
  };

  const sizeClass = size === "lg" ? "w-8 h-8 text-sm" : "w-5 h-5 text-xs";

  return (
    <span
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold ${
        colors[color] || "bg-slate-500 text-white"
      }`}
    >
      {color}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const tierColors: Record<string, string> = {
    core: "bg-[hsl(var(--knd-cyan))]/15 text-primary border-primary/30",
    essential: "bg-[hsl(var(--knd-cyan))]/10 text-primary border-primary/20",
    common: "bg-[hsl(var(--knd-amber))]/15 text-[hsl(var(--knd-amber))] border-[hsl(var(--knd-amber))]/30",
    flex: "bg-muted/40 text-muted-foreground border-border/60",
    spice: "bg-muted/30 text-muted-foreground border-border/40",
  };

  return (
    <Badge
      variant="outline"
      className={tierColors[tier] || "bg-muted/30 text-muted-foreground border-border/40"}
    >
      {tier}
    </Badge>
  );
}

function TierRow({
  tier,
  count,
  description,
  tone,
  muted = false,
}: {
  tier: string;
  count: number;
  description: string;
  tone: "primary" | "amber" | "neutral";
  muted?: boolean;
}) {
  const toneMap: Record<typeof tone, string> = {
    primary: "text-primary",
    amber: "text-[hsl(var(--knd-amber))]",
    neutral: "text-muted-foreground",
  };

  return (
    <div className="flex justify-between items-center">
      <div>
        <span className={`font-medium ${toneMap[tone]}`}>{tier}</span>
        <span className="text-muted-foreground text-sm ml-2">({description})</span>
      </div>
      <span className={`font-mono font-semibold ${muted ? "text-muted-foreground" : toneMap[tone]}`}>
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

  const deltaClass = isNegative ? "text-[hsl(var(--knd-amber))]" : "text-primary";

  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2">
      <div className="flex-1 min-w-0">
        <a
          href={`https://scryfall.com/search?q=${encodeURIComponent(
            normalizeDisplayString(card.card_name)
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:text-primary truncate block"
        >
          {normalizeDisplayString(card.card_name)}
        </a>
        <p className="text-xs text-muted-foreground">
          {card.deck_count} decks · {inclusionRate.toFixed(0)}% inclusion
        </p>
      </div>
      <div className="text-right ml-4">
        <div className="flex items-center gap-2 justify-end">
          <span className={`font-mono font-semibold ${deltaClass}`}>
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
          <span
            title="Two-sided p-value (normal approximation). Highlighted when p < 0.05."
            className={`rounded-full border px-2 py-0.5 text-[10px] ${
              (() => {
                const zScore = delta / (stdDev / Math.sqrt(card.deck_count));
                const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));
                return pValue < 0.05
                  ? "border-primary/40 text-primary"
                  : "border-border/60 text-muted-foreground";
              })()
            }`}
          >
            {(() => {
              const zScore = delta / (stdDev / Math.sqrt(card.deck_count));
              const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));
              return `p=${formatPValue(pValue)}`;
            })()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
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
  const vsExpected = toNumber(matchup.win_rate_vs_expected) * 100;
  const colorClass = type === "favorable" ? "text-primary" : "text-[hsl(var(--knd-amber))]";

  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2">
      <div className="flex-1 min-w-0">
        <Link
          href={`/commanders/${matchup.opponent_commander_id}`}
          className="text-foreground hover:text-primary truncate block"
        >
          {normalizeDisplayString(matchup.opponent_commander_name)}
        </Link>
        <p className="text-xs text-muted-foreground">
          {matchup.games_played} games · {matchup.wins}W/{matchup.losses}L/{matchup.draws}D
          {matchup.is_statistically_significant && (
            <span className="ml-1 text-[hsl(var(--knd-amber))]">★</span>
          )}
        </p>
      </div>
      <div className="text-right ml-4">
        <span className={`font-mono font-semibold ${colorClass}`}>
          {winRate.toFixed(1)}% WR
        </span>
        <p className="text-xs text-muted-foreground">
          {vsExpected > 0 ? "+" : ""}{vsExpected.toFixed(1)}% vs expected
        </p>
      </div>
    </div>
  );
}

function RecentFinishRow({
  finish,
  commanderId,
}: {
  finish: RecentFinish;
  commanderId: string;
}) {
  const deckHost = (() => {
    if (!finish.decklist_url) return null;
    const url = finish.decklist_url.toLowerCase();
    if (url.includes("moxfield.com")) return "Moxfield";
    if (url.includes("topdeck.gg")) return "TopDeck";
    if (url.includes("archidekt.com")) return "Archidekt";
    return "Decklist";
  })();

  const tournamentUrl = finish.tournament.topdeck_tid
    ? `https://topdeck.gg/event/${finish.tournament.topdeck_tid}`
    : null;
  const topdeckDeckUrl =
    finish.tournament.topdeck_tid && finish.player_handle
      ? `https://topdeck.gg/deck/${finish.tournament.topdeck_tid}/@${finish.player_handle}`
      : null;
  const decklistHref = finish.decklist_url || topdeckDeckUrl;

  const dateLabel = new Date(finish.tournament.start_date).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  let medalLabel = "Top 16";
  let medalClass = "border-[hsl(var(--knd-amber))]/40 text-[hsl(var(--knd-amber))]";
  if (finish.final_standing === 1) {
    medalLabel = "1st";
    medalClass = "border-[hsl(var(--knd-amber))]/60 text-[hsl(var(--knd-amber))]";
  } else if (finish.made_top_cut) {
    medalLabel = "Top Cut";
    medalClass = "border-primary/40 text-primary";
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-xs ${medalClass}`}>
            {medalLabel}
          </span>
          {tournamentUrl ? (
            <a
              href={tournamentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-foreground truncate hover:text-primary"
            >
              {normalizeDisplayString(finish.tournament.name)}
            </a>
          ) : (
            <p className="text-sm font-medium text-foreground truncate">
              {normalizeDisplayString(finish.tournament.name)}
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {dateLabel} · {finish.tournament.player_count} players
          {finish.final_standing ? ` · Standing ${finish.final_standing}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {decklistHref ? (
          <a
            href={decklistHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-border/60 px-3 py-1 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            {deckHost || (topdeckDeckUrl ? "TopDeck" : "Decklist")}
          </a>
        ) : null}
      </div>
    </div>
  );
}
