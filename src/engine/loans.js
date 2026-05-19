// Loans — generic loan system for corps (1817, 1867, etc.)
// Tracks loans per corp, global interest rate, take/repay actions.

import { moveLeft, moveRight } from './stockMarket.js'

// Calculate current interest rate based on total loans in the game.
// 1817: 5% base, +5% per 5 loans taken globally, max 50%.
export function currentInterestRate(state) {
  const config = state.title.loans || {}
  const step = config.rateStep || 5        // % increase per tier
  const loansPerTier = config.loansPerTier || 5
  const baseRate = config.baseRate || 5
  const maxRate = config.maxRate || 70

  const totalLoans = totalLoansInGame(state)
  const tier = Math.floor(totalLoans / loansPerTier)
  return Math.min(baseRate + tier * step, maxRate)
}

// Total loans across all corps.
export function totalLoansInGame(state) {
  return state.corporations.reduce((sum, c) => sum + (c.loans || 0), 0)
}

// Max loans a corp can take (based on its share size).
export function maxLoansForCorp(corp, title) {
  const config = title.loans || {}
  if (config.maxLoansPerCorp != null) return config.maxLoansPerCorp
  // Default: number of total shares (2-share corp = 2 loans, 10-share = 10)
  return corp.totalShares || 10
}

// Interest due for a single corp this OR.
export function interestDue(state, corpSym) {
  const corp = state.corporations.find((c) => c.sym === corpSym)
  if (!corp || !corp.loans) return 0

  const rate = currentInterestRate(state)
  const loanValue = state.title.loans?.loanValue || 100
  return Math.floor((rate * corp.loans * loanValue) / 100)
}

// Take a loan: corp gets cash, price moves left.
export function takeLoan(state, corpSym) {
  const corp = state.corporations.find((c) => c.sym === corpSym)
  if (!corp) return false

  const config = state.title.loans || {}
  const loanValue = config.loanValue || 100
  const max = maxLoansForCorp(corp, state.title)

  if ((corp.loans || 0) >= max) return false

  corp.loans = (corp.loans || 0) + 1
  corp.cash += loanValue
  state.bank.cash -= loanValue

  // Price moves left
  moveLeft(state.stockMarket, corpSym, 1)
  return true
}

// Repay a loan: corp pays cash, price moves right.
export function repayLoan(state, corpSym) {
  const corp = state.corporations.find((c) => c.sym === corpSym)
  if (!corp || !corp.loans || corp.loans <= 0) return false

  const config = state.title.loans || {}
  const loanValue = config.loanValue || 100

  if (corp.cash < loanValue) return false

  corp.loans -= 1
  corp.cash -= loanValue
  state.bank.cash += loanValue

  // Price moves right
  moveRight(state.stockMarket, corpSym, 1)
  return true
}

// Pay interest for a corp. Returns amount paid, or negative if can't pay (triggers liquidation).
export function payInterest(state, corpSym) {
  const corp = state.corporations.find((c) => c.sym === corpSym)
  if (!corp || !corp.loans) return 0

  const due = interestDue(state, corpSym)
  if (due <= 0) return 0

  if (corp.cash >= due) {
    corp.cash -= due
    state.bank.cash += due
    return due
  }

  // Can't pay — return deficit (negative means liquidation/cash crisis)
  const deficit = due - corp.cash
  state.bank.cash += corp.cash
  corp.cash = 0
  return -deficit
}
