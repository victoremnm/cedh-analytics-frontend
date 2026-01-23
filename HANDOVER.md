# Handover Notes

## Data cleanup

- The frontend now filters out rows where `commander_name` is "Unknown Commander" for both the main table and the top win rate list.
- If "Unknown Commander" appears, it should be cleaned at the data layer (Supabase) or excluded in the API query.
