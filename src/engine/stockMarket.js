// StockMarket — parse cells, track corp positions, move prices.

// Parse a market cell string. Conventions from 18xx.games:
//   "100p" = par price, "40y" = yellow, "30o" = orange, "25b" = brown, "0c" = close
//   1880: "115B" = bonus, "130W" = bonus+1, "150X" = bonus+2, "180Y" = bonus+3, "200Z" = bonus+4
//   1860: "54p" = par, "40r" = reserved, "7i" = initial, "340e" = endgame
//   1849: "306u" = unlimited, "216z" = zone, "144x" = extra
export function parseCell(cellStr) {
  if (!cellStr || cellStr === '') return null
  const match = cellStr.match(/^(\d+)([a-zA-Z]*)$/)
  if (!match) return null
  const price = parseInt(match[1], 10)
  const modifier = match[2] || ''
  const modLower = modifier.toLowerCase()
  return {
    price,
    canPar: modLower.includes('p'),
    zone: modLower.includes('y') ? 'yellow'
        : modLower.includes('o') ? 'orange'
        : modLower.includes('b') && !modifier.includes('B') ? 'brown'
        : modLower.includes('c') ? 'close'
        : modLower.includes('e') ? 'endgame'
        : modLower.includes('i') ? 'initial'
        : modLower.includes('r') ? 'reserved'
        : modifier.includes('B') ? 'bonus'
        : modifier.includes('W') ? 'bonus'
        : modifier.includes('X') ? 'bonus'
        : modifier.includes('Y') ? 'bonus'
        : modifier.includes('Z') ? 'bonus'
        : 'normal',
    modifier,
  }
}

export function createStockMarket(marketDef) {
  const grid = marketDef.map((row) => row.map(parseCell))
  return {
    grid,
    corpPositions: {}, // { [corpSym]: { row, col } }
  }
}

export function parPrices(market) {
  const prices = []
  for (let row = 0; row < market.grid.length; row++) {
    for (let col = 0; col < market.grid[row].length; col++) {
      const cell = market.grid[row][col]
      if (cell && cell.canPar) {
        prices.push({ price: cell.price, row, col })
      }
    }
  }
  return prices.sort((a, b) => a.price - b.price)
}

export function priceAt(market, row, col) {
  const cell = market.grid[row]?.[col]
  return cell ? cell.price : null
}

export function corpPrice(market, corpSym) {
  const pos = market.corpPositions[corpSym]
  if (!pos) return null
  return priceAt(market, pos.row, pos.col)
}

export function placeCorpOnMarket(market, corpSym, row, col) {
  // order: higher = arrived later = placed under existing tokens
  const maxOrder = Object.values(market.corpPositions).reduce((m, p) => Math.max(m, p.order || 0), 0)
  market.corpPositions[corpSym] = { row, col, order: maxOrder + 1 }
}

// --- Single-step primitives ---

let _orderSeq = 1000

function bumpOrder(market, pos) {
  _orderSeq++
  pos.order = _orderSeq
}

function stepRight(market, pos) {
  const row = market.grid[pos.row]
  if (pos.col < row.length - 1 && row[pos.col + 1]) {
    pos.col++
    bumpOrder(market, pos)
    return true
  }
  return false
}

function stepLeft(market, pos) {
  if (pos.col > 0 && market.grid[pos.row][pos.col - 1]) {
    pos.col--
    bumpOrder(market, pos)
    return true
  }
  return false
}

function stepDown(market, pos) {
  if (pos.row >= market.grid.length - 1) return false
  const nextRow = market.grid[pos.row + 1]
  let col = Math.min(pos.col, nextRow.length - 1)
  while (col >= 0 && !nextRow[col]) col--
  if (col >= 0) {
    pos.row++
    pos.col = col
    bumpOrder(market, pos)
    return true
  }
  return false
}

function stepUp(market, pos) {
  if (pos.row <= 0) return false
  const prevRow = market.grid[pos.row - 1]
  let col = Math.min(pos.col, prevRow.length - 1)
  while (col >= 0 && !prevRow[col]) col--
  if (col >= 0) {
    pos.row--
    pos.col = col
    bumpOrder(market, pos)
    return true
  }
  return false
}

// --- High-level movement used by actions ---

// Move right N times (e.g., after paying dividends)
export function moveRight(market, corpSym, steps = 1) {
  const pos = market.corpPositions[corpSym]
  if (!pos) return
  for (let i = 0; i < steps; i++) {
    if (!stepRight(market, pos)) break
  }
}

// Move left N times (e.g., after withholding)
export function moveLeft(market, corpSym, steps = 1) {
  const pos = market.corpPositions[corpSym]
  if (!pos) return
  for (let i = 0; i < steps; i++) {
    if (!stepLeft(market, pos)) break
  }
}

// Move down N times (e.g., shares sold)
export function moveDown(market, corpSym, steps = 1) {
  const pos = market.corpPositions[corpSym]
  if (!pos) return
  for (let i = 0; i < steps; i++) {
    if (!stepDown(market, pos)) break
  }
}

// Move up N times (e.g., sold-out corps)
export function moveUp(market, corpSym, steps = 1) {
  const pos = market.corpPositions[corpSym]
  if (!pos) return
  for (let i = 0; i < steps; i++) {
    if (!stepUp(market, pos)) break
  }
}

// --- Dividend-based movement ---
// dividendMovement config: see switch below for all supported types.
// Returns positive for right moves, -1 for left
export function moveDividend(market, corpSym, perShare, dividendMovement, totalRevenue) {
  const pos = market.corpPositions[corpSym]
  if (!pos) return 0
  const price = priceAt(market, pos.row, pos.col)
  if (!price) return 0

  const doRight = (n) => { let m = 0; for (let i = 0; i < n; i++) if (stepRight(market, pos)) m++; return m }
  const doLeft = () => { stepLeft(market, pos); return -1 }
  const doLeftOrDown = () => { if (!stepLeft(market, pos)) stepDown(market, pos); return -1 }

  // Withhold always moves left (all types)
  if (perShare <= 0) {
    switch (dividendMovement) {
      case 'trg_triple_jump':
      case 'ptg_triple':
        return doLeftOrDown()
      default:
        return doLeft()
    }
  }

  // Revenue-based jumps
  switch (dividendMovement) {
    // 1830, 1889, 18Ches, 18MS, 1817 — simple: rev>0 right 1, no double jump
    case 'no_double':
      return doRight(1)

    // 1867, 1849, 18Rhl, 18Ireland — >=price right 1, else nothing
    case 'standard_no_double':
      return perShare >= price ? doRight(1) : 0

    // 1858 — per_share*10 >= price → right 1, else nothing
    case '1858':
      return perShare * 10 >= price ? doRight(1) : 0

    // 1846 — <half→left; >=1x→right1; >=2x→right2; >=3x→right3 (if price>=165)
    case '1846': {
      if (perShare < price * 0.5) return doLeft()
      let t = 0
      if (perShare >= price) t = 1
      if (perShare >= price * 2) t = 2
      if (perShare >= price * 3 && price >= 165) t = 3
      return t > 0 ? doRight(t) : 0
    }

    // 1822 — rev>0 right1; >=2x right2 (majors; minors always just right 1)
    case '1822':
      return doRight(perShare >= price * 2 ? 2 : 1)

    // 18SJ — >=price right1; >=2x right2 (if price>82)
    case '18sj':
      if (perShare < price) return 0
      return doRight(perShare >= price * 2 && price > 82 ? 2 : 1)

    // 1860, 1862 — >=1x→1; >=2x→2; >=3x→3; >=4x→4
    case 'multi_jump': {
      if (perShare < price) return 0
      const t = Math.min(Math.floor(perShare / price), 4)
      return doRight(t)
    }

    // 18GB — rev>0 always right; >=2x→2; >=3x→3; >=4x→4
    case '18gb': {
      const t = Math.min(Math.max(Math.floor(perShare / price), 1), 4)
      return doRight(t)
    }

    // 18USA — >=0.5x→1; >=1x→2; >=1.5x→3; >=2x→4
    case '18usa': {
      let t = 0
      if (perShare >= Math.floor(price * 0.5)) t = 1
      if (perShare >= price) t = 2
      if (perShare >= Math.floor(price * 1.5)) t = 3
      if (perShare >= price * 2) t = 4
      return t > 0 ? doRight(t) : 0
    }

    // 18RG — right = floor(rev/price), max 3
    case '18rg': {
      const t = Math.min(Math.floor(perShare / price), 3)
      return t > 0 ? doRight(t) : 0
    }

    // 21Moon — >=2x right2; >=half right1; else nothing
    case '21moon': {
      if (perShare >= price * 2) return doRight(2)
      if (perShare >= price * 0.5) return doRight(1)
      return 0
    }

    // 22Mars — >=2x right2; else right1
    // (already handled by 'standard' default, but explicit)

    // 1871 — full payout right1; half pay nothing (handled by caller)
    case '1871':
      return doRight(1)

    // 18DO TRG — withhold=left/down; <price=none; >=price right1; >=3x right2
    case 'trg_triple_jump':
      if (perShare < price) return 0
      if (perShare >= price * 3) return doRight(2)
      if (stepRight(market, pos)) return 1
      if (stepUp(market, pos)) return 1
      return 0

    // PTG — compare TOTAL revenue vs price
    case 'ptg_triple': {
      const rev = totalRevenue ?? perShare * 10
      if (rev < price * 0.5) return doLeftOrDown()
      if (rev >= price * 3) {
        let m = 0
        if (stepRight(market, pos) || stepUp(market, pos)) m++
        if (stepRight(market, pos) || stepUp(market, pos)) m++
        return m
      }
      if (stepRight(market, pos) || stepUp(market, pos)) return 1
      return 0
    }

    // Standard (default for most 18xx):
    // rev>0: right 1. If perShare >= price: right 2 (double jump)
    default:
      return doRight(perShare >= price ? 2 : 1)
  }
}

// --- Sell movement (title-aware) ---
// sellMovement config: 'down_share' | 'down_per_10' | 'down_per_sale' | 'left_block_pres' | 'down_block' | 'none'
// baseSharePercent: size of one regular cert (10 for standard, 20 for PTG 5-share corps)
export function moveSell(market, corpSym, percentSold, sellMovement = 'down_share', baseSharePercent = 10) {
  const pos = market.corpPositions[corpSym]
  if (!pos) return

  if (sellMovement === 'none') return

  const shares = Math.floor(percentSold / baseSharePercent)

  switch (sellMovement) {
    case 'down_share':
    case 'down_per_10':
      // One space down per 10% sold
      for (let i = 0; i < shares; i++) {
        stepDown(market, pos)
      }
      break

    case 'down_per_sale':
    case 'down_block':
    case 'down_block_pres':
      // Move down once regardless of how many sold
      stepDown(market, pos)
      break

    case 'left_share':
      // Move left per share
      for (let i = 0; i < shares; i++) {
        stepLeft(market, pos)
      }
      break

    case 'left_block':
    case 'left_block_pres':
      // Move left once regardless
      stepLeft(market, pos)
      break

    default:
      // Default: down per share
      for (let i = 0; i < shares; i++) {
        stepDown(market, pos)
      }
      break
  }
}

// --- Sold-out check ---
// A corp is sold out if 0% remains in IPO and market pool
// Project future prices: step right N times from a corp's current position.
// Returns array of prices [current, +1, +2, ...] of length steps+1.
// Does not mutate market.
export function projectPrices(market, corpSym, steps) {
  const pos = market.corpPositions[corpSym]
  if (!pos) return []
  const sim = { row: pos.row, col: pos.col }
  const prices = [priceAt(market, sim.row, sim.col) || 0]
  for (let i = 0; i < steps; i++) {
    // Try right, then up if at right edge (sold-out style bump)
    const row = market.grid[sim.row]
    if (sim.col < row.length - 1 && row[sim.col + 1]) {
      sim.col++
    } else if (sim.row > 0) {
      const prevRow = market.grid[sim.row - 1]
      let col = Math.min(sim.col, prevRow.length - 1)
      while (col >= 0 && !prevRow[col]) col--
      if (col >= 0) { sim.row--; sim.col = col }
    }
    prices.push(priceAt(market, sim.row, sim.col) || 0)
  }
  return prices
}

export function isSoldOut(corp) {
  return corp.ipoShares <= 0 && corp.marketShares <= 0
}

// Move sold-out corps up at end of OR set
export function moveSoldOutCorps(market, corporations) {
  const moved = []
  for (const corp of corporations) {
    if (corp.floated && isSoldOut(corp)) {
      const pos = market.corpPositions[corp.sym]
      if (pos && stepUp(market, pos)) {
        moved.push(corp.sym)
      }
    }
  }
  return moved
}
