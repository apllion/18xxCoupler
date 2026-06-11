import { describe, it, expect } from 'vitest'
import { createGame } from '../src/engine/setup.js'
import { applyAction } from '../src/engine/actions.js'
import { getTitle } from '../src/titles/index.js'
function make18ms(playerCount = 2) {
  const title = getTitle('g18ms')
  return createGame(title, Array.from({ length: playerCount }, (_, i) => `Player${i + 1}`))
}

function parCorp(game, playerId, corpSym, parPrice = 80) {
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

describe('18MS setup', () => {
  it('creates game with correct player count and cash', () => {
    const game = make18ms(2)
    expect(game.players).toHaveLength(2)
    expect(game.players[0].cash).toBe(900)
    expect(game.players[1].cash).toBe(900)
    expect(game.bank.cash).toBe(10000 - 900 * 2)
  })

  it('creates game with 3 players', () => {
    const game = make18ms(3)
    expect(game.players).toHaveLength(3)
    expect(game.players[0].cash).toBe(625)
  })

  it('creates game with 4 players', () => {
    const game = make18ms(4)
    expect(game.players).toHaveLength(4)
    expect(game.players[0].cash).toBe(525)
  })

  it('has 5 corporations', () => {
    const game = make18ms()
    expect(game.corporations).toHaveLength(5)
    expect(game.corporations.map(c => c.sym).sort()).toEqual(['Fr', 'GMO', 'IC', 'L&N', 'WRA'])
  })

  it('has 5 privates', () => {
    const game = make18ms()
    expect(game.companies).toHaveLength(5)
  })

  it('starts in Pregame (draft)', () => {
    const game = make18ms()
    expect(game.roundTracker.roundType).toBe('Pregame')
  })

  it('has correct phases', () => {
    const game = make18ms()
    expect(game.phaseManager.phases).toHaveLength(4)
    expect(game.phaseManager.phases[0].name).toBe('2')
    expect(game.phaseManager.phases[0].trainLimit).toBe(3)
  })
})

describe('18MS shares and parring', () => {
  it('pars a corporation at $80', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)

    const corp = game.corporations.find(c => c.sym === 'IC')
    expect(corp.parPrice).toBe(80)
    expect(corp.ipoed).toBe(true)
    expect(corp.ipoShares).toBe(80) // 100 - 20% president
    expect(game.players[0].shares).toHaveLength(1)
    expect(game.players[0].shares[0].isPresident).toBe(true)
    expect(game.players[0].shares[0].percent).toBe(20)
    expect(game.players[0].cash).toBe(900 - 160) // 20% of $80 = $160
  })

  it('floats at 60%', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    const corp = game.corporations.find(c => c.sym === 'IC')
    expect(corp.floated).toBe(false)

    // Buy 4 more 10% shares to reach 60%
    for (let i = 0; i < 4; i++) {
      applyAction(game, { type: 'BUY_SHARE', playerId: i < 2 ? 'p0' : 'p1', corpSym: 'IC', source: 'ipo' })
    }
    expect(corp.floated).toBe(true)
    // Full capitalization: corp gets par * 10
    expect(corp.cash).toBe(80 * 10)
  })

  it('limits player ownership to 70%', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    // Player has 20% president. Buy 5 more = 70%
    for (let i = 0; i < 5; i++) {
      applyAction(game, { type: 'BUY_SHARE', playerId: 'p0', corpSym: 'IC', source: 'ipo' })
    }
    const pct = game.players[0].shares.filter(s => s.corpSym === 'IC').reduce((sum, s) => sum + s.percent, 0)
    expect(pct).toBe(70)
  })

  it('sells shares to market pool and drops price', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    applyAction(game, { type: 'BUY_SHARE', playerId: 'p0', corpSym: 'IC', source: 'ipo' })

    const posBefore = { ...game.stockMarket.corpPositions['IC'] }
    applyAction(game, { type: 'SELL_SHARES', playerId: 'p0', corpSym: 'IC', percent: 10 })

    const corp = game.corporations.find(c => c.sym === 'IC')
    expect(corp.marketShares).toBe(10)
    // Price should drop (down_share: one step per 10%)
    expect(game.stockMarket.corpPositions['IC'].row).toBeGreaterThan(posBefore.row)
  })
})

describe('18MS trains', () => {
  it('buys a train from depot', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    // Float the corp
    for (let i = 0; i < 4; i++) {
      applyAction(game, { type: 'BUY_SHARE', playerId: i < 2 ? 'p0' : 'p1', corpSym: 'IC', source: 'ipo' })
    }
    const corp = game.corporations.find(c => c.sym === 'IC')
    const cashBefore = corp.cash

    applyAction(game, { type: 'BUY_TRAIN', corpSym: 'IC', trainName: '2+', price: 80 })

    expect(corp.trains).toHaveLength(1)
    expect(corp.trains[0].name).toBe('2+')
    expect(corp.cash).toBe(cashBefore - 80)
  })

  it('respects train limit of 3', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    const corp = game.corporations.find(c => c.sym === 'IC')
    corp.cash = 5000

    applyAction(game, { type: 'BUY_TRAIN', corpSym: 'IC', trainName: '2+', price: 80 })
    applyAction(game, { type: 'BUY_TRAIN', corpSym: 'IC', trainName: '2+', price: 80 })
    applyAction(game, { type: 'BUY_TRAIN', corpSym: 'IC', trainName: '2+', price: 80 })

    expect(corp.trains).toHaveLength(3)
  })
})

describe('18MS dividends', () => {
  it('pays dividends and moves price right', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    for (let i = 0; i < 4; i++) {
      applyAction(game, { type: 'BUY_SHARE', playerId: i < 2 ? 'p0' : 'p1', corpSym: 'IC', source: 'ipo' })
    }

    const p0before = game.players[0].cash
    const colBefore = game.stockMarket.corpPositions['IC'].col

    applyAction(game, { type: 'PAY_DIVIDEND', corpSym: 'IC', totalRevenue: 100 })

    // Player0 has 40% → gets $40
    expect(game.players[0].cash).toBe(p0before + 40)
    // Price should move right
    expect(game.stockMarket.corpPositions['IC'].col).toBeGreaterThan(colBefore)
  })

  it('withholds to corp treasury and moves price left', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    for (let i = 0; i < 4; i++) {
      applyAction(game, { type: 'BUY_SHARE', playerId: i < 2 ? 'p0' : 'p1', corpSym: 'IC', source: 'ipo' })
    }
    const corp = game.corporations.find(c => c.sym === 'IC')
    const cashBefore = corp.cash
    const colBefore = game.stockMarket.corpPositions['IC'].col

    applyAction(game, { type: 'WITHHOLD_DIVIDEND', corpSym: 'IC', totalRevenue: 100 })

    expect(corp.cash).toBe(cashBefore + 100)
    expect(game.stockMarket.corpPositions['IC'].col).toBeLessThan(colBefore)
  })
})

describe('18MS round tracking', () => {
  it('has default SR/OR round types', () => {
    const game = make18ms()
    // 18MS uses default roundTypes ['SR', 'OR'] + Pregame from setup
    expect(game.roundTracker.roundTypes).toContain('SR')
    expect(game.roundTracker.roundTypes).toContain('OR')
  })

  it('builds turn queue on SET_ROUND SR', () => {
    const game = make18ms()
    applyAction(game, { type: 'SET_ROUND', roundType: 'SR' })
    expect(game.turnQueue).toHaveLength(2)
    expect(game.turnQueue).toContain('p0')
    expect(game.turnQueue).toContain('p1')
  })

  it('builds corp queue on SET_ROUND OR', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    // Float IC
    for (let i = 0; i < 4; i++) {
      applyAction(game, { type: 'BUY_SHARE', playerId: i < 2 ? 'p0' : 'p1', corpSym: 'IC', source: 'ipo' })
    }

    applyAction(game, { type: 'SET_ROUND', roundType: 'OR' })
    expect(game.turnQueue).toContain('IC')
  })

  it('resets operated flags on entering OR', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    const corp = game.corporations.find(c => c.sym === 'IC')
    corp.operated = true

    applyAction(game, { type: 'SET_ROUND', roundType: 'OR' })
    expect(corp.operated).toBe(false)
  })
})

describe('18MS privates', () => {
  it('buys a private and assigns ownership', () => {
    const game = make18ms()
    const p = game.players[0]
    const cashBefore = p.cash

    applyAction(game, { type: 'BUY_PRIVATE', playerId: 'p0', companySym: 'AGS', price: 30 })

    expect(p.cash).toBe(cashBefore - 30)
    const company = game.companies.find(c => c.sym === 'AGS')
    expect(company.ownerId).toBe('p0')
    expect(company.ownerType).toBe('player')
  })

  it('collects private revenue', () => {
    const game = make18ms()
    applyAction(game, { type: 'BUY_PRIVATE', playerId: 'p0', companySym: 'AGS', price: 30 })
    const cashBefore = game.players[0].cash

    applyAction(game, { type: 'COLLECT_ALL_REVENUE' })

    // AGS pays $15 revenue
    expect(game.players[0].cash).toBe(cashBefore + 15)
  })
})
