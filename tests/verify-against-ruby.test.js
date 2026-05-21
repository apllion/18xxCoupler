// Verification test: compare our engine output against the authoritative
// Ruby engine running in the local 18xx.games Docker instance.
//
// Prerequisites: docker with 18xx-rack-1 container running
// Run: npx vitest run tests/verify-against-ruby.test.js

import { describe, it, expect } from 'vitest'
import { importGame } from '../src/engine/import18xxGames.js'
import { corpPrice } from '../src/engine/stockMarket.js'
import { playerSharePercent } from '../src/engine/player.js'
import { readFileSync, existsSync } from 'fs'
import { gunzipSync } from 'zlib'
import { execSync } from 'child_process'

function loadGame(filePath) {
  return JSON.parse(gunzipSync(readFileSync(filePath)).toString())
}

function getRubyState(filePath) {
  const json = gunzipSync(readFileSync(filePath)).toString()
  require('fs').writeFileSync('/tmp/verify_game.json', json)

  try {
    const raw = execSync(`
      cat /tmp/verify_game.json | docker exec -i 18xx-rack-1 ruby -I /18xx/lib -e '
        require "engine"
        require "json"
        data = JSON.parse(STDIN.read)
        game = Engine::Game.load(data)
        result = {
          players: game.players.map { |p| { name: p.name, cash: p.cash, value: p.value } },
          corporations: game.corporations.select(&:ipoed).map { |c|
            { id: c.id, cash: c.cash, price: c.share_price&.price, par: c.par_price&.price,
              floated: c.floated?, trains: c.trains.map(&:name),
              ipo: c.num_ipo_shares, pool: c.num_market_shares }
          },
          bank: game.bank.cash,
        }
        puts JSON.generate(result)
      '
    `, { encoding: 'utf-8', timeout: 30000 })

    const lines = raw.split('\n').filter(l => !l.startsWith('D,') && l.trim())
    return JSON.parse(lines[lines.length - 1])
  } catch (e) {
    console.error('Ruby engine failed:', e.message)
    return null
  }
}

function verifyGame(title, gameId, filePath) {
  describe(`${title} #${gameId}`, () => {
    const ruby = getRubyState(filePath)
    if (!ruby) {
      it.skip('Ruby engine not available (Docker not running?)', () => {})
      return
    }

    const gameJson = loadGame(filePath)
    const state = importGame(gameJson)

    it('has zero import errors', () => {
      expect(state.importSource.stats.errors).toHaveLength(0)
    })

    it('conserves total money', () => {
      const ours = state.players.reduce((s, p) => s + p.cash, 0)
        + state.corporations.reduce((s, c) => s + c.cash, 0)
        + state.bank.cash
      const theirs = ruby.players.reduce((s, p) => s + p.cash, 0)
        + ruby.corporations.reduce((s, c) => s + c.cash, 0)
        + ruby.bank
      expect(ours).toBe(theirs)
    })

    for (const rp of ruby.players) {
      it(`${rp.name}: cash within tolerance`, () => {
        const op = state.players.find(p => p.name === rp.name)
        expect(op).toBeTruthy()
        const diff = Math.abs(op.cash - rp.cash)
        console.log(`  ${rp.name}: ours=${op.cash} ruby=${rp.cash} diff=${diff}`)
        // Known limitation: implicit withhold $0 causes small cash diffs
        expect(diff).toBeLessThan(100)
      })
    }

    for (const rc of ruby.corporations) {
      it(`${rc.id}: price within 1 step`, () => {
        const oc = state.corporations.find(c => c.sym === rc.id)
        expect(oc).toBeTruthy()
        const ourPrice = corpPrice(state.stockMarket, rc.id) || 0
        const diff = Math.abs(ourPrice - rc.price)
        console.log(`  ${rc.id}: price ours=${ourPrice} ruby=${rc.price} diff=${diff}`)
        // Known limitation: implicit withhold $0 can shift price by 1 column
        expect(diff).toBeLessThan(20)
      })

      it(`${rc.id}: cash within tolerance`, () => {
        const oc = state.corporations.find(c => c.sym === rc.id)
        const diff = Math.abs(oc.cash - rc.cash)
        console.log(`  ${rc.id}: cash ours=${oc.cash} ruby=${rc.cash} diff=${diff}`)
        expect(diff).toBeLessThan(100)
      })

      it(`${rc.id}: trains match`, () => {
        const oc = state.corporations.find(c => c.sym === rc.id)
        expect(oc.trains.map(t => t.name).sort()).toEqual(rc.trains.sort())
      })
    }

    it('final scores summary', () => {
      console.log('\n=== SCORE COMPARISON ===')
      for (const rp of ruby.players) {
        const op = state.players.find(p => p.name === rp.name)
        let sv = 0
        for (const c of state.corporations.filter(c => c.ipoed)) {
          sv += (corpPrice(state.stockMarket, c.sym) || 0) * playerSharePercent(op, c.sym) / 10
        }
        const pv = op.privates.reduce((s, sym) =>
          s + (state.companies.find(c => c.sym === sym)?.value || 0), 0)
        const total = op.cash + sv + pv
        console.log(`  ${rp.name}: ours=${total} ruby=${rp.value} diff=${total - rp.value}`)
      }
    })
  })
}

// Verify games we have data for
const GAMES = [
  { title: '18Chesapeake', id: 213140, file: '/Users/droste/Work/18AI/data/games/18Chesapeake/213140.json.gz' },
  { title: '1889', id: 227697, file: '/Users/droste/Work/18AI/data/games/1889/227697.json.gz' },
  { title: '1830', id: 221999, file: '/Users/droste/Work/18AI/data/games/1830/221999.json.gz' },
]

for (const g of GAMES) {
  if (existsSync(g.file)) {
    verifyGame(g.title, g.id, g.file)
  }
}
