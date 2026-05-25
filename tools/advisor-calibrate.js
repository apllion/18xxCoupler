#!/usr/bin/env node
// advisor-calibrate.js — replay 18xx.games files, run advisor at each OR,
// compare tips vs what actually happened to calibrate advisor accuracy.
//
// Usage:
//   node tools/advisor-calibrate.js ../18AI/data/games
//   node tools/advisor-calibrate.js ../18AI/data/games/1889
//   node tools/advisor-calibrate.js game1.json.gz game2.json.gz ...
//
// Auto-detects directories (processes all .json.gz per title) vs individual files.
// Outputs per-title AND aggregate results.

import { readFileSync, readdirSync, statSync } from 'fs'
import { gunzipSync } from 'zlib'
import { join, basename } from 'path'
import { replayWithCallbacks } from '../src/engine/import18xxGames.js'
import { playerAdvisorTips, corpAdvisorTips } from '../src/engine/rules/advisorTips.js'
import { allNetWorths } from '../src/engine/rules/netWorth.js'

// --- Stats accumulator ---
function createStats() {
  return {}
}

function initTip(stats, id) {
  if (!stats[id]) stats[id] = { total: 0, winnerHad: 0, loserHad: 0, examples: [] }
}

function mergeTipInto(target, source) {
  for (const [id, s] of Object.entries(source)) {
    if (!target[id]) target[id] = { total: 0, winnerHad: 0, loserHad: 0, examples: [] }
    target[id].total += s.total
    target[id].winnerHad += s.winnerHad
    target[id].loserHad += s.loserHad
    if (target[id].examples.length < 3) {
      target[id].examples.push(...s.examples.slice(0, 3 - target[id].examples.length))
    }
  }
}

// --- Load game JSON (gzipped or plain) ---
function loadGame(path) {
  const raw = readFileSync(path)
  try {
    return JSON.parse(gunzipSync(raw).toString())
  } catch {
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

// --- Process one game ---
function processGame(gameJson, filePath, tipStats) {
  const orSnapshots = []

  try {
    const finalState = replayWithCallbacks(gameJson, (state, orNum, actionIdx, event) => {
      if (event === 'or_start' || event === 'sr_start') {
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

    const winnerIds = getWinnerIds(finalState)
    if (winnerIds.length === 0) return null

    const winnerNames = winnerIds.map(id => finalState.players.find(p => p.id === id)?.name || id)

    for (const snap of orSnapshots) {
      for (const [playerId, tips] of Object.entries(snap.playerTips)) {
        const isWinner = winnerIds.includes(playerId)
        for (const tip of tips) {
          const baseId = tip.id.replace(/-[A-Z&]+$/i, '')
          initTip(tipStats, baseId)
          tipStats[baseId].total++
          if (isWinner) tipStats[baseId].winnerHad++
          else tipStats[baseId].loserHad++
          if (tipStats[baseId].examples.length < 3) {
            tipStats[baseId].examples.push({
              game: gameJson.id || filePath,
              or: snap.orNum,
              player: finalState.players.find(p => p.id === playerId)?.name,
              isWinner, text: tip.text, severity: tip.severity,
            })
          }
        }
      }

      for (const [corpSym, tips] of Object.entries(snap.corpTips)) {
        const pres = finalState.players.find(p =>
          p.shares.some(s => s.corpSym === corpSym && s.isPresident)
        )
        if (!pres) continue
        const isWinner = winnerIds.includes(pres.id)
        for (const tip of tips) {
          const baseId = `corp:${tip.id.replace(/-.*$/, '')}`
          initTip(tipStats, baseId)
          tipStats[baseId].total++
          if (isWinner) tipStats[baseId].winnerHad++
          else tipStats[baseId].loserHad++
          if (tipStats[baseId].examples.length < 3) {
            tipStats[baseId].examples.push({
              game: gameJson.id || filePath,
              or: snap.orNum, corp: corpSym, president: pres.name,
              isWinner, text: tip.text, severity: tip.severity,
            })
          }
        }
      }
    }

    return { title: gameJson.title, id: gameJson.id, winners: winnerNames, ors: orSnapshots.length }
  } catch {
    return null
  }
}

// --- Print report ---
function printReport(title, stats, gameCount) {
  const sorted = Object.entries(stats).sort((a, b) => b[1].total - a[1].total)
  if (sorted.length === 0) { console.log('  (no tips generated)\n'); return }

  console.log(`${'Tip ID'.padEnd(25)} ${'Total'.padStart(6)} ${'Winner'.padStart(7)} ${'Loser'.padStart(7)} ${'W%'.padStart(5)} ${'L%'.padStart(5)}  Signal`)
  console.log(`${'─'.repeat(80)}`)

  for (const [id, s] of sorted) {
    const winPct = s.total > 0 ? Math.round((s.winnerHad / s.total) * 100) : 0
    const losePct = s.total > 0 ? Math.round((s.loserHad / s.total) * 100) : 0
    let signal = ''
    if (s.total < 5) signal = '(low data)'
    else if (losePct > winPct + 15) signal = '✓ WARNING — losers get this more'
    else if (winPct > losePct + 15) signal = '★ correlates with winning'
    else signal = '~ neutral'

    console.log(`${id.padEnd(25)} ${String(s.total).padStart(6)} ${String(s.winnerHad).padStart(7)} ${String(s.loserHad).padStart(7)} ${String(winPct + '%').padStart(5)} ${String(losePct + '%').padStart(5)}  ${signal}`)
  }
  console.log('')
}

// --- Resolve file list from args ---
function resolveFiles(args) {
  // Returns { title: [files] } map
  const titleFiles = {}

  for (const arg of args) {
    try {
      const st = statSync(arg)
      if (st.isDirectory()) {
        // Check if it contains title subdirs or game files directly
        const entries = readdirSync(arg)
        const hasSubdirs = entries.some(e => {
          try { return statSync(join(arg, e)).isDirectory() } catch { return false }
        })
        if (hasSubdirs) {
          // Root games dir — iterate title subdirs
          for (const sub of entries) {
            const subPath = join(arg, sub)
            try {
              if (!statSync(subPath).isDirectory()) continue
              const files = readdirSync(subPath)
                .filter(f => f.endsWith('.json') || f.endsWith('.json.gz'))
                .map(f => join(subPath, f))
              if (files.length > 0) {
                titleFiles[sub] = (titleFiles[sub] || []).concat(files)
              }
            } catch {}
          }
        } else {
          // Single title dir
          const title = basename(arg)
          const files = entries
            .filter(f => f.endsWith('.json') || f.endsWith('.json.gz'))
            .map(f => join(arg, f))
          if (files.length > 0) {
            titleFiles[title] = (titleFiles[title] || []).concat(files)
          }
        }
      } else {
        // Individual file
        titleFiles['mixed'] = (titleFiles['mixed'] || []).concat([arg])
      }
    } catch {}
  }

  return titleFiles
}

// --- Main ---
const args = process.argv.slice(2)
if (args.length === 0) {
  console.log('Usage:')
  console.log('  node tools/advisor-calibrate.js ../18AI/data/games          # all titles')
  console.log('  node tools/advisor-calibrate.js ../18AI/data/games/1889     # single title')
  console.log('  node tools/advisor-calibrate.js game1.json.gz game2.json.gz # specific files')
  process.exit(1)
}

const titleFiles = resolveFiles(args)
const titles = Object.keys(titleFiles).sort()

console.log(`\nAdvisor Calibration`)
console.log(`${'═'.repeat(80)}`)
for (const t of titles) console.log(`  ${t}: ${titleFiles[t].length} games`)
console.log(`  Total: ${Object.values(titleFiles).reduce((s, f) => s + f.length, 0)} games`)
console.log(`${'═'.repeat(80)}\n`)

const allStats = createStats()
const titleResults = {}

for (const title of titles) {
  const files = titleFiles[title]
  const titleStats = createStats()
  let processed = 0
  let failed = 0

  console.log(`── ${title} (${files.length} games) ──`)

  for (let i = 0; i < files.length; i++) {
    if (i % 50 === 0 && i > 0) process.stdout.write(`  ${i}/${files.length}...\n`)
    try {
      const json = loadGame(files[i])
      const result = processGame(json, files[i], titleStats)
      if (result) processed++
      else failed++
    } catch {
      failed++
    }
  }

  console.log(`  Processed: ${processed}, Failed: ${failed}\n`)
  printReport(title, titleStats, processed)
  mergeTipInto(allStats, titleStats)
  titleResults[title] = { processed, failed, stats: titleStats }
}

// --- Aggregate report ---
console.log(`${'═'.repeat(80)}`)
console.log(`AGGREGATE — ALL TITLES`)
console.log(`${'═'.repeat(80)}\n`)

const totalProcessed = Object.values(titleResults).reduce((s, r) => s + r.processed, 0)
console.log(`Total games: ${totalProcessed}\n`)
printReport('ALL', allStats, totalProcessed)

// --- Examples for top tips ---
const topTips = Object.entries(allStats).sort((a, b) => b[1].total - a[1].total).slice(0, 10)
console.log('TOP TIP EXAMPLES')
console.log(`${'─'.repeat(80)}`)
for (const [id, s] of topTips) {
  if (s.examples.length === 0) continue
  console.log(`\n  ${id}:`)
  for (const ex of s.examples) {
    const who = ex.player || `${ex.corp} (pres: ${ex.president})`
    console.log(`    [${ex.severity}] ${who} ${ex.isWinner ? 'WINNER' : 'loser'} OR${ex.or}: "${ex.text}"`)
  }
}
console.log(`\n${'═'.repeat(80)}`)
console.log('Done.\n')
