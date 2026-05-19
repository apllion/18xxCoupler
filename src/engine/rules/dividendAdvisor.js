// Dividend Advisor — compare payout/withhold/half-pay outcomes.

import { corpPrice, priceAt } from '../stockMarket.js'

// Given a revenue number, compute all three outcomes side by side
export function dividendComparison(state, corpSym, totalRevenue) {
  const corp = state.corporations.find(c => c.sym === corpSym)
  if (!corp || totalRevenue <= 0) return null

  const market = state.stockMarket
  const pos = market.corpPositions[corpSym]
  if (!pos) return null

  const currentPrice = priceAt(market, pos.row, pos.col)
  if (!currentPrice) return null

  const perShare = Math.floor(totalRevenue / 10)

  // Calculate player payouts
  const playerPayouts = []
  for (const player of state.players) {
    const pct = player.shares
      .filter(s => s.corpSym === corpSym)
      .reduce((sum, s) => sum + s.percent, 0)
    if (pct > 0) {
      playerPayouts.push({
        name: player.name,
        percent: pct,
        fullPay: perShare * (pct / 10),
        halfPay: Math.floor(totalRevenue / 2 / 10) * (pct / 10),
      })
    }
  }

  // Simulate price movements
  const payPrice = simulatePayPrice(market, pos, perShare, currentPrice, state.title)
  const withholdPrice = simulateWithholdPrice(market, pos)
  const halfPayPrice = currentPrice // half-pay: typically no movement

  // IPO dividend (full cap only)
  const ipoDividend = state.title.capitalization === 'full' && corp.ipoShares > 0
    ? perShare * (corp.ipoShares / 10)
    : 0

  // Treasury outcomes
  const halfRevenue = Math.floor(totalRevenue / 2)
  const treasuryHalf = totalRevenue - halfRevenue

  // Next cheapest train
  const cheapestTrain = state.depot.upcoming.find(t => !t.availableOn)
  const trainCost = cheapestTrain?.price || 0
  const trainName = cheapestTrain?.name || null

  return {
    perShare,
    currentPrice,
    payout: {
      label: 'Pay',
      newPrice: payPrice,
      priceChange: payPrice - currentPrice,
      isDoubleJump: perShare >= currentPrice,
      toPlayers: playerPayouts.reduce((s, p) => s + p.fullPay, 0),
      toTreasury: ipoDividend,
      treasuryAfter: corp.cash + ipoDividend,
      canAffordTrain: trainCost > 0 ? (corp.cash + ipoDividend) >= trainCost : null,
      playerPayouts: playerPayouts.map(p => ({ ...p, amount: p.fullPay })),
    },
    withhold: {
      label: 'Withhold',
      newPrice: withholdPrice,
      priceChange: withholdPrice - currentPrice,
      toPlayers: 0,
      toTreasury: totalRevenue,
      treasuryAfter: corp.cash + totalRevenue,
      canAffordTrain: trainCost > 0 ? (corp.cash + totalRevenue) >= trainCost : null,
      playerPayouts: playerPayouts.map(p => ({ ...p, amount: 0 })),
    },
    halfPay: state.title.halfPay ? {
      label: 'Half',
      newPrice: halfPayPrice,
      priceChange: 0,
      toPlayers: playerPayouts.reduce((s, p) => s + p.halfPay, 0),
      toTreasury: treasuryHalf,
      treasuryAfter: corp.cash + treasuryHalf,
      canAffordTrain: trainCost > 0 ? (corp.cash + treasuryHalf) >= trainCost : null,
      playerPayouts: playerPayouts.map(p => ({ ...p, amount: p.halfPay })),
    } : null,
    trainInfo: trainCost > 0 ? { name: trainName, cost: trainCost } : null,
  }
}

// Simulate payout price: right 1 (or 2 if double jump)
function simulatePayPrice(market, pos, perShare, currentPrice, title) {
  const row = market.grid[pos.row]
  const jumps = perShare >= currentPrice ? 2 : 1
  let col = pos.col
  for (let i = 0; i < jumps; i++) {
    if (col < row.length - 1 && row[col + 1]) col++
  }
  return priceAt(market, pos.row, col) || currentPrice
}

// Simulate withhold price: left 1
function simulateWithholdPrice(market, pos) {
  let col = pos.col
  if (col > 0 && market.grid[pos.row][col - 1]) col--
  return priceAt(market, pos.row, col) || priceAt(market, pos.row, pos.col)
}
