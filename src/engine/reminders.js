// Reminders — check game state for things the umpire might forget.
// Pure functions, no side effects. Called on round transitions.

import { playerCertCount } from './player.js'

export function checkReminders(state, fromRound, toRound, enabled) {
  const reminders = []

  // Leaving SR
  if (fromRound === 'SR' && toRound !== 'SR') {
    if (enabled.soldOut) {
      const log = state.actionLog || []
      const lastSR = log.findLastIndex(e => e.action.type === 'SET_ROUND' && (e.action.roundType === 'SR' || e.action.roundType === 'stock'))
      const alreadyAdjusted = log.slice(lastSR + 1).some(e => e.action.type === 'SOLD_OUT_ADJUST')
      if (!alreadyAdjusted) {
        const soldOut = state.corporations.filter(c => c.ipoed && c.ipoShares === 0 && c.marketShares === 0)
        if (soldOut.length > 0) {
          reminders.push({
            id: 'soldOut',
            message: `Sold out: ${soldOut.map(c => c.sym).join(', ')}`,
            severity: 'warning',
            action: { type: 'SOLD_OUT_ADJUST', label: 'Adjust' },
          })
        }
      }
    }

    if (enabled.certLimit) {
      const certLimit = typeof state.certLimit === 'number' ? state.certLimit : 99
      const over = state.players.filter(p => playerCertCount(p) > certLimit)
      if (over.length > 0) {
        reminders.push({
          id: 'certLimit',
          message: `Over cert limit: ${over.map(p => `${p.name} (${playerCertCount(p)}/${certLimit})`).join(', ')}`,
          severity: 'warning',
        })
      }
    }
  }

  // Entering OR
  if (toRound === 'OR') {
    if (enabled.collectPrivates) {
      const ownedPrivates = (state.companies || []).filter(c => c.ownerId && !c.closed)
      if (ownedPrivates.length > 0) {
        const log = state.actionLog || []
        const lastOR = log.findLastIndex(e => e.action.type === 'SET_ROUND' && e.action.roundType === 'OR')
        const alreadyCollected = log.slice(lastOR + 1).some(e => e.action.type === 'COLLECT_ALL_REVENUE')
        if (!alreadyCollected) {
          reminders.push({
            id: 'collectPrivates',
            message: 'Collect private revenues',
            severity: 'info',
            action: { type: 'COLLECT_ALL_REVENUE', label: 'Collect' },
          })
        }
      }
    }

    if (enabled.noTrains) {
      const trainless = state.corporations.filter(c => c.floated && c.trains.length === 0)
      if (trainless.length > 0) {
        reminders.push({
          id: 'noTrains',
          message: `No trains: ${trainless.map(c => c.sym).join(', ')}`,
          severity: 'warning',
        })
      }
    }
  }

  // Leaving OR
  if (fromRound === 'OR' && toRound !== 'OR') {
    if (enabled.corpNotOperated) {
      const notOperated = state.corporations.filter(c => c.floated && !c.operated)
      if (notOperated.length > 0) {
        reminders.push({
          id: 'corpNotOperated',
          message: `Did not operate: ${notOperated.map(c => c.sym).join(', ')}`,
          severity: 'warning',
        })
      }
    }
  }

  // Any round change
  if (enabled.bankLow) {
    const startingBank = typeof state.title.bankCash === 'number' ? state.title.bankCash : 12000
    if (state.bank.cash > 0 && state.bank.cash < startingBank * 0.2) {
      reminders.push({
        id: 'bankLow',
        message: `Bank low: ${state.bank.cash}`,
        severity: 'warning',
      })
    }
  }

  if (enabled.gameEnd && state.bank.cash <= 0) {
    reminders.push({
      id: 'gameEnd',
      message: 'Bank broken — game ends after this OR set',
      severity: 'critical',
    })
  }

  return reminders
}

export const REMINDER_DEFS = [
  { key: 'soldOut', label: 'Sold-out corps (leaving SR)', defaultOn: true },
  { key: 'collectPrivates', label: 'Collect private revenues (entering OR)', defaultOn: true },
  { key: 'certLimit', label: 'Certificate limit exceeded (leaving SR)', defaultOn: true },
  { key: 'bankLow', label: 'Bank running low (<20%)', defaultOn: true },
  { key: 'noTrains', label: 'Corps without trains (entering OR)', defaultOn: false },
  { key: 'gameEnd', label: 'Bank broken / game end', defaultOn: true },
  { key: 'corpNotOperated', label: 'Corps did not operate (leaving OR)', defaultOn: true },
]
