// LoanChartTab — loan/debt overview for all loan-bearing titles.
// Adapts display based on title.loans.type:
//   1817        — escalating interest rate tiers
//   1861        — fixed interest, origination fee, endgame penalty
//   1849        — bonds with fixed interest
//   1880_player — player debt with compound interest
//   18rg_debt   — inter-corp debt tokens with escalating price

import { useGameStore } from '../../store/gameStore.js'
import { formatCurrency } from '../../utils/currency.js'
import { totalLoansInGame, currentInterestRate, interestDue, playerInterestDue } from '../../engine/loans.js'

export default function LoanChartTab() {
  const game = useGameStore((s) => s.game)

  if (!game || !game.title.loans) return null

  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const config = game.title.loans
  const loanType = config.type || '1817'

  // 18RoyalGorge debt tokens
  if (loanType === '18rg_debt') return <DebtTokenChart game={game} fmt={fmt} config={config} />

  // 1880 player loans
  if (loanType === '1880_player') return <PlayerLoanChart game={game} fmt={fmt} config={config} />

  // Corp loans: 1817, 1861, 1849
  const loanValue = config.loanValue || 100
  const totalLoans = totalLoansInGame(game)
  const label = loanType === '1849' ? 'Bond' : 'Loan'

  // Per-corp breakdown
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
      <h2 className="text-broker-text font-bold text-lg">{label} Chart</h2>

      {/* Current status */}
      <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
        <div className="flex items-center gap-4 flex-wrap">
          {loanType === '1817' && (
            <div>
              <div className="text-broker-text-muted text-[10px]">Current Rate</div>
              <div className={`text-2xl font-bold ${currentInterestRate(game) >= (config.maxRate || 70) * 0.7 ? 'text-red-400' : 'text-broker-text'}`}>
                {currentInterestRate(game)}%
              </div>
            </div>
          )}
          {loanType === '1861' && (
            <div>
              <div className="text-broker-text-muted text-[10px]">Interest/Loan/OR</div>
              <div className="text-2xl font-bold text-broker-text">{fmt(config.interestPerLoan || 5)}</div>
            </div>
          )}
          {loanType === '1849' && (
            <div>
              <div className="text-broker-text-muted text-[10px]">Interest/Bond/OR</div>
              <div className="text-2xl font-bold text-broker-text">{fmt(config.interestPerLoan || 50)}</div>
            </div>
          )}
          <div>
            <div className="text-broker-text-muted text-[10px]">Total {label}s</div>
            <div className="text-2xl font-bold text-broker-text">{totalLoans}</div>
          </div>
          <div>
            <div className="text-broker-text-muted text-[10px]">{label} Value</div>
            <div className="text-lg font-bold text-broker-text">{fmt(loanValue)}</div>
          </div>
          {loanType === '1861' && (
            <div>
              <div className="text-broker-text-muted text-[10px]">Corp Receives</div>
              <div className="text-lg font-bold text-broker-text">{fmt(loanValue - (config.originationFee || 5))}</div>
            </div>
          )}
        </div>
      </div>

      {/* 1817: Interest rate tiers */}
      {loanType === '1817' && <InterestTierChart game={game} config={config} totalLoans={totalLoans} />}

      {/* 1861: Endgame penalty info */}
      {loanType === '1861' && config.endgameLeftPerLoan && totalLoans > 0 && (
        <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
          <div className="text-broker-text font-medium mb-1">Endgame Penalty</div>
          <div className="text-broker-text-muted text-xs">
            Price moves left {config.endgameLeftPerLoan} step{config.endgameLeftPerLoan > 1 ? 's' : ''} per outstanding loan before final scoring
          </div>
        </div>
      )}

      {/* 1849: Shareholder penalty info */}
      {loanType === '1849' && totalLoans > 0 && (
        <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
          <div className="text-broker-text font-medium mb-1">Endgame Penalty</div>
          <div className="text-broker-text-muted text-xs">
            {fmt(config.endgamePenaltyPerShare || 100)} deducted per share owned in bonded corp
          </div>
        </div>
      )}

      {/* Per-corp breakdown */}
      {corpLoans.length > 0 && (
        <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
          <div className="text-broker-text font-medium mb-2">Corp {label}s</div>
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
        <div className="text-broker-text-muted">No {label.toLowerCase()}s taken yet</div>
      )}
    </div>
  )
}

// 1817 escalating interest rate tiers
function InterestTierChart({ game, config, totalLoans }) {
  const baseRate = config.baseRate || 5
  const rateStep = config.rateStep || 5
  const loansPerTier = config.loansPerTier || 5
  const maxRate = config.maxRate || 70
  const currentRate = currentInterestRate(game)

  const tiers = []
  for (let rate = baseRate; rate <= maxRate; rate += rateStep) {
    const tierStart = ((rate - baseRate) / rateStep) * loansPerTier + 1
    const tierEnd = tierStart + loansPerTier - 1
    tiers.push({ rate, tierStart, tierEnd, isCurrent: currentRate === rate })
  }

  return (
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
              <div className="flex-1 h-4 rounded bg-broker-surface-hover">
                <div className={`h-4 rounded ${t.isCurrent ? 'bg-red-500' : fillPct > 0 ? 'bg-amber-600' : ''}`}
                  style={{ width: fillPct + '%' }} />
              </div>
              <span className="w-12 text-right text-xs text-broker-text-muted">
                {t.tierStart}-{t.tierEnd}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 18RoyalGorge debt tokens
function DebtTokenChart({ game, fmt, config }) {
  const debtPrice = game.debtMarketPrice || config.debtStartPrice || 50
  const debts = (config.debts || []).map(d => {
    const corp = game.corporations.find(c => c.sym === d.debtor)
    return { ...d, remaining: corp?.debtTokens || 0, color: corp?.color }
  }).filter(d => d.remaining > 0 || d.tokens > 0)

  return (
    <div className='text-sm p-3 space-y-4 overflow-y-auto bg-broker-bg h-full'>
      <h2 className="text-broker-text font-bold text-lg">Debt Tokens</h2>

      <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-broker-text-muted text-[10px]">Current Debt Price</div>
            <div className="text-2xl font-bold text-red-400">{fmt(debtPrice)}</div>
          </div>
          <div>
            <div className="text-broker-text-muted text-[10px]">Price Step</div>
            <div className="text-lg font-bold text-broker-text">+{fmt(config.debtPriceStep || 10)}/OR</div>
          </div>
        </div>
      </div>

      {debts.map(d => (
        <div key={d.debtor} className="bg-broker-surface rounded-lg p-3 border border-broker-border">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: d.color }} className="font-bold">{d.debtor}</span>
            <span className="text-broker-text-muted">owes</span>
            <span className="text-broker-text font-medium">{d.creditor}</span>
          </div>
          <div className="flex gap-3 text-xs">
            <span>Remaining: <span className={d.remaining > 0 ? 'text-red-400 font-bold' : 'text-green-400'}>{d.remaining}/{d.tokens}</span></span>
            {d.remaining > 0 && d.endgamePenalty && (
              <span className="text-red-300">Endgame: -{d.endgamePenalty[d.remaining]} steps</span>
            )}
            {d.remaining === 0 && <span className="text-green-400">Paid off</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// 1880 player loans
function PlayerLoanChart({ game, fmt, config }) {
  const playersWithDebt = game.players.filter(p => (p.debt || 0) > 0)
  const rate = config.compoundRate || 50

  return (
    <div className='text-sm p-3 space-y-4 overflow-y-auto bg-broker-bg h-full'>
      <h2 className="text-broker-text font-bold text-lg">Player Loans</h2>

      <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-broker-text-muted text-[10px]">Compound Rate</div>
            <div className="text-2xl font-bold text-red-400">{rate}%</div>
          </div>
          <div className="text-broker-text-muted text-xs">per Share Dealing Round</div>
        </div>
      </div>

      {playersWithDebt.length > 0 ? playersWithDebt.map(p => (
        <div key={p.id} className="bg-broker-surface rounded-lg p-3 border border-broker-border">
          <div className="flex items-center gap-2">
            <span className="text-broker-text font-bold">{p.name}</span>
            <span className="text-red-400 font-bold ml-auto">{fmt(p.debt)}</span>
          </div>
          <div className="text-xs text-broker-text-muted mt-1">
            Next interest: +{fmt(playerInterestDue(p, game.title))}
          </div>
        </div>
      )) : (
        <div className="text-broker-text-muted">No player loans</div>
      )}
    </div>
  )
}
