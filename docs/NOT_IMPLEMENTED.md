# Not Implemented in Engine

Mechanics mentioned in `docs/rules/*.md` that are NOT implemented in the engine at `src/engine/`.
The engine tracks financial state (cash, shares, trains, stock prices). Board/map features
(tile placement, route calculation, gauge restrictions) are inherently out of scope -- the
companion app does not enforce those.

Grouped by title. Items marked **(config only)** exist as title configuration but have no
dedicated engine logic beyond what the config drives.

---

## 1817
- Selection auction pregame flow (UI-only; engine has no auction state machine)

## 1822
- L/2 train variants (minor L-train upgrades to major 2-train) -- no variant tracking
- Tax haven private (shares held off-books, invisible to cert limit)

## 1822CA
- Grain trains (deliver grain from elevators to port cities) -- route/revenue mechanic

## 1822MX
- Builder cubes (reduce terrain costs) -- physical board tokens
- Port tiles on coastal spikes -- tile placement mechanic

## 1830
- D-train trade-in discount ($300 from 4/5/6) -- manual price override by user
- Sell/buy/sell SR order enforcement -- config only, not enforced by engine

## 1846
- Secret draft card selection flow (UI component exists, no engine state machine)
- Train variants (3/5, 4/6, 7/8) -- config only, user picks which to buy

## 1847AE
- Investor shares auto-exchange into corp shares at 5+5 phase -- no auto-trigger
- LFK revenue (10% of every train purchase price) -- not calculated automatically
- Sequential corp founding order enforcement -- config hint only
- Non-standard share structures per corp -- config only (engine uses title.shares)

## 1849
- Sequential random corp founding order enforcement -- UI hint only
- Par price gates (L.68/100 always, L.144 at 6H, L.216 at 10H) -- implemented in pregame.js getAvailableParPrices but not auto-enforced
- Non-standard shares (last cert is 20%) -- config only
- Random corp removal at 3 players -- UI hint only

## 1858
- Private railways starting public companies -- special ability, manual
- Broad/narrow gauge track -- board/tile mechanic
- H-train and M-train variants (4H/2M, 6H/3M, etc.) -- config only

## 1860
- Receivership mechanics -- not modeled (president/bank forced buy)
- Forced train buy from bank pool -- not enforced
- 100% pool limit -- config only

## 1861
- Optional 1D column market variant -- config only

## 1862
- 30% president share -- config only (engine uses title.shares)
- H-train triggers LNER formation -- event exists in events.js but LNER logic not automated

## 1867
- Multiplier trains (2+2, 5+5E run route twice) -- route/revenue mechanic
- Phase 8 train discounts ($275-$500 off) -- manual price entry by user

## 1871
- Branch/mainline route system -- route/revenue mechanic
- 10 phases with rapid train rusting -- config only (rusting IS implemented)

## 1880
- Building permits (A/B/C/D) gate track laying per phase -- board mechanic
- Foreign investors -- not modeled
- Draft for 8 privates -- draft UI exists, but 1880-specific flow not coded

## 1889
- Must sell in blocks -- config only, not enforced
- No emergency buy from other corps -- not enforced

## 1899 Daihan
- Goods transport via ports -- route/revenue mechanic
- D-train purchase advances stock price 1-3 spaces -- manual via SET_MARKET_POSITION
- Stations scale with par price (2 at low par, 3 at high) -- config only

## 18Chesapeake
- Cornelius Vanderbilt random president cert -- UI hint only
- D-train trade-in discount ($200 from 4/5/6) -- manual price override

## 18DO HSB
- Small breweries as privates in starting round -- config only
- Non-standard brewery shares (30/10/.../20, 40/10/.../20) -- config only
- Capex cards as both trains and brewery equipment -- trains work, no dual tracking

## 18DO TRG
- Sequential founding order enforcement -- config hint only
- Descending-value 2D grid market -- config only (stockMarket.js handles any grid shape)

## 18Depot
- (Sandbox title -- all engine mechanics available by design)

## 18GB
- 40% president certificate -- config only (engine uses title.shares)
- Unique blue tile phase between green and brown -- tile/phase config only
- X-trains (4X/5X/6X) -- config only (trains work generically)

## 18India
- Multiplier trains (3x2, 3x3, 4x2, 4x3 run route multiple times) -- route mechanic
- Gauges (broad/meter/narrow) -- board mechanic
- Guarantee companies -- not modeled

## 18Ireland
- Narrow gauge tile abilities -- board mechanic
- DKR private starts a minor with 2H train -- special setup, manual
- Merger timing strategic notes -- not a mechanic

## 18MEX
- NdM non-standard shares including 5% certs -- config only
- MNR private forces NdM par price -- special ability, manual

## 18MS
- Multiplier D-trains (2D/4D/5D multiply revenue x2) -- route/revenue mechanic
- 70% max ownership -- config only, not enforced

## 18Rhl
- RhE delayed par (70/75/80 only) via director private -- special ability, manual
- MKB non-standard shares (3x20% + 4x10%) -- config only
- CCE dual home stations -- board mechanic
- No emergency buy from other corps -- not enforced

## 18 Royal Gorge
- Gold and coal resources shipped for revenue -- route/revenue mechanic
- Debt tokens constrain operations -- not modeled
- Treaty of Boston event -- not modeled
- Mining tokens and coal/ore revenue bonuses -- board mechanic

## 18SJ
- Sell/buy/sell SR order enforcement -- config only, not enforced
- Bonus tokens (Gota kanal, Sveabolaget port) -- board mechanic
- KHJ minor splits revenue with owner -- not auto-calculated
- D-train trade-in discount ($300) -- manual price override
- E-train variant at kr1,300 -- config only

## 18USA
- Resource markers (coal, ore, oil) add route bonuses -- board mechanic
- Subsidy privates (chosen at float, no pregame auction) -- UI flow only
- P-trains (Pullman, available from phase 5) -- config only
- Choose home city at float -- UI flow only

## 21Moon
- Mineral resource hexes boost revenue -- board mechanic
- No cert limit for corp-held shares -- config only, not enforced

## 22Mars
- Fixed round sequence (predetermined SR/OR order) -- config only, not auto-sequenced
- Tax of 10c per share above 2 in same corp at each SR -- not auto-calculated
- 7*/8* trains double first/last stop values -- route/revenue mechanic
- Revolt event (random between OR7-OR10) -- not modeled
- Permit cards via priority auction -- UI only

## Railways of the Lost Atlas
- English auction for minors pregame flow -- UI component exists
- Fixed 4/6 cycle game length -- config only
- Minor abilities persist after merger -- config/display only
