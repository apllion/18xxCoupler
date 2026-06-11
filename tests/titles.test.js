import { describe, it, expect } from 'vitest'
import { createGame } from '../src/engine/setup.js'
import { applyAction } from '../src/engine/actions.js'
import { getTitle, titles } from '../src/titles/index.js'
import { parPrices } from '../src/engine/stockMarket.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGame(titleId, playerCount) {
  const title = getTitle(titleId)
  const names = Array.from({ length: playerCount }, (_, i) => `Player${i + 1}`)
  return createGame(title, names)
}

function parCorp(game, playerId, corpSym, parPrice) {
  const pars = parPrices(game.stockMarket)
  const slot = pars.find((p) => p.price === parPrice)
  if (!slot) throw new Error(`No par slot at price ${parPrice} for ${corpSym}`)
  applyAction(game, {
    type: 'PAR_SHARE',
    playerId,
    corpSym,
    parPrice: slot.price,
    row: slot.row,
    col: slot.col,
  })
}

// ---------------------------------------------------------------------------
// Per-title test suites
// ---------------------------------------------------------------------------

const titleIds = Object.keys(titles)

for (const titleId of titleIds) {
  describe(titleId, () => {
    const title = getTitle(titleId)
    const playerCount = title.minPlayers || 2
    const expectedCash = title.startingCash[playerCount]

    // -- basic setup -------------------------------------------------------
    it('creates game with correct players', () => {
      const game = makeGame(titleId, playerCount)
      expect(game.players).toHaveLength(playerCount)
      if (expectedCash !== undefined) {
        for (const p of game.players) {
          expect(p.cash).toBe(expectedCash)
        }
      }
    })

    // -- corporations exist ------------------------------------------------
    it('has corporations', () => {
      const game = makeGame(titleId, playerCount)
      // Some titles may legitimately have zero corps for a given player
      // count (unlikely but defensive). We still assert the array exists.
      expect(Array.isArray(game.corporations)).toBe(true)
      expect(game.corporations.length).toBeGreaterThan(0)
    })

    // -- par first corp ----------------------------------------------------
    it('pars first corp', () => {
      const game = makeGame(titleId, playerCount)
      const pars = parPrices(game.stockMarket)

      if (pars.length === 0 || game.corporations.length === 0) {
        // No par prices on this market or no corps — skip gracefully
        return
      }

      const corp = game.corporations[0]
      const firstPar = pars[0]

      parCorp(game, 'p0', corp.sym, firstPar.price)

      expect(corp.parPrice).toBe(firstPar.price)
      expect(corp.ipoed).toBe(true)
    })

    // -- buy a share from IPO after par ------------------------------------
    it('buys a share from IPO', () => {
      const game = makeGame(titleId, playerCount)
      const pars = parPrices(game.stockMarket)

      if (pars.length === 0 || game.corporations.length === 0) {
        return
      }

      const corp = game.corporations[0]
      const firstPar = pars[0]

      parCorp(game, 'p0', corp.sym, firstPar.price)

      const ipoSharesBefore = corp.ipoShares

      // Some titles may have 0 IPO shares remaining after president cert
      if (ipoSharesBefore <= 0) {
        return
      }

      // Use second player if available, else first
      const buyerId = playerCount > 1 ? 'p1' : 'p0'

      applyAction(game, {
        type: 'BUY_SHARE',
        playerId: buyerId,
        corpSym: corp.sym,
        source: 'ipo',
      })

      expect(corp.ipoShares).toBeLessThan(ipoSharesBefore)
    })
  })
}
