// AnalysisTab — ++ analysis features, only visible when plusPlus unlocked.
// Separate tab with all analysis panels in one scrollable view.
// 24 panels total: position, timing, market, money flow, strategic, meta.

import { useState } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { formatCurrency } from '../../utils/currency.js'
import { corpPrice, isSoldOut } from '../../engine/stockMarket.js'
import { playerSharePercent } from '../../engine/player.js'
import { currentPhase } from '../../engine/phase.js'
import { remainingCount } from '../../engine/depot.js'
import { allNetWorths } from '../../engine/rules/netWorth.js'
import { PositionMeter } from './PositionMeter.jsx'

// Static analysis data (18AI statistics)
import analysisDataRaw from '../../data/analysis-data.json'
const analysisData = analysisDataRaw || {}

export default function AnalysisTab() {
  const game = useGameStore((s) => s.game)
  const [view, setView] = useState('financial')

  if (!game) return null

  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const phase = currentPhase(game.phaseManager)
  const titleData = analysisData[game.title.title] || null

  const hasStats = !!titleData
  // Map analysis placeholder — future: game.title.hasMap or game.map presence
  const hasMap = false

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setView(id)}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
        view === id
          ? ('bg-blue-600 text-white')
          : ('text-broker-text-muted hover:text-broker-text')
      }`}>{label}</button>
  )

  return (
    <div className='text-sm p-3 space-y-4 overflow-y-auto bg-broker-bg h-full'>
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-white font-bold text-lg">
          ++ Analysis — {game.title.title}
        </h2>
        <div className="flex gap-1 flex-wrap">
          {tabBtn('financial', 'Financial')}
          {tabBtn('statistical', hasStats ? 'Statistical' : 'Statistical (n/a)')}
          {tabBtn('review', 'Review')}
          {tabBtn('map', hasMap ? 'Map' : 'Map (n/a)')}
          {tabBtn('mapstats', hasMap && hasStats ? 'Map Stats' : 'Map Stats (n/a)')}
        </div>
      </div>

      {/* ================================================================ */}
      {/* FINANCIAL — computed from game state + title config              */}
      {/* ================================================================ */}
      {view === 'financial' && <>
        <PositionMeter game={game} />
        <WinnerProfile game={game} fmt={fmt} titleData={titleData} />

        <Section title="Timing & Tempo" />
        <BankBreak game={game} fmt={fmt} />
        <TrainRush game={game} fmt={fmt} phase={phase} />
        <PhasePressure game={game} fmt={fmt} phase={phase} />
        <GameClock game={game} fmt={fmt} />
        <OREfficiency game={game} fmt={fmt} />
        <FloatSpeed game={game} fmt={fmt} titleData={titleData} />

        <Section title="Share Market" />
        <SoldOutTracker game={game} fmt={fmt} />
        <DumpAlert game={game} fmt={fmt} />
        <ShortSqueeze game={game} fmt={fmt} />

        <Section title="Money Flow" />
        <IncomeInequality game={game} fmt={fmt} />
        <CapitalVelocity game={game} fmt={fmt} />
        <WithholdBreakeven game={game} fmt={fmt} />

        <Section title="Strategic" />
        <EmergencyExposure game={game} fmt={fmt} />
        <DividendProjection game={game} fmt={fmt} />
        <CorpQuality game={game} fmt={fmt} />
        <TrainTimingMatrix game={game} fmt={fmt} />
        <EndgameProjection game={game} fmt={fmt} />
      </>}

      {/* ================================================================ */}
      {/* STATISTICAL — from 18xx.games / 18AI historical data            */}
      {/* ================================================================ */}
      {view === 'statistical' && <>
        {hasStats ? <>
          <Section title="Historical Statistics" />
          <ParGuide data={titleData} fmt={fmt} title={game.title.title} />
          {titleData.privates && <PrivateValuation data={titleData} game={game} fmt={fmt} />}
          {titleData.corp_win_rate && <CorpWinCorrelation data={titleData} game={game} fmt={fmt} />}
          {titleData.player_count && <PlayerCountImpact data={titleData} game={game} fmt={fmt} />}
        </> : (
          <Panel title="No Statistical Data">
            <span className="text-broker-text-muted">
              No 18xx.games statistics available for {game.title.title}.
              Data covers: {Object.keys(analysisData).join(', ') || 'none'}.
            </span>
          </Panel>
        )}
      </>}

      {/* ================================================================ */}
      {/* REVIEW — post-game learning, decision grading                   */}
      {/* ================================================================ */}
      {view === 'review' && <Review game={game} fmt={fmt} titleData={titleData} />}

      {/* ================================================================ */}
      {/* MAP — computed from game map state (future)                      */}
      {/* ================================================================ */}
      {view === 'map' && (
        <Panel title="Map Analysis">
          <span className="text-broker-text-muted">
            Map analysis requires route and token data.
            {hasMap ? ' Computing...' : ' Not available for this game yet.'}
          </span>
        </Panel>
      )}

      {/* ================================================================ */}
      {/* MAP STATS — historical map/route data from 18xx.games (future)  */}
      {/* ================================================================ */}
      {view === 'mapstats' && (
        <Panel title="Map Statistics">
          <span className="text-broker-text-muted">
            Historical map statistics (optimal routes, token placement) not yet available.
          </span>
        </Panel>
      )}
    </div>
  )
}

// =========================================================================
// SECTION HEADER
// =========================================================================
function Section({ title }) {
  return (
    <div className='text-broker-text-muted text-[10px] uppercase tracking-widest border-b border-broker-border pb-1 mt-3'>{title}</div>
  )
}

// =========================================================================
// WINNER PROFILE — synthesizes all metrics into per-player scorecard
// =========================================================================
function WinnerProfile({ game, fmt, titleData: _titleData }) {
  if (game.players.length < 2) return null
  const worths = allNetWorths(game)
  const corps = game.corporations.filter(c => c.floated)
  if (corps.length === 0) return <Panel title="Winner Profile"><span className="text-broker-text-muted">No corps floated yet</span></Panel>

  // Score each corp for quality (reused logic)
  const corpScores = {}
  for (const c of corps) {
    const price = corpPrice(game.stockMarket, c.sym) || 0
    const perm = c.trains.filter(t => !t.rustsOn).length
    const rust = c.trains.filter(t => t.rustsOn).length
    let s = 0
    s += Math.min(price / 50, 3)
    s += perm * 1.5
    s += c.trains.length > 0 ? 1 : -2
    s += Math.min(c.cash / 200, 2)
    s -= rust * 0.5
    s += c.tokensPlaced * 0.3
    corpScores[c.sym] = { score: Math.round(s * 10) / 10, price, perm, rust, trainless: c.trains.length === 0 }
  }

  // Dividend income per player (last N dividends)
  const income = {}
  game.players.forEach(p => { income[p.id] = 0 })
  let divN = 0
  for (let i = game.actionLog.length - 1; i >= 0 && divN < 15; i--) {
    const a = game.actionLog[i].action
    if (a.type === 'PAY_DIVIDEND' && a.corpSym) {
      for (const p of game.players) {
        const pct = playerSharePercent(p, a.corpSym)
        if (pct > 0) income[p.id] += Math.round((a.totalRevenue || 0) * pct / 100)
      }
      divN++
    }
  }
  const orsDivisor = Math.max(1, divN / Math.max(1, corps.length))

  // Build per-player scorecard
  const maxCorpScore = Math.max(...Object.values(corpScores).map(c => c.score), 1)
  const players = game.players.map(p => {
    const w = worths.find(x => x.playerId === p.id) || { total: 0, cash: 0, shareValue: 0, privateValue: 0 }

    // 1. Income rate (dividend income per OR)
    const incomePerOR = income[p.id] / orsDivisor
    // 2. Portfolio quality — weighted avg of corp scores for shares held
    let portfolioScore = 0
    let totalPct = 0
    for (const c of corps) {
      const pct = playerSharePercent(p, c.sym)
      if (pct > 0 && corpScores[c.sym]) {
        portfolioScore += corpScores[c.sym].score * pct
        totalPct += pct
      }
    }
    const avgPortfolio = totalPct > 0 ? portfolioScore / totalPct : 0
    // 3. Cash efficiency — idle cash ratio (lower is better, but 0 is risky)
    const cashRatio = w.total > 0 ? p.cash / w.total : 0
    const cashScore = cashRatio < 0.05 ? 0.6 : cashRatio < 0.15 ? 1.0 : cashRatio < 0.3 ? 0.8 : 0.4
    // 4. Presidency quality — avg score of corps you're president of
    const presidencies = corps.filter(c => p.shares.some(s => s.corpSym === c.sym && s.isPresident))
    const avgPresScore = presidencies.length > 0
      ? presidencies.reduce((s, c) => s + (corpScores[c.sym]?.score || 0), 0) / presidencies.length
      : 0
    // 5. Risk exposure — president of trainless/all-rustable corps
    const riskCorps = presidencies.filter(c => corpScores[c.sym]?.trainless || (c.trains.length > 0 && c.trains.every(t => t.rustsOn)))
    const riskPenalty = riskCorps.length * 1.5
    // 6. Diversification — how many corps do you hold shares in
    const corpsHeld = corps.filter(c => playerSharePercent(p, c.sym) > 0).length
    const diversification = Math.min(corpsHeld / Math.max(corps.length, 1), 1)

    // Composite score (0-10 scale)
    const maxIncome = Math.max(...game.players.map(pl => income[pl.id] / orsDivisor), 1)
    const composite =
      (incomePerOR / maxIncome) * 3.0 +             // income rate (max 3)
      (avgPortfolio / Math.max(maxCorpScore, 1)) * 2.0 + // portfolio quality (max 2)
      cashScore * 1.0 +                              // cash efficiency (max 1)
      (avgPresScore / Math.max(maxCorpScore, 1)) * 2.0 + // presidency quality (max 2)
      diversification * 1.0 -                         // diversification (max 1)
      riskPenalty +                                    // risk penalty
      (w.total > 0 ? 1 : 0)                          // participation bonus

    // Identify strongest dimension
    const dimensions = [
      { name: 'Income', val: maxIncome > 0 ? incomePerOR / maxIncome : 0 },
      { name: 'Portfolio', val: maxCorpScore > 0 ? avgPortfolio / maxCorpScore : 0 },
      { name: 'Cash mgmt', val: cashScore },
      { name: 'Presidency', val: maxCorpScore > 0 ? avgPresScore / maxCorpScore : 0 },
      { name: 'Diversified', val: diversification },
    ]
    const strongest = dimensions.reduce((best, d) => d.val > best.val ? d : best, dimensions[0])
    const weakest = dimensions.reduce((worst, d) => d.val < worst.val ? d : worst, dimensions[0])

    return {
      id: p.id, name: p.name,
      total: w.total, incomePerOR: Math.round(incomePerOR),
      portfolioScore: Math.round(avgPortfolio * 10) / 10,
      cashScore, avgPresScore: Math.round(avgPresScore * 10) / 10,
      presidencies: presidencies.length, riskCorps: riskCorps.length,
      corpsHeld, diversification: Math.round(diversification * 100),
      composite: Math.round(Math.max(0, composite) * 10) / 10,
      strongest: strongest.name, weakest: weakest.name,
      riskPenalty,
    }
  }).sort((a, b) => b.composite - a.composite)

  const maxComposite = players[0]?.composite || 1
  const leader = worths[0]
  const bestScorer = players[0]
  const divergence = leader && bestScorer && leader.playerId !== bestScorer.id

  return (
    <Panel title="Winner Profile">
      <div className="space-y-2">
        {players.map((p, i) => {
          const barPct = maxComposite > 0 ? Math.round((p.composite / maxComposite) * 100) : 0
          const isLeading = i === 0
          return (
            <div key={p.id}>
              <div className="flex items-center gap-2">
                <span className={`w-4 ${isLeading ? 'text-green-400 font-bold' : 'text-broker-text-muted'}`}>{i + 1}</span>
                <span className={`w-16 truncate ${isLeading ? 'text-green-400 font-bold' : 'text-broker-text'}`}>{p.name}</span>
                <div className={`flex-1 h-3 rounded bg-broker-surface-hover`}>
                  <div className={`h-3 rounded ${isLeading ? 'bg-green-600' : 'bg-blue-600'}`} style={{ width: barPct + '%' }} />
                </div>
                <span className="text-white w-8 text-right font-bold">{p.composite}</span>
                <span className="text-broker-text-muted w-14 text-right">{fmt(p.total)}</span>
              </div>
              <div className="ml-6 text-[10px] text-broker-text-muted flex flex-wrap gap-x-3">
                <span>+{fmt(p.incomePerOR)}/OR</span>
                <span>portfolio {p.portfolioScore}</span>
                <span>{p.presidencies} pres</span>
                <span>{p.corpsHeld} corps</span>
                {p.riskCorps > 0 && <span className="text-red-400">{p.riskCorps} at risk</span>}
                <span className="text-green-400">best: {p.strongest}</span>
                <span className="text-amber-400">weak: {p.weakest}</span>
              </div>
            </div>
          )
        })}
      </div>
      {divergence && (
        <div className="text-amber-400 text-xs mt-2 font-bold">
          {bestScorer.name} has the strongest play profile but {leader.name} leads in net worth
        </div>
      )}
      <div className="text-broker-text-muted text-xs mt-1">
        Score: income (3) + portfolio (2) + cash mgmt (1) + presidency (2) + diversity (1) - risk
      </div>
    </Panel>
  )
}

// =========================================================================
// TIMING & TEMPO
// =========================================================================

// --- Bank Break Countdown ---
function BankBreak({ game, fmt }) {
  const bankTotal = typeof game.title.bankCash === 'number'
    ? game.title.bankCash
    : (game.title.bankCash[game.playerCount] || 8000)
  const pct = Math.max(0, Math.round((game.bank.cash / bankTotal) * 100))

  let totalPaidOut = 0
  let divCount = 0
  for (let i = game.actionLog.length - 1; i >= 0 && divCount < 10; i--) {
    const a = game.actionLog[i].action
    if (a.type === 'PAY_DIVIDEND' || a.type === 'HALF_DIVIDEND') {
      totalPaidOut += a.totalRevenue || 0
      divCount++
    }
  }
  const avgPayoutPerOR = divCount > 0 ? Math.round(totalPaidOut / divCount) : 0
  const floatedCorps = game.corporations.filter(c => c.floated).length
  const estORPayment = avgPayoutPerOR * floatedCorps
  const orsRemaining = estORPayment > 0 ? Math.ceil(game.bank.cash / estORPayment) : '?'

  return (
    <Panel title="Bank Break Countdown">
      <div className="flex items-center gap-2">
        <div className={`flex-1 h-3 rounded bg-broker-surface-hover`}>
          <div className={`h-3 rounded ${pct < 20 ? 'bg-red-500' : pct < 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: pct + '%' }} />
        </div>
        <span className="text-white font-medium">{fmt(game.bank.cash)}</span>
        <span className="text-broker-text-muted">{pct}%</span>
      </div>
      <div className="text-broker-text-muted text-xs mt-1">
        ~{orsRemaining} ORs remaining {avgPayoutPerOR > 0 ? `(avg ${fmt(avgPayoutPerOR)}/div x ${floatedCorps} corps)` : '(no dividend data yet)'}
        {pct < 20 && <span className=" text-red-400 font-medium"> — Bank breaking soon!</span>}
      </div>
    </Panel>
  )
}

// --- Train Rush Clock ---
function TrainRush({ game, fmt, phase: _phase }) {
  const depot = game.depot
  const tiers = []
  const seen = new Set()
  for (const t of depot.upcoming) {
    if (!seen.has(t.name)) {
      seen.add(t.name)
      const count = remainingCount(depot, t.name)
      const triggersPhase = game.phaseManager.phases.some(p => p.on === t.name)
      tiers.push({ name: t.name, count, price: t.price, rustsOn: t.rustsOn, triggersPhase })
    }
  }

  const vulnerable = []
  for (const c of game.corporations.filter(c => c.floated)) {
    for (const t of c.trains) {
      if (t.rustsOn) {
        const triggerRemaining = remainingCount(depot, t.rustsOn)
        vulnerable.push({ corp: c.sym, color: c.color, train: t.name, rustsOn: t.rustsOn, remaining: triggerRemaining })
      }
    }
  }

  return (
    <Panel title="Train Rush Clock">
      <div className="space-y-1">
        {tiers.map(t => {
          const urgency = t.count <= 1 ? 'high' : t.count <= 3 ? 'medium' : 'low'
          return (
            <div key={t.name} className="flex items-center gap-2">
              <span className="text-white font-medium w-8">{t.name}</span>
              <div className={`flex-1 h-2 rounded bg-broker-surface-hover`}>
                <div className={`h-2 rounded ${urgency === 'high' ? 'bg-red-500' : urgency === 'medium' ? 'bg-yellow-500' : 'bg-green-600'}`}
                  style={{ width: Math.min(100, t.count * 15) + '%' }} />
              </div>
              <span className="text-broker-text-muted w-6 text-right">{t.count}x</span>
              <span className="text-broker-text w-14">{fmt(t.price)}</span>
              {t.triggersPhase && <span className="text-red-400">phase!</span>}
            </div>
          )
        })}
      </div>
      {vulnerable.length > 0 && (
        <div className="mt-2">
          <span className="text-red-400 text-xs font-medium">Vulnerable trains:</span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {vulnerable.map((v, i) => (
              <span key={i} className="text-xs">
                <span style={{ color: v.color }} className="font-bold">{v.corp}</span>
                {' '}{v.train} (r{v.rustsOn}: {v.remaining} left)
              </span>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

// --- Phase Pressure ---
function PhasePressure({ game, fmt, phase }) {
  const nextPhase = game.phaseManager.phases[game.phaseManager.currentIndex + 1]
  if (!nextPhase) return <Panel title="Phase Pressure"><span className="text-broker-text-muted">Final phase reached</span></Panel>

  const triggerTrain = nextPhase.on
  const remaining = triggerTrain ? remainingCount(game.depot, triggerTrain) : 0
  const trainDef = game.depot.upcoming.find(t => t.name === triggerTrain)

  return (
    <Panel title="Phase Pressure">
      <div className="text-white">
        Current: <span className="font-bold">{phase.name}</span> → Next: <span className="font-bold">{nextPhase.name}</span>
        {triggerTrain && <span className=" text-amber-400"> (on {triggerTrain} purchase)</span>}
      </div>
      {triggerTrain && (
        <div className="text-broker-text-muted text-xs mt-1">
          {remaining} {triggerTrain}-train{remaining !== 1 ? 's' : ''} left in depot @ {trainDef ? fmt(trainDef.price) : '?'}
          {remaining <= 2 && <span className="text-red-400 font-bold ml-1">IMMINENT</span>}
        </div>
      )}
      <div className="text-broker-text-muted text-xs mt-1">
        Next phase: limit {typeof nextPhase.trainLimit === 'number' ? nextPhase.trainLimit : JSON.stringify(nextPhase.trainLimit)}, {nextPhase.operatingRounds} ORs
        {nextPhase.events?.length > 0 && <span className="text-amber-400 ml-1">[{nextPhase.events.join(', ')}]</span>}
      </div>
    </Panel>
  )
}

// --- Game Clock ---
function GameClock({ game, fmt: _fmt }) {
  const bankTotal = typeof game.title.bankCash === 'number'
    ? game.title.bankCash
    : (game.title.bankCash[game.playerCount] || 8000)
  const bankPct = game.bank.cash / bankTotal

  // Count ORs played so far
  let orCount = 0
  let srCount = 0
  for (const entry of game.actionLog) {
    if (entry.action.type === 'ADVANCE_ROUND') {
      if (entry.action.newRound === 'OR') orCount++
      if (entry.action.newRound === 'SR') srCount++
    }
  }

  // Estimate total ORs: look at bank drain rate
  let totalPaidOut = 0
  let divCount = 0
  for (let i = game.actionLog.length - 1; i >= 0 && divCount < 20; i--) {
    const a = game.actionLog[i].action
    if (a.type === 'PAY_DIVIDEND' || a.type === 'HALF_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND') {
      totalPaidOut += a.totalRevenue || 0
      divCount++
    }
  }

  const floatedCorps = game.corporations.filter(c => c.floated).length
  const avgDrainPerOR = divCount > 0 && floatedCorps > 0 ? (totalPaidOut / divCount) * floatedCorps : 0
  const estORsLeft = avgDrainPerOR > 0 ? Math.ceil(game.bank.cash / avgDrainPerOR) : '?'
  const estTotalORs = typeof estORsLeft === 'number' ? orCount + estORsLeft : '?'
  const progress = typeof estTotalORs === 'number' && estTotalORs > 0 ? Math.round((orCount / estTotalORs) * 100) : 0

  // Check train-based end: if last train tier has few left
  const lastTier = game.depot.upcoming[game.depot.upcoming.length - 1]
  const lastTierName = lastTier?.name
  const lastTierLeft = lastTierName ? remainingCount(game.depot, lastTierName) : 99

  const endingSoon = bankPct < 0.15 || lastTierLeft <= 1

  return (
    <Panel title="Game Clock">
      <div className="flex items-center gap-2">
        <div className={`flex-1 h-3 rounded bg-broker-surface-hover`}>
          <div className={`h-3 rounded ${endingSoon ? 'bg-red-500' : progress > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: Math.min(100, progress) + '%' }} />
        </div>
        <span className="text-white font-medium">{progress}%</span>
      </div>
      <div className="text-broker-text-muted text-xs mt-1">
        SR {srCount} · OR {orCount}{typeof estORsLeft === 'number' ? ` · ~${estORsLeft} ORs left` : ''}
        {endingSoon && <span className="text-red-400 font-bold ml-1">ENDGAME</span>}
      </div>
      <div className="text-broker-text-muted text-xs">
        Ends by: {bankPct < 0.15 ? 'bank break' : lastTierLeft <= 2 ? 'last train purchased' : 'bank break (est.)'}
      </div>
    </Panel>
  )
}

// --- OR Efficiency ---
function OREfficiency({ game, fmt }) {
  const corps = game.corporations.filter(c => c.floated)
  if (corps.length === 0) return null

  const efficiencies = corps.map(c => {
    // Total revenue earned
    let totalRev = 0
    let revCount = 0
    for (const entry of game.actionLog) {
      const a = entry.action
      if ((a.type === 'PAY_DIVIDEND' || a.type === 'HALF_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND') && a.corpSym === c.sym) {
        totalRev += a.totalRevenue || 0
        revCount++
      }
    }

    // Total capex (trains + tokens)
    let trainCost = 0
    let tokenCost = 0
    for (const entry of game.actionLog) {
      const a = entry.action
      if (a.type === 'BUY_TRAIN' && a.corpSym === c.sym) trainCost += a.price || 0
      if (a.type === 'PLACE_TOKEN' && a.corpSym === c.sym) tokenCost += a.cost || 0
    }

    const totalCapex = trainCost + tokenCost
    const roi = totalCapex > 0 ? ((totalRev / totalCapex) * 100).toFixed(0) : '—'
    const revPerToken = c.tokensPlaced > 0 ? Math.round(totalRev / c.tokensPlaced) : 0
    const avgRev = revCount > 0 ? Math.round(totalRev / revCount) : 0

    return { sym: c.sym, color: c.color, totalRev, avgRev, totalCapex, roi, revPerToken, revCount }
  }).sort((a, b) => (b.avgRev || 0) - (a.avgRev || 0))

  return (
    <Panel title="OR Efficiency">
      <div className="space-y-0.5">
        {efficiencies.map(e => (
          <div key={e.sym} className="flex items-center gap-2">
            <span style={{ color: e.color }} className="font-bold w-10">{e.sym}</span>
            <span className="text-broker-text-muted w-16">avg {fmt(e.avgRev)}</span>
            <span className="text-broker-text-muted w-16">capex {fmt(e.totalCapex)}</span>
            <span className={`w-12 text-right ${parseInt(e.roi) > 150 ? 'text-green-400' : parseInt(e.roi) > 80 ? 'text-yellow-400' : 'text-red-400'}`}>
              {e.roi}% ROI
            </span>
            <span className="text-broker-text-muted w-14 text-right">{fmt(e.revPerToken)}/tok</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// --- Float Speed ---
function FloatSpeed({ game, fmt: _fmt, titleData: _titleData }) {
  const corps = game.corporations.filter(c => c.ipoed)
  if (corps.length === 0) return null

  // Find when each corp was IPO'd (action index) and floated
  const floatInfo = corps.map(c => {
    let ipoAction = null
    let floatAction = null
    let srAtIPO = 0
    let currentSR = 0
    for (let i = 0; i < game.actionLog.length; i++) {
      const a = game.actionLog[i].action
      if (a.type === 'ADVANCE_ROUND' && a.newRound === 'SR') currentSR++
      if (a.type === 'PAR' && a.corpSym === c.sym && !ipoAction) {
        ipoAction = i
        srAtIPO = currentSR
      }
      if (a.type === 'FLOAT_CORP' && a.corpSym === c.sym && !floatAction) {
        floatAction = i
      }
    }
    return {
      sym: c.sym, color: c.color, floated: c.floated,
      ipoSR: srAtIPO, floatSR: floatAction ? 'floated' : 'pending',
      actionsBetween: floatAction && ipoAction ? floatAction - ipoAction : null,
    }
  })

  return (
    <Panel title="Float Speed">
      <div className="space-y-0.5">
        {floatInfo.map(f => (
          <div key={f.sym} className="flex items-center gap-2">
            <span style={{ color: f.color }} className="font-bold w-10">{f.sym}</span>
            <span className="text-broker-text-muted">IPO'd SR{f.ipoSR}</span>
            <span className={f.floated ? 'text-green-400' : 'text-amber-400'}>
              {f.floated ? 'floated' : 'pending'}
            </span>
            {f.actionsBetween != null && (
              <span className="text-broker-text-muted">({f.actionsBetween} actions to float)</span>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}

// =========================================================================
// SHARE MARKET
// =========================================================================

// --- Sold-Out Tracker ---
function SoldOutTracker({ game, fmt }) {
  const corps = game.corporations.filter(c => c.floated)
  if (corps.length === 0) return null

  const data = corps.map(c => {
    const soldOut = isSoldOut(c)
    const totalAvailable = c.ipoShares + c.marketShares
    const price = corpPrice(game.stockMarket, c.sym) || 0
    return { sym: c.sym, color: c.color, soldOut, ipoLeft: c.ipoShares, poolLeft: c.marketShares, totalAvailable, price }
  }).sort((a, b) => a.totalAvailable - b.totalAvailable)

  return (
    <Panel title="Sold-Out Tracker">
      <div className="space-y-0.5">
        {data.map(d => (
          <div key={d.sym} className="flex items-center gap-2">
            <span style={{ color: d.color }} className="font-bold w-10">{d.sym}</span>
            {d.soldOut
              ? <span className="text-green-400 font-bold">SOLD OUT</span>
              : <>
                  <span className="text-broker-text-muted">IPO {d.ipoLeft}%</span>
                  <span className="text-broker-text-muted">Pool {d.poolLeft}%</span>
                </>
            }
            <span className="text-white ml-auto">{fmt(d.price)}</span>
            {d.totalAvailable === 10 && !d.soldOut && <span className="text-amber-400 text-xs">1 share away!</span>}
          </div>
        ))}
      </div>
      <div className="text-broker-text-muted text-xs mt-1">
        Sold-out corps move up at end of OR set
      </div>
    </Panel>
  )
}

// --- Dump Alert ---
function DumpAlert({ game, fmt: _fmt }) {
  const corps = game.corporations.filter(c => c.floated)
  const alerts = []

  for (const c of corps) {
    const pres = game.players.find(p => p.shares.some(s => s.corpSym === c.sym && s.isPresident))
    if (!pres) continue

    const presPct = playerSharePercent(pres, c.sym)
    // Find who else holds shares and could become president
    const others = game.players.filter(p => p.id !== pres.id).map(p => ({
      name: p.name,
      pct: playerSharePercent(p, c.sym),
    })).filter(o => o.pct > 0).sort((a, b) => b.pct - a.pct)

    if (others.length === 0) continue

    const topChallenger = others[0]
    // President can dump if they sell enough to make someone else pres
    const dumpable = presPct - 10 <= topChallenger.pct && c.marketShares + 10 <= 50

    if (dumpable) {
      alerts.push({
        sym: c.sym, color: c.color,
        presName: pres.name, presPct,
        challengerName: topChallenger.name, challengerPct: topChallenger.pct,
      })
    }
  }

  if (alerts.length === 0) return <Panel title="Dump Alert"><span className="text-green-400">No dump risk</span></Panel>

  return (
    <Panel title="Dump Alert">
      {alerts.map(a => (
        <div key={a.sym} className="mb-1">
          <span style={{ color: a.color }} className="font-bold">{a.sym}</span>
          <span className="text-amber-400 ml-1">{a.presName} ({a.presPct}%)</span>
          <span className=" text-broker-text-muted"> can dump to </span>
          <span className="text-amber-400">{a.challengerName} ({a.challengerPct}%)</span>
        </div>
      ))}
    </Panel>
  )
}

// --- Short Squeeze ---
function ShortSqueeze({ game, fmt }) {
  const corps = game.corporations.filter(c => c.floated)
  const data = corps.map(c => {
    const price = corpPrice(game.stockMarket, c.sym) || 0
    const totalPlayerPct = game.players.reduce((s, p) => s + playerSharePercent(p, c.sym), 0)
    const availableShares = c.ipoShares + c.marketShares
    const tight = availableShares <= 10 && !isSoldOut(c)
    return { sym: c.sym, color: c.color, price, availableShares, totalPlayerPct, tight }
  }).filter(d => d.tight || d.availableShares <= 20)
   .sort((a, b) => a.availableShares - b.availableShares)

  if (data.length === 0) return null

  return (
    <Panel title="Share Scarcity">
      <div className="space-y-0.5">
        {data.map(d => (
          <div key={d.sym} className="flex items-center gap-2">
            <span style={{ color: d.color }} className="font-bold w-10">{d.sym}</span>
            <span className="text-white w-14">{fmt(d.price)}</span>
            <span className="text-broker-text-muted">{d.availableShares}% available</span>
            <span className="text-broker-text-muted">{d.totalPlayerPct}% held by players</span>
            {d.tight && <span className="text-amber-400 text-xs font-bold">TIGHT</span>}
          </div>
        ))}
      </div>
    </Panel>
  )
}

// =========================================================================
// MONEY FLOW
// =========================================================================

// --- Income Inequality ---
function IncomeInequality({ game, fmt }) {
  const worths = allNetWorths(game)
  if (worths.length < 2) return null

  const top = worths[0]
  const bottom = worths[worths.length - 1]
  const avg = worths.reduce((s, w) => s + w.total, 0) / worths.length
  const gap = top.total - bottom.total
  const ratio = bottom.total > 0 ? (top.total / bottom.total).toFixed(1) : '∞'

  // Simple Gini-like: mean absolute difference / (2 * mean)
  let sumDiff = 0
  for (const a of worths) {
    for (const b of worths) {
      sumDiff += Math.abs(a.total - b.total)
    }
  }
  const gini = avg > 0 ? (sumDiff / (2 * worths.length * worths.length * avg)).toFixed(2) : '0.00'

  // Track recent income from dividends
  const recentIncome = {}
  game.players.forEach(p => { recentIncome[p.id] = 0 })
  let counted = 0
  for (let i = game.actionLog.length - 1; i >= 0 && counted < 20; i--) {
    const a = game.actionLog[i].action
    if (a.type === 'PAY_DIVIDEND' && a.corpSym) {
      for (const p of game.players) {
        const pct = playerSharePercent(p, a.corpSym)
        if (pct > 0) recentIncome[p.id] += Math.round((a.totalRevenue || 0) * pct / 100)
      }
      counted++
    }
  }

  return (
    <Panel title="Income Inequality">
      <div className="text-white">
        Gap: {fmt(gap)} · Ratio: {ratio}x · Gini: {gini}
      </div>
      <div className="space-y-0.5 mt-1">
        {worths.map((w, i) => {
          const barPct = top.total > 0 ? Math.round((w.total / top.total) * 100) : 0
          const income = recentIncome[w.playerId] || 0
          return (
            <div key={w.playerId} className="flex items-center gap-2">
              <span className={`w-16 truncate ${i === 0 ? 'text-green-400 font-bold' : 'text-broker-text'}`}>{w.name}</span>
              <div className={`flex-1 h-2 rounded bg-broker-surface-hover`}>
                <div className={`h-2 rounded ${i === 0 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: barPct + '%' }} />
              </div>
              <span className="text-white w-14 text-right">{fmt(w.total)}</span>
              <span className="text-broker-text-muted w-14 text-right">+{fmt(income)}</span>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

// --- Capital Velocity ---
function CapitalVelocity({ game, fmt }) {
  // Track money flow: bank→player, player→corp, corp→bank
  let bankToPlayer = 0
  let playerToCorp = 0
  let corpToBank = 0

  for (const entry of game.actionLog) {
    const a = entry.action
    switch (a.type) {
      case 'PAY_DIVIDEND':
        bankToPlayer += a.totalRevenue || 0
        break
      case 'BUY_SHARE_IPO':
      case 'BUY_SHARE_MARKET':
        playerToCorp += a.price || 0
        break
      case 'BUY_TRAIN':
        if (a.fromDepot) corpToBank += a.price || 0
        break
      case 'PLACE_TOKEN':
        corpToBank += a.cost || 0
        break
      case 'COLLECT_PRIVATE_REVENUE':
        bankToPlayer += a.revenue || 0
        break
      case 'BUY_PRIVATE_FROM_PLAYER':
        // player→corp
        break
      case 'SELL_SHARES':
        bankToPlayer += a.totalPrice || 0
        break
    }
  }

  const totalFlow = bankToPlayer + playerToCorp + corpToBank
  const bankTotal = typeof game.title.bankCash === 'number'
    ? game.title.bankCash
    : (game.title.bankCash[game.playerCount] || 8000)
  const velocity = bankTotal > 0 ? (totalFlow / bankTotal).toFixed(1) : '0.0'

  return (
    <Panel title="Capital Velocity">
      <div className="space-y-1">
        <div className="flex gap-4">
          <span className="text-green-400">Bank→Players: {fmt(bankToPlayer)}</span>
          <span className="text-blue-400">Players→Corps: {fmt(playerToCorp)}</span>
          <span className="text-purple-400">Corps→Bank: {fmt(corpToBank)}</span>
        </div>
        <div className="text-white">
          Total flow: {fmt(totalFlow)} · Velocity: {velocity}x bank
        </div>
        <div className="flex items-center gap-1">
          <span className="text-broker-text-muted text-[10px]">
            {parseFloat(velocity) < 1 ? 'Slow economy — money pooling' : parseFloat(velocity) < 2 ? 'Normal circulation' : 'Fast economy — money cycling quickly'}
          </span>
        </div>
      </div>
    </Panel>
  )
}

// --- Withhold vs Pay Breakeven ---
function WithholdBreakeven({ game, fmt }) {
  const corps = game.corporations.filter(c => c.floated && c.trains.length > 0)
  if (corps.length === 0) return null

  const analysis = corps.map(c => {
    // Last revenue
    let lastRev = 0
    for (let i = game.actionLog.length - 1; i >= 0; i--) {
      const a = game.actionLog[i].action
      if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && a.corpSym === c.sym) {
        lastRev = a.totalRevenue || 0
        break
      }
    }
    if (lastRev === 0) return null

    const price = corpPrice(game.stockMarket, c.sym) || 0
    const perShare = Math.floor(lastRev / 10)

    // Find next train cost
    const nextTrain = game.depot.upcoming.find(t => !t.availableOn && t.price > c.cash)

    // Withhold: corp gets full revenue but price drops
    // Pay: corp gets nothing, price goes up, shareholders get dividends
    // President's share value change vs dividend income
    const pres = game.players.find(p => p.shares.some(s => s.corpSym === c.sym && s.isPresident))
    const presPct = pres ? playerSharePercent(pres, c.sym) : 0
    const divIncome = Math.round(lastRev * presPct / 100)

    // Rough: withholding once = price drops ~1 slot (~$10-20), paying = price rises ~1 slot
    // Net worth impact: withhold gives corp cash but pres loses share value
    // Pay gives pres dividend but corp stays poor
    const priceSwing = Math.round(price * 0.1) // rough estimate per slot

    return {
      sym: c.sym, color: c.color, lastRev, perShare, price,
      presName: pres?.name, presPct, divIncome,
      corpCash: c.cash, nextTrainCost: nextTrain?.price || 0, nextTrainName: nextTrain?.name || '—',
      withholdToAfford: nextTrain ? Math.ceil((nextTrain.price - c.cash) / lastRev) : 0,
      priceSwing,
    }
  }).filter(Boolean)

  if (analysis.length === 0) return null

  return (
    <Panel title="Withhold vs Pay Breakeven">
      <div className="space-y-1">
        {analysis.map(a => {
          const shouldWithhold = a.withholdToAfford > 0 && a.withholdToAfford <= 2
          return (
            <div key={a.sym}>
              <div className="flex items-center gap-2">
                <span style={{ color: a.color }} className="font-bold w-10">{a.sym}</span>
                <span className="text-broker-text-muted">rev {fmt(a.lastRev)}</span>
                <span className="text-broker-text-muted">treas {fmt(a.corpCash)}</span>
                {a.nextTrainCost > 0 && (
                  <span className="text-broker-text-muted">
                    need {fmt(a.nextTrainCost)} ({a.nextTrainName})
                  </span>
                )}
              </div>
              <div className="text-broker-text-muted text-xs ml-12">
                Pay: pres gets {fmt(a.divIncome)} · Withhold: corp +{fmt(a.lastRev)}
                {a.withholdToAfford > 0 && (
                  <span className={shouldWithhold ? ' text-amber-400 font-bold' : ''}>
                    {' '}· {a.withholdToAfford}x withhold to afford {a.nextTrainName}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

// =========================================================================
// STRATEGIC
// =========================================================================

// --- Emergency Buy Exposure ---
function EmergencyExposure({ game, fmt }) {
  const corps = game.corporations.filter(c => c.floated)
  const exposed = []

  for (const c of corps) {
    const rustable = c.trains.filter(t => t.rustsOn)
    if (rustable.length === 0 && c.trains.length > 0) continue

    const allRustable = c.trains.length > 0 && c.trains.every(t => t.rustsOn)
    const trainless = c.trains.length === 0

    if (!trainless && !allRustable) continue

    const cheapest = game.depot.upcoming.find(t => !t.availableOn)
    const trainCost = cheapest?.price || 0
    const corpCanAfford = c.cash >= trainCost
    const pres = game.players.find(p => p.shares.some(s => s.corpSym === c.sym && s.isPresident))
    const presCanCover = pres ? (c.cash + pres.cash) >= trainCost : false
    const shortfall = trainCost - c.cash

    exposed.push({
      sym: c.sym, color: c.color, trainless, allRustable,
      rustTriggers: [...new Set(rustable.map(t => t.rustsOn))],
      trainCost, corpCanAfford, presName: pres?.name, presCanCover, shortfall,
    })
  }

  if (exposed.length === 0) return <Panel title="Emergency Buy Exposure"><span className="text-green-400">No corps at risk</span></Panel>

  return (
    <Panel title="Emergency Buy Exposure">
      {exposed.map(e => (
        <div key={e.sym} className="mb-1">
          <span style={{ color: e.color }} className="font-bold">{e.sym}</span>
          {e.trainless ? <span className="text-red-400 ml-1">TRAINLESS</span> : <span className="text-amber-400 ml-1">all trains rust on {e.rustTriggers.join('/')}</span>}
          <span className=" text-broker-text-muted"> — needs {fmt(e.trainCost)}</span>
          {e.corpCanAfford ? <span className="text-green-400 ml-1">can afford</span>
            : e.presCanCover ? <span className="text-amber-400 ml-1">pres {e.presName} covers {fmt(e.shortfall)}</span>
            : <span className="text-red-400 ml-1">can't afford! shortfall {fmt(e.shortfall)}</span>}
        </div>
      ))}
    </Panel>
  )
}

// --- Dividend Projection ---
function DividendProjection({ game, fmt }) {
  const corps = game.corporations.filter(c => c.floated && c.trains.length > 0)
  if (corps.length === 0) return null

  return (
    <Panel title="Cash Flow Projection">
      <div className="space-y-1">
        {corps.map(c => {
          let lastRev = 0
          for (let i = game.actionLog.length - 1; i >= 0; i--) {
            const a = game.actionLog[i].action
            if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && a.corpSym === c.sym) {
              lastRev = a.totalRevenue || 0
              break
            }
          }
          if (lastRev === 0) return null

          const nextTrain = game.depot.upcoming.find(t => !t.availableOn && t.price > c.cash)
          if (!nextTrain) return null

          const orsToAfford = Math.ceil((nextTrain.price - c.cash) / lastRev)

          return (
            <div key={c.sym}>
              <span style={{ color: c.color }} className="font-bold">{c.sym}</span>
              <span className=" text-broker-text-muted">
                {' '}rev {fmt(lastRev)} · treas {fmt(c.cash)} · need {fmt(nextTrain.price)} for {nextTrain.name}
              </span>
              <span className={orsToAfford <= 2 ? ' text-green-400' : ' text-amber-400'}>
                {' '} {orsToAfford} OR{orsToAfford !== 1 ? 's' : ''} withhold to afford
              </span>
            </div>
          )
        }).filter(Boolean)}
      </div>
    </Panel>
  )
}

// --- Corp Quality ---
function CorpQuality({ game, fmt }) {
  const corps = game.corporations.filter(c => c.floated)
  if (corps.length === 0) return null

  const scored = corps.map(c => {
    const price = corpPrice(game.stockMarket, c.sym) || 0
    const permanentTrains = c.trains.filter(t => !t.rustsOn).length
    const rustableTrains = c.trains.filter(t => t.rustsOn).length
    const hasTrains = c.trains.length > 0

    let score = 0
    score += Math.min(price / 50, 3)
    score += permanentTrains * 1.5
    score += hasTrains ? 1 : -2
    score += Math.min(c.cash / 200, 2)
    score -= rustableTrains * 0.5
    score += c.tokensPlaced * 0.3

    return { ...c, price, score: Math.round(score * 10) / 10, permanentTrains, rustableTrains }
  }).sort((a, b) => b.score - a.score)

  return (
    <Panel title="Corp Quality Ranking">
      <div className="space-y-0.5">
        {scored.map((c, i) => (
          <div key={c.sym} className="flex items-center gap-2">
            <span className="text-broker-text-muted w-4">{i + 1}.</span>
            <span style={{ color: c.color }} className="font-bold w-10">{c.sym}</span>
            <div className={`flex-1 h-2 rounded bg-broker-surface-hover`}>
              <div className={`h-2 rounded ${c.score > 5 ? 'bg-green-500' : c.score > 2 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: Math.min(100, c.score * 12) + '%' }} />
            </div>
            <span className="text-white w-8 text-right">{c.score}</span>
            <span className="text-broker-text-muted w-14">{fmt(c.price)}</span>
            <span className={c.permanentTrains > 0 ? 'text-green-400 w-6' : c.trains.length === 0 ? 'text-red-400 w-6' : 'text-amber-400 w-6'}>
              {c.trains.map(t => t.name).join('') || '!'}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// --- Train Timing Matrix ---
function TrainTimingMatrix({ game, fmt }) {
  const depot = game.depot
  const availableTrainNames = [...new Set(depot.upcoming.map(t => t.name))]
  if (availableTrainNames.length === 0) return null

  // For each buyable train, show what happens
  const scenarios = []
  for (const name of availableTrainNames) {
    const train = depot.upcoming.find(t => t.name === name)
    if (!train) continue
    const phaseChange = game.phaseManager.phases.find(p => p.on === name)
    const remaining = remainingCount(depot, name)

    // What rusts when this train is bought?
    const rustsTrains = []
    for (const c of game.corporations.filter(c => c.floated)) {
      for (const t of c.trains) {
        if (t.rustsOn === name) {
          rustsTrains.push({ corp: c.sym, color: c.color, train: t.name })
        }
      }
    }

    scenarios.push({ name, price: train.price, remaining, phaseChange, rustsTrains })
  }

  return (
    <Panel title="Train Timing Matrix">
      <div className="space-y-1">
        {scenarios.map(s => (
          <div key={s.name}>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium w-8">{s.name}</span>
              <span className="text-broker-text w-14">{fmt(s.price)}</span>
              <span className="text-broker-text-muted w-6">{s.remaining}x</span>
              {s.phaseChange && <span className="text-amber-400 text-xs">triggers {s.phaseChange.name}</span>}
            </div>
            {s.rustsTrains.length > 0 && (
              <div className="text-red-400 ml-10 text-[10px]">
                Rusts: {s.rustsTrains.map((r, i) => (
                  <span key={i}>
                    <span style={{ color: r.color }} className="font-bold">{r.corp}</span>
                    {' '}{r.train}{i < s.rustsTrains.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}

// --- Endgame Projection ---
function EndgameProjection({ game, fmt }) {
  const worths = allNetWorths(game)
  if (worths.length < 2) return null

  // Track net worth over recent ORs to project growth
  // We'll use dividend income as proxy for growth rate
  const growthRates = {}
  game.players.forEach(p => { growthRates[p.id] = 0 })

  let divRounds = 0
  for (let i = game.actionLog.length - 1; i >= 0 && divRounds < 15; i--) {
    const a = game.actionLog[i].action
    if (a.type === 'PAY_DIVIDEND' && a.corpSym) {
      for (const p of game.players) {
        const pct = playerSharePercent(p, a.corpSym)
        if (pct > 0) growthRates[p.id] += Math.round((a.totalRevenue || 0) * pct / 100)
      }
      divRounds++
    }
  }

  // Normalize to per-OR income
  const orsForCalc = Math.max(1, divRounds / Math.max(1, game.corporations.filter(c => c.floated).length))
  const projected = worths.map(w => {
    const incomePerOR = growthRates[w.playerId] / Math.max(1, orsForCalc)
    return { ...w, incomePerOR, projected3: w.total + incomePerOR * 3, projected5: w.total + incomePerOR * 5 }
  }).sort((a, b) => b.projected3 - a.projected3)

  const currentLeader = worths[0]
  const projectedLeader = projected[0]
  const leaderChange = currentLeader.playerId !== projectedLeader.playerId

  return (
    <Panel title="Endgame Projection">
      <div className="space-y-0.5">
        {projected.map((p, i) => (
          <div key={p.playerId} className="flex items-center gap-2">
            <span className={`w-16 truncate ${i === 0 ? 'text-green-400 font-bold' : 'text-broker-text'}`}>{p.name}</span>
            <span className="text-white w-14 text-right">{fmt(p.total)}</span>
            <span className="text-broker-text-muted"> →</span>
            <span className="text-broker-text w-14 text-right">{fmt(Math.round(p.projected3))}</span>
            <span className="text-broker-text-muted text-[10px]">+3OR</span>
            <span className="text-broker-text w-14 text-right">{fmt(Math.round(p.projected5))}</span>
            <span className="text-broker-text-muted text-[10px]">+5OR</span>
            <span className="text-broker-text-muted w-12 text-right">+{fmt(Math.round(p.incomePerOR))}/OR</span>
          </div>
        ))}
      </div>
      {leaderChange && (
        <div className="text-amber-400 text-xs mt-1 font-bold">
          Lead change projected: {projectedLeader.name} overtakes {currentLeader.name}
        </div>
      )}
    </Panel>
  )
}

// =========================================================================
// META / 18AI
// =========================================================================

// --- Par Value Guide (from 18AI data) ---
function ParGuide({ data, fmt, title: _title }) {
  const prices = Object.entries(data.par_prices).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  if (prices.length === 0) return null

  const bestPrice = prices.reduce((best, [p, s]) => s.win_rate > (best?.win_rate || 0) ? { price: p, ...s } : best, null)

  return (
    <Panel title={`Par Value Guide (${data.games_analyzed} games)`}>
      <div className="space-y-0.5">
        {prices.map(([price, stats]) => {
          const isBest = price === bestPrice?.price
          return (
            <div key={price} className="flex items-center gap-2">
              <span className={`w-10 text-right font-bold ${isBest ? 'text-green-400' : 'text-white'}`}>{fmt(parseInt(price))}</span>
              <div className={`flex-1 h-2 rounded bg-broker-surface-hover`}>
                <div className={`h-2 rounded ${isBest ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: Math.min(100, stats.win_rate * 2.5) + '%' }} />
              </div>
              <span className="text-broker-text-muted w-12 text-right">{stats.win_rate}%</span>
              <span className="text-broker-text-muted w-8 text-right">{stats.count}x</span>
            </div>
          )
        })}
      </div>
      {bestPrice && (
        <div className="text-green-400 text-xs mt-1">
          Best: {fmt(parseInt(bestPrice.price))} ({bestPrice.win_rate}% win rate, avg score {fmt(bestPrice.avg_score)})
        </div>
      )}
      {data.first_corp && Object.keys(data.first_corp).length > 0 && (
        <div className="text-broker-text-muted text-xs mt-1">
          First corp: {Object.entries(data.first_corp).slice(0, 5).map(([c, n]) => `${c}(${n}x)`).join(', ')}
        </div>
      )}
    </Panel>
  )
}

// --- Private Valuation ---
function PrivateValuation({ data, game, fmt: _fmt }) {
  const privates = Object.entries(data.privates)
  if (privates.length === 0) return null

  return (
    <Panel title={`Private Valuation (${data.games_analyzed} games)`}>
      <div className="space-y-0.5">
        {privates.sort((a, b) => b[1].winner_rate - a[1].winner_rate).map(([sym, stats]) => {
          const co = (game.companies || []).find(c => c.sym === sym)
          const owner = co?.ownerId
            ? (co.ownerType === 'player' ? game.players.find(p => p.id === co.ownerId)?.name : co.ownerId)
            : null
          return (
            <div key={sym} className="flex items-center gap-2">
              <span className="text-white w-12 font-medium">{sym}</span>
              <div className={`flex-1 h-2 rounded bg-broker-surface-hover`}>
                <div className={`h-2 rounded ${stats.winner_rate > 40 ? 'bg-green-500' : stats.winner_rate > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: Math.min(100, stats.winner_rate * 2) + '%' }} />
              </div>
              <span className="text-broker-text-muted w-12 text-right">{stats.winner_rate}%</span>
              <span className="text-broker-text-muted w-8 text-right">{stats.count}x</span>
              {owner && <span className="text-broker-text w-12 truncate">{owner}</span>}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

// --- Corp Win Correlation ---
function CorpWinCorrelation({ data, game, fmt: _fmt }) {
  const corps = Object.entries(data.corp_win_rate).sort((a, b) => b[1].win_rate - a[1].win_rate)
  if (corps.length === 0) return null

  return (
    <Panel title={`Corp Win Correlation (${data.games_analyzed} games)`}>
      <div className="space-y-0.5">
        {corps.map(([sym, stats]) => {
          const corp = game.corporations.find(c => c.sym === sym)
          const color = corp?.color
          const floated = corp?.floated
          return (
            <div key={sym} className="flex items-center gap-2">
              <span style={{ color: color || undefined }} className="font-bold w-10">{sym}</span>
              <div className={`flex-1 h-2 rounded bg-broker-surface-hover`}>
                <div className={`h-2 rounded ${stats.win_rate > 35 ? 'bg-green-500' : stats.win_rate > 20 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                  style={{ width: Math.min(100, stats.win_rate * 2.5) + '%' }} />
              </div>
              <span className="text-broker-text-muted w-12 text-right">{stats.win_rate}%</span>
              <span className="text-broker-text-muted w-8 text-right">{stats.count}x</span>
              {floated && <span className="text-green-400 text-[10px]">in play</span>}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

// --- Player Count Impact ---
function PlayerCountImpact({ data, game, fmt }) {
  const counts = Object.entries(data.player_count).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  if (counts.length === 0) return null

  const currentCount = game.playerCount || game.players.length

  return (
    <Panel title={`Player Count Impact (${data.games_analyzed} games)`}>
      <div className="space-y-0.5">
        {counts.map(([count, stats]) => {
          const isCurrent = parseInt(count) === currentCount
          return (
            <div key={count} className="flex items-center gap-2">
              <span className={`w-6 text-right font-bold ${isCurrent ? 'text-green-400' : 'text-white'}`}>{count}p</span>
              <span className="text-broker-text-muted w-8">{stats.games}g</span>
              <span className="text-broker-text-muted">win avg {fmt(stats.avg_winner_score)}</span>
              <span className="text-broker-text-muted">lose avg {fmt(stats.avg_loser_score)}</span>
              {isCurrent && <span className="text-green-400 text-[10px] font-bold">CURRENT</span>}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

// =========================================================================
// REVIEW — post-game analysis, decision grading, learning
// =========================================================================
function Review({ game, fmt, titleData: _titleData }) {
  const worths = allNetWorths(game)
  const corps = game.corporations.filter(c => c.floated)
  const winner = worths[0]

  // Count actions per player
  const actionCounts = {}
  const divChoices = {} // track pay vs withhold decisions per player's corps
  game.players.forEach(p => { actionCounts[p.id] = 0; divChoices[p.id] = { pay: 0, withhold: 0, half: 0 } })
  for (const entry of game.actionLog) {
    const a = entry.action
    if (a.playerId && actionCounts[a.playerId] !== undefined) actionCounts[a.playerId]++
    if (a.corpSym) {
      const pres = game.players.find(p => p.shares.some(s => s.corpSym === a.corpSym && s.isPresident))
      if (pres && divChoices[pres.id]) {
        if (a.type === 'PAY_DIVIDEND') divChoices[pres.id].pay++
        if (a.type === 'WITHHOLD_DIVIDEND') divChoices[pres.id].withhold++
        if (a.type === 'HALF_DIVIDEND') divChoices[pres.id].half++
      }
    }
  }

  // Revenue history per corp
  const corpRevHistory = {}
  for (const c of corps) corpRevHistory[c.sym] = []
  for (const entry of game.actionLog) {
    const a = entry.action
    if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && a.corpSym && corpRevHistory[a.corpSym]) {
      corpRevHistory[a.corpSym].push({ type: a.type, rev: a.totalRevenue || 0 })
    }
  }

  // Key moments: phase changes, train rusts, bankruptcies
  const keyMoments = []
  let actionIdx = 0
  for (const entry of game.actionLog) {
    const a = entry.action
    actionIdx++
    if (a.type === 'ADVANCE_PHASE') keyMoments.push({ idx: actionIdx, text: `Phase ${a.phaseName}`, severity: 'info' })
    if (a.type === 'RUST_TRAINS') keyMoments.push({ idx: actionIdx, text: `${a.trainName} rusted`, severity: 'warning' })
    if (a.type === 'PLAYER_BANKRUPT') keyMoments.push({ idx: actionIdx, text: `${a.playerId} bankrupt`, severity: 'critical' })
    if (a.type === 'BUY_TRAIN' && a.fromDepot) keyMoments.push({ idx: actionIdx, text: `${a.corpSym} bought ${a.trainName}`, severity: 'info' })
  }

  // Turning points: largest single-OR net worth swings
  // (approximation: track share price changes around dividend events)

  return (
    <>
      {/* Final standings */}
      <Panel title="Final Standings">
        <div className="space-y-1">
          {worths.map((w, i) => {
            const barPct = winner ? Math.round((w.total / winner.total) * 100) : 0
            return (
              <div key={w.playerId} className="flex items-center gap-2">
                <span className={`w-4 font-bold ${i === 0 ? 'text-green-400' : 'text-broker-text-muted'}`}>{i + 1}</span>
                <span className={`w-16 truncate ${i === 0 ? 'text-green-400 font-bold' : 'text-broker-text'}`}>{w.name}</span>
                <div className={`flex-1 h-3 rounded bg-broker-surface-hover`}>
                  <div className="h-3 rounded flex" style={{ width: barPct + '%' }}>
                    <div className="bg-green-700 h-full" style={{ width: w.total > 0 ? Math.round((w.cash / w.total) * 100) + '%' : '0' }} />
                    <div className="bg-blue-700 h-full" style={{ width: w.total > 0 ? Math.round((w.shareValue / w.total) * 100) + '%' : '0' }} />
                    <div className="bg-purple-700 h-full" style={{ width: w.total > 0 ? Math.round((w.privateValue / w.total) * 100) + '%' : '0' }} />
                  </div>
                </div>
                <span className="text-white w-16 text-right font-bold">{fmt(w.total)}</span>
                {i === 0 && <span className="text-green-400 text-xs font-bold">WINNER</span>}
              </div>
            )
          })}
        </div>
        <div className="flex gap-3 mt-1 text-[10px]">
          <span className="text-broker-text-muted"><span className="inline-block w-2 h-2 bg-green-700 rounded-sm mr-0.5" />Cash</span>
          <span className="text-broker-text-muted"><span className="inline-block w-2 h-2 bg-blue-700 rounded-sm mr-0.5" />Shares</span>
          <span className="text-broker-text-muted"><span className="inline-block w-2 h-2 bg-purple-700 rounded-sm mr-0.5" />Privates</span>
        </div>
      </Panel>

      {/* Player strategy profile */}
      <Panel title="Player Strategy">
        <div className="space-y-2">
          {worths.map((w, i) => {
            const dc = divChoices[w.playerId] || { pay: 0, withhold: 0, half: 0 }
            const totalDivs = dc.pay + dc.withhold + dc.half
            const payRate = totalDivs > 0 ? Math.round((dc.pay / totalDivs) * 100) : 0
            const presCorps = corps.filter(c => game.players.find(p => p.id === w.playerId)?.shares.some(s => s.corpSym === c.sym && s.isPresident))
            return (
              <div key={w.playerId}>
                <div className="flex items-center gap-2">
                  <span className={`w-16 truncate font-medium ${i === 0 ? 'text-green-400' : 'text-broker-text'}`}>{w.name}</span>
                  <span className="text-broker-text-muted">
                    {presCorps.map(c => c.sym).join(', ') || 'no corps'}
                  </span>
                </div>
                <div className="text-broker-text-muted text-[10px] ml-16">
                  {totalDivs > 0 && <span>Pay {payRate}% · W {dc.withhold}x · H {dc.half}x</span>}
                  {' · '}{actionCounts[w.playerId] || 0} actions
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Corp Performance */}
      <Panel title="Corp Performance">
        <div className="space-y-1">
          {corps.map(c => {
            const history = corpRevHistory[c.sym] || []
            const totalRev = history.reduce((s, h) => s + h.rev, 0)
            const avgRev = history.length > 0 ? Math.round(totalRev / history.length) : 0
            const price = corpPrice(game.stockMarket, c.sym) || 0
            const pres = game.players.find(p => p.shares.some(s => s.corpSym === c.sym && s.isPresident))
            return (
              <div key={c.sym} className="flex items-center gap-2">
                <span style={{ color: c.color }} className="font-bold w-10">{c.sym}</span>
                <span className="text-white w-14">{fmt(price)}</span>
                <span className="text-broker-text-muted">avg rev {fmt(avgRev)}</span>
                <span className="text-broker-text-muted">{history.length} ORs</span>
                <span className="text-broker-text-muted">treas {fmt(c.cash)}</span>
                <span className="text-broker-text ml-auto">{pres?.name || '—'}</span>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Key Moments Timeline */}
      {keyMoments.length > 0 && (
        <Panel title="Key Moments">
          <div className="space-y-0.5">
            {keyMoments.slice(-20).map((km, i) => (
              <div key={i} className={`text-xs ${
                km.severity === 'critical' ? 'text-red-400' :
                km.severity === 'warning' ? 'text-amber-400' :
                'text-broker-text-muted'
              }`}>
                <span className="text-broker-text-muted">#{km.idx}</span> {km.text}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* What-If Note */}
      <Panel title="Post-Game Tool">
        <div className="text-broker-text-muted">
          Use <span className="font-bold">What-If mode</span> to explore alternative decisions:
          enter what-if, change share positions and stock prices,
          then simulate a few more OR rounds to see how different
          holdings would have played out. Exit to restore the actual game state.
        </div>
      </Panel>
    </>
  )
}

// =========================================================================
// SHARED COMPONENTS
// =========================================================================

function Panel({ title, children }) {
  return (
    <div className='bg-broker-surface rounded-lg p-3 border border-broker-border'>
      <div className="text-white font-medium mb-2">{title}</div>
      {children}
    </div>
  )
}
