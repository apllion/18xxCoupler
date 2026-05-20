// actionBarBuilder — determines which actions to show based on context.
// Returns a list of action descriptors for the bottom bar.

import { playerSharePercent } from '../../engine/player.js'

// Action definitions with context rules
const ACTIONS = [
  // Share actions — SR context
  { id: 'pass', label: 'Pass', mLabel: 'Pa[ss]', key: 'Enter', round: 'sr', always: true },
  { id: 'buy', label: 'Buy', mLabel: '[B]uy', key: 'b', round: 'sr', always: true },
  { id: 'sell', label: 'Sell', mLabel: '[S]ell', key: 's', round: 'sr', always: true },
  { id: 'par', label: 'Par', mLabel: '[N]ew', key: 'n', round: 'sr', gate: (g) => g.corporations.some(c => !c.ipoed && !c.floated) },
  { id: 'short', label: 'Short', mLabel: 'Sh[o]rt', key: 'o', round: 'sr', gate: (g) => !!g.title.shorts },
  { id: 'closeshort', label: 'Close Short', mLabel: 'Cl[j]', key: 'j', round: 'sr', gate: (g) => !!g.title.shorts },

  // Private actions — context-dependent
  { id: 'buyprivate', label: 'Priv Buy', mLabel: '[P]riv', key: 'p', round: 'any',
    gate: (g, rt) => {
      const hasPrivs = (g.companies || []).some(c => !c.ownerId && !c.closed)
      if (!hasPrivs) return false
      // 1822 family: can buy during SR throughout the game
      if (g.title.merger?.type === '1822_acquire') return true
      // Others: only during pregame/setup
      return !!rt?.inPregame
    }
  },
  { id: 'sellprivate', label: 'Priv Sell', mLabel: 'Sel[v]', key: 'v', round: 'or',
    gate: (g, rt, player) => {
      if (!player) return false
      return (g.companies || []).some(c => c.ownerType === 'player' && c.ownerId === player.id && !c.closed && c.canSellToCorp !== false)
    }
  },

  // Corp OR actions
  { id: 'revenue', label: 'Revenue', mLabel: '[R]ev', key: 'r', round: 'or', always: true },
  { id: 'train', label: 'Train', mLabel: '[T]rain', key: 't', round: 'or', always: true },
  { id: 'token', label: 'Token', mLabel: 'To[k]en', key: 'k', round: 'or', always: true,
    gate: (g, rt, player, corp) => corp?.floated && corp?.tokensPlaced < corp?.tokens?.length
  },
  { id: 'issue', label: 'Issue', mLabel: '[I]ssue', key: 'i', round: 'or',
    gate: (g, rt, player, corp) => g.title.capitalization === 'incremental' && corp?.ipoShares > 0
  },
  { id: 'redeem', label: 'Redeem', mLabel: 'Re[d]eem', key: 'q', round: 'or',
    gate: (g, rt, player, corp) => g.title.capitalization === 'incremental' && corp?.marketShares > 0
  },
  { id: 'loan', label: 'Loan', mLabel: '[L]oan', key: 'l', round: 'or', gate: (g) => !!g.title.loans },
  { id: 'interest', label: 'Interest', mLabel: 'Int', round: 'or', gate: (g) => !!g.title.loans },
  { id: 'corpshare', label: 'Corp Trade', mLabel: '[G]corp', key: 'g', round: 'or', gate: (g) => !!g.title.corpCanBuyShares },
  { id: 'execcar', label: 'Exec Car', mLabel: 'ExCar', round: 'or', gate: (g) => !!g.title.executiveCars },
  { id: 'export', label: 'Export', mLabel: 'Export', round: 'or', gate: (g) => !!g.title.trainExport },
  { id: 'discard', label: 'Discard', mLabel: 'Discard', round: 'or', always: true },

  // Concessions — 1822 family
  { id: 'concession', label: 'Concession', mLabel: 'Conc', round: 'sr',
    gate: (g, rt, player) => {
      if (!player) return false
      return (g.companies || []).some(c => c.ownerType === 'player' && c.ownerId === player.id && !c.closed && c.sym.startsWith('C'))
    }
  },

  // Merger actions — title and round specific
  { id: 'merge', label: 'Merge', mLabel: 'Merge', round: 'any', gate: (g) => !!g.title.merger },

  // Round management — always
  { id: 'advance', label: 'Advance', mLabel: '[A]dv', key: 'a', round: 'any', always: true, category: 'round' },
  { id: 'collect', label: 'Collect', mLabel: '[C]oll', key: 'c', round: 'any', always: true, category: 'round' },
  { id: 'soldout', label: 'Sold-out', mLabel: 'S[o]ld', round: 'any', always: true, category: 'round' },
  // Undo is in the title bar, not the action bar
  // Replay is in Settings, not the action bar
]

export function getContextActions(game, selPlayer, selCorp, superUmpire) {
  if (!game) return []

  const rt = game.roundTracker
  const isSR = rt?.type === 'stock' && !rt?.inPregame
  const isOR = rt?.type === 'operating' && !rt?.inPregame
  const currentRound = isSR ? 'sr' : isOR ? 'or' : 'any'

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
