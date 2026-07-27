// Debug script: replay a game and find first point of cash divergence
// Usage: node tests/import-debug.mjs <game-file.json.gz>

import { readFileSync } from 'fs'
import { gunzipSync } from 'zlib'
import { createGame } from '../src/engine/setup.js'
import { applyAction } from '../src/engine/actions.js'
import { getTitle } from '../src/titles/index.js'

const TITLE_MAP = {
  '1830': 'g1830', '1889': 'g1889', '18Chesapeake': 'g18chesapeake',
  '1846': 'g1846', '18MS': 'g18ms',
}

function totalCash(state) {
  return state.players.reduce((s, p) => s + p.cash, 0)
    + state.corporations.reduce((s, c) => s + c.cash, 0)
    + state.bank.cash
}

function totalShares(state, corpSym) {
  const corp = state.corporations.find(c => c.sym === corpSym)
  if (!corp || !corp.ipoed) return null
  const ph = state.players.reduce((s, p) => s + p.shares.filter(sh => sh.corpSym === corpSym).reduce((s2, sh) => s2 + sh.percent, 0), 0)
  const ch = state.corporations.reduce((s, c) => s + (c.sharesHeld || []).filter(sh => sh.corpSym === corpSym).reduce((s2, sh) => s2 + sh.percent, 0), 0)
  return (corp.ipoShares || 0) + (corp.marketShares || 0) + ph + ch
}

// Minimal action converter (matches import18xxGames.js)
function buildVariantToBaseMap(title) {
  const map = {}
  for (const t of (title.trains || [])) {
    map[t.name] = t.name
    for (const v of (t.variants || [])) map[v.name] = t.name
  }
  return map
}

function parseShareId(shareId) {
  const i = shareId.lastIndexOf('_')
  return { corpSym: shareId.substring(0, i), index: parseInt(shareId.substring(i + 1), 10) }
}

const file = process.argv[2]
if (!file) { console.error('Usage: node tests/import-debug.mjs <file>'); process.exit(1) }

const gameJson = JSON.parse(gunzipSync(readFileSync(file)).toString())
const titleId = TITLE_MAP[gameJson.title]
if (!titleId) { console.error(`Unknown title: ${gameJson.title}`); process.exit(1) }

const title = getTitle(titleId)
const state = createGame(title, gameJson.players.map(p => p.name))
const playerMap = {}
gameJson.players.forEach((p, i) => { playerMap[p.id] = `p${i}` })
const variantToBase = buildVariantToBaseMap(title)

// Strip undo/redo
let actions = []
for (const a of gameJson.actions) {
  if (a.type === 'undo') { actions.pop() }
  else if (a.type === 'redo' || a.type.startsWith('program_')) { /* skip */ }
  else {
    const { auto_actions, ...main } = a
    actions.push(main)
    if (auto_actions) for (const aa of auto_actions) actions.push({ ...aa, id: main.id + 0.5 })
  }
}

// Build revenue map
const revenueMap = {}
for (let i = 0; i < actions.length; i++) {
  const a = actions[i]
  if (a.type === 'run_routes') {
    const rev = (a.routes || []).reduce((s, r) => s + (r.revenue || 0), 0) + (a.subsidy || 0) + (a.extra_revenue || 0)
    for (let j = i + 1; j < actions.length; j++) {
      if (actions[j].type === 'dividend' && actions[j].entity === a.entity) { revenueMap[actions[j].id] = rev; break }
      if (actions[j].type === 'run_routes' && actions[j].entity === a.entity) break
    }
  }
}

const initialCash = totalCash(state)
let errors = 0

for (let i = 0; i < actions.length; i++) {
  const a = actions[i]
  let converted = null

  try {
    switch (a.type) {
      case 'par': {
        const [price, row, col] = a.share_price.split(',').map(Number)
        converted = { type: 'PAR_SHARE', playerId: playerMap[a.entity], corpSym: a.corporation, parPrice: price, row, col }
        break
      }
      case 'buy_shares': {
        const shares = a.shares || []
        for (const sid of shares) {
          const { corpSym } = parseShareId(sid)
          const corp = state.corporations.find(c => c.sym === corpSym)
          const source = corp?.ipoShares > 0 ? 'ipo' : 'market'
          const pct = shares.length === 1 ? (a.percent || 10) : 10
          const act = { type: 'BUY_SHARE', playerId: playerMap[a.entity], corpSym, source, percent: pct }
          applyAction(state, act)
        }
        converted = null // already applied
        break
      }
      case 'sell_shares': {
        if (!a.shares?.length) break
        const { corpSym } = parseShareId(a.shares[0])
        converted = { type: 'SELL_SHARES', playerId: playerMap[a.entity], corpSym, percent: a.percent || a.shares.length * 10 }
        break
      }
      case 'dividend': {
        const rev = revenueMap[a.id] ?? 0
        if (a.kind === 'withhold') converted = { type: 'WITHHOLD_DIVIDEND', corpSym: a.entity, totalRevenue: rev }
        else if (a.kind === 'half') converted = { type: 'HALF_DIVIDEND', corpSym: a.entity, totalRevenue: rev }
        else converted = { type: 'PAY_DIVIDEND', corpSym: a.entity, totalRevenue: rev }
        break
      }
      case 'buy_train': {
        const vn = a.variant || a.train.split('-')[0]
        const tn = variantToBase[vn] || vn
        let fromCorpSym = null
        for (const c of state.corporations) {
          if (c.sym !== a.entity && c.trains.some(t => t.id === a.train || t.name === tn)) {
            fromCorpSym = c.sym; break
          }
        }
        if (!fromCorpSym) {
          const inDepot = state.depot.upcoming.some(t => t.name === tn)
          if (!inDepot) {
            for (const c of state.corporations) {
              if (c.sym !== a.entity && c.trains.some(t => t.name === tn)) { fromCorpSym = c.sym; break }
            }
          }
        }
        converted = { type: 'BUY_TRAIN', corpSym: a.entity, trainName: tn, price: a.price, ...(fromCorpSym ? { fromCorpSym } : {}) }
        break
      }
      case 'buy_company': {
        const co = state.companies.find(c => c.sym === a.company)
        if (co && a.entity_type === 'corporation') {
          converted = { type: 'SELL_PRIVATE', companySym: a.company, fromPlayerId: co.ownerId, toCorpSym: a.entity, price: a.price }
        } else if (co) {
          converted = { type: 'BUY_PRIVATE', playerId: playerMap[a.entity], companySym: a.company, price: a.price }
        }
        break
      }
      case 'bid': {
        converted = { type: 'BUY_PRIVATE', playerId: playerMap[a.entity], companySym: a.company, price: a.price }
        break
      }
      case 'discard_train': {
        const dn = a.variant || a.train.split('-')[0]
        converted = { type: 'DISCARD_TRAIN', corpSym: a.entity, trainName: variantToBase[dn] || dn }
        break
      }
      case 'bankrupt':
        converted = { type: 'PLAYER_BANKRUPT', playerId: playerMap[a.entity] }
        break
      default:
        break // skip non-financial
    }
  } catch (err) {
    console.log(`ACTION ${i} [${a.type}] CONVERT ERROR: ${err.message}`)
    errors++
    continue
  }

  if (!converted) continue

  const cashBefore = totalCash(state)
  try {
    applyAction(state, converted)
  } catch (err) {
    console.log(`ACTION ${i} [${a.type}] APPLY ERROR: ${err.message}`)
    console.log(`  action:`, JSON.stringify(converted))
    errors++
    continue
  }

  const cashAfter = totalCash(state)
  if (cashAfter !== cashBefore) {
    console.log(`ACTION ${i} [${a.type}] CASH LEAK: ${cashBefore} → ${cashAfter} (diff ${cashAfter - cashBefore})`)
    console.log(`  raw:`, JSON.stringify(a).substring(0, 200))
    console.log(`  converted:`, JSON.stringify(converted))
    errors++
    if (errors > 20) { console.log('Too many errors, stopping'); break }
  }

  // Check share invariant for any IPO'd corp
  for (const c of state.corporations.filter(x => x.ipoed)) {
    const ts = totalShares(state, c.sym)
    const corpDef = title.corporations?.find(x => x.sym === c.sym)
    const expected = (corpDef?.shares || title.shares || [20,10,10,10,10,10,10,10,10]).reduce((s,p) => s+p, 0)
    if (ts !== expected) {
      console.log(`ACTION ${i} [${a.type}] SHARE LEAK: ${c.sym} total=${ts} expected=${expected}`)
      console.log(`  ipo=${c.ipoShares} market=${c.marketShares}`)
      errors++
    }
  }
}

console.log(`\nDone. ${errors} errors found. Final cash: ${totalCash(state)} (initial: ${initialCash})`)
console.log('Players:', state.players.map(p => `${p.name}=${p.cash}`).join(', '))
console.log('Corps:', state.corporations.filter(c => c.ipoed).map(c => `${c.sym}=${c.cash}`).join(', '))
console.log('Bank:', state.bank.cash)
