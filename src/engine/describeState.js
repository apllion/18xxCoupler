// describeState — produce a plain-text description of the current game state.
// Designed for AI prompt usage, clipboard export, or accessibility.
// Pure function, no side effects.

import { corpPrice } from './stockMarket.js'
import { currentPhase } from './phase.js'
import { regularSharePercent } from './corporation.js'
import { playerNetWorth, allNetWorths } from './rules/netWorth.js'
import { interestDue, totalLoansInGame } from './loans.js'
import { playerCertCount } from './player.js'
import { formatCurrency } from '../utils/currency.js'

export function describeGameState(game) {
  if (!game) return 'No game loaded.'
  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const lines = []

  // ── System Prompt ─────────────────────────────────────────────────
  lines.push(buildSystemPrompt(game))
  lines.push('')

  // ── Header ────────────────────────────────────────────────────────
  lines.push(`# ${game.title.title} — Game State`)
  lines.push('')

  // Round & phase
  const phase = currentPhase(game.phaseManager)
  const rt = game.roundTracker?.roundType || '?'
  lines.push(`Round: ${rt} | Phase: ${phase?.name || '?'} | Train limit: ${phase?.trainLimit ?? '?'}`)
  lines.push(`Bank: ${fmt(game.bank.cash)}`)
  lines.push('')

  // ── Players ───────────────────────────────────────────────────────
  lines.push('## Players')
  const worths = allNetWorths(game)
  const certLimit = game.certLimit || 99

  for (const w of worths) {
    const p = game.players.find(x => x.id === w.playerId)
    const certs = playerCertCount(p)
    const holdings = p.shares
      .reduce((map, s) => {
        const key = s.corpSym
        if (!map[key]) map[key] = { pct: 0, pres: false }
        map[key].pct += s.percent
        if (s.isPresident) map[key].pres = true
        return map
      }, {})
    const holdStr = Object.entries(holdings)
      .sort((a, b) => b[1].pct - a[1].pct)
      .map(([sym, h]) => `${sym} ${h.pct}%${h.pres ? 'P' : ''}`)
      .join(', ')
    const privStr = p.privates.length > 0 ? ` | Privates: ${p.privates.join(', ')}` : ''
    const debtStr = (p.debt || 0) > 0 ? ` | Debt: ${fmt(p.debt)}` : ''
    const prio = game.priorityDeal === p.id ? ' [Priority]' : ''

    lines.push(`- ${p.name}${prio}: Cash ${fmt(p.cash)} | Net worth ${fmt(w.total)} | Certs ${certs}/${certLimit}`)
    lines.push(`  Holdings: ${holdStr || 'none'}${privStr}${debtStr}`)
  }
  lines.push('')

  // ── Corporations ──────────────────────────────────────────────────
  lines.push('## Corporations')
  const floated = game.corporations
    .filter(c => c.floated)
    .sort((a, b) => (corpPrice(game.stockMarket, b.sym) || 0) - (corpPrice(game.stockMarket, a.sym) || 0))

  for (const c of floated) {
    const price = corpPrice(game.stockMarket, c.sym) || 0
    const trainStr = c.trains.length > 0 ? c.trains.map(t => t.name).join(', ') : 'none'
    const tokStr = `${c.tokensPlaced || 0}/${c.tokens.length}`
    const loanStr = (c.loans || 0) > 0 ? ` | Loans: ${c.loans}` : ''
    const debtStr = (c.debtTokens || 0) > 0 ? ` | Debt tokens: ${c.debtTokens}` : ''
    const operatedStr = c.operated ? ' [operated]' : ''

    // Shareholders
    const holders = []
    for (const p of game.players) {
      const pct = p.shares.filter(s => s.corpSym === c.sym).reduce((s, sh) => s + sh.percent, 0)
      const isPres = p.shares.some(s => s.corpSym === c.sym && s.isPresident)
      if (pct > 0) holders.push(`${p.name} ${pct}%${isPres ? 'P' : ''}`)
    }
    // Corp-held shares
    for (const other of game.corporations) {
      const held = (other.sharesHeld || []).filter(s => s.corpSym === c.sym).reduce((s, sh) => s + sh.percent, 0)
      if (held > 0) holders.push(`${other.sym} ${held}%`)
    }

    lines.push(`- ${c.sym}: Price ${fmt(price)} (par ${fmt(c.parPrice)}) | Cash ${fmt(c.cash)} | Trains: ${trainStr} | Tokens: ${tokStr}${loanStr}${debtStr}${operatedStr}`)
    lines.push(`  IPO: ${c.ipoShares}% | Market: ${c.marketShares}% | Holders: ${holders.join(', ') || 'none'}`)

    // Last revenue
    const lastDiv = [...(game.actionLog || [])].reverse().find(e =>
      (e.action.type === 'PAY_DIVIDEND' || e.action.type === 'WITHHOLD_DIVIDEND' || e.action.type === 'HALF_DIVIDEND') && e.action.corpSym === c.sym
    )
    if (lastDiv) {
      const a = lastDiv.action
      const kind = a.type === 'PAY_DIVIDEND' ? 'paid' : a.type === 'HALF_DIVIDEND' ? 'half' : 'withheld'
      lines.push(`  Last revenue: ${fmt(a.totalRevenue)} (${kind})`)
    }
  }

  // Unfloated corps
  const unfloated = game.corporations.filter(c => c.ipoed && !c.floated)
  if (unfloated.length > 0) {
    lines.push(`\nIPO'd but not floated: ${unfloated.map(c => `${c.sym} (par ${fmt(c.parPrice)}, ${100 - c.ipoShares}% sold)`).join(', ')}`)
  }

  const unstarted = game.corporations.filter(c => !c.ipoed && !c.floated)
  if (unstarted.length > 0) {
    lines.push(`Available corps: ${unstarted.map(c => c.sym).join(', ')}`)
  }
  lines.push('')

  // ── Train Supply ──────────────────────────────────────────────────
  lines.push('## Train Supply')
  const trainCounts = {}
  for (const t of (game.depot?.upcoming || [])) {
    if (!t.availableOn) trainCounts[t.name] = (trainCounts[t.name] || 0) + 1
  }
  const gated = {}
  for (const t of (game.depot?.upcoming || [])) {
    if (t.availableOn) gated[t.name] = (gated[t.name] || 0) + 1
  }
  if (Object.keys(trainCounts).length > 0) {
    lines.push(`Available: ${Object.entries(trainCounts).map(([n, c]) => `${n}×${c} (${fmt(game.title.trains?.find(t => t.name === n)?.price || 0)})`).join(', ')}`)
  }
  if (Object.keys(gated).length > 0) {
    lines.push(`Gated: ${Object.entries(gated).map(([n, c]) => `${n}×${c}`).join(', ')}`)
  }
  lines.push('')

  // ── Private Companies ─────────────────────────────────────────────
  const openPrivates = (game.companies || []).filter(c => !c.closed)
  if (openPrivates.length > 0) {
    lines.push('## Private Companies')
    for (const c of openPrivates) {
      const owner = c.ownerType === 'player'
        ? game.players.find(p => p.id === c.ownerId)?.name
        : c.ownerType === 'corporation' ? c.ownerId : 'unowned'
      lines.push(`- ${c.sym} (${c.name}): Revenue ${fmt(c.revenue)} | Owner: ${owner}`)
    }
    lines.push('')
  }

  // ── Loans ─────────────────────────────────────────────────────────
  if (game.title.loans) {
    const loanType = game.title.loans.type
    if (loanType === '1817' || loanType === '1861') {
      const total = totalLoansInGame(game)
      if (total > 0) {
        lines.push('## Loans')
        lines.push(`Total loans: ${total}`)
        for (const c of game.corporations.filter(x => (x.loans || 0) > 0)) {
          lines.push(`- ${c.sym}: ${c.loans} loans, interest ${fmt(interestDue(game, c.sym))}`)
        }
        lines.push('')
      }
    }
    if (loanType === '1880_player') {
      const inDebt = game.players.filter(p => (p.debt || 0) > 0)
      if (inDebt.length > 0) {
        lines.push('## Player Debt')
        for (const p of inDebt) lines.push(`- ${p.name}: ${fmt(p.debt)}`)
        lines.push('')
      }
    }
  }

  // ── Recent Actions ────────────────────────────────────────────────
  const recent = (game.actionLog || []).slice(-5)
  if (recent.length > 0) {
    lines.push('## Recent Actions')
    for (const e of recent) {
      if (e.description) lines.push(`- ${e.description}`)
    }
    lines.push('')
  }

  // ── Operating Order ───────────────────────────────────────────────
  if (game.turnQueue && game.turnQueue.length > 0 && rt === 'OR') {
    const current = game.turnQueue[game.turnIndex || 0]
    lines.push(`## Operating Order`)
    lines.push(game.turnQueue.map((sym, i) => i === (game.turnIndex || 0) ? `[${sym}]` : sym).join(' → '))
    lines.push('')
  }

  // ── Standings ─────────────────────────────────────────────────────
  lines.push('## Standings')
  for (let i = 0; i < worths.length; i++) {
    lines.push(`${i + 1}. ${worths[i].name}: ${fmt(worths[i].total)} (cash ${fmt(worths[i].cash)}, shares ${fmt(worths[i].shareValue)}, privates ${fmt(worths[i].privateValue)})`)
  }

  return lines.join('\n')
}

// ── System Prompt Builder ───────────────────────────────────────────

function buildSystemPrompt(game) {
  const t = game.title
  const title = t.title || 'Unknown'
  const subtitle = t.subtitle ? ` — ${t.subtitle}` : ''
  const designer = t.designer ? ` by ${t.designer}` : ''
  const location = t.location || ''

  // Train names from title config
  const trainNames = (t.trains || []).map(tr => {
    const variants = (tr.variants || []).map(v => v.name)
    return variants.length > 0 ? `${tr.name} (variant: ${variants.join('/')})` : tr.name
  }).join(', ')

  // Corp names
  const corpNames = (t.corporations || []).map(c => c.sym).join(', ')

  // Key mechanics from specialties and config
  const mechanics = []
  if (t.capitalization) mechanics.push(`${t.capitalization} capitalization`)
  if (t.halfPay) mechanics.push('half pay allowed')
  if (t.loans) mechanics.push(`loans (${t.loans.type})`)
  if (t.issueRedeemRule) mechanics.push(`issue/redeem (${t.issueRedeemRule})`)
  if (t.sellMovement && t.sellMovement !== 'down_share') mechanics.push(`sell movement: ${t.sellMovement}`)
  if (t.merger) mechanics.push('mergers')
  if (t.corpCanBuyShares) mechanics.push('corp share trading')
  if (t.trainExport) mechanics.push('train export')

  const specialties = t.specialties || ''

  const lines = [
    `Act strictly as an expert in "${title}${subtitle}"${designer}.`,
    `Maintain 100% focus on ${title} rules, ${location ? `map geography (${location}), ` : ''}trains (${trainNames}), and game-specific mechanics.`,
    `Do NOT mix, import, or hallucinate mechanics, trains, rules, or terminologies from any other 18XX title.`,
    `If a requested concept does not exist specifically in ${title}, state that clearly.`,
    '',
    `Key mechanics: ${mechanics.join(', ') || 'standard 18xx'}.`,
    `Corporations: ${corpNames}.`,
  ]

  if (specialties) lines.push(`Specialties: ${specialties}.`)

  // Share structure
  const shares = t.shares || [20, 10, 10, 10, 10, 10, 10, 10, 10]
  const presPct = shares[0]
  const regPct = shares[1] || shares[0]
  const numShares = shares.length
  lines.push(`Shares: ${presPct}% president + ${numShares - 1}x${regPct}% (${numShares}-cert corps). Float at ${t.floatPercent || 60}%.`)

  // Sell/dividend movement summary
  const divMove = t.dividendMovement || 'standard'
  lines.push(`Dividend movement: ${divMove}. Sell movement: ${t.sellMovement || 'down_share'}.`)

  return lines.join('\n')
}
