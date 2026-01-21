"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface GlobalCardFrequency {
  card_name: string;
  deck_count: number;
  total_decks: number;
  inclusion_rate: string;
  commander_count: number;
  tier: string;
  top_commanders?: CommanderUsage[];
}

interface CommanderUsage {
  commander_id: string;
  commander: string;
  deck_count: number;
}

const ITEMS_PER_PAGE = 50;

export default function CardsPage() {
  const [cards, setCards] = useState<GlobalCardFrequency[]>([]);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchCards() {
      setLoading(true);

      const { data, error } = await supabase
        .from("card_frequencies_global")
        .select("*")
        .order("inclusion_rate", { ascending: false });

      if (error) {
        console.error("Error fetching card frequencies:", error);
        setLoading(false);
        return;
      }

      const cardData = data as GlobalCardFrequency[];

      // Get commander usage for top 200 cards
      const topCardNames = cardData.slice(0, 200).map((c) => c.card_name);
      const commanderUsage = await getCommanderUsageForCards(topCardNames);

      const cardsWithCommanders = cardData.map((card, index) => ({
        ...card,
        top_commanders: index < 200 ? commanderUsage.get(card.card_name) || [] : [],
      }));

      setCards(cardsWithCommanders);
      setLoading(false);
    }

    fetchCards();
  }, []);

  async function getCommanderUsageForCards(
    cardNames: string[]
  ): Promise<Map<string, CommanderUsage[]>> {
    if (cardNames.length === 0) return new Map();

    const { data, error } = await supabase
      .from("card_frequencies_by_commander")
      .select("card_name, commander_id, commander, deck_count")
      .in("card_name", cardNames)
      .order("deck_count", { ascending: false });

    if (error) {
      console.error("Error fetching commander usage:", error);
      return new Map();
    }

    const usageMap = new Map<string, CommanderUsage[]>();
    for (const row of data || []) {
      const existing = usageMap.get(row.card_name) || [];
      if (existing.length < 3) {
        existing.push({
          commander_id: row.commander_id,
          commander: row.commander,
          deck_count: row.deck_count,
        });
        usageMap.set(row.card_name, existing);
      }
    }
    return usageMap;
  }

  // Filter cards
  const filteredCards = cards.filter((card) => {
    const matchesTier = tierFilter === "all" || card.tier === tierFilter;
    const matchesSearch =
      searchQuery === "" ||
      card.card_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  });

  // Paginated cards
  const displayedCards = filteredCards.slice(0, displayCount);
  const hasMore = displayCount < filteredCards.length;

  // Tier counts
  const tierCounts = {
    core: cards.filter((c) => c.tier === "core").length,
    essential: cards.filter((c) => c.tier === "essential").length,
    common: cards.filter((c) => c.tier === "common").length,
    flex: cards.filter((c) => c.tier === "flex").length,
    spice: cards.filter((c) => c.tier === "spice").length,
  };

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
            Card Frequency Analysis
          </h1>
          <p className="text-[#a1a1aa] mt-2">
            Global inclusion rates across {cards[0]?.total_decks?.toLocaleString() || 0} analyzed decklists
          </p>
        </div>

        {/* Tier Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <TierCard tier="Core" count={tierCounts.core} description="80%+" color="#22c55e" />
          <TierCard tier="Essential" count={tierCounts.essential} description="60-79%" color="#84cc16" />
          <TierCard tier="Common" count={tierCounts.common} description="30-59%" color="#f59e0b" />
          <TierCard tier="Flex" count={tierCounts.flex} description="10-29%" color="#8b5cf6" />
          <TierCard tier="Spice" count={tierCounts.spice} description="<10%" color="#ef4444" />
        </div>

        {/* Filters */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-[#a1a1aa] text-sm mb-2 block">Search Cards</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setDisplayCount(ITEMS_PER_PAGE);
                  }}
                  placeholder="Search by card name..."
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#c9a227]"
                />
              </div>
              <div>
                <label className="text-[#a1a1aa] text-sm mb-2 block">Filter by Tier</label>
                <select
                  value={tierFilter}
                  onChange={(e) => {
                    setTierFilter(e.target.value);
                    setDisplayCount(ITEMS_PER_PAGE);
                  }}
                  className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#c9a227]"
                >
                  <option value="all">All Tiers</option>
                  <option value="core">Core (80%+)</option>
                  <option value="essential">Essential (60-79%)</option>
                  <option value="common">Common (30-59%)</option>
                  <option value="flex">Flex (10-29%)</option>
                  <option value="spice">Spice (&lt;10%)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards Table */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-[#fafafa]">
              {tierFilter === "all" ? "All Cards" : `${tierFilter.charAt(0).toUpperCase() + tierFilter.slice(1)} Cards`}{" "}
              ({filteredCards.length.toLocaleString()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-[#a1a1aa]">Loading...</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#2a2a2a] hover:bg-[#1a1a1a]">
                        <TableHead className="text-[#a1a1aa]">Rank</TableHead>
                        <TableHead className="text-[#a1a1aa]">Card Name</TableHead>
                        <TableHead className="text-[#a1a1aa]">Tier</TableHead>
                        <TableHead className="text-[#a1a1aa] text-right">Inclusion</TableHead>
                        <TableHead className="text-[#a1a1aa] text-right">Decks</TableHead>
                        <TableHead className="text-[#a1a1aa]">Top Commanders</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedCards.map((card, index) => (
                        <TableRow
                          key={card.card_name}
                          className="border-[#2a2a2a] hover:bg-[#252525]"
                        >
                          <TableCell className="font-mono text-[#a1a1aa]">
                            #{index + 1}
                          </TableCell>
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
                            <InclusionBar rate={parseFloat(card.inclusion_rate)} />
                          </TableCell>
                          <TableCell className="text-right font-mono text-[#a1a1aa]">
                            {card.deck_count.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {card.top_commanders && card.top_commanders.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {card.top_commanders.map((commander) => (
                                  <Link
                                    key={commander.commander_id}
                                    href={`/commanders/${commander.commander_id}`}
                                    className="text-xs px-1.5 py-0.5 rounded bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors truncate max-w-[120px]"
                                    title={`${commander.commander} (${commander.deck_count} decks)`}
                                  >
                                    {commander.commander.split(" / ")[0]}
                                  </Link>
                                ))}
                                {card.commander_count > 3 && (
                                  <span className="text-xs text-[#a1a1aa] px-1">
                                    +{card.commander_count - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#a1a1aa] text-xs">{card.commander_count} commanders</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {hasMore && (
                  <div className="flex flex-col items-center gap-2 mt-6 pt-4 border-t border-[#2a2a2a]">
                    <p className="text-[#a1a1aa] text-sm">
                      Showing {displayedCards.length.toLocaleString()} of {filteredCards.length.toLocaleString()} cards
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setDisplayCount((c) => c + ITEMS_PER_PAGE)}
                      className="bg-[#1a1a1a] border-[#2a2a2a] text-[#fafafa] hover:bg-[#252525]"
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function TierCard({
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
    <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-medium" style={{ color }}>{tier}</span>
        </div>
        <p className="text-2xl font-bold font-mono text-[#fafafa]">{count}</p>
        <p className="text-xs text-[#a1a1aa]">{description} inclusion</p>
      </CardContent>
    </Card>
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
    <Badge variant="outline" className={tierColors[tier] || "bg-gray-500/20 text-gray-400"}>
      {tier}
    </Badge>
  );
}

function InclusionBar({ rate }: { rate: number }) {
  const percentage = rate * 100;
  const color =
    percentage >= 80
      ? "#22c55e"
      : percentage >= 60
      ? "#84cc16"
      : percentage >= 30
      ? "#f59e0b"
      : percentage >= 10
      ? "#8b5cf6"
      : "#ef4444";

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <span style={{ color }} className="w-14 text-right">
        {percentage.toFixed(1)}%
      </span>
    </div>
  );
}
