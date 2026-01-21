# Backend Migrations Needed

These SQL functions are required by the frontend. Apply them to the cedh-analytics backend.

## Migration: Notable Players by Commander

**File:** `supabase/migrations/20260121000001_notable_players_function.sql`

```sql
-- Function: Get notable players for a specific commander
-- Returns players with 2+ tournament entries using this commander
CREATE OR REPLACE FUNCTION get_notable_players_for_commander(p_commander_id UUID)
RETURNS TABLE (
    player_name TEXT,
    entries BIGINT,
    total_wins BIGINT,
    total_games BIGINT,
    win_rate NUMERIC,
    top_16_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.name as player_name,
        COUNT(te.id) as entries,
        SUM(te.wins)::BIGINT as total_wins,
        SUM(te.wins + te.losses + te.draws)::BIGINT as total_games,
        ROUND(SUM(te.wins)::numeric / NULLIF(SUM(te.wins + te.losses + te.draws), 0), 4) as win_rate,
        SUM(CASE WHEN te.made_top_16 THEN 1 ELSE 0 END)::BIGINT as top_16_count
    FROM tournament_entries te
    JOIN players p ON te.player_id = p.id
    WHERE te.commander_id = p_commander_id
    GROUP BY p.id, p.name
    HAVING COUNT(te.id) >= 2
    ORDER BY COUNT(te.id) DESC, SUM(te.wins) DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to anon role (for frontend access)
GRANT EXECUTE ON FUNCTION get_notable_players_for_commander(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_notable_players_for_commander(UUID) TO authenticated;
```

## Migration: Commander Matchups

**File:** `supabase/migrations/20260121000002_commander_matchups_function.sql`

```sql
-- Function: Get commander vs commander matchup statistics
-- Shows which commanders beat/lose to a specific commander
CREATE OR REPLACE FUNCTION get_commander_matchups(p_commander_id UUID)
RETURNS TABLE (
    opponent_commander TEXT,
    opponent_commander_id UUID,
    times_lost_to BIGINT,
    times_beat BIGINT,
    total_encounters BIGINT,
    loss_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH my_games AS (
        -- Get all games where this commander participated
        SELECT
            gp.game_id,
            gp.result as my_result
        FROM game_participants gp
        JOIN tournament_entries te ON gp.entry_id = te.id
        WHERE te.commander_id = p_commander_id
    ),
    opponent_results AS (
        -- For each game, get opponent commanders and their results
        SELECT
            c.id as opp_commander_id,
            c.name as opp_commander,
            mg.my_result,
            gp.result as opp_result
        FROM my_games mg
        JOIN game_participants gp ON mg.game_id = gp.game_id
        JOIN tournament_entries te ON gp.entry_id = te.id
        JOIN commanders c ON te.commander_id = c.id
        WHERE te.commander_id != p_commander_id
    )
    SELECT
        opp_commander as opponent_commander,
        opp_commander_id as opponent_commander_id,
        SUM(CASE WHEN my_result = 'loss' AND opp_result = 'win' THEN 1 ELSE 0 END)::BIGINT as times_lost_to,
        SUM(CASE WHEN my_result = 'win' AND opp_result = 'loss' THEN 1 ELSE 0 END)::BIGINT as times_beat,
        COUNT(*)::BIGINT as total_encounters,
        ROUND(
            SUM(CASE WHEN my_result = 'loss' AND opp_result = 'win' THEN 1 ELSE 0 END)::numeric
            / NULLIF(COUNT(*), 0),
            4
        ) as loss_rate
    FROM opponent_results
    GROUP BY opp_commander_id, opp_commander
    HAVING COUNT(*) >= 3  -- Minimum 3 encounters for meaningful data
    ORDER BY
        SUM(CASE WHEN my_result = 'loss' AND opp_result = 'win' THEN 1 ELSE 0 END) DESC,
        COUNT(*) DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_commander_matchups(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_commander_matchups(UUID) TO authenticated;
```

## Migration: Commander Seat Stats (for turn-order grouping)

**File:** `supabase/migrations/20260121000003_commander_seat_stats.sql`

```sql
-- Materialized view: Commander performance by seat position
CREATE MATERIALIZED VIEW IF NOT EXISTS commander_seat_stats AS
SELECT
    c.id as commander_id,
    c.name as commander_name,
    gp.seat_position,
    COUNT(*) as games,
    SUM(CASE WHEN gp.result = 'win' THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN gp.result = 'loss' THEN 1 ELSE 0 END) as losses,
    SUM(CASE WHEN gp.result = 'draw' THEN 1 ELSE 0 END) as draws,
    ROUND(SUM(CASE WHEN gp.result = 'win' THEN 1 ELSE 0 END)::numeric / COUNT(*), 4) as win_rate,
    ROUND(SUM(CASE WHEN gp.result IN ('win', 'draw') THEN 1 ELSE 0 END)::numeric / COUNT(*), 4) as win_plus_draw_rate
FROM game_participants gp
JOIN tournament_entries te ON gp.entry_id = te.id
JOIN commanders c ON te.commander_id = c.id
GROUP BY c.id, c.name, gp.seat_position
HAVING COUNT(*) >= 10;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_commander_seat_stats_commander
ON commander_seat_stats(commander_id);

CREATE INDEX IF NOT EXISTS idx_commander_seat_stats_position
ON commander_seat_stats(seat_position);

-- Grant access
GRANT SELECT ON commander_seat_stats TO anon;
GRANT SELECT ON commander_seat_stats TO authenticated;
```

## Migration: Card-Commander Cross Reference Index

**File:** `supabase/migrations/20260121000004_card_commander_index.sql`

```sql
-- Index for efficient card->commander lookups on cards page
CREATE INDEX IF NOT EXISTS idx_card_freq_by_commander_cardname
ON card_frequencies_by_commander(card_name);

-- Function to get commanders using a specific card
CREATE OR REPLACE FUNCTION get_commanders_for_card(p_card_name TEXT)
RETURNS TABLE (
    commander_id UUID,
    commander_name TEXT,
    deck_count BIGINT,
    inclusion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cf.commander_id,
        cf.commander,
        cf.deck_count::BIGINT,
        cf.inclusion_rate::NUMERIC
    FROM card_frequencies_by_commander cf
    WHERE cf.card_name = p_card_name
    ORDER BY cf.deck_count DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_commanders_for_card(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_commanders_for_card(TEXT) TO authenticated;
```

---

## Automation: View Availability Checker

Create a GitHub Action workflow to check if required views/functions exist:

**File:** `.github/workflows/check-backend-views.yml`

```yaml
name: Check Backend Views

on:
  schedule:
    - cron: '0 9 * * 1'  # Weekly on Monday 9am UTC
  workflow_dispatch:  # Manual trigger

jobs:
  check-views:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check required database objects
        env:
          SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          # List of required functions and views
          REQUIRED_FUNCTIONS=(
            "get_notable_players_for_commander"
            "get_commander_matchups"
            "get_commanders_for_card"
          )

          REQUIRED_VIEWS=(
            "commander_stats"
            "card_frequencies_global"
            "card_frequencies_by_commander"
            "commander_card_report"
            "card_performance_by_commander"
            "trap_cards_report"
            "spice_cards_report"
            "seat_position_stats"
            "commander_seat_stats"
          )

          MISSING=()

          for func in "${REQUIRED_FUNCTIONS[@]}"; do
            result=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/$func" \
              -H "apikey: $SUPABASE_KEY" \
              -H "Content-Type: application/json" \
              -d '{}' \
              -w "%{http_code}" -o /dev/null)

            if [[ "$result" == "404" ]]; then
              MISSING+=("function: $func")
            fi
          done

          for view in "${REQUIRED_VIEWS[@]}"; do
            result=$(curl -s -X GET "$SUPABASE_URL/rest/v1/$view?limit=1" \
              -H "apikey: $SUPABASE_KEY" \
              -w "%{http_code}" -o /dev/null)

            if [[ "$result" == "404" ]]; then
              MISSING+=("view: $view")
            fi
          done

          if [ ${#MISSING[@]} -gt 0 ]; then
            echo "::warning::Missing database objects:"
            printf '%s\n' "${MISSING[@]}"
            echo ""
            echo "See BACKEND_MIGRATIONS.md for SQL to create these objects."
            exit 1
          else
            echo "All required database objects exist!"
          fi
```

## Alternative: TypeScript Check Script

**File:** `scripts/check-backend.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const REQUIRED = {
  views: [
    'commander_stats',
    'card_frequencies_global',
    'card_frequencies_by_commander',
    'commander_card_report',
    'card_performance_by_commander',
    'trap_cards_report',
    'spice_cards_report',
    'seat_position_stats',
    'commander_seat_stats',
  ],
  functions: [
    { name: 'get_notable_players_for_commander', args: { p_commander_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'get_commander_matchups', args: { p_commander_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'get_commanders_for_card', args: { p_card_name: 'Test' } },
  ],
};

async function checkBackend() {
  const missing: string[] = [];

  // Check views
  for (const view of REQUIRED.views) {
    const { error } = await supabase.from(view).select('*').limit(1);
    if (error?.code === '42P01') {
      missing.push(`view: ${view}`);
    }
  }

  // Check functions
  for (const func of REQUIRED.functions) {
    const { error } = await supabase.rpc(func.name, func.args);
    if (error?.code === '42883') {
      missing.push(`function: ${func.name}`);
    }
  }

  if (missing.length > 0) {
    console.error('Missing backend objects:');
    missing.forEach(m => console.error(`  - ${m}`));
    console.error('\nSee BACKEND_MIGRATIONS.md for SQL to create these.');
    process.exit(1);
  }

  console.log('All required backend objects exist!');
}

checkBackend();
```

Add to `package.json`:
```json
{
  "scripts": {
    "check:backend": "npx tsx scripts/check-backend.ts"
  }
}
```

---

## Data Enhancement: Topdeck.gg Player Handles

**File:** `supabase/migrations/20260121000005_player_topdeck_handle.sql`

The `players` table currently stores display names (e.g., "Julian [abcEDH]") but not the topdeck.gg handle (e.g., "@sunglasses"). To enable linking to player profiles, we need to capture handles during data ingestion.

```sql
-- Add topdeck_handle column to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS topdeck_handle TEXT;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_players_topdeck_handle ON players(topdeck_handle);
```

**Data Ingestion Changes Required:**

When scraping/importing tournament data from topdeck.gg, the backend needs to capture both:
- `name` (display name): "Julian [abcEDH]"
- `topdeck_handle`: "sunglasses" (without the @)

The topdeck.gg profile URL format is: `https://topdeck.gg/profile/@{handle}`

**Frontend Usage:** Once `topdeck_handle` is populated, update the notable players query:

```sql
-- Updated function to return topdeck_handle
CREATE OR REPLACE FUNCTION get_notable_players_for_commander(p_commander_id UUID)
RETURNS TABLE (
    player_name TEXT,
    topdeck_handle TEXT,  -- NEW
    entries BIGINT,
    total_wins BIGINT,
    total_games BIGINT,
    win_rate NUMERIC,
    top_16_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.name as player_name,
        p.topdeck_handle,  -- NEW
        COUNT(te.id) as entries,
        SUM(te.wins)::BIGINT as total_wins,
        SUM(te.wins + te.losses + te.draws)::BIGINT as total_games,
        ROUND(SUM(te.wins)::numeric / NULLIF(SUM(te.wins + te.losses + te.draws), 0), 4) as win_rate,
        SUM(CASE WHEN te.made_top_16 THEN 1 ELSE 0 END)::BIGINT as top_16_count
    FROM tournament_entries te
    JOIN players p ON te.player_id = p.id
    WHERE te.commander_id = p_commander_id
    GROUP BY p.id, p.name, p.topdeck_handle
    HAVING COUNT(te.id) >= 2
    ORDER BY COUNT(te.id) DESC, SUM(te.wins) DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Migration: Survival Analysis

**File:** `supabase/migrations/20260121000006_survival_analysis.sql`

Survival analysis tracks the probability of "surviving" (not losing) through each tournament round.
A player "survives" a round if they win or draw. This uses Kaplan-Meier style cumulative survival
probability calculations.

```sql
-- Survival Analysis: Track probability of "surviving" (not losing) through each round
-- This is Kaplan-Meier style survival analysis for tournament performance

-- Materialized view: Global survival curves by seat position
CREATE MATERIALIZED VIEW IF NOT EXISTS survival_curves_by_seat AS
WITH round_outcomes AS (
    -- Get each player's outcome in each round
    SELECT
        gp.seat_position,
        g.round_number,
        te.id as entry_id,
        gp.result,
        CASE WHEN gp.result IN ('win', 'draw') THEN 1 ELSE 0 END as survived
    FROM game_participants gp
    JOIN games g ON gp.game_id = g.id
    JOIN tournament_entries te ON gp.entry_id = te.id
    WHERE g.status = 'Completed'
      AND NOT g.is_bracket
      AND gp.result != 'bye'
),
survival_by_round AS (
    -- Calculate survival rate at each round by seat
    SELECT
        seat_position,
        round_number,
        COUNT(*) as players_at_risk,
        SUM(survived) as players_survived,
        ROUND(SUM(survived)::numeric / COUNT(*), 4) as survival_rate
    FROM round_outcomes
    GROUP BY seat_position, round_number
),
cumulative_survival AS (
    -- Calculate cumulative survival probability (Kaplan-Meier style)
    SELECT
        seat_position,
        round_number,
        players_at_risk,
        players_survived,
        survival_rate,
        -- Cumulative product of survival rates up to this round
        EXP(SUM(LN(NULLIF(survival_rate, 0))) OVER (
            PARTITION BY seat_position
            ORDER BY round_number
        ))::numeric as cumulative_survival
    FROM survival_by_round
)
SELECT
    seat_position,
    round_number,
    players_at_risk,
    players_survived,
    survival_rate,
    ROUND(cumulative_survival, 4) as cumulative_survival
FROM cumulative_survival
ORDER BY seat_position, round_number;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_survival_curves_seat ON survival_curves_by_seat(seat_position);
CREATE INDEX IF NOT EXISTS idx_survival_curves_round ON survival_curves_by_seat(round_number);

-- Function: Get survival curve for a specific commander (or global if NULL)
CREATE OR REPLACE FUNCTION get_survival_curve(p_commander_id UUID DEFAULT NULL)
RETURNS TABLE (
    round_number INTEGER,
    players_at_risk BIGINT,
    players_survived BIGINT,
    survival_rate NUMERIC,
    cumulative_survival NUMERIC
) AS $$
BEGIN
    IF p_commander_id IS NULL THEN
        -- Return global survival curve (all commanders)
        RETURN QUERY
        WITH round_outcomes AS (
            SELECT
                g.round_number,
                te.id as entry_id,
                CASE WHEN gp.result IN ('win', 'draw') THEN 1 ELSE 0 END as survived
            FROM game_participants gp
            JOIN games g ON gp.game_id = g.id
            JOIN tournament_entries te ON gp.entry_id = te.id
            WHERE g.status = 'Completed'
              AND NOT g.is_bracket
              AND gp.result != 'bye'
        ),
        survival_by_round AS (
            SELECT
                ro.round_number,
                COUNT(*)::BIGINT as players_at_risk,
                SUM(survived)::BIGINT as players_survived,
                ROUND(SUM(survived)::numeric / COUNT(*), 4) as survival_rate
            FROM round_outcomes ro
            GROUP BY ro.round_number
        ),
        cumulative AS (
            SELECT
                s.round_number,
                s.players_at_risk,
                s.players_survived,
                s.survival_rate,
                EXP(SUM(LN(NULLIF(s.survival_rate, 0))) OVER (ORDER BY s.round_number))::numeric as cum_surv
            FROM survival_by_round s
        )
        SELECT
            c.round_number,
            c.players_at_risk,
            c.players_survived,
            c.survival_rate,
            ROUND(c.cum_surv, 4) as cumulative_survival
        FROM cumulative c
        ORDER BY c.round_number;
    ELSE
        -- Return survival curve for specific commander
        RETURN QUERY
        WITH round_outcomes AS (
            SELECT
                g.round_number,
                te.id as entry_id,
                CASE WHEN gp.result IN ('win', 'draw') THEN 1 ELSE 0 END as survived
            FROM game_participants gp
            JOIN games g ON gp.game_id = g.id
            JOIN tournament_entries te ON gp.entry_id = te.id
            WHERE g.status = 'Completed'
              AND NOT g.is_bracket
              AND gp.result != 'bye'
              AND te.commander_id = p_commander_id
        ),
        survival_by_round AS (
            SELECT
                ro.round_number,
                COUNT(*)::BIGINT as players_at_risk,
                SUM(survived)::BIGINT as players_survived,
                ROUND(SUM(survived)::numeric / COUNT(*), 4) as survival_rate
            FROM round_outcomes ro
            GROUP BY ro.round_number
        ),
        cumulative AS (
            SELECT
                s.round_number,
                s.players_at_risk,
                s.players_survived,
                s.survival_rate,
                EXP(SUM(LN(NULLIF(s.survival_rate, 0))) OVER (ORDER BY s.round_number))::numeric as cum_surv
            FROM survival_by_round s
        )
        SELECT
            c.round_number,
            c.players_at_risk,
            c.players_survived,
            c.survival_rate,
            ROUND(c.cum_surv, 4) as cumulative_survival
        FROM cumulative c
        ORDER BY c.round_number;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT SELECT ON survival_curves_by_seat TO anon;
GRANT SELECT ON survival_curves_by_seat TO authenticated;
GRANT EXECUTE ON FUNCTION get_survival_curve(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_survival_curve(UUID) TO authenticated;
```

---

## Tracking Status

| Object | Type | Status | Frontend Usage |
|--------|------|--------|----------------|
| `get_notable_players_for_commander` | Function | Done | /commanders/[id] Players tab |
| `get_commander_matchups` | Function | Done | /commanders/[id] Matchups tab |
| `commander_seat_stats` | View | Done | /turn-order commander grouping |
| `get_commanders_for_card` | Function | Pending | /cards commander usage |
| `players.topdeck_handle` | Column | Pending | /commanders/[id] player profile links |
| `survival_curves_by_seat` | View | Done | /survival seat-based curves |
| `get_survival_curve` | Function | Done | /survival global and commander curves |

After applying migrations, refresh materialized views:
```sql
REFRESH MATERIALIZED VIEW commander_seat_stats;
REFRESH MATERIALIZED VIEW survival_curves_by_seat;
```
