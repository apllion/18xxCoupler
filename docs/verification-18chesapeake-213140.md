# Verification: 18Chesapeake #213140

## Test Date: 2026-05-21

Compared our engine output against the authoritative Ruby engine (18xx.games) running in Docker.

## Results

| Field | Ruby (correct) | Our engine | Status |
|---|---|---|---|
| PolarBearINBrown cash | $132 | $112 | WRONG (-20) |
| qlsnctzjzs cash | $612 | $601 | WRONG (-11) |
| bubble cash | $287 | $12 | WRONG (-275) |
| PRR cash | $0 | $285 | WRONG (+285) |
| PRR price | 95 | 95 | OK |
| PLE cash | $105 | -$50 | WRONG (-155) |
| PLE price | 65 | 65 | OK |
| B&O cash | $790 | $523 | WRONG (-267) |
| B&O price | 85 | 95 | WRONG (+10) |
| C&O cash | $100 | -$28 | WRONG (-128) |
| C&O price | 65 | 70 | WRONG (+5) |
| Bank | $5,974 | $6,545 | WRONG (-571) |
| Money conservation | $8,000 | $8,000 | OK |
| Import errors | 0 | 0 | OK |

## Identified Bugs

### 1. PRR float/capitalization bug
PRR was parred at $95 with 20% president cert + 10% additional share = 30% sold.
18Chesapeake floatPercent is 50%. PRR never floated (only 30% sold).
Our engine gives PRR $285 (full par payment to corp), Ruby gives $0.

**Root cause:** `handlePar` in actions.js always adds the par cost to `corp.cash`.
For full-cap titles, money should only go to the corp when shares are sold from IPO,
not before float. For non-floated corps, the money should go to the bank.

Actually the real issue: 18Chesapeake is FULL capitalization. In full cap, money from
IPO share sales goes to the corp immediately (each sale). PRR got 30% sold = $285.
But Ruby says $0. This means in 18Chesapeake, the corp only gets money on FLOAT,
not per-sale. Need to check the exact capitalization rules.

### 2. B&O share price wrong (95 vs 85)
B&O should be at price 85 but we show 95. There's a sell action (player sells B&O)
that should have moved the price down. Need to verify the sell movement logic
for 18Chesapeake's 2D market with down_share movement.

### 3. C&O share price wrong (70 vs 65)
Similar to B&O — sell movements not applied correctly.

### 4. Cash distribution wrong across all entities
Total money is correct ($8000) but distributed differently.
Likely cascading from the PRR capitalization bug and price bugs
(dividend payouts depend on share prices).

## Next Steps
1. Fix capitalization: full-cap corps get money only on float (lump sum)
2. Verify sell price movements step-by-step
3. Re-run verification after fixes
