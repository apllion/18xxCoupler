// Reminders — check game state for things the umpire might forget.
// Pure functions, no side effects. Called on round transitions.

import { playerCertCount } from './player.js'
import { interestDue, totalLoansInGame, playerInterestDue } from './loans.js'

export function checkReminders(state, fromRound, toRound, enabled) {
  const reminders = []
  const title = state.title || {}

  // ── Leaving SR ────────────────────────────────────────────────────

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

    // Player debt compound interest (1880, 18MS, 1822)
    if (enabled.playerDebt) {
      const config = title.loans || {}
      if (config.type === '1880_player' && config.compoundRate > 0) {
        const inDebt = state.players.filter(p => (p.debt || 0) > 0)
        if (inDebt.length > 0) {
          reminders.push({
            id: 'playerDebt',
            message: `Player debt compounds: ${inDebt.map(p => `${p.name} (+${Math.floor((p.debt || 0) * (config.compoundRate || 50) / 100)})`).join(', ')}`,
            severity: 'warning',
            action: { type: 'COMPOUND_PLAYER_INTEREST', label: 'Compound' },
          })
        }
      }
    }
  }

  // ── Entering OR ───────────────────────────────────────────────────

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
          message: `No trains: ${trainless.map(c => c.sym).join(', ')} — must buy a train`,
          severity: 'warning',
        })
      }
    }

    // Corp loan interest due (1817, 1861, 1849)
    if (enabled.loanInterest && title.loans && title.loans.type !== '1880_player' && title.loans.type !== '18rg_debt') {
      const corpsWithInterest = state.corporations
        .filter(c => c.floated && (c.loans || 0) > 0)
        .map(c => ({ sym: c.sym, due: interestDue(state, c.sym) }))
        .filter(c => c.due > 0)
      if (corpsWithInterest.length > 0) {
        reminders.push({
          id: 'loanInterest',
          message: `Loan interest due: ${corpsWithInterest.map(c => `${c.sym} (${c.due})`).join(', ')}`,
          severity: 'warning',
        })
      }
    }

    // Debt token price advance (18RoyalGorge)
    if (enabled.debtAdvance && title.loans?.type === '18rg_debt') {
      const debtPrice = state.debtMarketPrice || title.loans.debtStartPrice || 50
      const corpsWithDebt = state.corporations.filter(c => (c.debtTokens || 0) > 0)
      if (corpsWithDebt.length > 0) {
        reminders.push({
          id: 'debtAdvance',
          message: `Debt price advances at end of OR (currently ${debtPrice})`,
          severity: 'info',
          action: { type: 'ADVANCE_DEBT_PRICE', label: 'Advance' },
        })
      }
    }

    // Train export (1817)
    if (enabled.trainExport && title.trainExport) {
      reminders.push({
        id: 'trainExport',
        message: 'If no train bought this OR, next available train is removed',
        severity: 'info',
      })
    }
  }

  // ── Leaving OR ────────────────────────────────────────────────────

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

  // ── Any round change ──────────────────────────────────────────────

  if (enabled.bankLow) {
    const startingBank = typeof title.bankCash === 'number' ? title.bankCash : 12000
    if (state.bank.cash > 0 && state.bank.cash < startingBank * 0.2) {
      reminders.push({
        id: 'bankLow',
        message: `Bank low: ${state.bank.cash}`,
        severity: 'warning',
      })
    }
  }

  // Game end conditions — title-configurable
  if (enabled.gameEnd) {
    // Bank broken
    if (state.bank.cash <= 0 && typeof title.bankCash === 'number') {
      const check = title.gameEndCheck?.bank || 'current_or'
      const msg = check === 'immediate' ? 'Bank broken — game ends immediately'
        : check === 'current_or' ? 'Bank broken — game ends after this OR'
        : 'Bank broken — game ends after this OR set'
      reminders.push({ id: 'gameEnd', message: msg, severity: 'critical' })
    }

    // Fixed round game end
    if (title.fixedRounds && state.roundNumber >= title.fixedRounds) {
      reminders.push({ id: 'gameEnd', message: 'Final round reached', severity: 'critical' })
    }

    // Stock ceiling (22Mars)
    if (title.gameEndCheck?.stockCeiling) {
      const atCeiling = state.corporations.filter(c => {
        const pos = state.stockMarket?.corpPositions?.[c.sym]
        if (!pos) return false
        const row = state.stockMarket.grid[pos.row]
        return row && pos.col >= row.length - 1
      })
      if (atCeiling.length > 0) {
        reminders.push({
          id: 'gameEnd',
          message: `Stock ceiling reached: ${atCeiling.map(c => c.sym).join(', ')} — game may end`,
          severity: 'critical',
        })
      }
    }
  }

  // Emergency train buy warning
  if (enabled.emergencyBuy) {
    const trainless = state.corporations.filter(c => c.floated && c.trains.length === 0 && c.operated)
    if (trainless.length > 0) {
      const rule = title.emergencyBuy || 'president_pays'
      const ruleDesc = {
        'president_pays': 'president must pay',
        'president_sells_then_pays': 'president sells shares then pays',
        'loans': 'take loan if cannot afford',
        'bankruptcy': 'bankruptcy if cannot afford',
        'none': 'no forced purchase',
      }[rule] || rule
      reminders.push({
        id: 'emergencyBuy',
        message: `Emergency train: ${trainless.map(c => c.sym).join(', ')} — ${ruleDesc}`,
        severity: 'warning',
      })
    }
  }

  // Half pay reminder (titles that support it)
  if (enabled.halfPay && title.halfPay && toRound === 'OR') {
    reminders.push({
      id: 'halfPay',
      message: 'Half pay available this title',
      severity: 'info',
    })
  }

  return reminders
}

export const REMINDER_DEFS = [
  // Stock round
  { key: 'soldOut', label: 'Sold-out corps (leaving SR)', defaultOn: true },
  { key: 'certLimit', label: 'Certificate limit exceeded (leaving SR)', defaultOn: true },
  { key: 'playerDebt', label: 'Player debt compounds (leaving SR)', defaultOn: true },

  // Operating round
  { key: 'collectPrivates', label: 'Collect private revenues (entering OR)', defaultOn: true },
  { key: 'noTrains', label: 'Trainless corps must buy (entering OR)', defaultOn: true },
  { key: 'emergencyBuy', label: 'Emergency train buy rule (entering OR)', defaultOn: false },
  { key: 'loanInterest', label: 'Loan interest due (entering OR)', defaultOn: true },
  { key: 'debtAdvance', label: 'Debt price advances (entering OR)', defaultOn: true },
  { key: 'trainExport', label: 'Train export if none bought (entering OR)', defaultOn: true },
  { key: 'corpNotOperated', label: 'Corps did not operate (leaving OR)', defaultOn: true },
  { key: 'halfPay', label: 'Half pay available (entering OR)', defaultOn: false },

  // Any round
  { key: 'bankLow', label: 'Bank running low (<20%)', defaultOn: true },
  { key: 'gameEnd', label: 'Game end conditions', defaultOn: true },
]
