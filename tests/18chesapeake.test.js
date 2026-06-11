import { describe, it, expect } from 'vitest'
import { createGame } from '../src/engine/setup.js'
import { applyAction } from '../src/engine/actions.js'
import { getTitle } from '../src/titles/index.js'
import { corpPrice } from '../src/engine/stockMarket.js'

function makeChes(playerCount = 3) {
  const title = getTitle('g18chesapeake')
  return createGame(title, Array.from({ length: playerCount }, (_, i) => `Player${i + 1}`))
}

function parCorp(game, playerId, corpSym, parPrice) {
  const grid = game.stockMarket.grid
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c]?.price === parPrice && grid[r][c]?.canPar) {
        applyAction(game, { type: 'PAR_SHARE', playerId, corpSym, parPrice, row: r, col: c })
        return
      }
    }
  }
}

function floatCorp(game, corpSym) {
  // Buy shares until 60% float (president has 20%, need 4 more 10%)
  const players = game.players.map(p => p.id)
  let bought = 0
  for (let i = 0; bought < 4; i++) {
    applyAction(game, { type: 'BUY_SHARE', playerId: players[i % players.length], corpSym, source: 'ipo' })
    bought++
  }
}

describe('18Chesapeake setup', () => {
  it('creates game with correct player counts and cash', () => {
    const g3 = makeChes(3)
    expect(g3.players).toHaveLength(3)
    expect(g3.players[0].cash).toBe(800)

    const g4 = makeChes(4)
    expect(g4.players[0].cash).toBe(600)

    const g5 = makeChes(5)
    expect(g5.players[0].cash).toBe(480)
  })

  it('has $8000 bank', () => {
    const game = makeChes(3)
    expect(game.bank.cash).toBe(8000 - 800 * 3)
  })

  it('has 8 corporations', () => {
    const game = makeChes()
    expect(game.corporations).toHaveLength(8)
    expect(game.corporations.map(c => c.sym).sort()).toEqual(['B&O', 'C&A', 'C&O', 'LV', 'N&W', 'PLE', 'PRR', 'SRR'])
  })

  it('has 6 privates', () => {
    const game = makeChes()
    expect(game.companies).toHaveLength(6)
  })

  it('starts in Pregame (waterfall auction)', () => {
    const game = makeChes()
    expect(game.roundTracker.roundType).toBe('Pregame')
    expect(game.roundTracker.roundTypes).toContain('Pregame')
  })

  it('has 6 phases starting with phase 2', () => {
    const game = makeChes()
    expect(game.phaseManager.phases).toHaveLength(6)
    expect(game.phaseManager.phases[0].name).toBe('2')
    expect(game.phaseManager.phases[0].trainLimit).toBe(4)
    expect(game.phaseManager.phases[0].operatingRounds).toBe(1)
  })

  it('has terrain costs configured', () => {
    const game = makeChes()
    expect(game.title.terrainCosts).toEqual([20, 40])
  })
})

describe('18Chesapeake shares', () => {
  it('pars a corp and deducts president share cost', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)

    const corp = game.corporations.find(c => c.sym === 'PRR')
    expect(corp.parPrice).toBe(80)
    expect(corp.ipoed).toBe(true)
    expect(corp.ipoShares).toBe(80)
    expect(game.players[0].cash).toBe(800 - 160) // 20% at $80 = $160
    expect(game.players[0].shares[0].isPresident).toBe(true)
  })

  it('floats at 60% with full capitalization', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)
    floatCorp(game, 'PRR')

    const corp = game.corporations.find(c => c.sym === 'PRR')
    expect(corp.floated).toBe(true)
    expect(corp.cash).toBe(80 * 10) // full cap: par × 10
  })

  it('buys from IPO (full cap: money goes to bank)', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)
    const bankBefore = game.bank.cash

    applyAction(game, { type: 'BUY_SHARE', playerId: 'p1', corpSym: 'PRR', source: 'ipo' })

    // Full cap: player pays bank
    expect(game.bank.cash).toBe(bankBefore + 80)
  })

  it('sells shares to market and price drops', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)
    applyAction(game, { type: 'BUY_SHARE', playerId: 'p0', corpSym: 'PRR', source: 'ipo' })

    const rowBefore = game.stockMarket.corpPositions['PRR'].row
    applyAction(game, { type: 'SELL_SHARES', playerId: 'p0', corpSym: 'PRR', percent: 10 })

    const corp = game.corporations.find(c => c.sym === 'PRR')
    expect(corp.marketShares).toBe(10)
    expect(game.stockMarket.corpPositions['PRR'].row).toBeGreaterThan(rowBefore)
  })

  it('only one president cert per corp', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)
    applyAction(game, { type: 'BUY_SHARE', playerId: 'p1', corpSym: 'PRR', source: 'ipo' })
    applyAction(game, { type: 'BUY_SHARE', playerId: 'p1', corpSym: 'PRR', source: 'ipo' })

    const allPres = game.players.flatMap(p => p.shares.filter(s => s.corpSym === 'PRR' && s.isPresident))
    expect(allPres).toHaveLength(1)
  })

  it('par prices at correct positions', () => {
    const game = makeChes()
    // 18Ches par prices: 70, 75, 80, 95
    parCorp(game, 'p0', 'PRR', 95)
    expect(game.corporations.find(c => c.sym === 'PRR').parPrice).toBe(95)

    parCorp(game, 'p1', 'B&O', 70)
    expect(game.corporations.find(c => c.sym === 'B&O').parPrice).toBe(70)
  })
})

describe('18Chesapeake trains', () => {
  it('buys a 2-train', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)
    floatCorp(game, 'PRR')
    const corp = game.corporations.find(c => c.sym === 'PRR')
    const cashBefore = corp.cash

    applyAction(game, { type: 'BUY_TRAIN', corpSym: 'PRR', trainName: '2', price: 80 })

    expect(corp.trains).toHaveLength(1)
    expect(corp.trains[0].name).toBe('2')
    expect(corp.cash).toBe(cashBefore - 80)
  })

  it('train limit starts at 4, drops to 3 at phase 4', () => {
    const game = makeChes()
    expect(game.phaseManager.phases[0].trainLimit).toBe(4) // phase 2
    expect(game.phaseManager.phases[2].trainLimit).toBe(3) // phase 4
    expect(game.phaseManager.phases[3].trainLimit).toBe(2) // phase 5
  })

  it('5-train triggers close_companies event', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)
    floatCorp(game, 'PRR')
    const corp = game.corporations.find(c => c.sym === 'PRR')
    corp.cash = 10000

    // Buy through 2s, 3s, 4s to reach 5
    for (let i = 0; i < 7; i++) applyAction(game, { type: 'BUY_TRAIN', corpSym: 'PRR', trainName: '2', price: 80 })
    for (let i = 0; i < 6; i++) applyAction(game, { type: 'BUY_TRAIN', corpSym: 'PRR', trainName: '3', price: 180 })
    for (let i = 0; i < 5; i++) applyAction(game, { type: 'BUY_TRAIN', corpSym: 'PRR', trainName: '4', price: 300 })

    // Assign a private first
    applyAction(game, { type: 'BUY_PRIVATE', playerId: 'p0', companySym: 'D&R', price: 20 })

    applyAction(game, { type: 'BUY_TRAIN', corpSym: 'PRR', trainName: '5', price: 500 })

    expect(game.pendingEvents).toContain('close_companies')
  })
})

describe('18Chesapeake dividends', () => {
  it('pays dividends to shareholders', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)
    floatCorp(game, 'PRR')

    const p0before = game.players[0].cash
    // p0 has 20% president + some bought shares
    const p0pct = game.players[0].shares.filter(s => s.corpSym === 'PRR').reduce((sum, s) => sum + s.percent, 0)

    applyAction(game, { type: 'PAY_DIVIDEND', corpSym: 'PRR', totalRevenue: 100 })

    const perShare = Math.floor(100 / 10) // 10 shares × $10/share
    const expected = perShare * (p0pct / 10)
    expect(game.players[0].cash).toBe(p0before + expected)
  })

  it('withhold sends all to corp treasury', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)
    floatCorp(game, 'PRR')
    const corp = game.corporations.find(c => c.sym === 'PRR')
    const cashBefore = corp.cash

    applyAction(game, { type: 'WITHHOLD_DIVIDEND', corpSym: 'PRR', totalRevenue: 100 })

    expect(corp.cash).toBe(cashBefore + 100)
  })

  it('pay moves price right, withhold moves left', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)
    floatCorp(game, 'PRR')

    const colAfterPar = game.stockMarket.corpPositions['PRR'].col

    applyAction(game, { type: 'PAY_DIVIDEND', corpSym: 'PRR', totalRevenue: 100 })
    const colAfterPay = game.stockMarket.corpPositions['PRR'].col
    expect(colAfterPay).toBeGreaterThan(colAfterPar)

    applyAction(game, { type: 'WITHHOLD_DIVIDEND', corpSym: 'PRR', totalRevenue: 50 })
    const colAfterWithhold = game.stockMarket.corpPositions['PRR'].col
    expect(colAfterWithhold).toBeLessThan(colAfterPay)
  })

  it('IPO shares pay dividends to corp treasury (full cap)', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)
    floatCorp(game, 'PRR')
    const corp = game.corporations.find(c => c.sym === 'PRR')
    const cashBefore = corp.cash
    const ipoPct = corp.ipoShares // 40% remaining in IPO

    applyAction(game, { type: 'PAY_DIVIDEND', corpSym: 'PRR', totalRevenue: 100 })

    // IPO shares: $10/share × 4 shares = $40 to corp
    expect(corp.cash).toBe(cashBefore + 10 * (ipoPct / 10))
  })
})

describe('18Chesapeake privates', () => {
  it('buys a private', () => {
    const game = makeChes()
    applyAction(game, { type: 'BUY_PRIVATE', playerId: 'p0', companySym: 'D&R', price: 20 })

    const company = game.companies.find(c => c.sym === 'D&R')
    expect(company.ownerId).toBe('p0')
    expect(game.players[0].cash).toBe(800 - 20)
  })

  it('collects private revenue', () => {
    const game = makeChes()
    applyAction(game, { type: 'BUY_PRIVATE', playerId: 'p0', companySym: 'D&R', price: 20 })
    const before = game.players[0].cash

    applyAction(game, { type: 'COLLECT_ALL_REVENUE' })

    expect(game.players[0].cash).toBe(before + 5) // D&R pays $5
  })

  it('CV private has $30 revenue', () => {
    const game = makeChes()
    applyAction(game, { type: 'BUY_PRIVATE', playerId: 'p0', companySym: 'CV', price: 200 })
    const before = game.players[0].cash

    applyAction(game, { type: 'COLLECT_ALL_REVENUE' })

    expect(game.players[0].cash).toBe(before + 30)
  })
})

describe('18Chesapeake round tracking', () => {
  it('builds player queue on SR from priority deal', () => {
    const game = makeChes()
    game.priorityDeal = 'p1'
    applyAction(game, { type: 'SET_ROUND', roundType: 'SR' })

    expect(game.turnQueue[0]).toBe('p1')
    expect(game.turnQueue).toHaveLength(3)
  })

  it('builds corp queue on OR by price descending', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 95)
    parCorp(game, 'p1', 'B&O', 70)
    floatCorp(game, 'PRR')
    floatCorp(game, 'B&O')

    applyAction(game, { type: 'SET_ROUND', roundType: 'OR' })

    // PRR at 95 before B&O at 70
    expect(game.turnQueue.indexOf('PRR')).toBeLessThan(game.turnQueue.indexOf('B&O'))
  })

  it('operated flag resets on OR entry', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)
    const corp = game.corporations.find(c => c.sym === 'PRR')
    corp.operated = true

    applyAction(game, { type: 'SET_ROUND', roundType: 'OR' })
    expect(corp.operated).toBe(false)
  })
})

describe('18Chesapeake stock market', () => {
  it('multiple corps on same cell ordered by arrival', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)
    parCorp(game, 'p1', 'B&O', 80)

    const prrOrder = game.stockMarket.corpPositions['PRR'].order
    const boOrder = game.stockMarket.corpPositions['B&O'].order
    // PRR arrived first
    expect(prrOrder).toBeLessThan(boOrder)
  })

  it('sell movement is down_share (1 step per 10%)', () => {
    const game = makeChes()
    parCorp(game, 'p0', 'PRR', 80)
    applyAction(game, { type: 'BUY_SHARE', playerId: 'p0', corpSym: 'PRR', source: 'ipo' })

    const rowBefore = game.stockMarket.corpPositions['PRR'].row
    applyAction(game, { type: 'SELL_SHARES', playerId: 'p0', corpSym: 'PRR', percent: 10 })

    // One 10% share sold = one step down
    expect(game.stockMarket.corpPositions['PRR'].row).toBe(rowBefore + 1)
  })
})
