# 18xx Moderator Programs — Analysis & Comparison with 18xxBroker

## Lemmi's 18xx/PC Moderator (DOS, ~1995)

The classic DOS-era program widely used in the 18xx community. Replaces all physical game components **except** the map board, track tiles, and station tokens.

### What it tracks

**Per player:**
- Cash on hand
- Certificate count vs limit
- Ownership percentage per corporation
- President status (marked with special indicator)
- Private company holdings

**Per corporation:**
- Treasury cash
- Par price and current share price
- IPO shares remaining
- Bank pool shares
- Trains owned (compact format: "233" = one 2-train, two 3-trains)
- Revenue history
- Station token count
- President designation
- Owned private companies

**Global:**
- Bank cash and minimum threshold
- Available trains in depot with prices
- Stock market positions (format: "90/2" = row 2, price 90)

### What it automates

- **Auction phase:** Bid/pass/buy privates with affordability validation
- **Stock round:** Par setting, share purchases from IPO/market, president changes, price movements on buy/sell
- **Operating round:**
  - Private revenue collection (automatic at OR start)
  - Station placement cost deduction from treasury
  - Terrain costs (river $80, mountain $120 in 1830)
  - Train purchase from bank or other corps
  - Train upgrades (e.g., 4→D in 1830)
  - Emergency train purchases (president forced to sell shares)
  - Bankruptcy declaration
  - Dividend payout vs withhold with +/- toggle
  - Share price movements from dividend decisions
- **Private company sales:** Player-to-corp with price entry, highlights president-owned privates in red

### What it calculates

- Share price movements from dividends, withholds, and share sales
- Treasury flow (withhold → treasury, pay → players from bank)
- Certificate limit checking
- Emergency buy exposure (when president must sell shares to cover)
- Final scoring (accessible via Tables → Score menu)

### UI Design

- **Single dense screen:** One row per player, columns per corporation
- **Stock market view:** Separate screen showing price marker positions
- **Score display:** Requires navigation to access
- **Undo:** Press "-" key repeatedly to revert multiple actions, Ctrl-Enter to confirm
- **Input:** Mouse-primary (left=buy, middle=pass, right=bid), keyboard secondary

### What it does NOT do

- No map or tile tracking
- No route calculation
- No analysis or recommendations
- No network play or device sync
- No game import/export
- No what-if/sandbox mode
- No turn guidance

### Games Supported

Primarily 1830; other 18xx variants added over time. Configuration-based game definitions.

---

## Graphite Moderator (Java, modern)

A modern replacement for Lemmi, written in Java 8.

### Key Differences from Lemmi

- Modern Java application (no DOSBox needed)
- Supports many more 18xx titles (extensive game list on BGG)
- More user-friendly interface
- Same core concept: financial bookkeeping without map tracking

### Games Supported

Extensive list including 1830, 1846, 1856, 1870, 18xx variants. See [BGG GeekList](https://boardgamegeek.com/geeklist/231253/18xx-games-supported-graphite-moderator).

---

## Rails (Java, open source)

Full 18xx game engine on SourceForge. Unlike moderators, Rails implements the **complete game** including map, tiles, routes, and revenue calculation.

- Full rules enforcement
- AI players
- Network play
- Open source (Java)

---

## 18xx.games (Web, Ruby, open source)

Modern web implementation of many 18xx titles. Full rules enforcement, async play, action-replay format.

- Complete game engine per title
- Public JSON API with full action logs
- Thousands of completed games available
- Open source (Ruby backend)

---

## 18xxBroker — How It Compares

| Feature | Lemmi | Graphite | Rails | 18xx.games | **18xxBroker** |
|---------|-------|----------|-------|------------|----------------|
| Financial tracking | Yes | Yes | Yes | Yes | **Yes** |
| Map/tiles | No | No | Yes | Yes | No |
| Route calculation | No | No | Yes | Yes | No |
| Rules enforcement | Partial | Partial | Full | Full | Advisory |
| Multi-device sync | No | No | No | Web-based | **P2P WebRTC** |
| Turn guidance | No | No | Yes | Yes | **Yes (guided mode)** |
| What-if mode | No | No | No | No | **Yes** |
| Game import (18xx.games) | No | No | No | N/A | **Yes (by game ID)** |
| Replay with scrubbing | No | No | No | Partial | **Yes** |
| Train rush indicator | No | No | No | No | **Yes** |
| Dividend advisor | No | No | No | No | **Yes** |
| Analysis/heuristics | No | No | No | No | **Yes (AI-informed)** |
| Platform | DOS | Java | Java | Web | **Web (PWA)** |
| Open source | No | No | Yes | Yes | Yes |

### What 18xxBroker adds beyond classic moderators

1. **P2P sync** — All devices at the table see the same state via WebRTC. No server needed.
2. **Guided mode** — Player-focused views with turn handling. Classic moderators are "god mode" only.
3. **What-if mode** — Snapshot state, explore as all players/factions, revert. No moderator has this.
4. **18xx.games import** — Fetch any game by ID, replay the action history, branch into what-if from any point.
5. **Train rush indicator** — Per-corp rust risk, phase pressure, emergency buy exposure. Informed by AI analysis of 6000+ human games.
6. **Dividend advisor** — Side-by-side pay/half/withhold comparison showing price movement, treasury outcome, and train affordability.
7. **Multi-title support** — 33 titles configured, 10 tested with import (1830, 1846, 1849, 1861, 1867, 1880, 1889, 18Chesapeake, 18MEX, 18MS).

### What classic moderators still do better

1. **Mature UX** — Lemmi's single-screen density shows everything at once. 18xxBroker uses tabs.
2. **Speed** — DOS program with keyboard shortcuts is extremely fast for experienced users.
3. **Completeness** — Lemmi handles every edge case for supported games through decades of refinement.

---

## Sources

- [1830 with Lemmi's moderator (1/3)](https://www.railsonboards.com/2019/01/14/1830-with-lemmis-moderator-1-3/)
- [1830 with Lemmi's moderator (3/3)](https://www.railsonboards.com/2019/01/17/1830-with-lemmis-moderator-3-3/)
- [Graphite 18XX moderator demo (YouTube)](https://www.youtube.com/watch?v=jzvLubBc7yU)
- [18XX games supported by Graphite](https://boardgamegeek.com/geeklist/231253/18xx-games-supported-graphite-moderator)
- [Rails on SourceForge](https://sourceforge.net/projects/rails/)
