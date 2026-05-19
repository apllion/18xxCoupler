import { describe, it, expect } from 'vitest'
import { importGame } from '../src/engine/import18xxGames.js'
import { readFileSync, readdirSync } from 'fs'
import { gunzipSync } from 'zlib'

function loadGame(filePath) {
  const compressed = readFileSync(filePath)
  return JSON.parse(gunzipSync(compressed).toString())
}

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
    console.log(`Import stats: ${stats.applied} applied, ${stats.skipped} skipped, ${stats.errors.length} errors out of ${stats.total} total`)
    expect(stats.errors).toHaveLength(0)
    expect(stats.applied).toBeGreaterThan(50)
  })

  it('has corporations with correct pars after import', () => {
    const state = importGame(gameJson)
    const nyc = state.corporations.find(c => c.sym === 'NYC')
    expect(nyc.parPrice).toBe(80)
    expect(nyc.ipoed).toBe(true)
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
    console.log(`1889 Import stats: ${stats.applied} applied, ${stats.skipped} skipped, ${stats.errors.length} errors out of ${stats.total} total`)
    expect(stats.errors).toHaveLength(0)
    expect(stats.applied).toBeGreaterThan(50)
  })
})

// Batch tests for all supported titles
const ALL_TITLES = [
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
]

describe.each(ALL_TITLES)('import batch — $dir ($count games)', ({ dir, count }) => {
  const fullDir = `/Users/droste/Work/18AI/data/games/${dir}`
  const files = readdirSync(fullDir).filter(f => f.endsWith('.json.gz')).slice(0, count)

  it(`imports without errors`, () => {
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
})
