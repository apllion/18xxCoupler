// Corp Conversion — resize corps (2→5→10 shares) for 1817-style games.

// Convert a 2-share corp to 5-share.
// President's 10% becomes 40%. Other 10% shares become 20%.
// 3 new shares created in treasury.
export function convertTo5Share(state, corpSym) {
  const corp = state.corporations.find((c) => c.sym === corpSym)
  if (!corp) return false

  // Update player shares
  for (const player of state.players) {
    const newShares = []
    for (const s of player.shares) {
      if (s.corpSym === corpSym) {
        if (s.isPresident) {
          // President 10% → 40%
          newShares.push({ corpSym, percent: 40, isPresident: true })
        } else {
          // Regular 10% → 20%
          newShares.push({ corpSym, percent: 20, isPresident: false })
        }
      } else {
        newShares.push(s)
      }
    }
    player.shares = newShares
  }

  // Update corp tracking
  corp.corpSize = '5share'
  corp.totalShares = 5
  // Recalculate IPO: 3 new shares (20% each = 60%) go to treasury
  corp.ipoShares = 60
  corp.treasuryShares = 60

  return true
}

// Convert a 5-share corp to 10-share.
// President's 40% becomes 20%. Other 20% shares become 2x 10%.
// 4 new shares created in treasury.
export function convertTo10Share(state, corpSym) {
  const corp = state.corporations.find((c) => c.sym === corpSym)
  if (!corp) return false

  // Update player shares
  for (const player of state.players) {
    const newShares = []
    for (const s of player.shares) {
      if (s.corpSym === corpSym) {
        if (s.isPresident) {
          // President 40% → 20%
          newShares.push({ corpSym, percent: 20, isPresident: true })
        } else {
          // Regular 20% → 2x 10%
          newShares.push({ corpSym, percent: 10, isPresident: false })
          newShares.push({ corpSym, percent: 10, isPresident: false })
        }
      } else {
        newShares.push(s)
      }
    }
    player.shares = newShares
  }

  // Market shares also convert
  const marketPct = corp.marketShares
  corp.marketShares = marketPct // stays same % but now in 10% increments

  // Update corp tracking
  corp.corpSize = '10share'
  corp.totalShares = 10
  // New shares to treasury
  corp.ipoShares = Math.max(0, 100 - playerAndMarketPercent(state, corpSym))
  corp.treasuryShares = corp.ipoShares

  return true
}

// Convert a 2-share corp directly to 10-share (rare but possible in mergers).
export function convertTo10ShareFrom2(state, corpSym) {
  convertTo5Share(state, corpSym)
  convertTo10Share(state, corpSym)
}

function playerAndMarketPercent(state, corpSym) {
  let total = 0
  for (const player of state.players) {
    total += player.shares
      .filter((s) => s.corpSym === corpSym)
      .reduce((sum, s) => sum + s.percent, 0)
  }
  const corp = state.corporations.find((c) => c.sym === corpSym)
  total += corp?.marketShares || 0
  return total
}
