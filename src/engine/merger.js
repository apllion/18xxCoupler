// Merger — shared utilities for corp mergers/acquisitions across titles.

import { corpPrice } from './stockMarket.js'

// Transfer cash, trains, privates, and held shares from one corp to another.
export function transferAssets(state, fromCorpSym, toCorpSym) {
  const from = state.corporations.find((c) => c.sym === fromCorpSym)
  const to = state.corporations.find((c) => c.sym === toCorpSym)
  if (!from || !to) return

  // Cash
  to.cash += from.cash
  from.cash = 0

  // Trains (enforce train limit later at caller level)
  to.trains.push(...from.trains)
  from.trains = []

  // Shares held in other corps
  to.sharesHeld.push(...(from.sharesHeld || []))
  from.sharesHeld = []

  // Privates (if the title tracks them on corps)
  // Move privates assigned to fromCorp → toCorp
  if (state.companies) {
    for (const company of state.companies) {
      if (company.ownerId === fromCorpSym && company.ownerType === 'corporation') {
        company.ownerId = toCorpSym
      }
    }
  }
}

// Remove a corp from the game entirely.
export function removeCorpFromGame(state, corpSym) {
  // Remove from corporations list
  state.corporations = state.corporations.filter((c) => c.sym !== corpSym)

  // Remove from stock market positions
  if (state.stockMarket?.corpPositions?.[corpSym]) {
    delete state.stockMarket.corpPositions[corpSym]
  }

  // Remove shares held by players in this corp
  for (const player of state.players) {
    player.shares = player.shares.filter((s) => s.corpSym !== corpSym)
  }

  // Remove shares held by other corps in this corp
  for (const corp of state.corporations) {
    if (corp.sharesHeld) {
      corp.sharesHeld = corp.sharesHeld.filter((s) => s.corpSym !== corpSym)
    }
  }

  // Remove from turn queue if present
  if (state.turnQueue) {
    state.turnQueue = state.turnQueue.filter((s) => s !== corpSym)
  }
}

// Enforce train limit: remove cheapest excess trains (returned to depot).
export function enforceTrainLimit(state, corpSym, limit) {
  const corp = state.corporations.find((c) => c.sym === corpSym)
  if (!corp || corp.trains.length <= limit) return []

  // Sort by price ascending, remove cheapest first
  const sorted = [...corp.trains].sort((a, b) => (a.price || 0) - (b.price || 0))
  const removed = []
  while (sorted.length > limit) {
    removed.push(sorted.shift())
  }
  corp.trains = sorted
  return removed
}

// Calculate merged share price: average of two prices, rounded down to nearest market price.
export function averagePrice(state, corpSymA, corpSymB) {
  const priceA = corpPrice(state.stockMarket, corpSymA) || 0
  const priceB = corpPrice(state.stockMarket, corpSymB) || 0
  return Math.floor((priceA + priceB) / 2)
}

// Calculate 1862-style price: first + (second / 2), find nearest valid price at or below.
export function mergedPrice1862(state, survivorSym, nonsurvivorSym) {
  let survivorPrice = corpPrice(state.stockMarket, survivorSym) || 0
  let nonsurvivorPrice = corpPrice(state.stockMarket, nonsurvivorSym) || 0

  // Half price if no trains
  const survivor = state.corporations.find((c) => c.sym === survivorSym)
  const nonsurvivor = state.corporations.find((c) => c.sym === nonsurvivorSym)
  if (survivor?.trains.length === 0) survivorPrice = Math.floor(survivorPrice / 2)
  if (nonsurvivor?.trains.length === 0) nonsurvivorPrice = Math.floor(nonsurvivorPrice / 2)

  return Math.floor(survivorPrice + nonsurvivorPrice / 2)
}

// Find the closest market position for a target price (at or below).
export function findNearestMarketPosition(stockMarket, targetPrice) {
  let best = null
  let bestDiff = Infinity

  for (let row = 0; row < stockMarket.grid.length; row++) {
    for (let col = 0; col < stockMarket.grid[row].length; col++) {
      const cell = stockMarket.grid[row][col]
      if (!cell) continue
      const diff = targetPrice - cell.price
      if (diff >= 0 && diff < bestDiff) {
        bestDiff = diff
        best = { row, col, price: cell.price }
      }
    }
  }
  return best
}

// Move a corp's stock market token to a new position.
export function moveCorpToPosition(stockMarket, corpSym, row, col) {
  stockMarket.corpPositions[corpSym] = { row, col }
}

// PTG merger: create a composite corp from two equal companies.
export function ptgMerge(state, topCorpSym, bottomCorpSym) {
  const top = state.corporations.find((c) => c.sym === topCorpSym)
  const bottom = state.corporations.find((c) => c.sym === bottomCorpSym)
  if (!top || !bottom) return null

  const newPrice = averagePrice(state, topCorpSym, bottomCorpSym)

  // Transfer assets from bottom to top
  transferAssets(state, bottomCorpSym, topCorpSym)

  // Create composite identity with stripe colors
  const newSym = `${topCorpSym}-${bottomCorpSym}`
  top.name = `${top.name} / ${bottom.name}`
  top.mergedWith = bottomCorpSym
  top.isMerged = true
  top.stripeColor = bottom.color // second color for striped display
  top.stripeTextColor = bottom.textColor

  // Rename sym and update all references
  const oldSym = top.sym
  top.sym = newSym

  // Update stock market position key
  if (state.stockMarket.corpPositions[oldSym]) {
    state.stockMarket.corpPositions[newSym] = state.stockMarket.corpPositions[oldSym]
    delete state.stockMarket.corpPositions[oldSym]
  }

  // Update player shares to new sym
  for (const player of state.players) {
    for (const s of player.shares) {
      if (s.corpSym === oldSym) s.corpSym = newSym
    }
  }

  // Update turn queue
  if (state.turnQueue) {
    state.turnQueue = state.turnQueue.map((s) => s === oldSym ? newSym : s)
  }

  // Combine tokens: top keeps all tokens from both
  top.tokens = [...top.tokens, ...bottom.tokens]
  top.tokensPlaced = (top.tokensPlaced || 0) + (bottom.tokensPlaced || 0)

  // Convert shares: 5x20% → 10x10%
  // At this point, player shares referencing oldSym have been renamed to newSym.
  // Shares referencing bottomCorpSym have been removed by removeCorpFromGame (called later).
  // But bottom shares still exist in players. Convert all shares (newSym + bottomCorpSym) → 10% newSym.
  for (const player of state.players) {
    const newShares = []
    for (const share of player.shares) {
      if (share.corpSym === newSym || share.corpSym === bottomCorpSym) {
        // Each 20% share becomes 2x 10%
        const count = share.percent / 10
        for (let i = 0; i < count; i++) {
          newShares.push({ corpSym: newSym, percent: 10, isPresident: false })
        }
      } else {
        newShares.push(share)
      }
    }
    player.shares = newShares
  }

  // Convert corp-held shares similarly
  for (const corp of state.corporations) {
    if (!corp.sharesHeld) continue
    const newHeld = []
    for (const share of corp.sharesHeld) {
      if (share.corpSym === newSym || share.corpSym === bottomCorpSym) {
        const count = share.percent / 10
        for (let i = 0; i < count; i++) {
          newHeld.push({ corpSym: newSym, percent: 10, isPresident: false })
        }
      } else {
        newHeld.push(share)
      }
    }
    corp.sharesHeld = newHeld
  }

  // Determine president: player with most shares
  let maxShares = 0
  let presidentId = null
  for (const player of state.players) {
    const pct = player.shares
      .filter((s) => s.corpSym === newSym)
      .reduce((sum, s) => sum + s.percent, 0)
    if (pct > maxShares) {
      maxShares = pct
      presidentId = player.id
    }
  }
  // Mark president
  if (presidentId) {
    const player = state.players.find((p) => p.id === presidentId)
    const presCert = player.shares.find((s) => s.corpSym === newSym)
    if (presCert) presCert.isPresident = true
  }

  // Update share tracking on corp
  top.ipoShares = top.ipoShares + bottom.ipoShares
  top.marketShares = top.marketShares + bottom.marketShares
  top.treasuryShares = top.treasuryShares + bottom.treasuryShares

  // Bottom CEO share no longer generates income (PTG-specific)
  top.bottomCeoNoIncome = true

  // Place on market at averaged price
  const pos = findNearestMarketPosition(state.stockMarket, newPrice)
  if (pos) {
    moveCorpToPosition(state.stockMarket, newSym, pos.row, pos.col)
  }

  // Remove bottom corp from game
  removeCorpFromGame(state, bottomCorpSym)

  // Enforce train limit
  const tLimit = 2 // PTG train limit is always 2
  enforceTrainLimit(state, newSym, tLimit)

  return top
}

// RLA merger: two minors merge into a chosen Major Corporation.
export function rlaMerge(state, minorSymA, minorSymB, majorCorpSym, chosenIdentity) {
  const minorA = state.corporations.find((c) => c.sym === minorSymA)
  const minorB = state.corporations.find((c) => c.sym === minorSymB)
  const major = state.corporations.find((c) => c.sym === majorCorpSym)
  if (!minorA || !minorB || !major) return null

  const newPrice = averagePrice(state, minorSymA, minorSymB)

  // Set major identity if chosen
  if (chosenIdentity) {
    major.name = chosenIdentity
  }

  // Transfer assets from both minors to major
  transferAssets(state, minorSymA, majorCorpSym)
  transferAssets(state, minorSymB, majorCorpSym)

  // Carry over minor abilities
  major.abilities = [
    ...(minorA.desc ? [{ from: minorA.sym, desc: minorA.desc }] : []),
    ...(minorB.desc ? [{ from: minorB.sym, desc: minorB.desc }] : []),
  ]

  // Convert shares: minor certificates → major certificates
  // Each minor president cert (40%) → major president cert or 2x single certs
  // Each minor single cert (20%) → major single cert (20%)
  // Determine new president: player with most combined shares
  let maxPct = 0
  let presId = null
  for (const player of state.players) {
    const pct = player.shares
      .filter((s) => s.corpSym === minorSymA || s.corpSym === minorSymB)
      .reduce((sum, s) => sum + s.percent, 0)
    if (pct > maxPct) {
      maxPct = pct
      presId = player.id
    }
  }

  // Replace minor shares with major shares
  for (const player of state.players) {
    const minorShares = player.shares.filter(
      (s) => s.corpSym === minorSymA || s.corpSym === minorSymB
    )
    player.shares = player.shares.filter(
      (s) => s.corpSym !== minorSymA && s.corpSym !== minorSymB
    )
    // Give equivalent major shares
    for (const s of minorShares) {
      player.shares.push({
        corpSym: majorCorpSym,
        percent: s.percent,
        isPresident: false,
      })
    }
  }

  // Set president
  if (presId) {
    const pres = state.players.find((p) => p.id === presId)
    const cert = pres?.shares.find((s) => s.corpSym === majorCorpSym)
    if (cert) cert.isPresident = true
  }

  // Combine IPO/market shares
  major.ipoShares = minorA.ipoShares + minorB.ipoShares
  major.marketShares = minorA.marketShares + minorB.marketShares

  // Tokens: replace minor hub tokens with major hub tokens
  major.tokensPlaced = (minorA.tokensPlaced || 0) + (minorB.tokensPlaced || 0)

  // Float and place on market
  major.ipoed = true
  major.floated = true
  const pos = findNearestMarketPosition(state.stockMarket, newPrice)
  if (pos) {
    moveCorpToPosition(state.stockMarket, majorCorpSym, pos.row, pos.col)
  }

  // Enforce train limit for majors
  const majorTrainLimit = state.title.merger?.trainLimit?.major ?? 4
  enforceTrainLimit(state, majorCorpSym, majorTrainLimit)

  // Remove both minors
  removeCorpFromGame(state, minorSymA)
  removeCorpFromGame(state, minorSymB)

  return major
}

// 1862 merger: two peer corps, pick survivor.
export function merge1862(state, survivorSym, nonsurvivorSym) {
  const survivor = state.corporations.find((c) => c.sym === survivorSym)
  const nonsurvivor = state.corporations.find((c) => c.sym === nonsurvivorSym)
  if (!survivor || !nonsurvivor) return null

  const newPrice = mergedPrice1862(state, survivorSym, nonsurvivorSym)

  // Transfer assets
  transferAssets(state, nonsurvivorSym, survivorSym)

  survivor.isMerged = true
  survivor.mergedWith = nonsurvivorSym

  // Share handling: return half of each holder's shares to market
  for (const player of state.players) {
    const nonSurvivorShares = player.shares.filter((s) => s.corpSym === nonsurvivorSym)
    const survivorShares = player.shares.filter((s) => s.corpSym === survivorSym)
    const totalPct = nonSurvivorShares.reduce((s, sh) => s + sh.percent, 0) +
                     survivorShares.reduce((s, sh) => s + sh.percent, 0)

    // Remove nonsurvivor shares from player
    player.shares = player.shares.filter((s) => s.corpSym !== nonsurvivorSym)

    // Swap nonsurvivor shares → survivor shares (same percent)
    for (const sh of nonSurvivorShares) {
      player.shares.push({ corpSym: survivorSym, percent: sh.percent, isPresident: false })
    }

    // Return half to market
    const currentPct = player.shares
      .filter((s) => s.corpSym === survivorSym)
      .reduce((sum, s) => sum + s.percent, 0)
    const toReturn = Math.floor(currentPct / 2 / 10) * 10 // round down to nearest 10%
    let returned = 0
    player.shares = player.shares.filter((s) => {
      if (s.corpSym === survivorSym && !s.isPresident && returned < toReturn) {
        returned += s.percent
        return false
      }
      return true
    })
    survivor.marketShares += returned
  }

  // Determine new president: majority holder ≥ 30%
  let maxPct = 0
  let presId = null
  for (const player of state.players) {
    const pct = player.shares
      .filter((s) => s.corpSym === survivorSym)
      .reduce((sum, s) => sum + s.percent, 0)
    if (pct > maxPct) {
      maxPct = pct
      presId = player.id
    }
  }
  // Clear old president flags, set new
  for (const player of state.players) {
    for (const s of player.shares) {
      if (s.corpSym === survivorSym) s.isPresident = false
    }
  }
  if (presId && maxPct >= 30) {
    const pres = state.players.find((p) => p.id === presId)
    const cert = pres.shares.find((s) => s.corpSym === survivorSym)
    if (cert) cert.isPresident = true
  }

  // Combine IPO shares
  survivor.ipoShares += nonsurvivor.ipoShares

  // Place on market at new price
  const pos = findNearestMarketPosition(state.stockMarket, newPrice)
  if (pos) {
    moveCorpToPosition(state.stockMarket, survivorSym, pos.row, pos.col)
  }

  // Remove nonsurvivor
  removeCorpFromGame(state, nonsurvivorSym)

  return survivor
}

// 1822/MX minor acquisition: major absorbs minor.
export function acquireMinor1822(state, majorSym, minorSym, paymentShares, cashDifference) {
  const major = state.corporations.find((c) => c.sym === majorSym)
  const minor = state.corporations.find((c) => c.sym === minorSym)
  if (!major || !minor) return null

  // Find minor's owner (player who holds the minor's share)
  const minorOwner = state.players.find((p) =>
    p.shares.some((s) => s.corpSym === minorSym)
  )

  // Transfer assets from minor to major
  transferAssets(state, minorSym, majorSym)

  // Payment to minor's owner
  if (minorOwner) {
    // Give shares from major's IPO to minor owner
    for (let i = 0; i < paymentShares; i++) {
      if (major.ipoShares >= 10) {
        major.ipoShares -= 10
        minorOwner.shares.push({ corpSym: majorSym, percent: 10, isPresident: false })
      }
    }

    // Cash difference (positive = major pays owner, negative = owner pays major)
    if (cashDifference > 0) {
      major.cash -= cashDifference
      minorOwner.cash += cashDifference
    } else if (cashDifference < 0) {
      minorOwner.cash += cashDifference // negative, so subtracts
      major.cash -= cashDifference      // negative, so adds
    }
  }

  // Remove minor from game
  removeCorpFromGame(state, minorSym)

  return major
}

// 1867 minor→major conversion: minor converts to major at convert range price.
export function convertMinor1867(state, minorSym, majorSym) {
  const minor = state.corporations.find((c) => c.sym === minorSym)
  const major = state.corporations.find((c) => c.sym === majorSym)
  if (!minor || !major) return null

  const minorOwner = state.players.find((p) =>
    p.shares.some((s) => s.corpSym === minorSym)
  )

  // Transfer assets
  transferAssets(state, minorSym, majorSym)

  // Minor owner gets one 10% share of the major
  if (minorOwner) {
    if (major.ipoShares >= 10) {
      major.ipoShares -= 10
      minorOwner.shares.push({ corpSym: majorSym, percent: 10, isPresident: false })
    }
  }

  // Set major's par price based on minor's current share price
  const minorPrice = corpPrice(state.stockMarket, minorSym) || 0
  // Find highest par price ≤ minor's price
  const parPrices = []
  for (let row = 0; row < state.stockMarket.grid.length; row++) {
    for (let col = 0; col < state.stockMarket.grid[row].length; col++) {
      const cell = state.stockMarket.grid[row][col]
      if (cell?.par) {
        parPrices.push({ row, col, price: cell.price })
      }
    }
  }
  parPrices.sort((a, b) => b.price - a.price)
  const parPos = parPrices.find((p) => p.price <= minorPrice)

  if (parPos && !major.ipoed) {
    major.parPrice = parPos.price
    major.ipoed = true
    major.floated = true
    moveCorpToPosition(state.stockMarket, majorSym, parPos.row, parPos.col)
  }

  // Remove minor
  removeCorpFromGame(state, minorSym)

  return major
}

// 1867 multi-minor merge: merge multiple minors then convert to major.
export function mergeMinors1867(state, minorSyms, majorSym) {
  const major = state.corporations.find((c) => c.sym === majorSym)
  if (!major || minorSyms.length === 0) return null

  // Calculate par price: avg of min and max minor prices, capped 100-200
  const prices = minorSyms.map((sym) => corpPrice(state.stockMarket, sym) || 0)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  let newPrice = Math.max(100, Math.min(200, Math.floor((min + max) / 2)))

  // Find valid par price at or below
  const parPrices = []
  for (let row = 0; row < state.stockMarket.grid.length; row++) {
    for (let col = 0; col < state.stockMarket.grid[row].length; col++) {
      const cell = state.stockMarket.grid[row][col]
      if (cell?.par) {
        parPrices.push({ row, col, price: cell.price })
      }
    }
  }
  parPrices.sort((a, b) => b.price - a.price)
  const parPos = parPrices.find((p) => p.price <= newPrice)

  // Process each minor: transfer assets, give owner 10% of major
  for (const minorSym of minorSyms) {
    const minorOwner = state.players.find((p) =>
      p.shares.some((s) => s.corpSym === minorSym)
    )

    transferAssets(state, minorSym, majorSym)

    if (minorOwner && major.ipoShares >= 10) {
      major.ipoShares -= 10
      minorOwner.shares.push({ corpSym: majorSym, percent: 10, isPresident: false })
    }

    removeCorpFromGame(state, minorSym)
  }

  // Set major par/position
  if (parPos && !major.ipoed) {
    major.parPrice = parPos.price
    major.ipoed = true
    major.floated = true
    moveCorpToPosition(state.stockMarket, majorSym, parPos.row, parPos.col)
  }

  // Determine president: majority holder
  let maxPct = 0
  let presId = null
  for (const player of state.players) {
    const pct = player.shares
      .filter((s) => s.corpSym === majorSym)
      .reduce((sum, s) => sum + s.percent, 0)
    if (pct > maxPct) {
      maxPct = pct
      presId = player.id
    }
  }
  if (presId) {
    const pres = state.players.find((p) => p.id === presId)
    const cert = pres.shares.find((s) => s.corpSym === majorSym)
    if (cert) cert.isPresident = true
  }

  return major
}
