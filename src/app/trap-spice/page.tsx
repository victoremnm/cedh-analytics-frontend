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
}

async function getTrapCards() {
  const { data, error } = await supabase
    .from("trap_cards_report")
    .select("*")
    .order("trap_score", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching trap cards:", error);
    return [];
  }
  return data as TrapCard[];
}

async function getSpiceCards() {
  const { data, error } = await supabase
    .from("spice_cards_report")
    .select("*")
    .order("win_rate_delta", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching spice cards:", error);
    return [];
  }
  return data as SpiceCard[];
}

export default async function TrapSpicePage() {
  const [trapCards, spiceCards] = await Promise.all([
    getTrapCards(),
    getSpiceCards(),
  ]);

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

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trap Cards Panel */}
          <Card className="bg-[#1a1a1a] border-[#2a2a2a] border-l-4 border-l-[#ef4444]">
            <CardHeader>
              <CardTitle className="text-[#ef4444] flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Trap Cards ({trapCards.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2a2a2a] hover:bg-[#1a1a1a]">
                      <TableHead className="text-[#a1a1aa]">Card</TableHead>
                      <TableHead className="text-[#a1a1aa] text-right">Inclusion</TableHead>
                      <TableHead className="text-[#a1a1aa] text-right">Win Rate</TableHead>
                      <TableHead className="text-[#a1a1aa] text-right">Delta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trapCards.map((card) => (
                      <TableRow
                        key={card.card_name}
                        className="border-[#2a2a2a] hover:bg-[#252525]"
                      >
                        <TableCell>
                          <a
                            href={`https://scryfall.com/search?q=${encodeURIComponent(card.card_name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-[#c9a227] transition-colors"
                          >
                            {card.card_name}
                          </a>
                          <p className="text-xs text-[#a1a1aa]">
                            {card.deck_count} decks · {card.commander_count} commanders
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-[#a1a1aa]">
                          {(parseFloat(card.inclusion_rate) * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {(parseFloat(card.avg_win_rate) * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right font-mono text-[#ef4444]">
                          {(parseFloat(card.win_rate_delta) * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Spice Cards Panel */}
          <Card className="bg-[#1a1a1a] border-[#2a2a2a] border-l-4 border-l-[#22c55e]">
            <CardHeader>
              <CardTitle className="text-[#22c55e] flex items-center gap-2">
                <span className="text-2xl">✨</span>
                Spice Cards ({spiceCards.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2a2a2a] hover:bg-[#1a1a1a]">
                      <TableHead className="text-[#a1a1aa]">Card</TableHead>
                      <TableHead className="text-[#a1a1aa] text-right">Inclusion</TableHead>
                      <TableHead className="text-[#a1a1aa] text-right">Win Rate</TableHead>
                      <TableHead className="text-[#a1a1aa] text-right">Delta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spiceCards.map((card) => (
                      <TableRow
                        key={card.card_name}
                        className="border-[#2a2a2a] hover:bg-[#252525]"
                      >
                        <TableCell>
                          <a
                            href={`https://scryfall.com/search?q=${encodeURIComponent(card.card_name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-[#c9a227] transition-colors"
                          >
                            {card.card_name}
                          </a>
                          <p className="text-xs text-[#a1a1aa]">
                            {card.deck_count} decks · {card.commander_count} commanders
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-[#a1a1aa]">
                          {(parseFloat(card.inclusion_rate) * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {(parseFloat(card.avg_win_rate) * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right font-mono text-[#22c55e]">
                          +{(parseFloat(card.win_rate_delta) * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
      </main>
    </div>
  );
}
