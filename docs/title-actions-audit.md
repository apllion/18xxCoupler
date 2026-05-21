# Title Actions Audit — Comprehensive Per-Title Action List

<!-- MAINTENANCE PROMPT
To update this file, ask Claude to:
"Read all title configs in src/titles/g*.js, the action definitions in
src/engine/actions.js, and the UI gating in src/components/overview/actionBarBuilder.js.
Then update docs/title-actions-audit.md with any new titles, actions, or config changes.
Keep the per-title matrix, the action catalog, and the merger table in sync."
-->

## Action Catalog

### Universal Actions (all titles)

| Action | Round | Description |
|--------|-------|-------------|
| PAR_SHARE | SR | Par (IPO) a new corporation at chosen price |
| BUY_SHARE | SR | Buy share from IPO or market pool |
| SELL_SHARES | SR | Sell shares to market pool |
| PAY_DIVIDEND | OR | Corporation pays full revenue to shareholders |
| WITHHOLD_DIVIDEND | OR | Corporation withholds revenue in treasury |
| BUY_TRAIN | OR | Buy train from depot or another corporation |
| SOLD_OUT_ADJUST | End OR set | Move sold-out corps up one space on market |
| ADJUST_CASH | Any | Manual cash correction for any entity |
| ADVANCE_ROUND | Any | Move to next round |
| SET_PRIORITY | Any | Change priority deal holder |
| SWAP_PRESIDENT | Any | Manual president certificate swap |

### Config-Gated Actions

| Action | Config Flag | Round | Description |
|--------|------------|-------|-------------|
| HALF_DIVIDEND | `halfPay: true` | OR | Pay half to shareholders, half to treasury |
| ISSUE_SHARES | `capitalization: 'incremental'` | OR | Corp issues shares from IPO to raise cash |
| REDEEM_SHARES | `capitalization: 'incremental'` | OR | Corp buys back shares from market pool |
| BUY_PRIVATE | has companies | SR/OR | Buy private company |
| SELL_PRIVATE | has companies | OR | Sell private to corporation |
| COLLECT_ALL_REVENUE | has companies | Any | Collect revenue from all private companies |
| TAKE_LOAN | `loans` | OR | Corporation takes a loan |
| REPAY_LOAN | `loans` | OR | Corporation repays a loan |
| PAY_INTEREST | `loans` | OR | Pay interest on outstanding loans |
| SHORT_SELL | `shorts` | SR | Player shorts a corporation |
| CLOSE_SHORT | `shorts` | SR | Cover a short position |
| CONVERT_CORP | `corpSizing` | MR | Convert corp size (2→5→10 share) |
| CORP_BUY_SHARE | `corpCanBuyShares` | OR/SR | Corporation buys shares of another corp |
| CORP_SELL_SHARES | `corpCanSellShares` | OR/SR | Corporation sells shares of another corp |
| EXPORT_TRAIN | `trainExport` | End OR | Export next train if corp bought none |
| BUY_EXECUTIVE_CAR | `executiveCars` | OR | Buy executive car attachment for a train |
| CONVERT_CONCESSION | companies w/ concessions | SR | Convert concession to president cert |
| MERGE_CORPS | `merger` | MR/OR | Merge corporations (type varies) |
| ACQUIRE_MINOR | `merger.type: '1822_acquire'` | OR | Major acquires a minor |
| CONVERT_MINOR | `merger.type: '1867_minor_major'` | MR | Minor converts solo to major |
| MERGE_MINORS | `merger.type: '1867_minor_major'` | MR | Multiple minors merge into a major |
| DELIVER_BEER | `beerMarket` | OR | Small brewery delivers to beer market |
| DELIVER_EXPORT | `beerMarket` | OR | Small brewery delivers to export market |
| BREWERY_INCOME | `beerMarket` | OR | Small brewery earns income |
| ADVANCE_BEER_MARKET | `beerMarket` | Any | Advance beer market segment |
| REMOVE_NO_DEMAND | `beerMarket` | Any | Remove No Demand token from segment |
| PLACE_NO_DEMAND | `beerMarket` | Any | Place No Demand token on segment |
| GIVE_CARD | `strategyCards` | Any | Give strategy card to player (PTG) |
| ASSIGN_CARD_TO_TRAIN | `strategyCards` | OR | Attach strategy card to train (PTG) |
| USE_CARD_ACTION | `strategyCards` | OR | Use a strategy card's action (PTG) |
| NATIONALIZE_CORP | event-triggered | MR | Nationalize corporation into national entity |
| LIQUIDATE_CORP | admin | Any | Mark corporation as liquidated |
| DISMISS_EVENT | event-triggered | Any | Acknowledge a triggered game event |

---

## Per-Title Action Matrix

Legend: **U** = universal actions always available. Additional columns show which extra actions each title gets.

| Title | Half Pay | Issue/Redeem | Privates | Loans | Shorts | Corp Sizing | Corp Shares | Train Export | Exec Cars | Beer Mkt | Strategy Cards | Merger Type | Notes |
|-------|----------|-------------|----------|-------|--------|-------------|-------------|-------------|-----------|----------|----------------|-------------|-------|
| **1817** | yes | yes (incr) | yes | yes | yes | yes (2→5→10) | buy+sell | yes | — | — | — | 1817_merge | 20 corps, infinite bank |
| **1822** | yes | yes (incr) | yes + concessions | — | — | — | — | — | — | — | — | 1822_acquire | 10 majors + 30 minors, £ |
| **1822CA** | yes | yes (incr) | yes + concessions | — | — | — | — | — | — | — | — | 1822_acquire | 10 majors + 30 minors |
| **1822MX** | — | yes (incr) | yes + concessions | — | — | — | — | — | — | — | — | 1822_acquire | 7 majors + 24 minors + NDEM |
| **1830** | — | — | yes | — | — | — | — | — | — | — | — | — | sell_buy_sell SR order |
| **1846** | yes | yes (incr) | yes | — | — | — | — | — | — | — | — | — | secret draft, 20% float |
| **1847AE** | — | yes (incr) | yes | — | — | — | — | — | — | — | — | — | 50% float, Mark currency |
| **1849** | — | yes (incr) | yes | — | — | — | — | — | — | — | — | — | par price gates, H-trains |
| **1858** | yes | yes (incr) | yes | — | — | — | — | — | — | — | — | — | 40% float, Peseta |
| **1860** | — | — | yes | — | — | — | — | — | — | — | — | — | 100% market limit, +N trains |
| **1861** | — | yes (incr) | yes | — | — | — | — | — | — | — | — | — | nationalization events |
| **1862** | — | — | — | — | — | — | — | — | — | — | — | 1862_peer | 20 corps, 30% pres, NO privates |
| **1867** | yes | yes (incr) | yes | — | — | — | — | — | — | — | — | 1867_minor_major | 8 maj + 16 min + national, merger round |
| **1871** | yes | — | yes | — | — | — | — | — | — | — | — | — | 7 maj + 6 branches + PEIR national |
| **1880** | — | — | yes | — | — | — | — | — | — | — | — | — | phase-gated float % changes |
| **1889** | — | — | yes | — | — | — | — | — | — | — | — | — | beginner-friendly 1830 variant |
| **18Chesapeake** | — | — | yes | — | — | — | — | — | — | — | — | — | standard 1830 family |
| **18Daihan** | — | — | yes | — | — | — | — | — | yes | — | — | — | executive cars, Won currency |
| **18DO HSB** | — | — | breweries | — | — | — | — | — | — | yes | — | — | 7 railways + 6 breweries, beer market |
| **18DO TRG** | — | — | yes | — | — | — | — | — | — | — | — | — | triple-jump dividend movement |
| **18GB** | — | — | yes | — | — | yes (5→10) | — | — | — | — | — | — | 40% pres → converts to 10-share |
| **18India** | — | yes (incr) | yes | — | — | — | buy only | — | — | — | — | — | 30% float, no sell movement |
| **18Ireland** | — | yes (incr) | yes | — | — | — | — | — | — | — | — | 1867_minor_major | 7 maj + 14 min, merger round |
| **18MEX** | — | — | yes (+ minors) | — | — | — | — | — | — | — | — | — | NDM merger event (phase-triggered) |
| **18MS** | — | — | yes | — | — | — | — | — | — | — | — | — | 70% max ownership |
| **18Rhl** | — | — | yes | — | — | — | — | — | — | — | — | — | KEG special shares, Mark currency |
| **18 Royal Gorge** | — | yes (incr) | yes | — | — | — | — | — | — | — | — | — | metal corps (CF&I, VGC) |
| **18SJ** | — | yes (incr) | yes | — | — | — | — | — | — | — | — | — | sell_buy_sell, cap switches to full |
| **18USA** | yes | yes (incr) | yes | — | — | — | — | yes | — | — | — | — | 20 corps, P-trains |
| **21Moon** | — | yes (incr) | yes | — | — | — | buy+sell | — | — | — | — | — | corps buy own shares, no cert limit |
| **22Mars** | — | yes (incr) | yes (permits) | — | — | — | — | — | — | — | — | — | 5×20% shares, taxes, fixed rounds |
| **PTG** | — | yes (incr) | — | — | — | — | buy+sell | — | — | — | yes | ptg_combine | strategy cards, CEO income, taxes |
| **RLA** | — | yes (incr) | — | — | — | — | — | — | — | — | — | rla_merge | 18 minors + 6 majors, identity choice |

---

## Merger Types

| Type | Titles | Timing | Key Actions | Mechanics |
|------|--------|--------|-------------|-----------|
| `1817_merge` | 1817 | Merger & Conversion Round | MERGE_CORPS, CONVERT_CORP | Same-size corps merge; 2→5→10 conversion |
| `1822_acquire` | 1822, 1822CA, 1822MX | During OR | ACQUIRE_MINOR | Major acquires minor; payment in shares + cash |
| `1862_peer` | 1862 | During OR | MERGE_CORPS | Two equal peers, pick survivor; 30% threshold |
| `1867_minor_major` | 1867, 18Ireland | Dedicated Merger Round | CONVERT_MINOR, MERGE_MINORS | Minors → major; minor owner gets share |
| `ptg_combine` | PTG | During OR (from Brown) | MERGE_CORPS | Two peers → composite; 20%→10% share conversion |
| `rla_merge` | RLA | Merger Round (from Green) | MERGE_CORPS | 2 minors → major with identity choice |

---

## Per-Title Action Bar Layout

What the bottom bar should show for each title:

### Standard (1830, 18Chesapeake, 18Rhl, 18MS)
`Buy Sell | Rev Train | Adv Coll Sold Undo`

### + Half Pay (1889, 1858, 1871)
`Buy Sell | Rev(+half) Train | Adv Coll Sold Undo`

### 1846
`Buy Sell | Rev(+half) Train PrivBuy PrivSell Issue Redeem | Adv Coll Sold Undo`

### 1817
`Buy Sell Short CloseShort | Rev(+half) Train Loan Interest Export CorpBuy CorpSell | Convert | Adv Coll Sold Undo`

### 1822 / 1822CA / 1822MX
`Buy Sell | Rev(+half) Train PrivBuy PrivSell Concession Acquire | Adv Coll Sold Undo`

### 1862 (no privates)
`Buy Sell | Rev Train Merge | Adv Sold Undo`

### 1867 / 18Ireland
`Buy Sell | Rev(+half) Train PrivBuy PrivSell Convert Merge | Adv Coll Sold Undo`

### 18USA
`Buy Sell | Rev(+half) Train Export | Adv Coll Sold Undo`

### 18Daihan
`Buy Sell | Rev Train PrivBuy PrivSell ExecCar | Adv Coll Sold Undo`

### 18DO HSB
`Buy Sell | Rev Train Beer | Adv Undo`

### 18GB
`Buy Sell | Rev Train Convert | Adv Coll Sold Undo`

### 18India
`Buy Sell | Rev Train CorpBuy | Adv Coll Sold Undo`

### 21Moon
`Buy Sell CorpBuy CorpSell | Rev Train | Adv Coll Sold Undo`

### PTG
`Buy Sell CorpBuy CorpSell | Rev Train Card Merge | Adv Undo`

### RLA
`Buy Sell | Rev Train Merge | Adv Undo`

### 22Mars
`Buy Sell | Rev Train | Adv Coll Undo`

---

## Title Details

### 1817 — NYSE
- **Designer:** Craig Bartell, Tim Flowers
- **Players:** 3–12 | **Currency:** $ | **Bank:** ∞
- **Cap:** incremental | **Float:** 20% | **Shares:** 2-share (20+10)
- **Corps:** 20 (all start as 2-share, convert through 5→10)
- **Privates:** 11 companies
- **Pregame:** none listed
- **Unique:** loans (100 each, 5–70% tiered interest), short selling, corp sizing (2/5/10 share), train export, merger & conversion round, sell movement: none, corps can buy+sell shares of others, infinite bank

### 1822 — The Railways of Great Britain
- **Designer:** Simon Cutforth
- **Players:** 2–7 | **Currency:** £ | **Bank:** 12,000
- **Cap:** incremental | **Float:** 20% | **Shares:** standard
- **Corps:** 10 majors + 30 minors
- **Privates:** 7 privates + 10 concessions
- **Pregame:** bidbox auction
- **Unique:** concession → president cert conversion, major acquires minor (2 ops required), phase 6 full capitalisation event

### 1822CA — The Railways of Canada
- **Designer:** Robert Lecuyer & Simon Cutforth
- **Players:** 2–7 | **Currency:** $ | **Bank:** 12,000
- **Cap:** incremental | **Float:** 20%
- **Corps:** 10 majors + 30 minors
- **Pregame:** bidbox auction
- **Unique:** same as 1822 with Canadian corps, must sell in blocks

### 1822MX — The Railways of Mexico
- **Designer:** Scott Peterson
- **Players:** 2–5 | **Currency:** $ | **Bank:** 12,000
- **Cap:** incremental | **Float:** 20%
- **Corps:** 7 majors + 24 minors + NDEM national
- **Pregame:** bidbox auction
- **Unique:** same as 1822 with Mexican corps, NDEM national railway, must sell in blocks

### 1830 — Railways & Robber Barons
- **Designer:** Francis Tresham
- **Players:** 2–6 | **Currency:** $ | **Bank:** 12,000
- **Cap:** full | **Float:** 60% | **Shares:** standard
- **Corps:** 8 (PRR, NYC, CPR, B&O, C&O, ERIE, NYNH, B&M)
- **Privates:** 6
- **Pregame:** waterfall auction
- **Unique:** sell_buy_sell SR order, D-train discounts

### 1846 — The Race for the Midwest
- **Designer:** Thomas Lehmann
- **Players:** 2–5 | **Currency:** $ | **Bank:** varies by player count
- **Cap:** incremental | **Float:** 20% | **Shares:** standard
- **Corps:** 7 majors + 2 minors (MS, BIG4)
- **Privates:** 12
- **Pregame:** secret draft
- **Unique:** emergency buy must issue first, left_block_pres sell movement, pool shares drop price, variable bank size

### 1847AE — Pfalz Anniversary Edition
- **Designer:** Wolfram Janich
- **Players:** 3–5 | **Currency:** M | **Bank:** 8,000
- **Cap:** incremental | **Float:** 50%
- **Corps:** 8 (LFK is private company corp)
- **Privates:** 10 (some exchange for investor shares)
- **Pregame:** english auction
- **Unique:** complex share structures, LFK private corp

### 1849 — The Game of Sicilian Railways
- **Designer:** Federico Vellani
- **Players:** 3–5 | **Currency:** L. | **Bank:** 7,760
- **Cap:** incremental | **Float:** 20% | **Shares:** [20,10,10,10,10,10,10,20]
- **Corps:** 6 (AFG, ATA, CTL, IFT, RCS, SFA)
- **Privates:** 5
- **Pregame:** not specified
- **Unique:** par price gates (unlock at phases), sequential random corp order, dual 20% share slots, earthquake event

### 1858 — The Railways of Iberia
- **Designer:** Ian D. Wilson
- **Players:** 2–6 | **Currency:** Pt | **Bank:** varies
- **Cap:** incremental | **Float:** 40%
- **Corps:** 8
- **Privates:** 10
- **Pregame:** english auction
- **Unique:** half pay, H-trains and M-train variants

### 1860 — Railways on the Isle of Wight
- **Designer:** Mike Hutton
- **Players:** 2–4 | **Currency:** £ | **Bank:** 10,000
- **Cap:** full | **Float:** 50% | **Shares:** standard
- **Corps:** 8
- **Privates:** 5
- **Pregame:** none
- **Unique:** 100% market share limit, +N compound trains, ebuy no pres swap, southern_forms event

### 1861 — Railways of the Russian Empire
- **Designer:** Ian D. Wilson
- **Players:** 2–6 | **Currency:** ₽ | **Bank:** 15,000
- **Cap:** incremental | **Float:** 20%
- **Corps:** 8 majors + 16 minors + 1 national
- **Privates:** 5
- **Pregame:** bidbox auction
- **Unique:** nationalization events (trainless, phase-triggered), minors cannot start after phase 5, minors nationalized at phase 8

### 1862 — Railway Mania in the Eastern Counties
- **Designer:** Mike Hutton
- **Players:** 2–8 | **Currency:** £ | **Bank:** 15,000
- **Cap:** full | **Float:** 50% | **Shares:** [30,10,10,10,10,10,10,10]
- **Corps:** 20
- **Privates:** NONE
- **Pregame:** waterfall auction
- **Unique:** 30% president share, NO private companies, peer merger (pick survivor), LNER trigger event, phases A–H

### 1867 — Railways of Canada
- **Designer:** Ian D. Wilson
- **Players:** 2–6 | **Currency:** $ | **Bank:** 15,000
- **Cap:** incremental | **Float:** 20%
- **Corps:** 8 majors + 16 minors + 1 national
- **Privates:** 5
- **Pregame:** bidbox auction
- **Unique:** dedicated merger round (phase 3–7), minor→major conversion, up to 10 corps in one merge, nationalization events, train trade in phase 8

### 1871 — The Old Prince
- **Designer:** Lucas Boyd
- **Players:** 3–4 | **Currency:** $ | **Bank:** ∞
- **Cap:** full | **Float:** 60%
- **Corps:** 7 majors + 1 national (PEIR) + 6 branches
- **Privates:** 11
- **Pregame:** english auction
- **Unique:** PEIR national (5×20% shares), branch lines, salvage values on rusted trains, first_to_pass player order

### 1880 — China
- **Designer:** Helmut Ohley, Leonhard Orgler
- **Players:** 3–7 | **Currency:** ¥ | **Bank:** 37,860
- **Cap:** full (float % changes by phase) | **Float:** 20%→60%
- **Corps:** 14
- **Privates:** 8 (permit cards)
- **Pregame:** draft
- **Unique:** phase-gated float changes (20→30→40→60%), communist takeover event, stock exchange reopens, permit system

### 1889 — Shikoku
- **Designer:** Yasutaka Ikeda
- **Players:** 2–6 | **Currency:** ¥ | **Bank:** 7,000
- **Cap:** full | **Float:** 50% | **Shares:** standard
- **Corps:** 7 (AR, IR, SR, KO, TR, KU, UR)
- **Privates:** 7
- **Pregame:** waterfall auction
- **Unique:** must sell in blocks, no ebuy pres swap, D-train discounts

### 18Chesapeake — Birth of American Railroads
- **Designer:** Scott Petersen
- **Players:** 2–6 | **Currency:** $ | **Bank:** 8,000
- **Cap:** full | **Float:** 60% | **Shares:** standard
- **Corps:** 8 (PRR, PLE, SRR, B&O, C&O, LV, C&A, N&W)
- **Privates:** 6
- **Pregame:** waterfall auction
- **Unique:** 2p variant with 30% president, D-train discounts

### 18Daihan — Railways of the Korean Empire
- **Designer:** Geonil
- **Players:** 3–5 | **Currency:** ￦ | **Bank:** 7,600
- **Cap:** full | **Float:** 50%
- **Corps:** 8 (KR, GI, HN, GW, JR, RR, BH, YN)
- **Privates:** 7
- **Pregame:** waterfall auction
- **Unique:** executive cars (12 available), goods transport, D-train signals end game

### 18DO HSB — Dortmund: Heat, Sweat & Beer
- **Designer:** Wolfram Janich & Michael Scharf
- **Players:** 3–5 | **Currency:** M | **Bank:** 13,000
- **Cap:** full | **Float:** 50%
- **Corps:** 7 railways + 6 breweries
- **Privates:** 8 small breweries (B1–B8)
- **Pregame:** brewery purchase
- **Unique:** beer market (6 segments, export income, no demand tokens), dual corp tracks (railway + brewery), fixed 6 rounds, brewery income/delivery actions

### 18DO TRG — Dortmund: The Railway Game
- **Designer:** Wolfram Janich & Michael Scharf
- **Players:** 3–5 | **Currency:** M | **Bank:** 9,000
- **Cap:** full | **Float:** 50%
- **Corps:** 7 (BME, CME, RhE, KWE, DGEE, DHB, HHW)
- **Privates:** 5
- **Pregame:** english auction ("Starting Round")
- **Unique:** triple-jump dividend movement, sequential corp founding (KWE→DGEE→DHB/HHW), DHB cannot transport beer, final_run_on_rust event

### 18GB — Railways of Great Britain
- **Designer:** Dave Berry
- **Players:** 2–6 | **Currency:** £ | **Bank:** ∞
- **Cap:** full | **Float:** 40% | **Shares:** [40,20,20,20] → converts to 10-share
- **Corps:** 12
- **Privates:** 9
- **Pregame:** waterfall auction
- **Unique:** 5-share corps that convert to 10-share (corp sizing), 100% market limit, blue tile phase

### 18India — Railways of the British Raj
- **Designer:** Michael Carter et al.
- **Players:** 2–5 | **Currency:** ₹ | **Bank:** 9,000
- **Cap:** incremental | **Float:** 30%
- **Corps:** 18
- **Privates:** 6
- **Pregame:** english auction
- **Unique:** corps can buy (not sell) shares of other corps, no stock price movement on sells, first_to_pass player order

### 18Ireland — Railways of Ireland
- **Designer:** Ian Scrivins
- **Players:** 3–6 | **Currency:** £ | **Bank:** 4,000
- **Cap:** incremental | **Float:** 20%
- **Corps:** 7 majors + 14 minors
- **Privates:** 11
- **Pregame:** waterfall auction
- **Unique:** merger round (from phase 4), minor→major conversion, minors have [40,20,20,20] shares

### 18MEX — National Railways of Mexico
- **Designer:** Mark Derrick
- **Players:** 3–5 | **Currency:** $ | **Bank:** 9,000
- **Cap:** full | **Float:** 50%
- **Corps:** 8 (including NdM)
- **Privates:** 7 (includes minor corps A, B, C)
- **Pregame:** waterfall auction
- **Unique:** NDM merger event (phase 5), minor corps controlled by privates, companies_buyable event

### 18MS — The Railroads Come to Mississippi
- **Designer:** Mark Derrick
- **Players:** 2–4 | **Currency:** $ | **Bank:** 10,000
- **Cap:** full | **Float:** 60%
- **Corps:** 5 (GMO, IC, L&N, Fr, WRA)
- **Privates:** 5
- **Pregame:** draft
- **Unique:** 70% max ownership, fixed round end, 2D/5D multiplier trains, salvage values

### 18Rhl — Rhineland
- **Designer:** Wolfram Janich
- **Players:** 3–6 | **Currency:** M | **Bank:** 9,000
- **Cap:** full | **Float:** 50%
- **Corps:** 8 (KEG has special shares [20,10,20,20,10,10,10])
- **Privates:** 7
- **Pregame:** english auction
- **Unique:** KEG special share structure, CCE two home stations, RhE restricted par (70/75/80 only), many variants

### 18 Royal Gorge — The Royal Gorge Wars
- **Designer:** Kayla Ross & Denman Scofield
- **Players:** 2–4 | **Currency:** $ | **Bank:** ∞
- **Cap:** incremental | **Float:** 20%
- **Corps:** 13 (11 railway + 2 metal: CF&I, VGC)
- **Privates:** 8
- **Pregame:** english auction
- **Unique:** metal corporations (CF&I, VGC) with 10×10% shares

### 18SJ — Railways in the Frozen North
- **Designer:** Örjan Wennman
- **Players:** 2–6 | **Currency:** kr | **Bank:** 10,000
- **Cap:** incremental → full (switches at phase 5) | **Float:** 60%
- **Corps:** 11 majors + 1 minor (KHJ)
- **Privates:** 10
- **Pregame:** english auction
- **Unique:** sell_buy_sell SR order, capitalization switches from incremental to full at phase 5, nationalization event, stock market end trigger

### 18USA — The Railroads Come of Age
- **Designer:** Edward Reece, Mark Hendrickson, Shawn Fox
- **Players:** 2–7 | **Currency:** $ | **Bank:** ∞
- **Cap:** incremental | **Float:** 20%
- **Corps:** 20
- **Privates:** 12
- **Pregame:** none
- **Unique:** half pay, train export, P-trains (available from phase 5)

### 21Moon — Lunar Railways
- **Designer:** Jonas Jones & Scott Petersen
- **Players:** 2–5 | **Currency:** ₡ | **Bank:** ∞
- **Cap:** incremental | **Float:** 50%
- **Corps:** 7 (SSF, SWP, HMQ, VH, ITC, LG, KR)
- **Privates:** 6
- **Pregame:** none
- **Unique:** corps can buy+sell shares (including own shares), no cert limit for corp holdings

### 22Mars — Convict Camps, Mining, and Space Tourism
- **Designer:** Jonas Jones
- **Players:** 3–5 | **Currency:** c | **Bank:** ∞
- **Cap:** incremental | **Float:** 20% | **Shares:** 5×20%
- **Corps:** 8 (TRE, SMC, NWC, PL, MS, SRC, IG, REX)
- **Privates:** 10 (permit cards)
- **Pregame:** priority auction
- **Unique:** 5×20% share structure, per-share taxes (10 per share above 2), fixed round sequence (SR/OR interleaved), revolt mechanic (OR7–OR10), double-jump dividend movement

### PTG — Pocket Train Game
- **Designer:** Jonas Jones
- **Players:** 2–4 | **Currency:** $ | **Bank:** ∞
- **Cap:** incremental | **Float:** 20% | **Shares:** 5×20%
- **Corps:** 8 (RED, BLU, GRN, YEL, PUR, BLK, WHT, GRY)
- **Privates:** none (strategy cards instead)
- **Pregame:** priority auction
- **Unique:** strategy cards (8 types), corps can buy+sell shares (including president, can start corps), CEO income (10/turn), tax thresholds (60–100% ownership), triple-jump dividend, ptg_combine merger (from Brown phase), 7 fixed rounds, top bonus rounds 6+7

### RLA — Railways of the Lost Atlas
- **Designer:** Jacob Schacht & Kevin Delger
- **Players:** 2–5 | **Currency:** $ | **Bank:** ∞
- **Cap:** incremental | **Float:** 0% (immediate on auction)
- **Corps:** 18 minors + 6 majors (with identity options)
- **Privates:** none
- **Pregame:** english auction
- **Unique:** procedural map, 0% float, merger round (from Green), president chooses identity of merged major, abilities persist through merger, per-sale sell movement, 4 fixed rounds, no half pay

---

## Implementation Status / Missing Actions

### Missing from Overview Action Bar
- **Issue/Redeem shares** — needed for all incremental cap titles (1846, 1817, 1822*, 1849, 1858, 1861, 1867, 18India, 18Ireland, 18SJ, 18USA, 21Moon, 22Mars, PTG, RLA, 18 Royal Gorge)
- **Export train button** — 1817, 18USA
- **Convert concession button** — 1822, 1822CA, 1822MX
- **Corp share buy/sell** — 1817, 18India, 21Moon, PTG
- **Strategy card actions** — PTG
- **Beer market actions** — 18DO HSB

### Title-Specific Notes
- **1862** has NO privates — hide Priv Buy/Sell buttons
- **PTG** and **RLA** have NO privates — hide Priv Buy/Sell and Collect
- **1849** `take_loan` appears in 18xx.games data but title config has no loans field — investigate
- **18SJ** capitalization switches mid-game — issue/redeem availability changes

---

## Real Game Data Cross-Reference (18xx.games)

**Source:** 33 games analyzed (3 longest per title, 11 titles, from `/Users/droste/Work/18AI/data/games/`)

### All action types observed in real games

#### Universal (appeared in all 11 titles)

| 18xx.games action | Count (33 games) | Broker action | Status |
|---|---|---|---|
| `pass` | ~10,000+ | SR_PASS / turn pass | **covered** |
| `buy_shares` | ~3,200 | BUY_SHARE | **covered** |
| `sell_shares` | ~1,200 | SELL_SHARES | **covered** |
| `par` | ~350 | PAR_SHARE | **covered** |
| `dividend` | ~3,500 | PAY_DIVIDEND / WITHHOLD / HALF | **covered** |
| `buy_train` | ~1,600 | BUY_TRAIN | **covered** |
| `bid` | ~1,300 | pregame auction | **covered** |
| `place_token` | ~900 | PLACE_TOKEN | **covered** |
| `lay_tile` | ~5,200 | — | out of scope (map) |
| `run_routes` | ~3,700 | — | out of scope (map) |

#### Title-specific game actions

| 18xx.games action | Titles observed | Broker action | Status |
|---|---|---|---|
| `buy_company` | 1830, 1846, 1889, 1849, 18MEX, 18Ches, 18MS, 1867, 1861 | BUY_PRIVATE / SELL_PRIVATE | **covered** |
| `merge` | 1817, 1867, 1861, 18MEX | MERGE_CORPS | **covered** |
| `convert` | 1817, 1867, 1861 | CONVERT_CORP / CONVERT_MINOR | **covered** |
| `take_loan` | 1817 (499×), 1849 (4×) | TAKE_LOAN | **covered** |
| `payoff_loan` | 1817 (339×) | REPAY_LOAN | **covered** |
| `short` | 1817 (197×) | SHORT_SELL | **covered** |
| `discard_train` | 1830, 1889, 18Ches, 1880, 1817 | — | **GAP: no DISCARD_TRAIN action** |
| `remove_token` | 1817 (19×), 1867 (3×), 1861 (4×) | — | **GAP: no REMOVE_TOKEN action** |
| `assign` | 1846 (9×), 1849 (4×), 1880 (4×), 1817 (59×) | — | **GAP: private ability assignment** |
| `choose` | 1849 (14×), 1880 (135×), 1817 (15×), 1867 (3×) | — | **GAP: generic choice prompt** |
| `bankrupt` | 1817 (9×), 1849 (8×) | PLAYER_BANKRUPT? | **partial — verify** |
| `payoff_debt` | 1849 (1×) | — | **GAP: player debt payoff** |
| `payoff_player_debt` | 1880 (2×) | — | **GAP: player debt payoff** |
| `purchase_train` | 1880 (2×) | BUY_TRAIN? | **unclear — private-granted train buy** |
| `end_game` | 1846 (1×) | — | manual / not needed |

#### Meta/UI actions (not game mechanics — we can ignore)

| 18xx.games action | Notes |
|---|---|
| `undo` / `redo` | Player corrections — we have our own undo |
| `log` | Chat/note messages |
| `program_share_pass` | Auto-pass in SR |
| `program_buy_shares` | Auto-buy shares |
| `program_merger_pass` | Auto-pass in merger rounds (1817, 1867) |
| `program_disable` | Disable an auto-program |

### Gap Analysis

**3 action types still need design decisions:**

1. ~~DISCARD_TRAIN~~ — **COVERED** (added to engine + import handler)
2. ~~REMOVE_TOKEN~~ — **COVERED** (added to engine + import handler)
3. **ASSIGN** — Assign a private company ability to a specific hex/corp. Heavily used in 1817 (59× — likely mine/port assignment during mergers), 1846 (9× — Steamboat Company), 1849 (4×), 1880 (4×). This is a generic "attach ability X to target Y" action. **Needs design.**
4. **CHOOSE** — Generic disambiguation prompt. Very heavy in 1880 (135× — likely communism/permit choices), also 1817 (15×), 1849 (14×), 1867 (3×). A catch-all for title-specific decisions that don't fit other action types. **Needs design.**
5. **PAYOFF_DEBT / PAYOFF_PLAYER_DEBT** — Player pays off personal debt. Seen in 1849 (1×) and 1880 (2×). Rare but needed for those titles. **Needs design.**
6. ~~PURCHASE_TRAIN~~ — Handled as skip (1880 private ability, not a depot purchase).

**Verified as covered:**
- ~~`bankrupt`~~ — PLAYER_BANKRUPT exists in engine: sets bankrupt=true, zeroes cash/shares/privates, removes from turn queue. ✓
- ~~`discard_train`~~ — DISCARD_TRAIN in engine: removes train from corp, pushes to depot.discarded. Import converts 18xx.games discard_train to this action. ✓
- ~~`remove_token`~~ — REMOVE_TOKEN in engine: decrements tokensPlaced. Import converts 18xx.games remove_token to this action. ✓

### Per-Title Action Type Summary

| Title | Games | Total actions | Unique types | Title-specific actions |
|---|---|---|---|---|
| **1817** | 3 | 7,495 | 25 | take_loan, payoff_loan, short, convert, merge, assign, choose, remove_token, bankrupt |
| **1867** | 3 | 3,396 | 22 | merge, convert, remove_token, choose |
| **1861** | 3 | 3,798 | 19 | merge, convert, remove_token |
| **1880** | 3 | 4,017 | 20 | assign, choose (135×!), payoff_player_debt, purchase_train |
| **1849** | 3 | 3,465 | 21 | assign, choose, take_loan, payoff_debt, bankrupt |
| **1846** | 3 | 3,595 | 19 | assign, end_game |
| **18MEX** | 3 | 3,391 | 18 | merge |
| **1830** | 3 | 4,249 | 17 | discard_train |
| **1889** | 3 | 3,081 | 18 | discard_train |
| **18Ches** | 3 | 3,067 | 17 | discard_train |
| **18MS** | 3 | 1,548 | 16 | (none — cleanest title) |
