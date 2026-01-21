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
import Link from "next/link";

export const dynamic = "force-dynamic";

interface GlobalCardFrequency {
  card_name: string;
  deck_count: number;
  total_decks: number;
  inclusion_rate: string;
  commander_count: number;
  tier: string;
}

async function getCardFrequencies() {
  const { data, error } = await supabase
    .from("card_frequencies_global")
    .select("*")
    .order("inclusion_rate", { ascending: false });

  if (error) {
    console.error("Error fetching card frequencies:", error);
    return [];
  }
  return data as GlobalCardFrequency[];
}

export default async function CardsPage() {
  const cards = await getCardFrequencies();

  // Group by tier for summary
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
            Global inclusion rates across {cards[0]?.total_decks.toLocaleString() || 0} analyzed decklists
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

        {/* Cards Table */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-[#fafafa]">
              All Cards ({cards.length.toLocaleString()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <TableHead className="text-[#a1a1aa]">Rank</TableHead>
                    <TableHead className="text-[#a1a1aa]">Card Name</TableHead>
                    <TableHead className="text-[#a1a1aa]">Tier</TableHead>
                    <TableHead className="text-[#a1a1aa] text-right">Inclusion Rate</TableHead>
                    <TableHead className="text-[#a1a1aa] text-right">Deck Count</TableHead>
                    <TableHead className="text-[#a1a1aa] text-right">Commanders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.slice(0, 200).map((card, index) => (
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
                      <TableCell className="text-right font-mono text-[#8b5cf6]">
                        {card.commander_count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {cards.length > 200 && (
                <p className="text-[#a1a1aa] text-sm mt-4 text-center">
                  Showing 200 of {cards.length.toLocaleString()} cards
                </p>
              )}
            </div>
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
