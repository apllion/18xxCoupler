# Upcoming Features

## Analysis & Decision Helpers

### Quick Wins (data already in engine)

- [ ] **Train Rush Clock (enhanced)** — ORs remaining estimate (bank cash / avg revenue), urgency bars per rust event, trainless alerts per corp
- [ ] **Dividend Advisor (enhanced)** — cash flow projection: "if withhold 3 ORs, can buy 5-train", multi-OR outcome comparison
- [ ] **Position Meter** — net worth per player (cash + shares + privates), position ratio bar chart, leader indicator
- [ ] **Bank Break Countdown** — bank health % bar, estimated ORs to bank break, "final OR set" warning
- [ ] **Phase Pressure Gauge** — trains remaining per tier in depot, phase trigger indicators, vulnerable train list per corp

### Medium Effort (from 18AI statistical data)

- [ ] **Par Value Guide** — win rate by par price per title (from 732+ game analysis), "65 is best first corp" style tips
- [ ] **Corp Quality Ranking** — revenue potential score per corp, offboard dependency %, static data from AI analysis
- [ ] **Private Company Valuation** — winner correlation per private, "SC at $40: 45% win rate" annotations

### Harder (needs computation)

- [ ] **Cash Flow Planner** — forward simulate N ORs, show when corp can afford next train tier, withhold/pay schedule
- [ ] **Emergency Buy Exposure** — which corps trainless if next phase triggers, president coverage check, sell requirements

## Engine Actions Missing

- [ ] **REMOVE_TOKEN** — corp removes a station token (1861 etc.)
- [ ] **DISCARD_TRAIN** — forced discard when over train limit
- [ ] **EXPORT_TRAIN** button — 1817, 18USA end of OR
- [ ] **CONVERT_CONCESSION** button — 1822 family
- [ ] **Merger panel** — MERGE_CORPS, ACQUIRE_MINOR, CONVERT_MINOR, MERGE_MINORS per title type
- [ ] **SHORT_SELL / CLOSE_SHORT** panel — 1817
- [ ] **CONVERT_CORP** panel — 1817 (2→5→10 share), 18GB (5→10 share)
- [ ] **Beer market actions** — 18DO HSB (DELIVER_BEER, DELIVER_EXPORT, BREWERY_INCOME, etc.)
- [ ] **NATIONALIZE_CORP** — 1861, 1867, 18SJ
- [ ] **PLAYER_BANKRUPT** button

## Limits & Validation (advisory per settings)

- [ ] **Bank pool limit** — warn/block when market shares exceed title's marketShareLimit
- [ ] **Certificate limit** — visual warning when player exceeds certLimit (already shown, need warning styling)
- [ ] **Ownership limit** — warn when player exceeds maxOwnership % per corp
- [ ] **Train limit** — warn when corp exceeds phase trainLimit after purchase
- [ ] **Sell restrictions** — per title: sellAfter, mustSellInBlocks, can't sell president cert

## Setup & Configuration

- [ ] **Corp selection panel** — toggle corps in/out for 1846 (2p: choose 4-5 of 7), 1849 (remove by player count)
- [ ] **Token action panel** — click Tokens row to place/remove, show cost
- [ ] **Starting cash editor** — for custom/house rules
- [ ] **Variant selector** — better UI for selecting title variants during setup

## UI/UX

- [ ] **Super-umpire edit mode** — click any value in matrix to edit directly (cash, shares, trains)
- [ ] **Moderator-native detail views** — Corps, Players, Market views in terminal aesthetic (currently uses Broker views)
- [ ] **Player view (restricted)** — filtered to one player's corps/actions, for phone use
- [ ] **Room join/create in settings** — P2P connection setup
- [ ] **Action log view** — scrollable log in both skins
- [ ] **Stock market grid view** — visual market with corp position markers
- [ ] **Undo history** — show what was undone, allow redo

## Import & Analysis

- [ ] **Import from file** — load .json game files (not just from API)
- [ ] **18xx.games live game tracking** — auto-refresh active games
- [ ] **Game comparison** — side-by-side two game states (what-if vs real)
- [ ] **Export game state** — download current state as JSON
- [ ] **Score calculator** — final scoring (cash + share value at market price)

## Automation (configurable)

- [ ] **Wire up auto-advance** — when all players passed SR, auto-advance to OR
- [ ] **Wire up auto-collect** — auto-collect private revenue at OR start
- [ ] **Wire up auto-sold-out** — auto-adjust at OR end
- [ ] **Wire up auto-presidency** — auto-swap on share majority change
- [ ] **Wire up auto-next-corp** — after revenue+train, advance to next corp
