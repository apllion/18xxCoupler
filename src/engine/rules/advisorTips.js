// advisorTips.js — context-aware tips for players and corps.
// Pure logic, no UI. Returns arrays of { id, severity, text, corpSym?, playerId? }
// severity: 'critical' | 'warning' | 'opportunity' | 'info'

import { corpPrice, isSoldOut } from '../stockMarket.js'
import { playerSharePercent, playerCertCount } from '../player.js'
import { currentPhase, trainLimit } from '../phase.js'
import { remainingCount, nextAvailableTrains } from '../depot.js'
import { playerNetWorth, allNetWorths } from './netWorth.js'
import { getCertLimit, certLimitWarnings } from './certLimit.js'
import { trainRushAnalysis } from './trainRush.js'

// ---- Player Tips ----

export function playerAdvisorTips(game, playerId) {
  const tips = []
  const player = game.players.find(p => p.id === playerId)
  if (!player) return tips

  const worths = allNetWorths(game)
  const myWorth = worths.find(w => w.playerId === playerId)
  const leader = worths[0]
  const corps = game.corporations.filter(c => c.floated)

  // 1. Income trailing
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
  const orDiv = Math.max(1, divN / Math.max(1, corps.length))
  const myIncome = income[playerId] / orDiv
  const maxIncome = Math.max(...Object.values(income).map(v => v / orDiv))
  if (maxIncome > 0 && myIncome < maxIncome * 0.6) {
    const gap = Math.round(maxIncome - myIncome)
    tips.push({ id: 'income-trailing', severity: 'warning', text: `Income trailing leader by ~${gap}/OR` })
  }

  // 2. Dump risk — am I vulnerable to getting dumped on?
  for (const c of corps) {
    const isPres = player.shares.some(s => s.corpSym === c.sym && s.isPresident)
    if (!isPres) continue
    const myPct = playerSharePercent(player, c.sym)
    const challengers = game.players.filter(p => p.id !== playerId)
      .map(p => ({ name: p.name, pct: playerSharePercent(p, c.sym), id: p.id }))
      .filter(p => p.pct > 0)
      .sort((a, b) => b.pct - a.pct)
    if (challengers.length > 0 && myPct - 10 <= challengers[0].pct && c.marketShares + 10 <= 50) {
      tips.push({ id: `dump-risk-${c.sym}`, severity: 'critical', corpSym: c.sym,
        text: `Dump risk: ${challengers[0].name} holds ${challengers[0].pct}% of ${c.sym}, you hold ${myPct}%` })
    }
  }

  // 3. Emergency buy exposure — president of trainless/rustable corps
  const rush = trainRushAnalysis(game)
  for (const c of corps) {
    const isPres = player.shares.some(s => s.corpSym === c.sym && s.isPresident)
    if (!isPres) continue
    const info = rush.corpAnalysis.find(x => x.sym === c.sym)
    if (info?.emergencyBuyExposed) {
      const cheapest = nextAvailableTrains(game.depot)[0]
      const shortfall = cheapest ? cheapest.price - c.cash : 0
      tips.push({ id: `emergency-${c.sym}`, severity: 'critical', corpSym: c.sym,
        text: `${c.sym} exposed to emergency buy — shortfall ${shortfall > 0 ? shortfall : 0}` })
    }
  }

  // 4. Sold-out opportunity
  for (const c of corps) {
    const held = playerSharePercent(player, c.sym)
    if (held <= 0) continue
    if (!isSoldOut(c) && c.ipoShares + c.marketShares === 10) {
      tips.push({ id: `soldout-opp-${c.sym}`, severity: 'opportunity', corpSym: c.sym,
        text: `${c.sym} is 1 share from sold-out — buying locks price bump` })
    }
  }

  // 5. Cert limit
  const certWarnings = certLimitWarnings(game)
  const myWarning = certWarnings.find(w => w.playerId === playerId)
  if (myWarning) {
    tips.push({ id: 'cert-limit', severity: myWarning.over ? 'critical' : 'warning',
      text: `Certificate count: ${myWarning.count}/${myWarning.limit}${myWarning.over ? ' — OVER LIMIT' : ' — at limit'}` })
  }

  // 6. Cash-heavy
  if (myWorth && myWorth.total > 0) {
    const cashPct = Math.round((player.cash / myWorth.total) * 100)
    if (cashPct > 40 && corps.length > 2) {
      tips.push({ id: 'cash-heavy', severity: 'info',
        text: `${cashPct}% of net worth idle in cash` })
    }
  }

  // 7. Net worth gap
  if (leader && myWorth && leader.playerId !== playerId) {
    const gap = leader.total - myWorth.total
    const rank = worths.findIndex(w => w.playerId === playerId) + 1
    if (gap > 0) {
      tips.push({ id: 'nw-gap', severity: gap > myWorth.total * 0.3 ? 'warning' : 'info',
        text: `${rank}${rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'} place, ${gap} behind ${leader.name}` })
    }
  }

  // 8. Withhold suggestion for presidencies
  for (const c of corps) {
    const isPres = player.shares.some(s => s.corpSym === c.sym && s.isPresident)
    if (!isPres || c.trains.length === 0) continue
    let lastRev = 0
    for (let i = game.actionLog.length - 1; i >= 0; i--) {
      const a = game.actionLog[i].action
      if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && a.corpSym === c.sym) {
        lastRev = a.totalRevenue || 0; break
      }
    }
    if (lastRev === 0) continue
    const nextTrain = game.depot.upcoming.find(t => !t.availableOn && t.price > c.cash)
    if (!nextTrain) continue
    const wh = Math.ceil((nextTrain.price - c.cash) / lastRev)
    if (wh > 0 && wh <= 2) {
      tips.push({ id: `withhold-${c.sym}`, severity: 'info', corpSym: c.sym,
        text: `${c.sym}: ${wh} withhold${wh > 1 ? 's' : ''} to afford ${nextTrain.name}-train` })
    }
  }

  return tips
}

// ---- Corp Tips ----

export function corpAdvisorTips(game, corpSym) {
  const tips = []
  const corp = game.corporations.find(c => c.sym === corpSym)
  if (!corp || !corp.floated) return tips

  const price = corpPrice(game.stockMarket, corpSym) || 0
  const rush = trainRushAnalysis(game)
  const info = rush.corpAnalysis.find(x => x.sym === corpSym)

  // 1. Train rust imminent
  if (info) {
    for (const r of info.rustRisk) {
      tips.push({ id: `rust-${r.trigger}`, severity: r.willBeTrainless ? 'critical' : 'warning',
        text: `${r.affectedTrains.join(',')} rust on ${r.trigger} purchase (${r.remaining} left)${r.willBeTrainless ? ' — will be trainless' : ''}` })
    }
  }

  // 2. Withhold vs pay breakeven
  let lastRev = 0
  for (let i = game.actionLog.length - 1; i >= 0; i--) {
    const a = game.actionLog[i].action
    if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && a.corpSym === corpSym) {
      lastRev = a.totalRevenue || 0; break
    }
  }
  if (lastRev > 0) {
    const nextTrain = game.depot.upcoming.find(t => !t.availableOn && t.price > corp.cash)
    if (nextTrain) {
      const wh = Math.ceil((nextTrain.price - corp.cash) / lastRev)
      tips.push({ id: 'withhold-breakeven', severity: wh <= 2 ? 'warning' : 'info',
        text: `${wh} withhold${wh > 1 ? 's' : ''} to afford ${nextTrain.name} (${nextTrain.price})` })
    }
  }

  // 3. Sold-out status
  if (isSoldOut(corp)) {
    tips.push({ id: 'sold-out', severity: 'opportunity', text: 'Sold out — price bumps at OR end' })
  } else if (corp.ipoShares + corp.marketShares === 10) {
    tips.push({ id: 'near-soldout', severity: 'opportunity', text: '1 share from sold-out' })
  }

  // 4. Double jump
  if (lastRev > 0 && price > 0) {
    const perShare = Math.floor(lastRev / 10)
    if (perShare >= price) {
      tips.push({ id: 'double-jump', severity: 'opportunity', text: `Revenue ${lastRev} enables double price jump (${perShare}/share >= ${price} price)` })
    }
  }

  // 5. Train limit
  const limit = trainLimit(game.phaseManager)
  if (corp.trains.length >= limit) {
    tips.push({ id: 'train-limit', severity: 'warning', text: `At train limit (${corp.trains.length}/${limit}) — must discard before buying` })
  }

  // 6. Cash reserves
  const cheapest = nextAvailableTrains(game.depot)[0]
  if (cheapest && corp.cash < cheapest.price && corp.trains.length === 0) {
    tips.push({ id: 'cash-short', severity: 'critical',
      text: `Trainless, treasury ${corp.cash} short of ${cheapest.name} (${cheapest.price})` })
  } else if (cheapest && corp.cash < cheapest.price * 0.5 && corp.trains.length > 0) {
    const gap = cheapest.price - corp.cash
    tips.push({ id: 'cash-low', severity: 'info', text: `Treasury ${gap} short of next train (${cheapest.name})` })
  }

  // 7. Loans
  if (corp.loans > 0) {
    const rate = game.title.loans?.interestRate || 10
    const interest = Math.round(corp.loans * (game.title.loans?.loanValue || 100) * rate / 100)
    tips.push({ id: 'loan-burden', severity: interest > corp.cash * 0.3 ? 'warning' : 'info',
      text: `${corp.loans} loan${corp.loans > 1 ? 's' : ''}, interest ${interest} due this OR` })
  }

  // 8. No permanent trains
  if (info && info.permanentCount === 0 && corp.trains.length > 0) {
    tips.push({ id: 'no-permanent', severity: 'warning', text: 'No permanent trains — all are rustable' })
  }

  return tips
}
