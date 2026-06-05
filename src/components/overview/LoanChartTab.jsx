// LoanChartTab — loan interest rate chart for 1817/18USA.
// Shows current rate, tier progression, per-corp loan counts.

import { useGameStore } from '../../store/gameStore.js'
import { formatCurrency } from '../../utils/currency.js'
import { totalLoansInGame, currentInterestRate, interestDue } from '../../engine/loans.js'

export default function LoanChartTab() {
  const game = useGameStore((s) => s.game)

  if (!game || !game.title.loans) return null

  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const loans = game.title.loans
  const loanValue = loans.loanValue || 100
  const baseRate = loans.baseRate || 5
  const rateStep = loans.rateStep || 5
  const loansPerTier = loans.loansPerTier || 5
  const maxRate = loans.maxRate || 70

  const totalLoans = totalLoansInGame(game)
  const currentRate = currentInterestRate(game)

  // Build tier chart
  const tiers = []
  for (let rate = baseRate; rate <= maxRate; rate += rateStep) {
    const tierStart = ((rate - baseRate) / rateStep) * loansPerTier + 1
    const tierEnd = tierStart + loansPerTier - 1
    const isCurrent = currentRate === rate
    tiers.push({ rate, tierStart, tierEnd, isCurrent })
  }

  // Per-corp loans
  const corpLoans = game.corporations
    .filter(c => c.floated && (c.loans || 0) > 0)
    .map(c => ({
      sym: c.sym, color: c.color, loans: c.loans || 0,
      interest: interestDue(game, c.sym),
      debt: (c.loans || 0) * loanValue,
    }))
    .sort((a, b) => b.loans - a.loans)

  return (
    <div className='text-sm p-3 space-y-4 overflow-y-auto bg-broker-bg h-full'>
      <h2 className="text-broker-text font-bold text-lg">
        Loan Chart
      </h2>

      {/* Current status */}
      <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="text-broker-text-muted text-[10px]">Current Rate</div>
            <div className={`text-2xl font-bold ${currentRate >= maxRate * 0.7 ? 'text-red-400' : 'text-broker-text'}`}>{currentRate}%</div>
          </div>
          <div>
            <div className="text-broker-text-muted text-[10px]">Total Loans</div>
            <div className={`text-2xl font-bold text-broker-text`}>{totalLoans}</div>
          </div>
          <div>
            <div className="text-broker-text-muted text-[10px]">Loan Value</div>
            <div className={`text-lg font-bold text-broker-text`}>{fmt(loanValue)}</div>
          </div>
        </div>
      </div>

      {/* Interest rate tiers */}
      <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
        <div className="text-broker-text font-medium mb-2">Interest Rate Tiers</div>
        <div className="space-y-1">
          {tiers.map(t => {
            const fillPct = totalLoans >= t.tierEnd ? 100
              : totalLoans >= t.tierStart ? Math.round(((totalLoans - t.tierStart + 1) / loansPerTier) * 100)
              : 0
            return (
              <div key={t.rate} className="flex items-center gap-2">
                <span className={`w-10 text-right font-bold ${t.isCurrent ? 'text-red-400' : 'text-broker-text-muted'}`}>
                  {t.rate}%
                </span>
                <div className={`flex-1 h-4 rounded bg-broker-surface-hover`}>
                  <div className={`h-4 rounded ${t.isCurrent ? 'bg-red-500' : fillPct > 0 ? 'bg-amber-600' : ''}`}
                    style={{ width: fillPct + '%' }} />
                </div>
                <span className={`w-12 text-right text-xs text-broker-text-muted`}>
                  {t.tierStart}-{t.tierEnd}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-corp breakdown */}
      {corpLoans.length > 0 && (
        <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
          <div className="text-broker-text font-medium mb-2">Corp Loans</div>
          <div className="space-y-1">
            {corpLoans.map(c => (
              <div key={c.sym} className="flex items-center gap-2">
                <span style={{ color: c.color }} className="font-bold w-10">{c.sym}</span>
                <span className="text-broker-text w-6 text-right">{c.loans}</span>
                <span className="text-broker-text-muted">= {fmt(c.debt)} debt</span>
                <span className="text-red-400 ml-auto">int: {fmt(c.interest)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {corpLoans.length === 0 && (
        <div className="text-broker-text-muted">No loans taken yet</div>
      )}
    </div>
  )
}
