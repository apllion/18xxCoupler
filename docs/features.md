# 18xxBroker — Feature List

Financial bookkeeping and decision-support companion for 18xx board games.
Not a full rules engine (no map/routing) — a moderator tool with modern conveniences.

---

## Core Game Loop

- Game creation from 33 configured titles + player names + optional variant
- Player-count-based filtering (corps, companies, starting cash, cert limits)
- Phase tracking (yellow/green/brown/gray) triggered by train purchases
- Train depot: purchase, rusting, discarding, exporting
- Stock market grid: IPO placement, price movements on dividends/sells/sold-out
- Dividend actions: pay, withhold, half-pay (where title enables it)
- Private companies: auction, revenue collection, sale to corps, phase-triggered closure
- Round tracking: SR / OR sets / Merger rounds, with step tracking inside ORs
- Certificate limit and ownership limit tracking (advisory, not blocking)

## Pregame & Auctions

- Waterfall auction (1830, 1889, 18Chesapeake, 1862, 18Rhl, 18GB, 18Ireland, 18MS)
- Bidbox auction (1822, 1822CA, 1861)
- English auction (1847AE, 1858, 18India, 18Daihan, 18DO TRG, 18 Royal Gorge, 18SJ, RLA)
- Secret draft (1846)
- Open draft (1880, 18MS)
- Priority auction (22Mars, PTG)
- Brewery purchase (18DO HSB)
- Setup hints per player count
- Post-auction results entry
- Player order display during draft/auction

## Stock Market & Shares

- 2D grid market with position tracking per corp
- IPO at selected par price (phase-gated par prices for 1849)
- Buy from IPO or market pool
- Sell to market pool with configurable price movement (down_share, down_block, down_per_10, none)
- Sold-out corps move up at end of OR set
- Corp-to-corp share purchases (1817, 18India, 21Moon, PTG)
- Corp-to-corp share sales (1817, 21Moon, PTG)
- Issue shares from IPO to raise cash (incremental cap titles)
- Redeem shares from market back to IPO
- Double-jump price movement on high-value dividends
- Configurable sell timing (after first SR, after operate, any time)
- Configurable sell-buy order (sell_buy, sell_buy_sell)

## Title-Specific Mechanics

- **Loans** (1817): take/repay/interest, tiered interest rates, liquidation on non-payment
- **Short selling** (1817): open/cover short positions
- **Corp sizing** (1817, 18GB): 2-share / 5-share / 10-share conversion
- **Concessions** (1822 family): concession -> president cert conversion
- **Train export** (1817, 18USA): export next depot train if corp bought none
- **Executive cars** (18Daihan): attach to trains, limited supply
- **Beer market** (18DO HSB): brewery deliveries, market segments, export, No Demand tokens
- **Strategy cards** (PTG): give to player, assign to train, use card action
- **Phase-gated float %** (1880): 20% -> 30% -> 40% -> 60% through phases
- **Phase-gated par prices** (1849): higher par slots unlock at later phases
- **Nationalization** (1861, 1867, 18SJ): close corp, compensate shareholders, transfer to national
- **Events**: close_companies, green_minors_available, majors_can_ipo, earthquake, etc.

## Mergers

Six distinct merger types implemented:

| Type | Titles | Timing |
|------|--------|--------|
| 1817_merge | 1817 | Merger & Conversion Round |
| 1822_acquire | 1822, 1822CA, 1822MX | During OR (major acquires minor) |
| 1862_peer | 1862 | During OR (two peers, pick survivor) |
| 1867_minor_major | 1867, 18Ireland | Dedicated Merger Round |
| ptg_combine | PTG | During OR (from Brown phase) |
| rla_merge | RLA | Merger Round (from Green phase) |

## Analysis & Decision Support

- **Dividend Advisor**: side-by-side comparison of pay/withhold/half outcomes — new price, player payouts, treasury impact, train affordability
- **Train Rush Indicator**: per-corp rust risk, emergency buy exposure, permanent vs. rustable trains, depot pressure
- **Net Worth Calculation**: cash + share value (at market price) + private value, ranked
- **Certificate Limit Tracking**: visual flag when over limit
- **Bank Status**: remaining bank cash, highlight when low

## Undo, Replay & What-If

- **Action log**: every action recorded with timestamp and description
- **Undo**: rebuild state from log minus last entry (unlimited depth)
- **Replay mode**: scrub through any imported or saved game action-by-action
- **What-if mode**: snapshot state, explore freely, then discard or keep changes
- Mode banners: blue for replay, purple for what-if

## Import / Export

- Import from 18xx.games by game ID (async fetch + full action replay)
- 25+ titles mapped for import
- Export game as JSON (titleId, playerNames, actionLog, createdAt)
- Import from JSON file
- Import stats: applied/skipped/errors count
- Known limitation: implicit withhold $0 events cause small cash diffs (~100)

## P2P Networking (No Server)

- WebRTC via Trystero over Nostr relays
- Room creation with 6-character alphanumeric codes
- Join room by code, auto-sync full game state on connect
- All actions broadcast to peers immediately
- Peer count display, connection status indicator
- Heartbeat every 10s, auto-reconnect with backoff
- Room persistence (rejoin last room on reload)

## Two Complete UI Skins

### Broker (modern)
- Clean, compact matrix: 1 row per player, 1 column per corp
- Multi-tab layout: Overview, Market, Corps, Players, Privates, Beer Market, Summary
- Color-coded corp columns, faded if not IPO'd
- Click-to-select for detail panels
- Keyboard navigation (arrow keys)
- Player perspective buttons (lock to one player or umpire view)

### Moderator (retro terminal)
- DOS/Green/Amber/White terminal color schemes
- Monospace font, pixel-perfect spacing
- F-key shortcuts (F1:Matrix, F3:Corp, F4:Player, F5:Privates, F6:Settings)
- Same data, same actions, different aesthetic

### App Themes
- Broker (gold accents), Dark, Light — applied via CSS variables

## Persistence

- Auto-save to localStorage on each action
- Load & continue last game
- List all saved games
- Delete saved game
- No save during what-if mode (prevents accidents)

## Title Support

### Tested (verified against Ruby engine)
1830, 1846, 1849, 1861, 1867, 1880, 1889, 18Chesapeake, 18MEX, 18MS

### Configured (33 total)
1817, 1822, 1822CA, 1822MX, 1830, 1846, 1847AE, 1849, 1858, 1860, 1861,
1862, 1867, 1871, 1880, 1889, 18Chesapeake, 18Daihan, 18DO HSB, 18DO TRG,
18GB, 18India, 18Ireland, 18MEX, 18MS, 18Rhl, 18 Royal Gorge, 18SJ, 18USA,
21Moon, 22Mars, PTG, RLA

## Tech Stack

- React 19 + Vite 8
- Zustand + Immer for state management
- Trystero for P2P (WebRTC over Nostr)
- Vitest for testing
- No backend, no database, no auth — runs entirely in the browser
