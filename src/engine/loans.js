// Loans — generic loan system supporting multiple 18xx loan types.
//
// Loan types (set via title.loans.type):
//   '1817'        — Corp bank loans, global escalating interest, liquidation on default.
//   '1861'        — Corp bank loans, fixed interest, origination fee, nationalization penalty.
//   '1849'        — Corp bonds (variant), fixed interest, game-end shareholder penalty.
//   '1880_player' — Player loans, 50% compound interest per SDR.
//   '18rg_debt'   — Inter-corp debt tokens (Treaty of Boston), escalating market price.

import { moveLeft, moveRight } from './stockMarket.js'

// ─── Interest rate ──────────────────────────────────────────────────

// Current interest rate for 1817-style escalating loans.
export function currentInterestRate(state) {
  const config = state.title.loans || {}
  if (config.type !== '1817' && config.type !== undefined) return config.interestRate || 0

  const step = config.rateStep || 5        // % increase per tier
  const loansPerTier = config.loansPerTier || 5
  const baseRate = config.baseRate || 5
  const maxRate = config.maxRate || 70

  const totalLoans = totalLoansInGame(state)
  const tier = Math.floor(totalLoans / loansPerTier)
  return Math.min(baseRate + tier * step, maxRate)
}

// Total corp loans across all corps.
export function totalLoansInGame(state) {
  return state.corporations.reduce((sum, c) => sum + (c.loans || 0), 0)
}

// ─── Max loans ──────────────────────────────────────────────────────

export function maxLoansForCorp(corp, title) {
  const config = title.loans || {}
  if (config.maxLoansPerCorp != null) return config.maxLoansPerCorp

  // Per-type defaults
  if (config.maxByType) {
    const corpType = corp.type || 'major'
    if (config.maxByType[corpType] != null) return config.maxByType[corpType]
  }

  // Default: number of total shares (2-share corp = 2 loans, 10-share = 10)
  return corp.totalShares || 10
}

// ─── Interest due ───────────────────────────────────────────────────

export function interestDue(state, corpSym) {
  const corp = state.corporations.find(c => c.sym === corpSym)
  if (!corp || !corp.loans) return 0

  const config = state.title.loans || {}

  if (config.type === '1861') {
    // Fixed interest per loan per OR
    return corp.loans * (config.interestPerLoan || 5)
  }

  if (config.type === '1849') {
    // Fixed interest per bond per OR
    return corp.loans * (config.interestPerLoan || 50)
  }

  // 1817 default: rate-based
  const rate = currentInterestRate(state)
  const loanValue = config.loanValue || 100
  return Math.floor((rate * corp.loans * loanValue) / 100)
}

// ─── Player loan interest (1880) ────────────────────────────────────

export function playerInterestDue(player, title) {
  const config = title.loans || {}
  if (config.type !== '1880_player') return 0
  const debt = player.debt || 0
  if (debt <= 0) return 0
  const rate = config.compoundRate || 50 // 50% compound
  return Math.floor(debt * rate / 100)
}

// Compound interest on player debt (called at SDR start)
export function compoundPlayerInterest(player, title) {
  const interest = playerInterestDue(player, title)
  if (interest > 0) {
    player.debt = (player.debt || 0) + interest
  }
  return interest
}

// ─── Take loan ──────────────────────────────────────────────────────

export function takeLoan(state, corpSym) {
  const corp = state.corporations.find(c => c.sym === corpSym)
  if (!corp) return false

  const config = state.title.loans || {}
  const loanValue = config.loanValue || 100
  const max = maxLoansForCorp(corp, state.title)

  if ((corp.loans || 0) >= max) return false

  corp.loans = (corp.loans || 0) + 1

  if (config.type === '1861') {
    // Origination fee: corp receives less than face value
    const fee = config.originationFee || 5
    corp.cash += loanValue - fee
    state.bank.cash -= loanValue
    // No price movement on take/repay in 1861/1867
  } else if (config.type === '1849') {
    // Bond: full face value
    corp.cash += loanValue
    state.bank.cash -= loanValue
    // No price movement
  } else {
    // 1817 / 18USA
    corp.cash += loanValue
    state.bank.cash -= loanValue
    const takeSteps = config.takeSteps || 1
    moveLeft(state.stockMarket, corpSym, takeSteps)
  }
  return true
}

// ─── Repay loan ─────────────────────────────────────────────────────

export function repayLoan(state, corpSym) {
  const corp = state.corporations.find(c => c.sym === corpSym)
  if (!corp || !corp.loans || corp.loans <= 0) return false

  const config = state.title.loans || {}
  const loanValue = config.loanValue || 100

  if (corp.cash < loanValue) return false

  corp.loans -= 1
  corp.cash -= loanValue
  state.bank.cash += loanValue

  if (config.type === '1861' || config.type === '1849') {
    // No price movement
  } else {
    // 1817 / 18USA: price moves right
    const repaySteps = config.repaySteps || 1
    moveRight(state.stockMarket, corpSym, repaySteps)
  }
  return true
}

// ─── Pay interest ───────────────────────────────────────────────────

export function payInterest(state, corpSym) {
  const corp = state.corporations.find(c => c.sym === corpSym)
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

// ─── Player loan take (1880, 1822, 18MS, 18Rhl) ────────────────────

export function takePlayerLoan(state, playerId, amount) {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return false

  const config = state.title.loans || {}

  // 1822-style: immediate interest (e.g. 50% → loan = 150% of shortfall)
  const immediateRate = config.immediateInterest || 0
  const totalDebt = immediateRate > 0
    ? amount + Math.ceil(amount * immediateRate / 100)
    : amount

  player.debt = (player.debt || 0) + totalDebt
  player.cash += amount  // Player only receives the original shortfall amount
  state.bank.cash -= amount
  return true
}

// Repay player loan — player pays what they can
export function repayPlayerLoan(state, playerId, amount) {
  const player = state.players.find(p => p.id === playerId)
  if (!player || !player.debt || player.debt <= 0) return false

  const payment = Math.min(amount, player.debt, player.cash)
  if (payment <= 0) return false

  player.debt -= payment
  player.cash -= payment
  state.bank.cash += payment
  return true
}

// Auto-repay: player pays off debt whenever they receive money (18MS)
export function autoRepayPlayerDebt(state, playerId) {
  const config = state.title.loans || {}
  if (!config.autoRepay) return 0

  const player = state.players.find(p => p.id === playerId)
  if (!player || !player.debt || player.debt <= 0 || player.cash <= 0) return 0

  const payment = Math.min(player.debt, player.cash)
  player.debt -= payment
  player.cash -= payment
  state.bank.cash += payment
  return payment
}

// Check if player is blocked from spending (18MS, 1822)
export function playerDebtBlocksSpending(title, player) {
  const config = title.loans || {}
  return config.debtBlocksSpending && (player.debt || 0) > 0
}

// Game-end debt value (accounts for endgameMultiplier like 18Rhl 2x)
export function playerDebtEndgameValue(title, player) {
  const config = title.loans || {}
  const debt = player.debt || 0
  if (debt <= 0) return 0
  const multiplier = config.endgameMultiplier || 1
  return debt * multiplier
}

// ─── Debt token payment (18RoyalGorge) ──────────────────────────────

export function payDebtToken(state, corpSym) {
  const corp = state.corporations.find(c => c.sym === corpSym)
  if (!corp || !corp.debtTokens || corp.debtTokens <= 0) return false

  const config = state.title.loans || {}
  const debtPrice = state.debtMarketPrice || config.debtStartPrice || 50

  if (corp.cash < debtPrice) return false

  corp.debtTokens -= 1
  corp.cash -= debtPrice

  // Find creditor and pay them
  const debtConfig = (config.debts || []).find(d => d.debtor === corpSym)
  if (debtConfig) {
    if (debtConfig.creditorType === 'corp') {
      const creditor = state.corporations.find(c => c.sym === debtConfig.creditor)
      if (creditor) creditor.cash += debtPrice
    } else if (debtConfig.creditorType === 'private') {
      // Pay to owner of the private (e.g., Doc Holliday)
      const company = (state.companies || []).find(c => c.sym === debtConfig.creditor)
      if (company && company.owner) {
        const owner = state.players.find(p => p.id === company.owner)
        if (owner) owner.cash += debtPrice
        else state.bank.cash += debtPrice
      } else {
        state.bank.cash += debtPrice
      }
    } else {
      state.bank.cash += debtPrice
    }
  } else {
    state.bank.cash += debtPrice
  }

  return true
}

// Advance debt market price (called at end of each OR)
export function advanceDebtPrice(state) {
  const config = state.title.loans || {}
  if (config.type !== '18rg_debt') return
  const step = config.debtPriceStep || 10
  state.debtMarketPrice = (state.debtMarketPrice || config.debtStartPrice || 50) + step
}

// Game-end penalty for unpaid debt (18RoyalGorge)
export function debtEndgamePenalty(corp, config) {
  if (!config || config.type !== '18rg_debt') return 0
  const remaining = corp.debtTokens || 0
  if (remaining <= 0) return 0
  const penalties = (config.debts || []).find(d => d.debtor === corp.sym)
  if (!penalties || !penalties.endgamePenalty) return 0
  return penalties.endgamePenalty[remaining] || 0
}

// Game-end penalty for 1861/1867 loans (price moves left N per loan)
export function loanNationalizationPenalty(corp, config) {
  if (!config || config.type !== '1861') return 0
  const loans = corp.loans || 0
  if (loans <= 0) return 0
  return loans * (config.endgameLeftPerLoan || 1)
}

// Game-end penalty for 1849 bonds (per share owned in bonded corp)
export function bondShareholderPenalty(corp, config) {
  if (!config || config.type !== '1849') return 0
  if (!corp.loans || corp.loans <= 0) return 0
  return config.endgamePenaltyPerShare || 100
}
