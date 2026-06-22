import { describe, it, expect } from 'vitest'
import { createGame } from '../src/engine/setup.js'
import { applyAction } from '../src/engine/actions.js'
import { getTitle } from '../src/titles/index.js'
import { checkReminders } from '../src/engine/reminders.js'

function make18ms(playerCount = 2) {
  const title = getTitle('g18ms')
  return createGame(title, Array.from({ length: playerCount }, (_, i) => `Player${i + 1}`))
}

function parCorp(game, playerId, corpSym, parPrice = 80) {
  const grid = game.stockMarket.grid
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      if (grid[r][c]?.price === parPrice && grid[r][c]?.canPar) {
        applyAction(game, { type: 'PAR_SHARE', playerId, corpSym, parPrice, row: r, col: c })
        return
      }
}

const ALL_ON = {
  soldOut: true, collectPrivates: true, certLimit: true,
  bankLow: true, noTrains: true, gameEnd: true, corpNotOperated: true,
}

const ALL_OFF = {
  soldOut: false, collectPrivates: false, certLimit: false,
  bankLow: false, noTrains: false, gameEnd: false, corpNotOperated: false,
}

describe('reminders: soldOut', () => {
  it('detects sold-out corps when leaving SR', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    // Buy all shares to make sold out
    for (let i = 0; i < 8; i++) {
      if (game.corporations.find(c => c.sym === 'IC').ipoShares > 0)
        applyAction(game, { type: 'BUY_SHARE', playerId: 'p' + (i % 2), corpSym: 'IC', source: 'ipo' })
    }

    const reminders = checkReminders(game, 'SR', 'OR', ALL_ON)
    const soldOut = reminders.find(r => r.id === 'soldOut')
    expect(soldOut).toBeTruthy()
    expect(soldOut.message).toContain('IC')
    expect(soldOut.action.type).toBe('SOLD_OUT_ADJUST')
  })

  it('skips if already adjusted this SR', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    for (let i = 0; i < 8; i++) {
      if (game.corporations.find(c => c.sym === 'IC').ipoShares > 0)
        applyAction(game, { type: 'BUY_SHARE', playerId: 'p' + (i % 2), corpSym: 'IC', source: 'ipo' })
    }
    applyAction(game, { type: 'SET_ROUND', roundType: 'SR' })
    applyAction(game, { type: 'SOLD_OUT_ADJUST' })

    const reminders = checkReminders(game, 'SR', 'OR', ALL_ON)
    expect(reminders.find(r => r.id === 'soldOut')).toBeFalsy()
  })

  it('does not trigger when disabled', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    for (let i = 0; i < 8; i++) {
      if (game.corporations.find(c => c.sym === 'IC').ipoShares > 0)
        applyAction(game, { type: 'BUY_SHARE', playerId: 'p' + (i % 2), corpSym: 'IC', source: 'ipo' })
    }

    const reminders = checkReminders(game, 'SR', 'OR', { ...ALL_OFF })
    expect(reminders.find(r => r.id === 'soldOut')).toBeFalsy()
  })
})

describe('reminders: collectPrivates', () => {
  it('reminds to collect when entering OR', () => {
    const game = make18ms()
    applyAction(game, { type: 'BUY_PRIVATE', playerId: 'p0', companySym: 'AGS', price: 30 })

    const reminders = checkReminders(game, 'SR', 'OR', ALL_ON)
    const collect = reminders.find(r => r.id === 'collectPrivates')
    expect(collect).toBeTruthy()
    expect(collect.action.type).toBe('COLLECT_ALL_REVENUE')
  })

  it('does not remind if already collected', () => {
    const game = make18ms()
    applyAction(game, { type: 'BUY_PRIVATE', playerId: 'p0', companySym: 'AGS', price: 30 })
    applyAction(game, { type: 'SET_ROUND', roundType: 'OR' })
    applyAction(game, { type: 'COLLECT_ALL_REVENUE' })

    const reminders = checkReminders(game, 'SR', 'OR', ALL_ON)
    expect(reminders.find(r => r.id === 'collectPrivates')).toBeFalsy()
  })

  it('does not remind when no privates owned', () => {
    const game = make18ms()

    const reminders = checkReminders(game, 'SR', 'OR', ALL_ON)
    expect(reminders.find(r => r.id === 'collectPrivates')).toBeFalsy()
  })
})

describe('reminders: noTrains', () => {
  it('detects trainless floated corps when entering OR', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    // Float IC
    for (let i = 0; i < 4; i++)
      applyAction(game, { type: 'BUY_SHARE', playerId: 'p' + (i % 2), corpSym: 'IC', source: 'ipo' })

    const reminders = checkReminders(game, 'SR', 'OR', ALL_ON)
    const noTrains = reminders.find(r => r.id === 'noTrains')
    expect(noTrains).toBeTruthy()
    expect(noTrains.message).toContain('IC')
  })

  it('does not trigger when corps have trains', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    for (let i = 0; i < 4; i++)
      applyAction(game, { type: 'BUY_SHARE', playerId: 'p' + (i % 2), corpSym: 'IC', source: 'ipo' })
    applyAction(game, { type: 'BUY_TRAIN', corpSym: 'IC', trainName: '2+', price: 80 })

    const reminders = checkReminders(game, 'SR', 'OR', ALL_ON)
    expect(reminders.find(r => r.id === 'noTrains')).toBeFalsy()
  })

  it('off by default', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    for (let i = 0; i < 4; i++)
      applyAction(game, { type: 'BUY_SHARE', playerId: 'p' + (i % 2), corpSym: 'IC', source: 'ipo' })

    const defaults = { ...ALL_ON, noTrains: false }
    const reminders = checkReminders(game, 'SR', 'OR', defaults)
    expect(reminders.find(r => r.id === 'noTrains')).toBeFalsy()
  })
})

describe('reminders: corpNotOperated', () => {
  it('detects non-operated corps when leaving OR', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    for (let i = 0; i < 4; i++)
      applyAction(game, { type: 'BUY_SHARE', playerId: 'p' + (i % 2), corpSym: 'IC', source: 'ipo' })
    // Enter OR (resets operated flags)
    applyAction(game, { type: 'SET_ROUND', roundType: 'OR' })

    const reminders = checkReminders(game, 'OR', 'SR', ALL_ON)
    const notOp = reminders.find(r => r.id === 'corpNotOperated')
    expect(notOp).toBeTruthy()
    expect(notOp.message).toContain('IC')
  })

  it('does not trigger when all corps operated', () => {
    const game = make18ms()
    parCorp(game, 'p0', 'IC', 80)
    for (let i = 0; i < 4; i++)
      applyAction(game, { type: 'BUY_SHARE', playerId: 'p' + (i % 2), corpSym: 'IC', source: 'ipo' })
    applyAction(game, { type: 'SET_ROUND', roundType: 'OR' })
    applyAction(game, { type: 'BUY_TRAIN', corpSym: 'IC', trainName: '2+', price: 80 })
    // BUY_TRAIN marks corp as operated

    const reminders = checkReminders(game, 'OR', 'SR', ALL_ON)
    expect(reminders.find(r => r.id === 'corpNotOperated')).toBeFalsy()
  })
})

describe('reminders: bankLow', () => {
  it('detects low bank', () => {
    const game = make18ms()
    game.bank.cash = 1000 // 10% of 10000

    const reminders = checkReminders(game, 'SR', 'OR', ALL_ON)
    const bankLow = reminders.find(r => r.id === 'bankLow')
    expect(bankLow).toBeTruthy()
    expect(bankLow.message).toContain('1000')
  })

  it('does not trigger when bank healthy', () => {
    const game = make18ms()
    // Bank starts at 10000 - player cash

    const reminders = checkReminders(game, 'SR', 'OR', ALL_ON)
    expect(reminders.find(r => r.id === 'bankLow')).toBeFalsy()
  })
})

describe('reminders: gameEnd', () => {
  it('detects bank broken', () => {
    const game = make18ms()
    game.bank.cash = 0

    const reminders = checkReminders(game, 'OR', 'SR', ALL_ON)
    const gameEnd = reminders.find(r => r.id === 'gameEnd')
    expect(gameEnd).toBeTruthy()
    expect(gameEnd.severity).toBe('critical')
  })

  it('does not trigger when bank positive', () => {
    const game = make18ms()

    const reminders = checkReminders(game, 'OR', 'SR', ALL_ON)
    expect(reminders.find(r => r.id === 'gameEnd')).toBeFalsy()
  })
})

describe('reminders: all disabled', () => {
  it('returns empty when all reminders off', () => {
    const game = make18ms()
    game.bank.cash = 0 // would trigger gameEnd
    parCorp(game, 'p0', 'IC', 80)

    const reminders = checkReminders(game, 'SR', 'OR', ALL_OFF)
    expect(reminders).toHaveLength(0)
  })
})
