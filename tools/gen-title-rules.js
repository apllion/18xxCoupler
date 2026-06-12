#!/usr/bin/env node
// Generate docs/title-rules.md from title configs.
// Usage: node -e "import('./tools/gen-title-rules.js')"

import { allTitles } from '../src/titles/index.js'
import { writeFileSync } from 'fs'

const titles = allTitles().sort((a, b) => a.title.localeCompare(b.title))

let out = '# Title Rules Reference\n\n'
out += 'Auto-generated from title configs — run `node --input-type=module tools/gen-title-rules.js` to update.\n\n'

out += '| Title | Cap | Float | Shares | Max Own | Sell Move | Sell After | Unsold Div | Div Move | Pool Limit | Sell Order | Half | Loans | Shorts | Corp Trade | Merger | Terrain |\n'
out += '|-------|-----|-------|--------|---------|----------|------------|------------|----------|------------|------------|------|-------|--------|------------|--------|---------|\n'

for (const t of titles) {
  const cap = (t.capitalization || 'full').slice(0, 4)
  const floatPct = (t.floatPercent || 60) + '%'
  const shares = t.shares || [20, 10, 10, 10, 10, 10, 10, 10, 10]
  const shareStr = shares[0] + '/' + (shares[1] || shares[0]) + 'x' + shares.length
  const maxOwn = t.maxOwnership ? (typeof t.maxOwnership === 'number' ? t.maxOwnership + '%' : 'varies') : ''
  const sellMove = (t.sellMovement || 'down_share').replace('down_', 'd/').replace('left_', 'l/').replace('_pres', '+p')
  const sellAfter = (t.sellAfter || 'first_sr').replace('first_sr', '').replace(/_/g, ' ')
  const unsoldDiv = t.unsoldShareDividends || 'market'
  const divMove = (t.dividendMovement || 'standard').replace('standard', '')
  const mktLimit = (t.marketShareLimit != null ? t.marketShareLimit : 50) + '%'
  const sellOrder = (t.sellBuyOrder || 'sell_buy').replace('sell_buy_sell', 'sbs').replace('sell_buy', 'sb')
  const halfPay = t.halfPay ? '✓' : ''
  const loans = t.loans ? '✓' : ''
  const shorts = t.shorts ? '✓' : ''
  const corpTrade = t.corpCanBuyShares ? '✓' : ''
  const merger = t.merger ? t.merger.type.replace(/_/g, ' ') : ''
  const terrain = (t.terrainCosts || []).join(',') || ''

  out += '| ' + [
    t.title, cap, floatPct, shareStr, maxOwn, sellMove, sellAfter, unsoldDiv, divMove, mktLimit, sellOrder, halfPay, loans, shorts, corpTrade, merger, terrain
  ].join(' | ') + ' |\n'
}

writeFileSync('docs/title-rules.md', out)
console.log('Written docs/title-rules.md (' + titles.length + ' titles)')
