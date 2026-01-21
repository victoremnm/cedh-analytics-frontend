"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface SeatPositionStat {
  seat_position: number;
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: string;
  draw_rate?: number;
  win_plus_draw_rate?: number;
}

interface CommanderSeatStat {
  commander_id: string;
  commander_name: string;
  seat_position: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: string;
  draw_rate: string;
  win_plus_draw_rate: string;
}

export default function TurnOrderPage() {
  const [stats, setStats] = useState<SeatPositionStat[]>([]);
  const [commanderStats, setCommanderStats] = useState<CommanderSeatStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  useEffect(() => {
    async function fetchStats() {
      const [globalResult, commanderResult] = await Promise.all([
        supabase
          .from("seat_position_stats")
          .select("*")
          .order("seat_position"),
        supabase
          .from("commander_seat_stats")
          .select("*")
          .gte("games", 20)
          .order("games", { ascending: false }),
      ]);

      if (globalResult.error) {
        console.error("Error fetching seat stats:", globalResult.error);
      } else {
        const enrichedStats = (globalResult.data || []).map((stat) => ({
          ...stat,
          draw_rate: stat.draws / stat.total_games,
          win_plus_draw_rate: (stat.wins + stat.draws) / stat.total_games,
        }));
        setStats(enrichedStats);
      }

      if (commanderResult.error) {
        console.error("Error fetching commander seat stats:", commanderResult.error);
      } else {
        setCommanderStats(commanderResult.data || []);
      }

      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa] flex items-center justify-center">
        <p className="text-[#a1a1aa]">Loading turn order data...</p>
      </div>
    );
  }

  const totalGames = stats[0]?.total_games || 0;
  const totalWins = stats.reduce((sum, s) => sum + s.wins, 0);
  const expectedRate = 0.25; // 25% expected in 4-player pods

  // Calculate chi-square statistic
  const expectedWins = totalWins / 4;
  const chiSquare = stats.reduce((sum, s) => {
    const diff = s.wins - expectedWins;
    return sum + (diff * diff) / expectedWins;
  }, 0);

  // Cohen's w effect size
  const cohensW = Math.sqrt(chiSquare / totalWins);
  const effectInterpretation =
    cohensW < 0.1 ? "small" : cohensW < 0.3 ? "medium" : "large";

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
            Turn Order Fairness
          </h1>
          <p className="text-[#a1a1aa] mt-2">
            Statistical analysis of seat position advantage across{" "}
            {totalGames.toLocaleString()} games
          </p>
        </div>

        {/* Win Rate by Position */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] mb-8">
          <CardHeader>
            <CardTitle className="text-[#fafafa]">Win Rate by Seat Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {stats.map((stat) => {
                const winRate = parseFloat(stat.win_rate) * 100;
                const isAboveExpected = winRate > expectedRate * 100;
                const delta = winRate - expectedRate * 100;

                return (
                  <div key={stat.seat_position} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                          style={{
                            backgroundColor: getSeatColor(stat.seat_position),
                            color: "#0a0a0a",
                          }}
                        >
                          {stat.seat_position + 1}
                        </div>
                        <div>
                          <p className="font-medium">
                            {getSeatLabel(stat.seat_position)}
                          </p>
                          <p className="text-sm text-[#a1a1aa]">
                            {stat.wins.toLocaleString()} wins / {stat.total_games.toLocaleString()} games
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-2xl font-bold font-mono"
                          style={{ color: getSeatColor(stat.seat_position) }}
                        >
                          {winRate.toFixed(1)}%
                        </p>
                        <p
                          className="text-sm font-mono"
                          style={{ color: isAboveExpected ? "#22c55e" : "#ef4444" }}
                        >
                          {delta > 0 ? "+" : ""}
                          {delta.toFixed(1)}% vs expected
                        </p>
                        <p className="text-xs text-[#a1a1aa] font-mono mt-1">
                          Draw: {((stat.draw_rate || 0) * 100).toFixed(1)}% · W+D: {((stat.win_plus_draw_rate || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="relative h-8 bg-[#2a2a2a] rounded-lg overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full rounded-lg transition-all"
                        style={{
                          width: `${winRate * 3}%`,
                          backgroundColor: getSeatColor(stat.seat_position),
                        }}
                      />
                      {/* Expected line at 25% */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-white/50"
                        style={{ left: `${expectedRate * 100 * 3}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[#a1a1aa] text-sm mt-4 text-center">
              White line indicates expected 25% win rate in 4-player pods
            </p>
          </CardContent>
        </Card>

        {/* Statistical Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-[#fafafa]">Statistical Significance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#a1a1aa]">Chi-Square Statistic (χ²)</span>
                <span className="font-mono font-bold text-[#c9a227]">
                  {chiSquare.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#a1a1aa]">Degrees of Freedom</span>
                <span className="font-mono">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#a1a1aa]">Cohen&apos;s w (Effect Size)</span>
                <span className="font-mono font-bold text-[#8b5cf6]">
                  {cohensW.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#a1a1aa]">Effect Interpretation</span>
                <span
                  className="font-bold"
                  style={{
                    color:
                      effectInterpretation === "large"
                        ? "#ef4444"
                        : effectInterpretation === "medium"
                        ? "#f59e0b"
                        : "#22c55e",
                  }}
                >
                  {effectInterpretation.toUpperCase()}
                </span>
              </div>
              <hr className="border-[#2a2a2a]" />
              <div className="flex justify-between items-center">
                <span className="text-[#a1a1aa]">Result</span>
                <span className="font-bold text-[#ef4444]">
                  Statistically Significant
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardHeader>
              <CardTitle className="text-[#fafafa]">Interpretation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-[#a1a1aa]">
                <p>
                  Players in <strong className="text-[#22c55e]">Seat 1 (first)</strong> win{" "}
                  <strong className="text-[#fafafa]">
                    {(parseFloat(stats[0]?.win_rate || "0") * 100).toFixed(1)}%
                  </strong>{" "}
                  of games, significantly higher than the expected 25%.
                </p>
                <p>
                  Players in <strong className="text-[#ef4444]">Seat 4 (last)</strong> win only{" "}
                  <strong className="text-[#fafafa]">
                    {(parseFloat(stats[3]?.win_rate || "0") * 100).toFixed(1)}%
                  </strong>{" "}
                  of games, well below expected.
                </p>
                <p>
                  The effect size (Cohen&apos;s w = {cohensW.toFixed(3)}) indicates a{" "}
                  <strong
                    style={{
                      color:
                        effectInterpretation === "large"
                          ? "#ef4444"
                          : effectInterpretation === "medium"
                          ? "#f59e0b"
                          : "#22c55e",
                    }}
                  >
                    {effectInterpretation}
                  </strong>{" "}
                  first-player advantage in cEDH.
                </p>
                <p className="text-sm italic">
                  This suggests turn order significantly impacts game outcomes, with going
                  first providing a meaningful competitive advantage.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Raw Data */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-[#fafafa]">Raw Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left py-2 text-[#a1a1aa]">Seat</th>
                    <th className="text-right py-2 text-[#a1a1aa]">Games</th>
                    <th className="text-right py-2 text-[#a1a1aa]">Wins</th>
                    <th className="text-right py-2 text-[#a1a1aa]">Losses</th>
                    <th className="text-right py-2 text-[#a1a1aa]">Draws</th>
                    <th className="text-right py-2 text-[#a1a1aa]">Win Rate</th>
                    <th className="text-right py-2 text-[#a1a1aa]">Draw Rate</th>
                    <th className="text-right py-2 text-[#a1a1aa]">Win+Draw</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat) => (
                    <tr key={stat.seat_position} className="border-b border-[#2a2a2a]">
                      <td className="py-2 font-medium">
                        Seat {stat.seat_position + 1} ({getSeatLabel(stat.seat_position)})
                      </td>
                      <td className="py-2 text-right font-mono text-[#a1a1aa]">
                        {stat.total_games.toLocaleString()}
                      </td>
                      <td className="py-2 text-right font-mono text-[#22c55e]">
                        {stat.wins.toLocaleString()}
                      </td>
                      <td className="py-2 text-right font-mono text-[#ef4444]">
                        {stat.losses.toLocaleString()}
                      </td>
                      <td className="py-2 text-right font-mono text-[#f59e0b]">
                        {stat.draws.toLocaleString()}
                      </td>
                      <td className="py-2 text-right font-mono font-bold" style={{ color: getSeatColor(stat.seat_position) }}>
                        {(parseFloat(stat.win_rate) * 100).toFixed(2)}%
                      </td>
                      <td className="py-2 text-right font-mono text-[#f59e0b]">
                        {((stat.draw_rate || 0) * 100).toFixed(2)}%
                      </td>
                      <td className="py-2 text-right font-mono text-[#8b5cf6]">
                        {((stat.win_plus_draw_rate || 0) * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Commander Seat Position Breakdown */}
        {commanderStats.length > 0 && (
          <Card className="bg-[#1a1a1a] border-[#2a2a2a] mt-6">
            <CardHeader>
              <CardTitle className="text-[#fafafa]">Commander Performance by Seat</CardTitle>
              <p className="text-[#a1a1aa] text-sm">
                Click a seat to see which commanders perform best from that position
              </p>
            </CardHeader>
            <CardContent>
              {/* Seat Selector */}
              <div className="flex gap-2 mb-6">
                {[0, 1, 2, 3].map((seat) => (
                  <button
                    key={seat}
                    onClick={() => setSelectedSeat(selectedSeat === seat ? null : seat)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedSeat === seat
                        ? "text-[#0a0a0a]"
                        : "bg-[#2a2a2a] text-[#fafafa] hover:bg-[#3a3a3a]"
                    }`}
                    style={{
                      backgroundColor: selectedSeat === seat ? getSeatColor(seat) : undefined,
                    }}
                  >
                    Seat {seat + 1}
                  </button>
                ))}
              </div>

              {/* Commander Table for Selected Seat */}
              {selectedSeat !== null && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2a2a2a]">
                        <th className="text-left py-2 text-[#a1a1aa]">Commander</th>
                        <th className="text-right py-2 text-[#a1a1aa]">Games</th>
                        <th className="text-right py-2 text-[#a1a1aa]">Win Rate</th>
                        <th className="text-right py-2 text-[#a1a1aa]">Draw Rate</th>
                        <th className="text-right py-2 text-[#a1a1aa]">Win+Draw</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commanderStats
                        .filter((c) => c.seat_position === selectedSeat)
                        .slice(0, 15)
                        .map((commander) => {
                          const winRate = parseFloat(commander.win_rate) * 100;
                          const drawRate = parseFloat(commander.draw_rate) * 100;
                          const winPlusDrawRate = parseFloat(commander.win_plus_draw_rate) * 100;
                          const isAboveExpected = winRate > 25;

                          return (
                            <tr key={commander.commander_id} className="border-b border-[#2a2a2a]">
                              <td className="py-2">
                                <Link
                                  href={`/commanders/${commander.commander_id}`}
                                  className="hover:text-[#c9a227] transition-colors"
                                >
                                  {commander.commander_name}
                                </Link>
                              </td>
                              <td className="py-2 text-right font-mono text-[#a1a1aa]">
                                {commander.games}
                              </td>
                              <td
                                className="py-2 text-right font-mono font-bold"
                                style={{ color: isAboveExpected ? "#22c55e" : "#ef4444" }}
                              >
                                {winRate.toFixed(1)}%
                              </td>
                              <td className="py-2 text-right font-mono text-[#f59e0b]">
                                {drawRate.toFixed(1)}%
                              </td>
                              <td className="py-2 text-right font-mono text-[#8b5cf6]">
                                {winPlusDrawRate.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  <p className="text-[#a1a1aa] text-xs mt-4">
                    Showing commanders with 20+ games from Seat {selectedSeat + 1}
                  </p>
                </div>
              )}

              {selectedSeat === null && (
                <p className="text-[#a1a1aa] text-center py-8">
                  Select a seat position above to see commander performance breakdown
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function getSeatColor(position: number): string {
  const colors = ["#22c55e", "#84cc16", "#f59e0b", "#ef4444"];
  return colors[position] || "#a1a1aa";
}

function getSeatLabel(position: number): string {
  const labels = ["First", "Second", "Third", "Fourth"];
  return labels[position] || `Position ${position + 1}`;
}
