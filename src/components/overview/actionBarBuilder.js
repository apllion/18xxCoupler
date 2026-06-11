// actionBarBuilder — determines which actions to show based on context.
// Returns a list of action descriptors for the bottom bar.

import { playerSharePercent } from '../../engine/player.js'

// Action definitions with context rules
const ACTIONS = [
  // Share actions — SR context
  { id: 'priority', label: 'Priority', round: 'sr', always: true },
  { id: 'buy', label: 'Buy', key: 'b', round: 'sr', always: true },
  { id: 'sell', label: 'Sell', key: 's', round: 'sr', always: true },
  { id: 'par', label: 'Par', key: 'n', round: 'sr', gate: (g) => g.corporations.some(c => !c.ipoed && !c.floated) },
  { id: 'president', label: 'President', round: 'any', always: true,
    gate: (g, rt, player, corp) => {
      if (!player || !corp || !corp.ipoed) return false
      const certs = player.shares.filter(s => s.corpSym === corp.sym && !s.isPresident)
      const isPres = player.shares.some(s => s.corpSym === corp.sym && s.isPresident)
      if (isPres || certs.length === 0) return false
      // Need enough regular certs to exchange for president cert
      const presPercent = g.title.shares?.[0] ?? 20
      const shareSize = g.title.shares?.[1] ?? 10
      const certsNeeded = Math.floor(presPercent / shareSize)
      return certs.length >= certsNeeded
    }
  },
  { id: 'short', label: 'Short', key: 'o', round: 'sr', gate: (g) => !!g.title.shorts },
  { id: 'closeshort', label: 'Close Short', key: 'j', round: 'sr', gate: (g) => !!g.title.shorts },

  // Private actions — context-dependent
  { id: 'buyprivate', label: 'Priv Buy', key: 'p', round: 'any',
    gate: (g, rt) => {
      if (!(g.companies || []).some(c => !c.ownerId && !c.closed)) return false
      // If title uses draft pregame, only show during Pregame
      if (g.title.pregame?.some(s => s.type === 'draft') && rt?.roundType !== 'Pregame') return false
      return true
    }
  },
  { id: 'sellprivate', label: 'Priv Sell', key: 'v', round: 'or',
    gate: (g, rt, player) => {
      if (!player) return false
      return (g.companies || []).some(c => c.ownerType === 'player' && c.ownerId === player.id && !c.closed && c.canSellToCorp !== false)
    }
  },

  // Corp OR actions
  { id: 'revenue', label: 'Revenue', key: 'r', round: 'or', always: true },
  { id: 'train', label: 'Train', key: 't', round: 'or', always: true },
  { id: 'token', label: 'Token', key: 'k', round: 'or', always: true,
    gate: (g, rt, player, corp) => corp?.floated && corp?.tokensPlaced < corp?.tokens?.length
  },
  { id: 'issue', label: 'Issue', key: 'i', round: 'or',
    gate: (g, rt, player, corp) => g.title.capitalization === 'incremental' && corp?.ipoShares > 0
  },
  { id: 'redeem', label: 'Redeem', key: 'q', round: 'or',
    gate: (g, rt, player, corp) => g.title.capitalization === 'incremental' && corp?.marketShares > 0
  },
  { id: 'loan', label: 'Loan', key: 'l', round: 'or', gate: (g) => !!g.title.loans },
  { id: 'interest', label: 'Interest', round: 'or', gate: (g) => !!g.title.loans },
  { id: 'corpshare', label: 'Corp Trade', key: 'g', round: 'or', gate: (g) => !!g.title.corpCanBuyShares },
  { id: 'execcar', label: 'Exec Car', round: 'or', gate: (g) => !!g.title.executiveCars },
  { id: 'export', label: 'Export', round: 'or', gate: (g) => !!g.title.trainExport },
  { id: 'discard', label: 'Discard', round: 'or',
    gate: (g, rt, player, corp) => corp?.floated && corp?.trains?.length > 0
  },
  { id: 'removetoken', label: 'Rm Token', round: 'or',
    gate: (g, rt, player, corp) => corp?.floated && corp?.tokensPlaced > 0
  },

  // Pay to bank — auctions, fees, any cash-to-bank transfer
  { id: 'paybank', label: 'Pay', round: 'any', always: true },
  // Strategy cards — PTG
  { id: 'takecard', label: 'Card', round: 'any', gate: (g) => !!g.title.strategyCards },

  // Concessions — 1822 family
  { id: 'concession', label: 'Concession', round: 'sr',
    gate: (g, rt, player) => {
      if (!player) return false
      return (g.companies || []).some(c => c.ownerType === 'player' && c.ownerId === player.id && !c.closed && c.sym.startsWith('C'))
    }
  },

  // Merger actions — title and round specific
  { id: 'merge', label: 'Merge', round: 'any', gate: (g) => !!g.title.merger },

  // Round management — always
  { id: 'collect', label: 'Collect', key: 'c', round: 'any', always: true, category: 'round' },
  { id: 'soldout', label: 'Sold-out', round: 'any', always: true, category: 'round' },
  // Undo is in the title bar, not the action bar
  // Replay is in Settings, not the action bar
]

export function getContextActions(game, selPlayer, selCorp, superUmpire) {
  if (!game) return []

  const rt = game.roundTracker
  const roundType = rt?.roundType || 'SR'
  const ROUND_GATE = { SR: 'sr', OR: 'or', CR: 'or' }
  const currentRound = ROUND_GATE[roundType] || 'any'
  const isOR = currentRound === 'or'

  return ACTIONS.filter(action => {
    // Super-umpire: show everything
    if (superUmpire) return true

    // Check round context
    if (action.round !== 'any' && action.round !== currentRound) {
      // SR actions also show during 'any' (pregame)
      if (!(action.round === 'sr' && !isOR)) return false
    }

    // Check title/state gate
    if (action.gate && !action.gate(game, rt, selPlayer, selCorp)) return false

    return true
  })
}

// Group actions for display
export function groupActions(actions) {
  const main = actions.filter(a => a.category !== 'round')
  const round = actions.filter(a => a.category === 'round')
  return { main, round }
}
