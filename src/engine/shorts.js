// Short Selling — players can short sell shares (1817).
// Creates a negative share (player owes) + positive share (goes to market).
// Closing a short: buy a share from market to cancel the negative.

import { corpPrice } from './stockMarket.js'

// Execute a short sell: player receives cash, gets negative share, market gets positive share.
export function shortSell(state, playerId, corpSym) {
  const player = state.players.find((p) => p.id === playerId)
  const corp = state.corporations.find((c) => c.sym === corpSym)
  const price = corpPrice(state.stockMarket, corpSym)
  if (!player || !corp || !price) return false

  // Check: can't short 2-share corps
  if (corp.corpSize === '2share') return false

  // Check: player can't own positive shares and short same corp
  const ownsShares = player.shares.some((s) => s.corpSym === corpSym && !s.isShort)
  if (ownsShares) return false

  // Check short limit
  const config = state.title.shorts || {}
  const maxShorts = config.maxPerCorp || corp.totalShares || 10
  const currentShorts = player.shares.filter((s) => s.corpSym === corpSym && s.isShort).length
  if (currentShorts >= maxShorts) return false

  // Player receives cash
  player.cash += price

  // Player gets negative (short) share
  player.shares.push({ corpSym, percent: 10, isPresident: false, isShort: true })

  // Positive share goes to market
  corp.marketShares += 10

  return true
}

// Close a short: player buys share from market to cancel negative share.
export function closeShort(state, playerId, corpSym) {
  const player = state.players.find((p) => p.id === playerId)
  const corp = state.corporations.find((c) => c.sym === corpSym)
  const price = corpPrice(state.stockMarket, corpSym)
  if (!player || !corp || !price) return false

  // Find a short share
  const shortIdx = player.shares.findIndex((s) => s.corpSym === corpSym && s.isShort)
  if (shortIdx < 0) return false

  // Player pays current price
  player.cash -= price

  // Remove negative share
  player.shares.splice(shortIdx, 1)

  // Remove positive share from market
  corp.marketShares = Math.max(0, corp.marketShares - 10)

  return true
}

// Count shorts a player has in a corp.
export function playerShortCount(player, corpSym) {
  return player.shares.filter((s) => s.corpSym === corpSym && s.isShort).length
}

// Total shorts in a corp across all players.
export function totalShorts(state, corpSym) {
  return state.players.reduce(
    (sum, p) => sum + playerShortCount(p, corpSym), 0
  )
}
