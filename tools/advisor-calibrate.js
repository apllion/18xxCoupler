#!/usr/bin/env node
// advisor-calibrate.js — replay 18xx.games files, run advisor at each OR,
// compare tips vs what actually happened to calibrate advisor accuracy.
//
// Usage:
//   node tools/advisor-calibrate.js game1.json.gz game2.json.gz ...
//   node tools/advisor-calibrate.js games/*.json.gz
//
// Outputs per-tip accuracy stats: how often winners followed the advice,
// how often losers ignored it.

import { readFileSync } from 'fs'
import { gunzipSync } from 'zlib'
import { replayWithCallbacks } from '../src/engine/import18xxGames.js'
import { playerAdvisorTips, corpAdvisorTips } from '../src/engine/rules/advisorTips.js'
import { allNetWorths } from '../src/engine/rules/netWorth.js'
import { playerSharePercent } from '../src/engine/player.js'
import { corpPrice } from '../src/engine/stockMarket.js'

// --- Stats accumulator ---
const tipStats = {}
// tipStats[tipId] = { total, winnerHad, loserHad, winnerFollowed, loserIgnored }

function initTip(id) {
  if (!tipStats[id]) tipStats[id] = { total: 0, winnerHad: 0, loserHad: 0, examples: [] }
}

// --- Load game JSON (gzipped or plain) ---
function loadGame(path) {
  const raw = readFileSync(path)
  try {
    // Try gzipped first
    return JSON.parse(gunzipSync(raw).toString())
  } catch {
    // Plain JSON
    return JSON.parse(raw.toString())
  }
}

// --- Determine winner from final state ---
function getWinnerIds(state) {
  const worths = allNetWorths(state)
  if (worths.length === 0) return []
  const maxTotal = worths[0].total
  return worths.filter(w => w.total === maxTotal).map(w => w.playerId)
}

// --- Track what actually happened after a tip ---
function trackNextActions(state, actionLog, fromIdx, count = 5) {
  const actions = []
  for (let i = fromIdx; i < Math.min(actionLog.length, fromIdx + count); i++) {
    actions.push(state.actionLog[i]?.action?.type || '?')
  }
  return actions
}

// --- Process one game ---
function processGame(gameJson, filePath) {
  const orSnapshots = []

  try {
    const finalState = replayWithCallbacks(gameJson, (state, orNum, actionIdx, event) => {
      if (event === 'or_start' || event === 'sr_start') {
        // Snapshot advisor tips at this boundary
        const floatedCorps = state.corporations.filter(c => c.floated)
        if (floatedCorps.length === 0) return

        const playerTips = {}
        for (const p of state.players) {
          const tips = playerAdvisorTips(state, p.id)
          if (tips.length > 0) playerTips[p.id] = tips
        }

        const corpTips = {}
        for (const c of floatedCorps) {
          const tips = corpAdvisorTips(state, c.sym)
          if (tips.length > 0) corpTips[c.sym] = tips
        }

        orSnapshots.push({ orNum, event, actionIdx, playerTips, corpTips })
      }
    })

    if (!finalState) return null

    // Determine winner
    const winnerIds = getWinnerIds(finalState)
    if (winnerIds.length === 0) return null

    const worths = allNetWorths(finalState)
    const winnerNames = winnerIds.map(id => finalState.players.find(p => p.id === id)?.name || id)

    // Score each tip snapshot
    for (const snap of orSnapshots) {
      // Player tips
      for (const [playerId, tips] of Object.entries(snap.playerTips)) {
        const isWinner = winnerIds.includes(playerId)
        for (const tip of tips) {
          const baseId = tip.id.replace(/-[A-Z&]+$/, '') // strip corp suffix for grouping
          initTip(baseId)
          tipStats[baseId].total++
          if (isWinner) {
            tipStats[baseId].winnerHad++
          } else {
            tipStats[baseId].loserHad++
          }
          // Keep a few examples
          if (tipStats[baseId].examples.length < 3) {
            tipStats[baseId].examples.push({
              game: gameJson.id || filePath,
              or: snap.orNum,
              player: finalState.players.find(p => p.id === playerId)?.name,
              isWinner,
              text: tip.text,
              severity: tip.severity,
            })
          }
        }
      }

      // Corp tips — attribute to president
      for (const [corpSym, tips] of Object.entries(snap.corpTips)) {
        const pres = finalState.players.find(p =>
          p.shares.some(s => s.corpSym === corpSym && s.isPresident)
        )
        if (!pres) continue
        const isWinner = winnerIds.includes(pres.id)
        for (const tip of tips) {
          const baseId = `corp:${tip.id.replace(/-.*$/, '')}`
          initTip(baseId)
          tipStats[baseId].total++
          if (isWinner) {
            tipStats[baseId].winnerHad++
          } else {
            tipStats[baseId].loserHad++
          }
          if (tipStats[baseId].examples.length < 3) {
            tipStats[baseId].examples.push({
              game: gameJson.id || filePath,
              or: snap.orNum,
              corp: corpSym,
              president: pres.name,
              isWinner,
              text: tip.text,
              severity: tip.severity,
            })
          }
        }
      }
    }

    return { title: gameJson.title, id: gameJson.id, winners: winnerNames, ors: orSnapshots.length, worths }
  } catch (err) {
    console.error(`  Error: ${err.message}`)
    return null
  }
}

// --- Main ---
const args = process.argv.slice(2)
if (args.length === 0) {
  console.log('Usage: node tools/advisor-calibrate.js game1.json.gz game2.json.gz ...')
  console.log('')
  console.log('Replays 18xx.games files, runs advisor tips at each OR boundary,')
  console.log('and reports which tips correlate with winning vs losing.')
  process.exit(1)
}

console.log(`\nAdvisor Calibration — processing ${args.length} game(s)\n`)

let processed = 0
let failed = 0
const titleCounts = {}

for (const path of args) {
  const name = path.split('/').pop()
  process.stdout.write(`  ${name}... `)
  try {
    const json = loadGame(path)
    const result = processGame(json, path)
    if (result) {
      processed++
      titleCounts[result.title] = (titleCounts[result.title] || 0) + 1
      console.log(`OK — ${result.title} ${result.ors} ORs, winner: ${result.winners.join(', ')}`)
    } else {
      failed++
      console.log('SKIP (no result)')
    }
  } catch (err) {
    failed++
    console.log(`FAIL: ${err.message}`)
  }
}

// --- Report ---
console.log(`\n${'='.repeat(70)}`)
console.log(`Processed: ${processed} games, Failed: ${failed}`)
console.log(`Titles: ${Object.entries(titleCounts).map(([t, n]) => `${t}(${n})`).join(', ')}`)
console.log(`${'='.repeat(70)}\n`)

// Sort tips by total occurrences
const sorted = Object.entries(tipStats)
  .sort((a, b) => b[1].total - a[1].total)

console.log('TIP ACCURACY REPORT')
console.log(`${'─'.repeat(70)}`)
console.log(`${'Tip ID'.padEnd(25)} ${'Total'.padStart(6)} ${'Winner'.padStart(7)} ${'Loser'.padStart(7)} ${'W%'.padStart(5)} ${'L%'.padStart(5)}  Signal`)
console.log(`${'─'.repeat(70)}`)

for (const [id, s] of sorted) {
  const winPct = s.total > 0 ? Math.round((s.winnerHad / s.total) * 100) : 0
  const losePct = s.total > 0 ? Math.round((s.loserHad / s.total) * 100) : 0

  // Signal: if losers get this tip way more than winners, it's a good warning
  // If winners get it more, it's noise or opportunity
  let signal = ''
  if (s.total < 5) signal = '(low data)'
  else if (losePct > winPct + 15) signal = '✓ GOOD WARNING — losers get this more'
  else if (winPct > losePct + 15) signal = '→ correlates with winning'
  else signal = '~ neutral'

  console.log(`${id.padEnd(25)} ${String(s.total).padStart(6)} ${String(s.winnerHad).padStart(7)} ${String(s.loserHad).padStart(7)} ${String(winPct + '%').padStart(5)} ${String(losePct + '%').padStart(5)}  ${signal}`)
}

console.log(`${'─'.repeat(70)}\n`)

// Show examples for top tips
console.log('EXAMPLES (up to 3 per tip)')
console.log(`${'─'.repeat(70)}`)
for (const [id, s] of sorted.slice(0, 10)) {
  if (s.examples.length === 0) continue
  console.log(`\n  ${id}:`)
  for (const ex of s.examples) {
    const who = ex.player || `${ex.corp} (pres: ${ex.president})`
    console.log(`    [${ex.severity}] ${who} ${ex.isWinner ? 'WINNER' : 'loser'} OR${ex.or}: "${ex.text}"`)
  }
}

console.log(`\n${'─'.repeat(70)}`)
console.log('Done.\n')
