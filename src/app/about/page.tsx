import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export const metadata = {
  title: "About | cEDH Analytics",
  description:
    "Methodology, statistics, and technical details behind cEDH Analytics",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-[#a1a1aa] hover:text-[#fafafa] text-sm mb-4 inline-block"
          >
            &larr; Back to Home
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#c9a227] to-[#8b5cf6] bg-clip-text text-transparent">
            About cEDH Analytics
          </h1>
          <p className="text-[#a1a1aa] mt-2">
            Methodology, statistics, and technical details
          </p>
        </div>

        {/* Data Inclusion Criteria */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] mb-8">
          <CardHeader>
            <CardTitle className="text-[#c9a227]">Data Inclusion Criteria</CardTitle>
          </CardHeader>
          <CardContent className="text-[#a1a1aa] space-y-4">
            <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#c9a227]/30">
              <p className="text-[#fafafa] font-medium mb-2">
                All findings are based on events with 32+ players
              </p>
              <p className="text-sm">
                We only include tournaments with at least 32 participants to ensure
                statistical relevance. Smaller events are excluded as they don&apos;t
                provide enough data points to draw meaningful conclusions about
                commander performance.
              </p>
            </div>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Tournament data sourced from TopDeck.gg API</li>
              <li>Only completed tournaments with published standings are included</li>
              <li>Decklist data parsed and normalized for card frequency analysis</li>
              <li>Partner commanders are tracked as a single combined commander identity</li>
            </ul>
          </CardContent>
        </Card>

        {/* Primary Statistics */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] mb-8">
          <CardHeader>
            <CardTitle className="text-[#22c55e]">Primary Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <StatisticSection
              title="Win Rate"
              formula="Win Rate = Wins / Total Games"
              description="The percentage of games won by a commander. In a 4-player pod, the expected (baseline) win rate is 25% - anything above this indicates above-average performance."
              example="A commander with 150 wins in 500 games has a 30% win rate (150/500 = 0.30), which is 5 percentage points above expected."
            />

            <StatisticSection
              title="Conversion Rate (Top 16)"
              formula="Conversion Rate = Top 16 Finishes / Total Entries"
              description="The percentage of tournament entries that result in a Top 16 finish. Higher conversion rates indicate consistently strong performance across multiple tournaments."
              example="A commander with 25 Top 16 finishes from 100 entries has a 25% conversion rate."
            />

            <StatisticSection
              title="Inclusion Rate"
              formula="Inclusion Rate = Decks with Card / Total Decks"
              description="For card analysis, this measures how often a card appears across all decklists for a given commander (or globally). Cards are tiered based on their inclusion rates."
              example="If Sol Ring appears in 95 of 100 decks, its inclusion rate is 95%."
            />

            <StatisticSection
              title="Synergy Score"
              formula="Synergy = Commander Inclusion Rate - Global Inclusion Rate"
              description="Measures how much more (or less) often a card appears in a specific commander's decks compared to the global average. Positive synergy indicates the card is particularly good with that commander."
              example="If Mystic Remora has 85% inclusion in Kinnan decks but only 60% globally, the synergy is +25%."
            />

            <div className="p-4 bg-[#0a0a0a] rounded-lg">
              <h4 className="text-[#fafafa] font-medium mb-2">Card Tiers</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <div className="text-center p-2 rounded bg-green-500/20">
                  <span className="text-green-400 font-bold">Core</span>
                  <p className="text-[#a1a1aa]">80%+ inclusion</p>
                </div>
                <div className="text-center p-2 rounded bg-lime-500/20">
                  <span className="text-lime-400 font-bold">Essential</span>
                  <p className="text-[#a1a1aa]">60-79%</p>
                </div>
                <div className="text-center p-2 rounded bg-amber-500/20">
                  <span className="text-amber-400 font-bold">Common</span>
                  <p className="text-[#a1a1aa]">30-59%</p>
                </div>
                <div className="text-center p-2 rounded bg-purple-500/20">
                  <span className="text-purple-400 font-bold">Flex</span>
                  <p className="text-[#a1a1aa]">10-29%</p>
                </div>
                <div className="text-center p-2 rounded bg-red-500/20">
                  <span className="text-red-400 font-bold">Spice</span>
                  <p className="text-[#a1a1aa]">&lt;10%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Survival Analysis */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] mb-8">
          <CardHeader>
            <CardTitle className="text-[#06b6d4]">Survival Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[#a1a1aa]">
            <p>
              Survival analysis tracks the probability of a player &quot;surviving&quot;
              (remaining in contention) through successive rounds of a tournament.
              This is inspired by Kaplan-Meier survival curves used in medical
              research and reliability engineering.
            </p>

            <StatisticSection
              title="Survival Probability"
              formula="S(r) = P(remaining at round r) = (Players at r) / (Total starting players)"
              description="The survival probability at round r represents the fraction of original players who are still in the tournament at that point. Players 'drop' when they accumulate enough losses or voluntarily withdraw."
            />

            <StatisticSection
              title="Cumulative Survival"
              formula="S(r) = S(r-1) × (1 - drop_rate(r))"
              description="Each round's survival builds on the previous round. If 90% survive round 1 and 85% of those survive round 2, the cumulative survival at round 2 is 0.90 × 0.85 = 76.5%."
            />

            <div className="p-4 bg-[#0a0a0a] rounded-lg">
              <h4 className="text-[#fafafa] font-medium mb-2">Interpreting Survival Curves</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>
                  <strong className="text-[#22c55e]">Steeper drop</strong> = Higher
                  elimination rate at that round
                </li>
                <li>
                  <strong className="text-[#c9a227]">Flat sections</strong> = Most
                  players surviving that phase
                </li>
                <li>
                  Compare seat positions to identify turn order advantages
                </li>
                <li>
                  Compare commanders to see which have better long-term tournament
                  staying power
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Statistical Significance */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] mb-8">
          <CardHeader>
            <CardTitle className="text-[#8b5cf6]">Statistical Significance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[#a1a1aa]">
            <p>
              Not all observed differences are meaningful. Statistical significance
              helps us determine whether an observed effect (like a commander&apos;s
              win rate being above 25%) is likely real or just due to random chance.
            </p>

            <StatisticSection
              title="Sample Size Requirements"
              description="We require minimum sample sizes before drawing conclusions. A commander with 5 entries and a 60% win rate is far less reliable than one with 500 entries and a 28% win rate."
            />

            <div className="p-4 bg-[#0a0a0a] rounded-lg">
              <h4 className="text-[#fafafa] font-medium mb-2">Confidence Levels</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-[#c9a227]">★</span>
                  <span className="text-[#22c55e] font-medium w-20">High</span>
                  <span>100+ games - Strong statistical confidence</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#a1a1aa]">★</span>
                  <span className="text-[#c9a227] font-medium w-20">Medium</span>
                  <span>30-99 games - Moderate confidence, interpret with caution</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#a1a1aa]/50">★</span>
                  <span className="text-[#ef4444] font-medium w-20">Low</span>
                  <span>10-29 games - Low confidence, high variance expected</span>
                </div>
              </div>
            </div>

            <StatisticSection
              title="P-Value"
              formula="p < 0.05 indicates statistical significance"
              description="The p-value represents the probability of observing results at least as extreme as the actual results, assuming the null hypothesis is true. In our context, if a commander's win rate appears higher than 25%, the p-value tells us how likely we'd see this by random chance."
            />
          </CardContent>
        </Card>

        {/* Chi-Square Test */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] mb-8">
          <CardHeader>
            <CardTitle className="text-[#ef4444]">Chi-Square Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[#a1a1aa]">
            <p>
              The Chi-square (χ²) test is used to determine whether observed
              frequencies differ significantly from expected frequencies. We use
              it to analyze turn order fairness and categorical distributions.
            </p>

            <StatisticSection
              title="Chi-Square Formula"
              formula="χ² = Σ [(Observed - Expected)² / Expected]"
              description="For each category (e.g., each seat position), we calculate the squared difference between observed and expected values, divided by the expected value. The sum across all categories gives us the chi-square statistic."
              example="If seat 1 has 28% wins (expected 25%), and we have 1000 games, χ² contribution = (280-250)²/250 = 3.6"
            />

            <div className="p-4 bg-[#0a0a0a] rounded-lg">
              <h4 className="text-[#fafafa] font-medium mb-2">Turn Order Analysis</h4>
              <p className="text-sm mb-3">
                We use chi-square tests to determine if turn order creates a
                statistically significant advantage:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>
                  <strong>Null hypothesis:</strong> All seat positions have equal
                  25% win rate
                </li>
                <li>
                  <strong>Alternative:</strong> At least one seat position differs
                  significantly
                </li>
                <li>
                  <strong>Degrees of freedom:</strong> df = (number of seats - 1) = 3
                </li>
                <li>
                  <strong>Critical value:</strong> χ² &gt; 7.815 at p &lt; 0.05
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Trap and Spice Methodology */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] mb-8">
          <CardHeader>
            <CardTitle className="text-[#f59e0b]">Trap &amp; Spice Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[#a1a1aa]">
            <StatisticSection
              title="Trap Score"
              formula="Trap Score = Inclusion Rate × |Baseline WR - Card WR|"
              description="Identifies popular cards that underperform. Cards with high inclusion rates but below-baseline win rates are 'traps' - widely played despite hurting your chances. The trap score weights by inclusion rate so commonly-played underperformers rank higher."
            />

            <StatisticSection
              title="Spice Identification"
              formula="Spice = Low Inclusion Rate + High Win Rate Delta"
              description="Hidden gems are cards with &lt;10% inclusion but significantly above-baseline win rates. These rarely-played cards may offer competitive advantages that the meta hasn't discovered yet."
            />

            <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#f59e0b]/30">
              <h4 className="text-[#fafafa] font-medium mb-2">Important Caveats</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>
                  <strong>Correlation ≠ Causation:</strong> A card&apos;s correlation
                  with win rate doesn&apos;t mean it causes wins
                </li>
                <li>
                  <strong>Confounding factors:</strong> Better players may play
                  certain cards, skewing results
                </li>
                <li>
                  <strong>Meta context:</strong> A card&apos;s effectiveness depends
                  on the current meta
                </li>
                <li>
                  <strong>Sample size:</strong> Low-inclusion cards have high variance
                  in their statistics
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Technology Stack */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] mb-8">
          <CardHeader>
            <CardTitle className="text-[#fafafa]">Technology Stack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TechCard
                title="Frontend"
                items={[
                  { name: "Next.js 16", desc: "React framework with App Router" },
                  { name: "TypeScript", desc: "Type-safe development" },
                  { name: "Tailwind CSS", desc: "Utility-first styling" },
                  { name: "Recharts", desc: "Data visualization" },
                  { name: "Radix UI", desc: "Accessible component primitives" },
                ]}
              />
              <TechCard
                title="Backend"
                items={[
                  { name: "Supabase", desc: "PostgreSQL database + API" },
                  { name: "Materialized Views", desc: "Pre-computed statistics" },
                  { name: "RPC Functions", desc: "Complex queries in PL/pgSQL" },
                  { name: "Edge Functions", desc: "Serverless compute" },
                ]}
              />
              <TechCard
                title="Data Pipeline"
                items={[
                  { name: "TopDeck.gg API", desc: "Tournament data source" },
                  { name: "Python ETL", desc: "Data extraction and loading" },
                  { name: "Scheduled Jobs", desc: "Regular data refreshes" },
                ]}
              />
              <TechCard
                title="Infrastructure"
                items={[
                  { name: "Vercel", desc: "Frontend hosting + CDN" },
                  { name: "Supabase Cloud", desc: "Managed PostgreSQL" },
                  { name: "GitHub Actions", desc: "CI/CD pipeline" },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact / Contributing */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-[#fafafa]">Questions &amp; Feedback</CardTitle>
          </CardHeader>
          <CardContent className="text-[#a1a1aa]">
            <p className="mb-4">
              Have questions about the methodology or found an issue with the data?
              We welcome feedback and contributions.
            </p>
            <div className="flex gap-4">
              <Link
                href="https://github.com"
                className="px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md hover:border-[#c9a227] transition-colors"
              >
                View on GitHub
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatisticSection({
  title,
  formula,
  description,
  example,
}: {
  title: string;
  formula?: string;
  description: string;
  example?: string;
}) {
  return (
    <div className="border-l-2 border-[#2a2a2a] pl-4">
      <h4 className="text-[#fafafa] font-medium mb-1">{title}</h4>
      {formula && (
        <code className="block text-sm text-[#c9a227] bg-[#0a0a0a] px-2 py-1 rounded mb-2 font-mono">
          {formula}
        </code>
      )}
      <p className="text-sm text-[#a1a1aa]">{description}</p>
      {example && (
        <p className="text-sm text-[#71717a] mt-2 italic">Example: {example}</p>
      )}
    </div>
  );
}

function TechCard({
  title,
  items,
}: {
  title: string;
  items: { name: string; desc: string }[];
}) {
  return (
    <div className="p-4 bg-[#0a0a0a] rounded-lg">
      <h4 className="text-[#fafafa] font-medium mb-3">{title}</h4>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.name} className="text-sm">
            <span className="text-[#c9a227] font-medium">{item.name}</span>
            <span className="text-[#a1a1aa]"> - {item.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
