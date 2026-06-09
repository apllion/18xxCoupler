import { describe, it, expect } from 'vitest'
import { createGame } from '../src/engine/setup.js'
import { applyAction } from '../src/engine/actions.js'
import { getTitle } from '../src/titles/index.js'

function make1830(playerCount = 3) {
  const title = getTitle('g1830')
  return createGame(title, Array.from({ length: playerCount }, (_, i) => `Player${i + 1}`))
}

describe('BUY_PRIVATE', () => {
  it('transfers cash from player to bank and assigns ownership', () => {
    const game = make1830()
    const p = game.players[0]
    const c = game.companies[0] // SV, value 20

    applyAction(game, { type: 'BUY_PRIVATE', playerId: p.id, companySym: 'SV', price: 25 })

    expect(p.cash).toBe(800 - 25)
    expect(game.bank.cash).toBe(12000 - 800 * 3 + 25)
    expect(c.ownerId).toBe(p.id)
    expect(c.ownerType).toBe('player')
    expect(p.privates).toContain('SV')
    expect(game.actionLog).toHaveLength(1)
  })

  it('logs the action with description', () => {
    const game = make1830()
    applyAction(game, { type: 'BUY_PRIVATE', playerId: 'p0', companySym: 'SV', price: 20 })

    expect(game.actionLog[0].description).toContain('Player1')
    expect(game.actionLog[0].description).toContain('SV')
  })
})

describe('PAR_SHARE', () => {
  it('pars a corporation and deducts president share cost', () => {
    const game = make1830()
    const parPrice = 100
    applyAction(game, { type: 'PAR_SHARE', playerId: 'p0', corpSym: 'PRR', parPrice, row: 0, col: 6 })

    const corp = game.corporations.find((c) => c.sym === 'PRR')
    const player = game.players[0]

    expect(corp.parPrice).toBe(100)
    expect(corp.ipoed).toBe(true)
    expect(corp.ipoShares).toBe(80) // 100 - 20% president
    expect(player.cash).toBe(800 - 200) // 20% of 100 = 200
    expect(player.shares).toHaveLength(1)
    expect(player.shares[0].corpSym).toBe('PRR')
    expect(player.shares[0].isPresident).toBe(true)
  })
})

describe('BUY_SHARE', () => {
  it('buys from IPO', () => {
    const game = make1830()
    applyAction(game, { type: 'PAR_SHARE', playerId: 'p0', corpSym: 'PRR', parPrice: 100, row: 0, col: 6 })
    applyAction(game, { type: 'BUY_SHARE', playerId: 'p1', corpSym: 'PRR', source: 'ipo' })

    const player1 = game.players[1]
    const corp = game.corporations.find((c) => c.sym === 'PRR')

    expect(player1.shares).toHaveLength(1)
    expect(player1.shares[0].percent).toBe(10)
    expect(corp.ipoShares).toBe(70) // 80 - 10
  })
})

describe('SELL_SHARES', () => {
  it('sells shares to market pool', () => {
    const game = make1830()
    applyAction(game, { type: 'PAR_SHARE', playerId: 'p0', corpSym: 'PRR', parPrice: 100, row: 0, col: 6 })
    applyAction(game, { type: 'BUY_SHARE', playerId: 'p1', corpSym: 'PRR', source: 'ipo' })

    const before = game.players[1].cash
    applyAction(game, { type: 'SELL_SHARES', playerId: 'p1', corpSym: 'PRR', percent: 10 })

    expect(game.players[1].shares).toHaveLength(0)
    expect(game.players[1].cash).toBeGreaterThan(before)
  })
})

describe('PAY_DIVIDEND', () => {
  it('distributes revenue to shareholders', () => {
    const game = make1830()
    applyAction(game, { type: 'PAR_SHARE', playerId: 'p0', corpSym: 'PRR', parPrice: 100, row: 0, col: 6 })

    const cashBefore = game.players[0].cash
    applyAction(game, { type: 'PAY_DIVIDEND', corpSym: 'PRR', totalRevenue: 100 })

    // Player0 has 20% → gets 10 * 2 = 20
    expect(game.players[0].cash).toBe(cashBefore + 20)
  })
})

describe('WITHHOLD_DIVIDEND', () => {
  it('sends revenue to corp treasury', () => {
    const game = make1830()
    applyAction(game, { type: 'PAR_SHARE', playerId: 'p0', corpSym: 'PRR', parPrice: 100, row: 0, col: 6 })

    const corp = game.corporations.find((c) => c.sym === 'PRR')
    const cashBefore = corp.cash
    applyAction(game, { type: 'WITHHOLD_DIVIDEND', corpSym: 'PRR', totalRevenue: 100 })

    expect(corp.cash).toBe(cashBefore + 100)
  })
})

describe('BUY_TRAIN', () => {
  it('buys a train from depot', () => {
    const game = make1830()
    applyAction(game, { type: 'PAR_SHARE', playerId: 'p0', corpSym: 'PRR', parPrice: 100, row: 0, col: 6 })

    const corp = game.corporations.find((c) => c.sym === 'PRR')
    const cashBefore = corp.cash
    applyAction(game, { type: 'BUY_TRAIN', corpSym: 'PRR', trainName: '2', price: 80 })

    expect(corp.trains).toHaveLength(1)
    expect(corp.trains[0].name).toBe('2')
    expect(corp.cash).toBe(cashBefore - 80)
  })

  it('triggers close_companies event on 5-train', () => {
    const game = make1830()
    applyAction(game, { type: 'PAR_SHARE', playerId: 'p0', corpSym: 'PRR', parPrice: 100, row: 0, col: 6 })
    // Buy all 2s, 3s, 4s to reach 5-train
    const corp = game.corporations.find((c) => c.sym === 'PRR')
    corp.cash = 10000

    for (let i = 0; i < 6; i++) applyAction(game, { type: 'BUY_TRAIN', corpSym: 'PRR', trainName: '2', price: 80 })
    for (let i = 0; i < 5; i++) applyAction(game, { type: 'BUY_TRAIN', corpSym: 'PRR', trainName: '3', price: 180 })
    for (let i = 0; i < 4; i++) applyAction(game, { type: 'BUY_TRAIN', corpSym: 'PRR', trainName: '4', price: 300 })

    // Assign a private first
    applyAction(game, { type: 'BUY_PRIVATE', playerId: 'p0', companySym: 'SV', price: 20 })
    const sv = game.companies.find((c) => c.sym === 'SV')
    expect(sv.ownerId).toBe('p0')

    applyAction(game, { type: 'BUY_TRAIN', corpSym: 'PRR', trainName: '5', price: 450 })

    // Privates should be closed
    expect(sv.closed).toBe(true)
    expect(sv.ownerId).toBeNull()
    expect(game.pendingEvents).toContain('close_companies')
  })
})

describe('SET_PLAYER_ORDER', () => {
  it('reorders the players array', () => {
    const game = make1830()
    expect(game.players[0].name).toBe('Player1')

    applyAction(game, { type: 'SET_PLAYER_ORDER', order: ['p2', 'p0', 'p1'] })

    expect(game.players[0].name).toBe('Player3')
    expect(game.players[1].name).toBe('Player1')
    expect(game.players[2].name).toBe('Player2')
  })
})

describe('SET_PRIORITY', () => {
  it('sets priority deal', () => {
    const game = make1830()
    applyAction(game, { type: 'SET_PRIORITY', playerId: 'p2' })

    expect(game.priorityDeal).toBe('p2')
  })
})

describe('REMOVE_CORPORATION', () => {
  it('removes a corporation from the game', () => {
    const game = make1830()
    expect(game.corporations).toHaveLength(8)

    applyAction(game, { type: 'REMOVE_CORPORATION', corpSym: 'PRR' })

    expect(game.corporations).toHaveLength(7)
    expect(game.corporations.find((c) => c.sym === 'PRR')).toBeUndefined()
  })
})

describe('ADVANCE_ROUND', () => {
  it('advances from pregame to SR', () => {
    const game = make1830()
    expect(game.roundTracker.roundType).toBe('Pregame')

    applyAction(game, { type: 'ADVANCE_ROUND' })

    expect(game.roundTracker.roundType).toBe('SR')
  })

  it('advances from SR to OR', () => {
    const game = make1830()
    applyAction(game, { type: 'ADVANCE_ROUND' }) // Pregame → SR
    applyAction(game, { type: 'ADVANCE_ROUND' }) // SR → OR

    expect(game.roundTracker.roundType).toBe('OR')
  })
})

describe('DISMISS_EVENT', () => {
  it('removes a pending event', () => {
    const game = make1830()
    game.pendingEvents = ['close_companies', 'earthquake']

    applyAction(game, { type: 'DISMISS_EVENT', event: 'close_companies' })

    expect(game.pendingEvents).toEqual(['earthquake'])
  })
})

// --- PTG / 5-share corp fixes ---

function makePTG(playerCount = 2) {
  const title = getTitle('gptg')
  return createGame(title, Array.from({ length: playerCount }, (_, i) => `Player${i + 1}`))
}

function parPTGCorp(game, playerId, corpSym, parPrice = 80) {
  // PTG 2D grid: par prices at col 0 — find the right row
  const grid = game.stockMarket.grid
  let row = 0
  for (let r = 0; r < grid.length; r++) {
    if (grid[r][0]?.price === parPrice && grid[r][0]?.par) { row = r; break }
  }
  applyAction(game, { type: 'PAR_SHARE', playerId, corpSym, parPrice, row, col: 0 })
}

describe('PTG: president cert uniqueness', () => {
  it('only first share bought from IPO is president', () => {
    const game = makePTG()
    parPTGCorp(game, 'p0', 'RED', 80)
    // p0 has president cert (20%P)
    expect(game.players[0].shares.filter(s => s.corpSym === 'RED' && s.isPresident)).toHaveLength(1)

    // p1 buys a regular share — should NOT be president
    applyAction(game, { type: 'BUY_SHARE', playerId: 'p1', corpSym: 'RED', source: 'ipo', percent: 20 })
    expect(game.players[1].shares.filter(s => s.corpSym === 'RED' && s.isPresident)).toHaveLength(0)
    expect(game.players[1].shares.filter(s => s.corpSym === 'RED')).toHaveLength(1)
    expect(game.players[1].shares[0].percent).toBe(20)
  })

  it('second player buying more shares does not become president', () => {
    const game = makePTG()
    parPTGCorp(game, 'p0', 'RED', 80)
    applyAction(game, { type: 'BUY_SHARE', playerId: 'p1', corpSym: 'RED', source: 'ipo', percent: 20 })
    applyAction(game, { type: 'BUY_SHARE', playerId: 'p1', corpSym: 'RED', source: 'ipo', percent: 20 })

    // Only p0 has president
    const allPres = [...game.players[0].shares, ...game.players[1].shares]
      .filter(s => s.corpSym === 'RED' && s.isPresident)
    expect(allPres).toHaveLength(1)
  })
})

describe('PTG: incremental capitalization for corp IPO purchases', () => {
  it('corp buying from IPO pays target corp treasury (not bank)', () => {
    const game = makePTG()
    parPTGCorp(game, 'p0', 'RED', 80)
    parPTGCorp(game, 'p1', 'GRN', 80)

    const red = game.corporations.find(c => c.sym === 'RED')
    const grn = game.corporations.find(c => c.sym === 'GRN')
    // Give RED enough cash to buy
    red.cash = 500

    const redCashBefore = red.cash
    const grnCashBefore = grn.cash
    const bankBefore = game.bank.cash

    // RED buys GRN share from IPO at market price (80)
    applyAction(game, { type: 'CORP_BUY_SHARE', buyerCorpSym: 'RED', targetCorpSym: 'GRN', source: 'ipo', percent: 20 })

    // RED pays, GRN receives (incremental — goes to corp, not bank)
    const price = game.stockMarket.grid[game.stockMarket.corpPositions['GRN'].row][game.stockMarket.corpPositions['GRN'].col].price
    expect(red.cash).toBe(redCashBefore - price)
    expect(grn.cash).toBe(grnCashBefore + price)
  })
})

describe('PTG: sell movement uses baseSharePercent', () => {
  it('selling one 20% share drops price one step (not two)', () => {
    const game = makePTG()
    parPTGCorp(game, 'p0', 'RED', 90)
    applyAction(game, { type: 'BUY_SHARE', playerId: 'p0', corpSym: 'RED', source: 'ipo', percent: 20 })

    const priceBefore = game.stockMarket.grid[game.stockMarket.corpPositions['RED'].row][game.stockMarket.corpPositions['RED'].col].price
    const rowBefore = game.stockMarket.corpPositions['RED'].row

    applyAction(game, { type: 'SELL_SHARES', playerId: 'p0', corpSym: 'RED', percent: 20 })

    const rowAfter = game.stockMarket.corpPositions['RED'].row
    // Should drop exactly 1 row, not 2
    expect(rowAfter).toBe(rowBefore + 1)
  })
})

describe('PTG: CEO income', () => {
  it('collectAllRevenue pays CEO salary to president holders', () => {
    const game = makePTG()
    parPTGCorp(game, 'p0', 'RED', 80)
    parPTGCorp(game, 'p1', 'GRN', 80)

    const p0before = game.players[0].cash
    const p1before = game.players[1].cash

    applyAction(game, { type: 'COLLECT_ALL_REVENUE' })

    // p0 holds RED president → +$10, p1 holds GRN president → +$10
    expect(game.players[0].cash).toBe(p0before + 10)
    expect(game.players[1].cash).toBe(p1before + 10)
  })
})

describe('PTG: issue shares moves down one step', () => {
  it('issuing shares drops price one row', () => {
    const game = makePTG()
    parPTGCorp(game, 'p0', 'RED', 90)

    const rowBefore = game.stockMarket.corpPositions['RED'].row

    applyAction(game, { type: 'ISSUE_SHARES', corpSym: 'RED' })

    const rowAfter = game.stockMarket.corpPositions['RED'].row
    expect(rowAfter).toBe(rowBefore + 1)
  })
})

describe('SET_ROUND: turn queue auto-build', () => {
  it('builds player queue on SR', () => {
    const game = make1830()
    game.priorityDeal = 'p1'

    applyAction(game, { type: 'SET_ROUND', roundType: 'SR' })

    expect(game.turnQueue).toEqual(['p1', 'p2', 'p0'])
    expect(game.turnIndex).toBe(0)
    expect(game.srPassed).toEqual([])
  })

  it('builds corp queue on OR sorted by price', () => {
    const game = makePTG()
    // PTG floats at 20% (CEO share), so par immediately floats
    parPTGCorp(game, 'p0', 'RED', 90)
    parPTGCorp(game, 'p1', 'GRN', 80)

    applyAction(game, { type: 'SET_ROUND', roundType: 'OR' })

    // RED at 90 should be before GRN at 80
    expect(game.turnQueue[0]).toBe('RED')
    expect(game.turnQueue[1]).toBe('GRN')
    expect(game.turnIndex).toBe(0)
    expect(game.orStep).toBe(0)
  })

  it('resets operated flags on OR', () => {
    const game = make1830()
    applyAction(game, { type: 'PAR_SHARE', playerId: 'p0', corpSym: 'PRR', parPrice: 100, row: 0, col: 6 })
    const prr = game.corporations.find(c => c.sym === 'PRR')
    prr.operated = true

    applyAction(game, { type: 'SET_ROUND', roundType: 'OR' })

    expect(prr.operated).toBe(false)
  })
})

describe('MOVE_CERT: president uniqueness', () => {
  it('moving president cert clears old holder', () => {
    const game = make1830()
    applyAction(game, { type: 'PAR_SHARE', playerId: 'p0', corpSym: 'PRR', parPrice: 100, row: 0, col: 6 })

    // p0 is president
    expect(game.players[0].shares.some(s => s.corpSym === 'PRR' && s.isPresident)).toBe(true)

    // Move president cert from IPO to p1
    applyAction(game, { type: 'MOVE_CERT', fromSource: 'ipo', toPlayerId: 'p1', corpSym: 'PRR', percent: 20, isPresident: true })

    // p0 should no longer be president
    expect(game.players[0].shares.some(s => s.corpSym === 'PRR' && s.isPresident)).toBe(false)
    // p1 should be president
    expect(game.players[1].shares.some(s => s.corpSym === 'PRR' && s.isPresident)).toBe(true)
  })
})
