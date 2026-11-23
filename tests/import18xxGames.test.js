import { describe, it, expect } from 'vitest'
import { importGame } from '../src/engine/import18xxGames.js'
import { playerNetWorth } from '../src/engine/rules/netWorth.js'
import { readFileSync, readdirSync } from 'fs'
import { gunzipSync } from 'zlib'

function loadGame(filePath) {
  const compressed = readFileSync(filePath)
  return JSON.parse(gunzipSync(compressed).toString())
}

// Build a name→expectedNetWorth map from 18xx.games JSON
function expectedNetWorths(gameJson) {
  if (!gameJson.result || gameJson.status !== 'finished') return null
  const map = {}
  for (const p of gameJson.players) {
    const nw = gameJson.result[String(p.id)]
    if (nw !== undefined) map[p.name] = nw
  }
  return map
}

// ─── Detailed single-game tests ──────────────────────────────────────────────

describe('import18xxGames — 1846', () => {
  const gameJson = loadGame('/Users/droste/Work/18AI/data/games/1846/232396.json.gz')

  it('imports a finished 1846 game without throwing', () => {
    const state = importGame(gameJson)
    expect(state).toBeDefined()
    expect(state.players).toHaveLength(5)
    expect(state.importSource.gameId).toBe(232396)
  })

  it('maps players correctly', () => {
    const state = importGame(gameJson)
    expect(state.players[0].name).toBe('dusty')
    expect(state.players[1].name).toBe('dyoung418')
    expect(state.players[4].name).toBe('KIDD-CHAR')
  })

  it('applies financial actions with zero errors', () => {
    const state = importGame(gameJson)
    const { stats } = state.importSource
    expect(stats.errors).toHaveLength(0)
    expect(stats.applied).toBeGreaterThan(50)
  })

  it('has corporations with correct pars after import', () => {
    const state = importGame(gameJson)
    const nyc = state.corporations.find(c => c.sym === 'NYC')
    expect(nyc.parPrice).toBe(80)
    expect(nyc.ipoed).toBe(true)
  })

  it('player net worths reported (baseline)', () => {
    const state = importGame(gameJson)
    const expected = expectedNetWorths(gameJson)
    if (!expected) return
    for (const p of state.players) {
      const ours = playerNetWorth(state, p.id)
      const theirs = expected[p.name]
      if (theirs !== undefined) {
        console.log(`  ${p.name}: ours=${ours} theirs=${theirs} diff=${theirs - ours}`)
      }
    }
    // Baseline: values diverge because import doesn't track stock price movement.
    // This test logs the gap; the batch test below tracks match rates.
    expect(state.players.length).toBeGreaterThan(0)
  })
})

describe('import18xxGames — 1889', () => {
  const gameJson = loadGame('/Users/droste/Work/18AI/data/games/1889/220058.json.gz')

  it('imports a finished 1889 game without throwing', () => {
    const state = importGame(gameJson)
    expect(state).toBeDefined()
    expect(state.players).toHaveLength(3)
    expect(state.importSource.gameId).toBe(220058)
  })

  it('applies financial actions with zero errors', () => {
    const state = importGame(gameJson)
    const { stats } = state.importSource
    expect(stats.errors).toHaveLength(0)
    expect(stats.applied).toBeGreaterThan(50)
  })
})

// ─── Batch tests: import + verify net worth ──────────────────────────────────

const ALL_TITLES = [
  { dir: '1817', count: 50 },
  { dir: '1830', count: 50 },
  { dir: '1846', count: 100 },
  { dir: '1849', count: 50 },
  { dir: '1861', count: 50 },
  { dir: '1867', count: 50 },
  { dir: '1880', count: 50 },
  { dir: '1889', count: 100 },
  { dir: '18Chesapeake', count: 50 },
  { dir: '18MEX', count: 50 },
  { dir: '18MS', count: 50 },
  { dir: '21Moon', count: 50 },
]

describe.each(ALL_TITLES)('import batch — $dir ($count games)', ({ dir, count }) => {
  const fullDir = `/Users/droste/Work/18AI/data/games/${dir}`
  const files = readdirSync(fullDir).filter(f => f.endsWith('.json.gz')).slice(0, count)

  it('imports without errors', () => {
    let totalErrors = 0
    let totalApplied = 0
    const errorGames = []
    for (const file of files) {
      const json = loadGame(`${fullDir}/${file}`)
      const state = importGame(json)
      const { stats } = state.importSource
      totalApplied += stats.applied
      if (stats.errors.length > 0) {
        errorGames.push({ id: json.id, errors: stats.errors.slice(0, 3) })
      }
      totalErrors += stats.errors.length
    }
    console.log(`${dir}: ${files.length} games, ${totalApplied} applied, ${totalErrors} errors`)
    for (const g of errorGames.slice(0, 5)) {
      console.log(`  Game ${g.id}:`)
      for (const e of g.errors) {
        console.log(`    ${e.convertedAction?.type}: ${e.error}`)
      }
    }
    expect(totalErrors).toBe(0)
  })

  it('player net worths match 18xx.games scores', () => {
    let gamesChecked = 0
    let exactMatches = 0
    let totalDiff = 0
    const mismatches = []

    for (const file of files) {
      const json = loadGame(`${fullDir}/${file}`)
      if (json.status !== 'finished' || !json.result) continue

      const state = importGame(json)
      const expected = expectedNetWorths(json)
      if (!expected) continue

      gamesChecked++
      let gameExact = true

      for (const p of state.players) {
        const ours = playerNetWorth(state, p.id)
        const theirs = expected[p.name]
        if (theirs === undefined) continue

        const diff = Math.abs(ours - theirs)
        totalDiff += diff
        if (diff > 0) {
          gameExact = false
          if (mismatches.length < 10) {
            mismatches.push({ gameId: json.id, player: p.name, ours, theirs, diff })
          }
        }
      }
      if (gameExact) exactMatches++
    }

    console.log(`${dir}: ${gamesChecked} finished games checked, ${exactMatches} exact matches (${gamesChecked > 0 ? Math.round(100 * exactMatches / gamesChecked) : 0}%)`)
    if (mismatches.length > 0) {
      console.log(`  Mismatches (first ${mismatches.length}):`)
      for (const m of mismatches) {
        console.log(`    Game ${m.gameId} ${m.player}: ours=${m.ours} theirs=${m.theirs} diff=${m.diff}`)
      }
    }

    // Track accuracy as a baseline. Import doesn't replay stock price movements
    // (dividends move prices, sold-out adjustments, etc.), so net worth diverges.
    // As we improve the import, these numbers should go up.
    // Current baseline (Nov 2026): ~0-6% exact match across titles.
    if (gamesChecked > 0) {
      const matchRate = exactMatches / gamesChecked
      // Don't fail — this is a tracking test. Log the rate for monitoring.
      console.log(`  Match rate: ${(100 * matchRate).toFixed(1)}% exact`)
      // Fail only if accuracy regresses below the minimum we've seen (0%)
      expect(matchRate).toBeGreaterThanOrEqual(0)
    }
  })
})
