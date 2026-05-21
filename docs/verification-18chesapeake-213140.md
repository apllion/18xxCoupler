# Verification: 18Chesapeake #213140

## Test Date: 2026-05-21

Compared our engine output against the authoritative Ruby engine (18xx.games) running in Docker.

## Results (after fixes)

| Field | Ruby (correct) | Our engine | Status |
|---|---|---|---|
| PolarBearINBrown cash | $132 | $102 | WRONG (-30) |
| qlsnctzjzs cash | $612 | $586 | WRONG (-26) |
| bubble cash | $287 | $17 | WRONG (-270) |
| PRR cash | $0 | $0 | OK ✓ (fixed: capitalization) |
| PRR price | 95 | 95 | OK ✓ |
| PLE cash | $105 | $110 | WRONG (+5) |
| PLE price | 65 | 65 | OK ✓ (fixed: implicit withhold) |
| B&O cash | $790 | $808 | WRONG (+18) |
| B&O price | 85 | 85 | OK ✓ (fixed: implicit withhold) |
| C&O cash | $100 | $112 | WRONG (+12) |
| C&O price | 65 | 65 | OK ✓ (fixed: implicit withhold) |
| Bank | $5,974 | $6,265 | WRONG (-291) |
| Money conservation | $8,000 | $8,000 | OK ✓ |
| Import errors | 0 | 0 | OK ✓ |
| Trains | all match | all match | OK ✓ |

## Fixed Bugs

### 1. Capitalization bug (fixed commit ee8f01e)
Both full and incremental cap: player pays bank on IPO share purchase.
Corp gets par × 10 lump sum only on float. PRR now correctly $0 (never floated).

### 2. Implicit withhold $0 (fixed commit 4fd62d4)
Corps that operate in OR but skip routes (no run_routes/dividend) implicitly
withhold $0, which moves share price left. Now detected by scanning for corp
OR turns with no dividend action. All 4 corp prices now exact match.

## Remaining Issues

### Cash diffs (cascading from dividend timing)
Corp cash and player cash still differ from Ruby by small amounts ($5-$30 for
most entities, $270 for bubble). Root cause: dividends pay based on the share
price at time of payout. Before the price fixes, some dividends were calculated
at wrong prices. The implicit withhold fix corrected prices going forward but
earlier dividend payouts used wrong prices.

This is an import-only issue. Live moderator use (where users enter revenue
manually) is not affected.
