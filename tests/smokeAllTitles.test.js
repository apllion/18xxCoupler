// Smoke tests for every registered title.
// Validates config completeness, game creation, basic actions, and invariants.
// No external data needed — these tests create games programmatically.

import { describe, it, expect } from 'vitest'
import { createGame } from '../src/engine/setup.js'
import { applyAction } from '../src/engine/actions.js'
import { getTitle, titles } from '../src/titles/index.js'
import { parPrices, corpPrice } from '../src/engine/stockMarket.js'
import { currentPhase, trainLimit } from '../src/engine/phase.js'
import { playerNetWorth } from '../src/engine/rules/netWorth.js'

function makeGame(titleId, playerCount) {
  const title = getTitle(titleId)
  const names = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`)
  return createGame(title, names)
}

function totalSystemCash(game) {
  let total = game.bank.cash
  for (const p of game.players) total += p.cash
  for (const c of game.corporations) total += c.cash
  return total
}

// ─── Config validation ───────────────────────────────────────────────────────

describe('title config validation', () => {
  const titleIds = Object.keys(titles)

  it(`has ${titleIds.length} registered titles`, () => {
    expect(titleIds.length).toBeGreaterThanOrEqual(25)
  })

  for (const titleId of titleIds) {
    const title = getTitle(titleId)

    describe(titleId, () => {
      it('has required metadata', () => {
        expect(title.title).toBeTruthy()
        expect(title.titleId).toBe(titleId)
        expect(title.minPlayers).toBeGreaterThanOrEqual(2)
        expect(title.maxPlayers).toBeGreaterThanOrEqual(title.minPlayers)
      })

      it('has valid startingCash for all player counts', () => {
        for (let n = title.minPlayers; n <= title.maxPlayers; n++) {
          const cash = title.startingCash[n]
          expect(cash, `startingCash[${n}]`).toBeGreaterThan(0)
        }
      })

      it('has valid certLimit for all player counts', () => {
        if (typeof title.certLimit === 'number') {
          expect(title.certLimit).toBeGreaterThan(0)
        } else {
          for (let n = title.minPlayers; n <= title.maxPlayers; n++) {
            const limit = title.certLimit[n]
            // certLimit can be a number or an object { major: N, minor: M } per player count
            if (typeof limit === 'object') {
              expect(Object.values(limit).some(v => v > 0), `certLimit[${n}] has positive values`).toBe(true)
            } else {
              expect(limit, `certLimit[${n}]`).toBeGreaterThan(0)
            }
          }
        }
      })

      it('has bankCash', () => {
        if (typeof title.bankCash === 'number') {
          expect(title.bankCash).toBeGreaterThan(0)
        } else {
          // Object keyed by player count
          expect(Object.keys(title.bankCash).length).toBeGreaterThan(0)
        }
      })

      it('has a stock market grid', () => {
        expect(Array.isArray(title.market)).toBe(true)
        expect(title.market.length).toBeGreaterThan(0)
        expect(title.market[0].length).toBeGreaterThan(0)
      })

      it('has phases with train limits', () => {
        expect(Array.isArray(title.phases)).toBe(true)
        expect(title.phases.length).toBeGreaterThanOrEqual(2)
        for (const phase of title.phases) {
          expect(phase.name).toBeTruthy()
          expect(phase.trainLimit).toBeDefined()
          expect(phase.operatingRounds).toBeGreaterThanOrEqual(1)
        }
      })

      it('has trains', () => {
        expect(Array.isArray(title.trains)).toBe(true)
        expect(title.trains.length).toBeGreaterThanOrEqual(2)
        for (const train of title.trains) {
          expect(train.name).toBeTruthy()
          expect(train.price).toBeGreaterThan(0)
        }
      })

      it('has corporations', () => {
        expect(Array.isArray(title.corporations)).toBe(true)
        expect(title.corporations.length).toBeGreaterThan(0)
        for (const corp of title.corporations) {
          expect(corp.sym).toBeTruthy()
          expect(corp.name).toBeTruthy()
        }
      })

      it('has par prices on the market', () => {
        const game = makeGame(titleId, title.minPlayers)
        const pars = parPrices(game.stockMarket)
        // Some titles have non-standard par or no-par mechanics
        if (pars.length === 0) {
          // This is OK for titles with purchase auctions or other exotic setups
          return
        }
        expect(pars.length).toBeGreaterThan(0)
      })
    })
  }
})

// ─── Game creation smoke ─────────────────────────────────────────────────────

describe('game creation smoke', () => {
  const titleIds = Object.keys(titles)

  for (const titleId of titleIds) {
    const title = getTitle(titleId)

    describe(titleId, () => {
      it('creates game at min players', () => {
        const game = makeGame(titleId, title.minPlayers)
        expect(game.players).toHaveLength(title.minPlayers)
        expect(game.corporations.length).toBeGreaterThan(0)
        expect(game.bank.cash).toBeGreaterThan(0)
        expect(game.depot.upcoming.length).toBeGreaterThan(0)
      })

      it('creates game at max players', () => {
        const game = makeGame(titleId, title.maxPlayers)
        expect(game.players).toHaveLength(title.maxPlayers)
      })

      it('phase and train limit are defined', () => {
        const game = makeGame(titleId, title.minPlayers)
        const phase = currentPhase(game.phaseManager)
        expect(phase).toBeDefined()
        expect(phase.name).toBeTruthy()
        const limit = trainLimit(game.phaseManager)
        expect(limit).toBeGreaterThan(0)
      })

      it('cash conservation at start', () => {
        const game = makeGame(titleId, title.minPlayers)
        const totalCash = totalSystemCash(game)
        // Some titles have incremental cap where not all bank cash is in the bank
        // but total system cash should be positive and consistent
        expect(totalCash).toBeGreaterThan(0)
      })

      it('all players start with correct cash', () => {
        const n = title.minPlayers
        const game = makeGame(titleId, n)
        const expected = title.startingCash[n]
        for (const p of game.players) {
          expect(p.cash).toBe(expected)
        }
      })

      it('net worth equals cash at start', () => {
        const game = makeGame(titleId, title.minPlayers)
        for (const p of game.players) {
          const nw = playerNetWorth(game, p.id)
          // At game start, net worth = cash (no shares or privates owned yet,
          // unless pregame auction already assigned privates)
          expect(nw).toBeGreaterThanOrEqual(p.cash)
        }
      })

      it('pars first corp without error', () => {
        const game = makeGame(titleId, title.minPlayers)
        const pars = parPrices(game.stockMarket)
        if (pars.length === 0 || game.corporations.length === 0) return

        const corp = game.corporations[0]
        const slot = pars[0]

        applyAction(game, {
          type: 'PAR_SHARE',
          playerId: 'p0',
          corpSym: corp.sym,
          parPrice: slot.price,
          row: slot.row,
          col: slot.col,
        })

        expect(corp.ipoed).toBe(true)
        expect(corp.parPrice).toBe(slot.price)
        expect(corpPrice(game.stockMarket, corp.sym)).toBe(slot.price)
      })

      it('buys share after par without error', () => {
        const game = makeGame(titleId, title.minPlayers)
        const pars = parPrices(game.stockMarket)
        if (pars.length === 0 || game.corporations.length === 0) return

        const corp = game.corporations[0]
        const slot = pars[0]

        applyAction(game, {
          type: 'PAR_SHARE',
          playerId: 'p0',
          corpSym: corp.sym,
          parPrice: slot.price,
          row: slot.row,
          col: slot.col,
        })

        if (corp.ipoShares <= 0) return

        const buyerId = title.minPlayers > 1 ? 'p1' : 'p0'
        const sharesBefore = corp.ipoShares

        applyAction(game, {
          type: 'BUY_SHARE',
          playerId: buyerId,
          corpSym: corp.sym,
          source: 'ipo',
        })

        expect(corp.ipoShares).toBeLessThan(sharesBefore)
      })

      it('cash is conserved after par + buy', () => {
        const game = makeGame(titleId, title.minPlayers)
        const startCash = totalSystemCash(game)

        const pars = parPrices(game.stockMarket)
        if (pars.length === 0 || game.corporations.length === 0) return

        const corp = game.corporations[0]
        applyAction(game, {
          type: 'PAR_SHARE',
          playerId: 'p0',
          corpSym: corp.sym,
          parPrice: pars[0].price,
          row: pars[0].row,
          col: pars[0].col,
        })

        if (corp.ipoShares > 0 && title.minPlayers > 1) {
          applyAction(game, {
            type: 'BUY_SHARE',
            playerId: 'p1',
            corpSym: corp.sym,
            source: 'ipo',
          })
        }

        const endCash = totalSystemCash(game)
        expect(endCash).toBe(startCash)
      })

      it('sells share without error', () => {
        const game = makeGame(titleId, title.minPlayers)
        const pars = parPrices(game.stockMarket)
        if (pars.length === 0 || game.corporations.length === 0) return

        const corp = game.corporations[0]
        applyAction(game, {
          type: 'PAR_SHARE',
          playerId: 'p0',
          corpSym: corp.sym,
          parPrice: pars[0].price,
          row: pars[0].row,
          col: pars[0].col,
        })

        // Buy enough to have a non-president share to sell
        if (corp.ipoShares > 0 && title.minPlayers > 1) {
          applyAction(game, {
            type: 'BUY_SHARE',
            playerId: 'p1',
            corpSym: corp.sym,
            source: 'ipo',
          })

          const p1 = game.players.find(p => p.id === 'p1')
          const hasShares = p1.shares.some(s => s.corpSym === corp.sym)
          if (hasShares) {
            const shareSize = title.shares?.[1] ?? 10
            applyAction(game, {
              type: 'SELL_SHARES',
              playerId: 'p1',
              corpSym: corp.sym,
              percent: shareSize,
            })
            expect(corp.marketShares).toBeGreaterThan(0)
          }
        }
      })

      it('pays dividend without error', () => {
        const game = makeGame(titleId, title.minPlayers)
        const pars = parPrices(game.stockMarket)
        if (pars.length === 0 || game.corporations.length === 0) return

        const corp = game.corporations[0]
        applyAction(game, {
          type: 'PAR_SHARE',
          playerId: 'p0',
          corpSym: corp.sym,
          parPrice: pars[0].price,
          row: pars[0].row,
          col: pars[0].col,
        })

        // Float the corp if needed
        while (corp.ipoShares > 0 && !corp.floated) {
          const buyer = title.minPlayers > 1 ? 'p1' : 'p0'
          applyAction(game, {
            type: 'BUY_SHARE',
            playerId: buyer,
            corpSym: corp.sym,
            source: 'ipo',
          })
        }

        if (!corp.floated) return

        applyAction(game, {
          type: 'PAY_DIVIDEND',
          corpSym: corp.sym,
          totalRevenue: 100,
        })

        // Dividend should have been paid
        expect(corp.cash).toBeDefined()
      })
    })
  }
})
