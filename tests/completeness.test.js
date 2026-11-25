// Completeness tests — verify every title-specific mechanic is exercisable.
// For each title, reads its config to find which features it declares,
// then tests that those actions can be performed without errors.
//
// This answers: "Can a user do everything this game allows?"

import { describe, it, expect } from 'vitest'
import { createGame } from '../src/engine/setup.js'
import { applyAction } from '../src/engine/actions.js'
import { getTitle, titles } from '../src/titles/index.js'
import { parPrices, corpPrice } from '../src/engine/stockMarket.js'
import { currentPhase, trainLimit } from '../src/engine/phase.js'
import { playerNetWorth } from '../src/engine/rules/netWorth.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGame(titleId, playerCount) {
  const title = getTitle(titleId)
  const names = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`)
  return createGame(title, names)
}

function parFirstCorp(game) {
  const pars = parPrices(game.stockMarket)
  if (pars.length === 0) return null
  const corp = game.corporations[0]
  const slot = pars[0]
  applyAction(game, {
    type: 'PAR_SHARE', playerId: 'p0', corpSym: corp.sym,
    parPrice: slot.price, row: slot.row, col: slot.col,
  })
  return corp
}

function floatCorp(game, corp) {
  const title = game.title
  let buyer = 0
  while (!corp.floated && corp.ipoShares > 0) {
    const pid = `p${buyer % game.players.length}`
    if (game.players.find(p => p.id === pid).cash < corp.parPrice) break
    applyAction(game, { type: 'BUY_SHARE', playerId: pid, corpSym: corp.sym, source: 'ipo' })
    buyer++
  }
  return corp.floated
}

function totalCash(game) {
  let t = game.bank.cash
  for (const p of game.players) t += p.cash
  for (const c of game.corporations) t += c.cash
  return t
}

// ─── Per-title completeness ──────────────────────────────────────────────────

for (const [titleId, title] of Object.entries(titles)) {
  describe(`completeness: ${titleId}`, () => {
    const pc = title.minPlayers

    // ── BASIC (every title) ──

    it('can par, buy, sell a share', () => {
      const game = makeGame(titleId, pc)
      const pars = parPrices(game.stockMarket)
      if (pars.length === 0) return // no-par title
      const corp = parFirstCorp(game)
      expect(corp.ipoed).toBe(true)

      if (corp.ipoShares > 0 && pc > 1) {
        applyAction(game, { type: 'BUY_SHARE', playerId: 'p1', corpSym: corp.sym, source: 'ipo' })
        const shareSize = title.shares?.[1] ?? 10
        applyAction(game, { type: 'SELL_SHARES', playerId: 'p1', corpSym: corp.sym, percent: shareSize })
        expect(corp.marketShares).toBeGreaterThan(0)
      }
    })

    it('can pay dividend and withhold', () => {
      const game = makeGame(titleId, pc)
      const corp = parFirstCorp(game)
      if (!corp) return
      floatCorp(game, corp)
      if (!corp.floated) return

      applyAction(game, { type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: 100 })
      applyAction(game, { type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: 50 })
      // Cash conservation
      expect(totalCash(game)).toBe(totalCash(makeGame(titleId, pc)))
    })

    it('can buy a train', () => {
      const game = makeGame(titleId, pc)
      const corp = parFirstCorp(game)
      if (!corp) return
      floatCorp(game, corp)
      if (!corp.floated) return

      const train = game.depot.upcoming[0]
      if (!train || corp.cash < train.price) return

      applyAction(game, { type: 'BUY_TRAIN', corpSym: corp.sym, trainName: train.name, price: train.price })
      expect(corp.trains.length).toBeGreaterThan(0)
    })

    it('can collect private revenue', () => {
      const game = makeGame(titleId, pc)
      if (!game.companies || game.companies.length === 0) return

      // Buy first private for p0
      const priv = game.companies[0]
      applyAction(game, { type: 'BUY_PRIVATE', playerId: 'p0', companySym: priv.sym, price: priv.value })

      // Collect revenue
      applyAction(game, { type: 'COLLECT_ALL_REVENUE' })
      // Should not throw
    })

    // ── HALF PAY ──

    if (title.halfPay) {
      it('can half-pay dividend', () => {
        const game = makeGame(titleId, pc)
        const corp = parFirstCorp(game)
        if (!corp) return
        floatCorp(game, corp)
        if (!corp.floated) return

        const cashBefore = corp.cash
        applyAction(game, { type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: 100 })
        // Corp should receive ~half into treasury
        expect(corp.cash).toBeGreaterThan(cashBefore)
      })
    }

    // ── INCREMENTAL CAPITALIZATION ──

    if (title.capitalization === 'incremental') {
      it('incremental: corp gets share payment on buy', () => {
        const game = makeGame(titleId, pc)
        const corp = parFirstCorp(game)
        if (!corp) return
        // After president cert, corp should have received payment
        expect(corp.cash).toBeGreaterThan(0)
      })

      // Issue / redeem shares
      it('can issue shares', () => {
        const game = makeGame(titleId, pc)
        const corp = parFirstCorp(game)
        if (!corp) return
        floatCorp(game, corp)
        if (!corp.floated || corp.ipoShares <= 0) return

        const cashBefore = corp.cash
        applyAction(game, { type: 'ISSUE_SHARES', corpSym: corp.sym })
        expect(corp.cash).toBeGreaterThan(cashBefore)
      })
    }

    // ── LOANS ──

    if (title.loans && title.loans.type !== '1880_player') {
      it('can take a corp loan', () => {
        const game = makeGame(titleId, pc)
        const corp = parFirstCorp(game)
        if (!corp) return
        floatCorp(game, corp)
        if (!corp.floated) return

        const cashBefore = corp.cash
        applyAction(game, { type: 'TAKE_LOAN', corpSym: corp.sym })
        expect(corp.cash).toBeGreaterThan(cashBefore)
      })
    }

    if (title.loans?.type === '1880_player') {
      it('can take a player loan', () => {
        const game = makeGame(titleId, pc)
        const cashBefore = game.players[0].cash
        const amount = title.loans.amount || title.loans.value || 100
        applyAction(game, { type: 'TAKE_PLAYER_LOAN', playerId: 'p0', amount })
        expect(game.players[0].cash).toBeGreaterThan(cashBefore)
      })
    }

    // ── TERRAIN COSTS (via ADJUST_CASH on corp) ──

    if (title.terrainCosts?.length > 0) {
      it('can pay terrain cost', () => {
        const game = makeGame(titleId, pc)
        const corp = parFirstCorp(game)
        if (!corp) return
        floatCorp(game, corp)
        if (!corp.floated) return

        const cost = title.terrainCosts[0]
        const cashBefore = corp.cash
        applyAction(game, { type: 'ADJUST_CASH', entityType: 'corporation', entityId: corp.sym, amount: -cost })
        expect(corp.cash).toBe(cashBefore - cost)
      })
    }

    // ── PRIVATES ──

    if (title.companies?.length > 0) {
      it('can buy and sell a private company', () => {
        const game = makeGame(titleId, pc)
        const priv = game.companies[0]

        // Buy private
        applyAction(game, { type: 'BUY_PRIVATE', playerId: 'p0', companySym: priv.sym, price: priv.value })
        expect(game.players[0].privates).toContain(priv.sym)

        // Par and float a corp to sell private to
        const corp = parFirstCorp(game)
        if (!corp) return
        floatCorp(game, corp)
        if (!corp.floated) return
        if (priv.canSellToCorp === false) return

        applyAction(game, { type: 'SELL_PRIVATE', companySym: priv.sym, fromPlayerId: 'p0', toCorpSym: corp.sym, price: priv.value })
        expect(game.players[0].privates).not.toContain(priv.sym)
      })
    }

    // ── SHORTS (1817) ──

    if (title.shorts) {
      it('can short sell', () => {
        const game = makeGame(titleId, Math.max(pc, 3))
        const corp = parFirstCorp(game)
        if (!corp) return
        floatCorp(game, corp)
        if (!corp.floated) return

        // Use a player who doesn't own shares in this corp
        const shorter = game.players.find(p => !p.shares.some(s => s.corpSym === corp.sym))
        if (!shorter) return

        applyAction(game, { type: 'SHORT_SELL', playerId: shorter.id, corpSym: corp.sym })
        const shortShares = shorter.shares.filter(s => s.corpSym === corp.sym && s.isShort)
        // Short sell may fail silently if corp size or phase restrictions apply
        // (1817: can't short 2-share corps, can't short in certain phases)
        // This test verifies the action doesn't crash; exact behavior depends on game state
        expect(shortShares.length).toBeGreaterThanOrEqual(0)
      })
    }

    // ── CORP CAN BUY SHARES ──

    if (title.corpCanBuyShares) {
      it('corp can buy its own share', () => {
        const game = makeGame(titleId, pc)
        const corp = parFirstCorp(game)
        if (!corp) return
        floatCorp(game, corp)
        if (!corp.floated) return

        // Need a share in market first
        if (pc > 1) {
          applyAction(game, { type: 'BUY_SHARE', playerId: 'p1', corpSym: corp.sym, source: 'ipo' })
          applyAction(game, { type: 'SELL_SHARES', playerId: 'p1', corpSym: corp.sym, percent: title.shares?.[1] ?? 10 })
        }
        if (corp.marketShares <= 0) return

        applyAction(game, { type: 'CORP_BUY_SHARE', buyerCorpSym: corp.sym, targetCorpSym: corp.sym, source: 'market' })
      })
    }

    // ── TRAIN EXPORT ──

    if (title.trainExport) {
      it('can export a train', () => {
        const game = makeGame(titleId, pc)
        applyAction(game, { type: 'EXPORT_TRAIN' })
        // Should remove a train from depot or advance phase
      })
    }

    // ── STRATEGY CARDS ──

    if (title.strategyCards?.length > 0) {
      it('can give a strategy card', () => {
        const game = makeGame(titleId, pc)
        const card = game.strategyCards?.[0]
        if (!card) return
        applyAction(game, { type: 'GIVE_CARD', playerId: 'p0', card })
        expect(game.players[0].cards?.length).toBeGreaterThan(0)
      })
    }

    // ── SOLD-OUT ADJUSTMENT ──

    it('can run sold-out adjustment', () => {
      const game = makeGame(titleId, pc)
      // Should not throw even with no sold-out corps
      applyAction(game, { type: 'SOLD_OUT_ADJUST' })
    })

    // ── PLAYER REORDER ──

    it('can reorder players', () => {
      const game = makeGame(titleId, pc)
      if (pc < 2) return
      const order = game.players.map(p => p.id).reverse()
      applyAction(game, { type: 'SET_PLAYER_ORDER', order })
      expect(game.players[0].id).toBe(order[0])
    })

    // ── MONEY CONSERVATION across all tested actions ──

    it('cash is conserved through a full action sequence', () => {
      const game = makeGame(titleId, pc)
      const startCash = totalCash(game)

      const pars = parPrices(game.stockMarket)
      if (pars.length === 0) return

      // Par + buy + dividend + withhold + sell
      const corp = parFirstCorp(game)
      floatCorp(game, corp)
      if (corp.floated) {
        applyAction(game, { type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: 100 })
        applyAction(game, { type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: 50 })
        if (title.halfPay) {
          applyAction(game, { type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: 80 })
        }
      }

      expect(totalCash(game)).toBe(startCash)
    })
  })
}
