// StockMarket — parse cells, track corp positions, move prices.
import { dividendStrategies, sellStrategies } from './families/index.js'

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
// dividendMovement config: dispatches to family strategy functions.
// Returns positive for right moves, -1 for left
export function moveDividend(market, corpSym, perShare, dividendMovement, totalRevenue) {
  const pos = market.corpPositions[corpSym]
  if (!pos) return 0
  const price = priceAt(market, pos.row, pos.col)
  if (!price) return 0

  // Build helpers object that strategies use to move the token.
  // This keeps step primitives private to stockMarket.js while letting
  // family strategies express movement intent.
  const helpers = {
    doRight: (n) => { let m = 0; for (let i = 0; i < n; i++) if (stepRight(market, pos)) m++; return m },
    doLeft: () => { stepLeft(market, pos); return -1 },
    doLeftOrDown: () => { if (!stepLeft(market, pos)) stepDown(market, pos); return -1 },
    tryStepRight: () => stepRight(market, pos),
    tryStepUp: () => stepUp(market, pos),
  }

  // Look up the strategy function for this title's dividend movement type.
  // Falls back to classic (standard double-jump) if the key is not found.
  const strategy = dividendStrategies[dividendMovement] || dividendStrategies['standard']
  return strategy(market, pos, perShare, price, totalRevenue, helpers)
}

// --- Sell movement (title-aware) ---
// sellMovement config: dispatches to family strategy functions.
// baseSharePercent: size of one regular cert (10 for standard, 20 for PTG 5-share corps)
export function moveSell(market, corpSym, percentSold, sellMovement = 'down_share', baseSharePercent = 10) {
  const pos = market.corpPositions[corpSym]
  if (!pos) return

  if (sellMovement === 'none') return

  const shares = Math.floor(percentSold / baseSharePercent)

  // Build helpers for sell strategies
  const helpers = {
    stepDown: () => stepDown(market, pos),
    stepLeft: () => stepLeft(market, pos),
  }

  // Look up sell strategy; fall back to down-per-share default
  const strategy = sellStrategies[sellMovement] || sellStrategies['down_share']
  strategy(market, pos, shares, helpers)
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
