# Title Actions Audit — What Each Title Needs

## Actions by Category

### Always Available (all titles)
- PAR_SHARE — par new corp
- BUY_SHARE — buy from IPO or market
- SELL_SHARES — sell to market
- BUY_TRAIN — from depot or other corp
- ADJUST_CASH — manual correction
- ADVANCE_ROUND — move to next round
- SET_PRIORITY — change priority deal
- SWAP_PRESIDENT — manual president swap

### Available When Title Has Privates
- BUY_PRIVATE — buy from bank (auction results)
- SELL_PRIVATE — sell to corp (OR only)
- COLLECT_ALL_REVENUE — collect all private revenue

### Available When Title Config Enables
| Action | Config Field | Titles | Round |
|--------|-------------|--------|-------|
| HALF_DIVIDEND | `halfPay: true` | 1846, 1858, 1867, 1817, 1822*, 1862, 1871, 18MS, 18USA, 18SJ | OR |
| PAY_DIVIDEND | always | all | OR |
| WITHHOLD_DIVIDEND | always | all | OR |
| SOLD_OUT_ADJUST | always | all | End of OR set |
| TAKE_LOAN | `loans` | 1817 | OR |
| REPAY_LOAN | `loans` | 1817 | OR |
| PAY_INTEREST | `loans` | 1817 | OR |
| SHORT_SELL | `shorts` | 1817 | SR |
| CLOSE_SHORT | `shorts` | 1817 | SR |
| CONVERT_CORP | `corpSizing` | 1817, 18GB | MR |
| CORP_BUY_SHARE | `corpCanBuyShares` | PTG, 18India, 21Moon | OR/SR |
| CORP_SELL_SHARES | `corpCanSellShares` | PTG, 21Moon | OR/SR |
| EXPORT_TRAIN | `trainExport` | 1817, 18USA | End of OR |
| BUY_EXECUTIVE_CAR | `executiveCars` | 18Daihan | OR |
| CONVERT_CONCESSION | companies with concessions | 1822, 1822CA, 1822MX | SR |
| MERGE_CORPS | `merger` | see below | MR/OR |
| DELIVER_BEER etc. | `beerMarket` | 18DO HSB | OR |

### Merger Types (title-specific)
| Type | Titles | When | Action |
|------|--------|------|--------|
| 1822_acquire | 1822, 1822CA, 1822MX, 18MEX | OR (major acquires minor) | ACQUIRE_MINOR |
| 1817_merge | 1817 | Merger & Conversion Round | MERGE_CORPS |
| 1862_peer | 1862 | OR (two peers, pick survivor) | MERGE_CORPS |
| 1867_minor_major | 1867, 18Ireland | Merger Round after ORs | CONVERT_MINOR, MERGE_MINORS |
| ptg_combine | PTG | OR (two peers → composite) | MERGE_CORPS |
| rla_merge | RLA | Merger Round (2 minors → major) | MERGE_CORPS |

### MISSING from Overview Action Bar

**1846 specific:**
- Issue shares (incremental cap — corp issues shares from IPO to raise cash)
- Redeem shares (corp buys back from market pool)
- These are OR actions for the operating corp
- Engine: need ISSUE_SHARES, REDEEM_SHARES actions

**1817 specific:**
- Export train (end of OR if no train bought)
- Already in engine as EXPORT_TRAIN but no UI button

**1822 family:**
- Convert concession to president cert
- Already in engine as CONVERT_CONCESSION but no UI button

**1862:**
- No privates at all — hide Priv Buy/Sell buttons

**1849:**
- take_loan action appears in 18xx.games data but title config has no loans field — investigate

## Per-Title Action Bar Config

What the bottom bar should show for each title:

### Standard (1830, 18Chesapeake, 18RHL)
`Buy Sell | Rev Train | Adv Coll Sold Undo`

### + Half Pay (1889, 1858, 18MS, 18USA)
`Buy Sell | Rev(+half) Train | Adv Coll Sold Undo`

### + Privates (most titles)
`Buy Sell | Rev Train PrivBuy PrivSell | Adv Coll Sold Undo`

### 1846
`Buy Sell | Rev(+half) Train PrivBuy PrivSell Issue Redeem | Adv Coll Sold Undo`

### 1817
`Buy Sell Short CloseShort | Rev(+half) Train Loan Interest Export | Convert | Adv Coll Sold Undo`

### 1822/1822CA/1822MX
`Buy Sell | Rev(+half) Train PrivBuy PrivSell Concession Acquire | Adv Coll Sold Undo`

### 1867/18Ireland
`Buy Sell | Rev(+half) Train PrivBuy PrivSell Convert Merge | Adv Coll Sold Undo`

### PTG
`Buy Sell CorpBuy CorpSell | Rev Train Merge | Adv Undo`

### 21Moon
`Buy Sell CorpBuy CorpSell | Rev Train | Adv Undo`

### 1862
`Buy Sell | Rev Train Merge | Adv Coll Sold Undo`
(no privates)

### 18Daihan
`Buy Sell | Rev Train PrivBuy PrivSell ExecCar | Adv Coll Sold Undo`

### 18DO HSB
`Buy Sell | Rev Train Beer | Adv Undo`

## What 18xx.games Uses (from real game data)

17 real action types across 10 titles:
- `par`, `buy_shares`, `sell_shares` — universal
- `buy_train`, `dividend`, `run_routes` — universal
- `bid`, `buy_company`, `place_token`, `lay_tile` — universal (we skip map ones)
- `pass`, `discard_train`, `bankrupt`, `end_game` — universal
- `assign` — 1846, 1849, 1880 (private reassignment)
- `choose` — 1849, 1867, 1880 (game-specific choices)
- `merge` — 1861, 1867, 18MEX
- `convert` — 1861, 1867
- `take_loan` — 1849
- `purchase_train` — 1880 (private ability)
- `payoff_player_debt` — 1880
- `remove_token` — 1861

## Priority Implementation Order

1. **Title-aware action bar** — only show relevant buttons per title
2. **Issue/Redeem shares** — needed for 1846 and other incremental cap titles
3. **Export train button** — 1817, 18USA
4. **Convert concession button** — 1822 family
5. **Discard train** — forced discard when over train limit
