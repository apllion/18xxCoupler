// Lightweight game data hook — shared between mobile and other views.
// No keyboard/panel/cursor state. Just game data + dispatch.

import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore.js'
// uiStore not needed — driver view overrides myPlayerId with driverPlayerId
import { useDispatch } from './useDispatch.js'
import { corpPrice } from '../engine/stockMarket.js'
import { currentPhase, trainLimit } from '../engine/phase.js'
import { playerSharePercent, playerCertCount, isPresident } from '../engine/player.js'
import { formatCurrency } from '../utils/currency.js'

export function useGameData() {
  const game = useGameStore((s) => s.game)
  const dispatch = useDispatch()

  const fmt = game ? (n) => formatCurrency(n, game.title.currencyFormat) : (n) => String(n)
  const phase = game ? currentPhase(game.phaseManager) : null
  const limit = game ? trainLimit(game.phaseManager) : 0

  const corps = useMemo(() => {
    if (!game) return []
    return game.corporations
      .filter(c => c.ipoed || c.floated)
      .map(c => ({ ...c, price: corpPrice(game.stockMarket, c.sym) || 0 }))
      .sort((a, b) => {
        const ar = game.stockMarket.corpPositions[a.sym]?.row ?? 99
        const br = game.stockMarket.corpPositions[b.sym]?.row ?? 99
        const ac = game.stockMarket.corpPositions[a.sym]?.col ?? -1
        const bc = game.stockMarket.corpPositions[b.sym]?.col ?? -1
        if (ar !== br) return ar - br
        if (ac !== bc) return bc - ac
        return (game.stockMarket.corpPositions[a.sym]?.order ?? 0) - (game.stockMarket.corpPositions[b.sym]?.order ?? 0)
      })
  }, [game?.corporations, game?.stockMarket])

  const rt = game?.roundTracker
  const isSR = rt?.roundType === 'SR'
  const isOR = rt?.roundType === 'OR'

  const certLimit = game ? (typeof game.certLimit === 'number' ? game.certLimit : game.certLimit) : 99

  return {
    game, fmt, phase, limit, corps, dispatch,
    myPlayerId: null, me: null,
    isSR, isOR, rt,
    certLimit,
    // Re-export utilities for convenience
    playerSharePercent, playerCertCount, isPresident, corpPrice,
  }
}
