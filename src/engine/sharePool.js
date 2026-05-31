// SharePool — buy/sell shares between players, IPO, and market pool.
// Advisory only — never blocks actions.

export function buyShareFromIPO(state, playerId, corpSym, percent = 10) {
  const player = state.players.find((p) => p.id === playerId)
  const corp = state.corporations.find((c) => c.sym === corpSym)
  const price = state.stockMarket.corpPositions[corpSym]
    ? priceForCorp(state, corpSym)
    : corp.parPrice

  if (!player || !corp || !price) return

  // Market price = per-share price. Shares per cert = percent / baseShareSize.
  const baseShare = state.title.shares?.[1] ?? 10
  const cost = price * (percent / baseShare)
  const isPresident = percent === 20 || (percent === (state.title.shares?.[0] ?? 20))

  player.cash -= cost
  corp.ipoShares -= percent

  if (state.title.capitalization === 'incremental') {
    // Incremental: player pays corp treasury
    corp.cash += cost
  } else {
    // Full: player pays bank
    state.bank.cash += cost
  }

  player.shares.push({ corpSym, percent, isPresident })

  // Check float
  const soldPercent = 100 - corp.ipoShares
  if (!corp.floated && soldPercent >= corp.floatPercent) {
    corp.floated = true
    if (state.title.capitalization !== 'incremental') {
      // Full cap: corp receives par × 10 from bank on float
      const capitalization = corp.parPrice * 10
      corp.cash += capitalization
      state.bank.cash -= capitalization
    }
    // Incremental: no lump sum — corp already received each share payment
  }
}

export function buyShareFromMarket(state, playerId, corpSym, percent = 10) {
  const player = state.players.find((p) => p.id === playerId)
  const corp = state.corporations.find((c) => c.sym === corpSym)
  const price = priceForCorp(state, corpSym)

  if (!player || !corp || !price) return

  const baseShare = state.title.shares?.[1] ?? 10
  const cost = price * (percent / baseShare)
  player.cash -= cost
  corp.marketShares -= percent
  state.bank.cash += cost // market shares: money goes to bank

  player.shares.push({ corpSym, percent, isPresident: false })
}

export function sellShares(state, playerId, corpSym, percent = 10) {
  const player = state.players.find((p) => p.id === playerId)
  const corp = state.corporations.find((c) => c.sym === corpSym)
  const price = priceForCorp(state, corpSym)

  if (!player || !corp || !price) return

  const baseShare = state.title.shares?.[1] ?? 10
  const revenue = price * (percent / baseShare)
  player.cash += revenue
  state.bank.cash -= revenue

  // Remove shares from player
  let remaining = percent
  player.shares = player.shares.filter((s) => {
    if (s.corpSym === corpSym && remaining > 0) {
      remaining -= s.percent
      return false
    }
    return true
  })

  corp.marketShares += percent
}

// --- Corp-to-corp share operations ---

export function corpBuyShareFromIPO(state, buyerCorpSym, targetCorpSym, percent = 10) {
  const buyer = state.corporations.find((c) => c.sym === buyerCorpSym)
  const target = state.corporations.find((c) => c.sym === targetCorpSym)
  const price = state.stockMarket.corpPositions[targetCorpSym]
    ? priceForCorp(state, targetCorpSym)
    : target.parPrice

  if (!buyer || !target || !price) return

  const baseShare = state.title.shares?.[1] ?? 10; const cost = price * (percent / baseShare)
  buyer.cash -= cost
  state.bank.cash += cost

  target.ipoShares -= percent
  buyer.sharesHeld.push({ corpSym: targetCorpSym, percent, isPresident: false })

  // Check float
  const soldPercent = 100 - target.ipoShares
  if (!target.floated && soldPercent >= target.floatPercent) {
    target.floated = true
    const capitalization = target.parPrice * 10
    target.cash += capitalization
    state.bank.cash -= capitalization
  }
}

export function corpBuyShareFromMarket(state, buyerCorpSym, targetCorpSym, percent = 10) {
  const buyer = state.corporations.find((c) => c.sym === buyerCorpSym)
  const target = state.corporations.find((c) => c.sym === targetCorpSym)
  const price = priceForCorp(state, targetCorpSym)

  if (!buyer || !target || !price) return

  const baseShare = state.title.shares?.[1] ?? 10; const cost = price * (percent / baseShare)
  buyer.cash -= cost
  target.marketShares -= percent
  state.bank.cash += cost

  buyer.sharesHeld.push({ corpSym: targetCorpSym, percent, isPresident: false })
}

export function corpSellShares(state, sellerCorpSym, targetCorpSym, percent = 10) {
  const seller = state.corporations.find((c) => c.sym === sellerCorpSym)
  const target = state.corporations.find((c) => c.sym === targetCorpSym)
  const price = priceForCorp(state, targetCorpSym)

  if (!seller || !target || !price) return

  const baseShare = state.title.shares?.[1] ?? 10; const revenue = price * (percent / baseShare)
  seller.cash += revenue
  state.bank.cash -= revenue

  // Remove shares from corp's holdings
  let remaining = percent
  seller.sharesHeld = seller.sharesHeld.filter((s) => {
    if (s.corpSym === targetCorpSym && remaining > 0) {
      remaining -= s.percent
      return false
    }
    return true
  })

  target.marketShares += percent
}

function priceForCorp(state, corpSym) {
  const pos = state.stockMarket.corpPositions[corpSym]
  if (!pos) return null
  const cell = state.stockMarket.grid[pos.row]?.[pos.col]
  return cell ? cell.price : null
}
