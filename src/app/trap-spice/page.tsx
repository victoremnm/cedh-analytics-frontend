"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TrapCard {
  card_name: string;
  deck_count: number;
  inclusion_rate: string;
  avg_win_rate: string;
  baseline_win_rate: string;
  win_rate_delta: string;
  top_16_rate: string;
  commander_count: number;
  trap_score: string;
  top_commanders?: CommanderUsage[];
}

interface SpiceCard {
  card_name: string;
  deck_count: number;
  inclusion_rate: string;
  avg_win_rate: string;
  baseline_win_rate: string;
  win_rate_delta: string;
  top_16_rate: string;
  commander_count: number;
  top_commanders?: CommanderUsage[];
}

interface CommanderUsage {
  commander_id: string;
  commander: string;
  deck_count: number;
  inclusion_rate: string;
}

interface Commander {
  commander_id: string;
  commander_name: string;
  total_entries: number;
}

const ITEMS_PER_PAGE = 20;

export default function TrapSpicePage() {
  const [commanders, setCommanders] = useState<Commander[]>([]);
  const [selectedCommander, setSelectedCommander] = useState<string>("");
  const [trapCards, setTrapCards] = useState<TrapCard[]>([]);
  const [spiceCards, setSpiceCards] = useState<SpiceCard[]>([]);
  const [trapPage, setTrapPage] = useState(1);
  const [spicePage, setSpicePage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Fetch commanders for dropdown
  useEffect(() => {
    async function fetchCommanders() {
      const { data, error } = await supabase
        .from("commander_stats")
        .select("commander_id, commander_name, total_entries")
        .gt("total_entries", 10)
        .order("total_entries", { ascending: false });

      if (!error && data) {
        setCommanders(data);
      }
    }
    fetchCommanders();
  }, []);

  // Fetch trap and spice cards
  useEffect(() => {
    async function fetchCards() {
      setLoading(true);
      setTrapPage(1);
      setSpicePage(1);

      // Fetch trap cards
      const { data: trapData } = await supabase
        .from("trap_cards_report")
        .select("*")
        .order("trap_score", { ascending: false })
        .limit(100);

      // Fetch spice cards
      const { data: spiceData } = await supabase
        .from("spice_cards_report")
        .select("*")
        .order("win_rate_delta", { ascending: false })
        .limit(100);

      const allCardNames = [
        ...(trapData || []).map((c) => c.card_name),
        ...(spiceData || []).map((c) => c.card_name),
      ];

      // Fetch commander usage for all cards
      const commanderUsage = await getCommanderUsageForCards(allCardNames);

      const trapsWithCommanders = (trapData || []).map((card) => ({
        ...card,
        top_commanders: commanderUsage.get(card.card_name) || [],
      }));

      const spicesWithCommanders = (spiceData || []).map((card) => ({
        ...card,
        top_commanders: commanderUsage.get(card.card_name) || [],
      }));

      setTrapCards(trapsWithCommanders);
      setSpiceCards(spicesWithCommanders);
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
      .select("card_name, commander_id, commander, deck_count, inclusion_rate")
      .in("card_name", cardNames)
      .order("deck_count", { ascending: false });

    if (error) {
      console.error("Error fetching commander usage:", error);
      return new Map();
    }

    const usageMap = new Map<string, CommanderUsage[]>();
    for (const row of data || []) {
      const existing = usageMap.get(row.card_name) || [];
      if (existing.length < 10) {
        existing.push({
          commander_id: row.commander_id,
          commander: row.commander,
          deck_count: row.deck_count,
          inclusion_rate: row.inclusion_rate,
        });
        usageMap.set(row.card_name, existing);
      }
    }
    return usageMap;
  }

  // Filter cards by selected commander
  const filteredTrapCards = selectedCommander
    ? trapCards.filter((card) =>
        card.top_commanders?.some((c) => c.commander_id === selectedCommander)
      )
    : trapCards;

  const filteredSpiceCards = selectedCommander
    ? spiceCards.filter((card) =>
        card.top_commanders?.some((c) => c.commander_id === selectedCommander)
      )
    : spiceCards;

  // Paginated results
  const paginatedTrapCards = filteredTrapCards.slice(0, trapPage * ITEMS_PER_PAGE);
  const paginatedSpiceCards = filteredSpiceCards.slice(0, spicePage * ITEMS_PER_PAGE);

  const hasMoreTraps = paginatedTrapCards.length < filteredTrapCards.length;
  const hasMoreSpice = paginatedSpiceCards.length < filteredSpiceCards.length;

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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#ef4444] to-[#22c55e] bg-clip-text text-transparent">
            Trap & Spice Cards
          </h1>
          <p className="text-[#a1a1aa] mt-2">
            Find overrated cards to cut and hidden gems to try
          </p>
        </div>

        {/* Commander Filter */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label className="text-[#a1a1aa] text-sm font-medium whitespace-nowrap">
                Filter by Commander:
              </label>
              <select
                value={selectedCommander}
                onChange={(e) => setSelectedCommander(e.target.value)}
                className="flex-1 max-w-md bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-2 text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#c9a227]"
              >
                <option value="">All Commanders (Global)</option>
                {commanders.map((c) => (
                  <option key={c.commander_id} value={c.commander_id}>
                    {c.commander_name} ({c.total_entries} entries)
                  </option>
                ))}
              </select>
              {selectedCommander && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCommander("")}
                  className="bg-[#1a1a1a] border-[#2a2a2a] text-[#fafafa] hover:bg-[#252525]"
                >
                  Clear Filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Explanation */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-bold text-[#ef4444] mb-2">
                  Trap Cards
                </h3>
                <p className="text-[#a1a1aa] text-sm">
                  Popular cards that underperform. These have high inclusion rates but
                  below-average win rates. Consider cutting them from your deck despite
                  their popularity.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#22c55e] mb-2">
                  Spice Cards
                </h3>
                <p className="text-[#a1a1aa] text-sm">
                  Hidden gems with low inclusion but high win rates. These rarely-played
                  cards overperform when included. Consider trying them in your deck.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12 text-[#a1a1aa]">Loading...</div>
        ) : (
          <>
            {/* Two-panel layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trap Cards Panel */}
              <Card className="bg-[#1a1a1a] border-[#2a2a2a] border-l-4 border-l-[#ef4444]">
                <CardHeader>
                  <CardTitle className="text-[#ef4444] flex items-center gap-2">
                    Trap Cards ({filteredTrapCards.length})
                  </CardTitle>
                  <p className="text-[#a1a1aa] text-sm">
                    Popular cards with below-average win rates
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paginatedTrapCards.length === 0 ? (
                      <p className="text-[#a1a1aa] text-sm">
                        No trap cards found for this commander.
                      </p>
                    ) : (
                      paginatedTrapCards.map((card) => (
                        <CardWithCommanders
                          key={card.card_name}
                          card={card}
                          type="trap"
                          highlightCommander={selectedCommander}
                        />
                      ))
                    )}
                    {hasMoreTraps && (
                      <Button
                        variant="outline"
                        className="w-full bg-[#0a0a0a] border-[#2a2a2a] text-[#fafafa] hover:bg-[#252525]"
                        onClick={() => setTrapPage((p) => p + 1)}
                      >
                        Show More ({filteredTrapCards.length - paginatedTrapCards.length} remaining)
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Spice Cards Panel */}
              <Card className="bg-[#1a1a1a] border-[#2a2a2a] border-l-4 border-l-[#22c55e]">
                <CardHeader>
                  <CardTitle className="text-[#22c55e] flex items-center gap-2">
                    Spice Cards ({filteredSpiceCards.length})
                  </CardTitle>
                  <p className="text-[#a1a1aa] text-sm">
                    Hidden gems with above-average win rates
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paginatedSpiceCards.length === 0 ? (
                      <p className="text-[#a1a1aa] text-sm">
                        No spice cards found for this commander.
                      </p>
                    ) : (
                      paginatedSpiceCards.map((card) => (
                        <CardWithCommanders
                          key={card.card_name}
                          card={card}
                          type="spice"
                          highlightCommander={selectedCommander}
                        />
                      ))
                    )}
                    {hasMoreSpice && (
                      <Button
                        variant="outline"
                        className="w-full bg-[#0a0a0a] border-[#2a2a2a] text-[#fafafa] hover:bg-[#252525]"
                        onClick={() => setSpicePage((p) => p + 1)}
                      >
                        Show More ({filteredSpiceCards.length - paginatedSpiceCards.length} remaining)
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Methodology Note */}
            <Card className="bg-[#1a1a1a] border-[#2a2a2a] mt-8">
              <CardHeader>
                <CardTitle className="text-[#fafafa]">Methodology</CardTitle>
              </CardHeader>
              <CardContent className="text-[#a1a1aa] space-y-2">
                <p>
                  <strong className="text-[#ef4444]">Trap Score</strong> = Inclusion Rate ×
                  |Baseline Win Rate - Card Win Rate| for cards with negative delta
                </p>
                <p>
                  <strong className="text-[#22c55e]">Spice Cards</strong> are filtered for cards
                  with &lt;10% inclusion but significant positive win rate delta
                </p>
                <p className="text-sm italic">
                  Note: Low sample sizes can skew results. Cards with very few appearances may
                  show extreme win rates due to variance. Consider the deck count when
                  evaluating spice cards.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function CardWithCommanders({
  card,
  type,
  highlightCommander,
}: {
  card: TrapCard | SpiceCard;
  type: "trap" | "spice";
  highlightCommander?: string;
}) {
  const delta = parseFloat(card.win_rate_delta) * 100;
  const winRate = parseFloat(card.avg_win_rate) * 100;
  const inclusionRate = parseFloat(card.inclusion_rate) * 100;
  const color = type === "trap" ? "#ef4444" : "#22c55e";

  return (
    <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a]">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <a
            href={`https://scryfall.com/search?q=${encodeURIComponent(card.card_name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:text-[#c9a227] transition-colors"
          >
            {card.card_name}
          </a>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            {card.deck_count} decks · {card.commander_count} commanders
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono font-bold" style={{ color }}>
            {type === "spice" && delta > 0 ? "+" : ""}
            {delta.toFixed(2)}%
          </p>
          <p className="text-xs text-[#a1a1aa]">
            {winRate.toFixed(1)}% WR · {inclusionRate.toFixed(0)}% incl
          </p>
        </div>
      </div>

      {/* Commander Breakdown */}
      {card.top_commanders && card.top_commanders.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
          <p className="text-xs text-[#a1a1aa] mb-2">Top commanders using this card:</p>
          <div className="flex flex-wrap gap-2">
            {card.top_commanders.map((commander) => (
              <Link
                key={commander.commander_id}
                href={`/commanders/${commander.commander_id}`}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  highlightCommander === commander.commander_id
                    ? "bg-[#c9a227] text-[#0a0a0a]"
                    : "bg-[#1a1a1a] hover:bg-[#252525]"
                }`}
              >
                <span className={highlightCommander === commander.commander_id ? "text-[#0a0a0a]" : "text-[#fafafa]"}>
                  {commander.commander.split(" / ")[0]}
                </span>
                <span className={`ml-1 ${highlightCommander === commander.commander_id ? "text-[#0a0a0a]/70" : "text-[#a1a1aa]"}`}>
                  ({commander.deck_count})
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
