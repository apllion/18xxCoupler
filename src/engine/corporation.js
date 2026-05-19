// Corporation — treasury, trains, shares, float state.

export function createCorporation(def, title) {
  const floatPercent = def.floatPercent ?? title.floatPercent ?? 60
  const shares = title.shares ?? [20, 10, 10, 10, 10, 10, 10, 10, 10]

  return {
    sym: def.sym,
    name: def.name,
    color: def.color,
    textColor: def.textColor || '#fff',
    tokens: def.tokens,
    coordinates: def.coordinates,
    floatPercent,

    cash: 0,
    parPrice: null,
    marketPosition: null, // set by stockMarket
    floated: false,
    ipoed: false,
    trains: [],          // [{ name, id }]
    tokensPlaced: 0,

    // Share tracking: how many percent remain in each pool
    ipoShares: shares.reduce((s, p) => s + p, 0),  // starts at 100
    marketShares: 0,
    treasuryShares: 0,

    // Shares this corp holds in other corps (corp-to-corp ownership)
    sharesHeld: [],  // [{ corpSym, percent }]

    // Corp sizing (1817): 2-share, 5-share, or 10-share
    totalShares: shares.length,
    corpSize: def.corpSize || null,  // '2share' | '5share' | '10share' | null (standard)

    // Loans (1817, 1867)
    loans: 0,

    // Liquidation state
    liquidated: false,
  }
}

export function ipoSharesRemaining(corp) {
  return corp.ipoShares
}

export function trainCount(corp) {
  return corp.trains.length
}

export function addTrain(corp, train) {
  corp.trains.push(train)
}

export function removeTrain(corp, trainId) {
  corp.trains = corp.trains.filter((t) => t.id !== trainId)
}

export function removeTrainsByName(corp, trainName) {
  const removed = corp.trains.filter((t) => t.name === trainName)
  corp.trains = corp.trains.filter((t) => t.name !== trainName)
  return removed
}
