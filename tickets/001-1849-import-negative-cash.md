# 001: 1849 Import — Negative Cash & Missing State

**Status:** Partially Fixed
**Priority:** Medium
**Date:** 2026-08-03
**Updated:** 2026-08-03
**Test game:** 263057 (1849, 5p, Stock Round, Phase 4H)

## Problem

`importGame()` produced incorrect state for 1849 games.

## Fixes Applied

1. **`bid` actions** — FIXED. Added `resolveAuctionBids()` pre-processing. Competitive bids resolved to single winning bid per company.

2. **`choose` / `assign` actions** — Non-financial, correctly skipped. No fix needed.

3. **Stock market position** — PAR_SHARE does call `placeCorpOnMarket(row, col)`. Works correctly.

## Remaining Issue

4. **Grid coordinate mismatch** — 18xx.games `share_price` field (e.g. "68,3,0") uses different row/col numbering than our grid. Price is correct but placement cell may be off. Low priority — only affects visual position, not financial logic.

## Expected Behavior

For game 263057 after 33 actions:
- cstas: ~$130 cash (started $300, bought SCE $5 + RSA $25, par'd nothing yet)
- Alex_Gred: ~$130 cash (started $300, bought SIGI, par'd SFA at $68)
- SFA: $100 cash, price $68, trains: [4H]
- Phase: 4H

## Files to Fix

- `src/engine/import18xxGames.js` — `convertAction()` needs:
  - `case 'bid':` handler for waterfall auction (deduct price, assign company)
  - `case 'choose':` handler (may be no-op for state, but shouldn't skip)
  - Stock market position from par action

- `src/engine/actions.js` — verify `PAR_SHARE` action updates `corp.sharePrice`

## How to Test

```bash
node -e "
global.window = global;
eval(require('fs').readFileSync('dist/coupler-engine.js', 'utf8'));
const game = JSON.parse(require('fs').readFileSync('test-data/263057.json', 'utf8'));
const state = CouplerEngine.importGame(game);
console.log(state.players.map(p => p.name + ': $' + p.cash));
// Expected: all positive, matching 18xx.games UI
"
```
