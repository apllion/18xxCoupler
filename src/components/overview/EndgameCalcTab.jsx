// EndgameCalcTab — endgame calculator.
// Each corp: enter stock prices per round. Revenue fixed.
// total = cash + (revenue × rounds) + sum(prices) × shares per corp
// Results live, no button needed.

import { useState, useMemo } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { formatCurrency } from '../../utils/currency.js'
import { corpPrice, projectPrices } from '../../engine/stockMarket.js'
import { playerSharePercent } from '../../engine/player.js'

// Common stock prices across 18xx games
const COMMON_PRICES = [40, 50, 60, 67, 70, 76, 80, 82, 90, 100, 110, 112, 120, 124, 130, 137, 140, 150, 160, 170, 180, 200, 220, 250, 275, 300, 350, 400, 450, 500, 550]

export default function EndgameCalcTab() {
  const game = useGameStore((s) => s.game)
  const skin = useUIStore((s) => s.skin)
  const m = skin === 'moderator'
  const fmt = (n) => formatCurrency(n, game?.title?.currencyFormat || '$')

  const stateFromGame = (projectRounds = 3) => {
    if (!game || !game.corporations.some(c => c.floated)) return null
    const fCorps = game.corporations.filter(c => c.floated)
    const players = game.players.map(p => {
      const shares = {}
      for (const c of fCorps) shares[c.sym] = Math.round(playerSharePercent(p, c.sym) / 10)
      return { name: p.name, cash: p.cash, shares }
    })
    const corps = fCorps.map(c => {
      let lastRev = 0
      for (let i = game.actionLog.length - 1; i >= 0; i--) {
        const a = game.actionLog[i].action
        if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && a.corpSym === c.sym) {
          lastRev = a.totalRevenue || 0; break
        }
      }
      const prices = projectPrices(game.stockMarket, c.sym, projectRounds)
      return { sym: c.sym, color: c.color, revenue: lastRev, prices: prices.length > 0 ? prices : [corpPrice(game.stockMarket, c.sym) || 0] }
    })
    return { players, corps, rounds: projectRounds + 1 }
  }

  const emptyState = {
    players: [
      { name: 'Player 1', cash: 0, shares: { A: 0, B: 0 } },
      { name: 'Player 2', cash: 0, shares: { A: 0, B: 0 } },
      { name: 'Player 3', cash: 0, shares: { A: 0, B: 0 } },
    ],
    corps: [
      { sym: 'A', color: '#d81e3e', revenue: 0, prices: [100] },
      { sym: 'B', color: '#0189d1', revenue: 0, prices: [100] },
    ],
  }

  const initState = useMemo(() => stateFromGame(3) || emptyState, [])

  const [players, setPlayers] = useState(initState.players)
  const [corps, setCorps] = useState(initState.corps)
  const [newCorpName, setNewCorpName] = useState('')
  const [activeCell, setActiveCell] = useState(null) // { sym, roundIdx }

  const loadFromGame = () => {
    const s = stateFromGame(rounds - 1)
    if (!s) return
    setPlayers(s.players)
    setCorps(s.corps)
    if (s.rounds) setRounds(s.rounds)
  }

  // --- Corp helpers ---
  const addCorp = () => {
    const sym = newCorpName.trim().toUpperCase() || String.fromCharCode(65 + corps.length)
    if (corps.some(c => c.sym === sym)) return
    setCorps(prev => [...prev, { sym, color: '#888', revenue: 0, prices: [100] }])
    setPlayers(prev => prev.map(p => ({ ...p, shares: { ...p.shares, [sym]: 0 } })))
    setNewCorpName('')
  }
  const removeCorp = (sym) => {
    if (corps.length <= 1) return
    setCorps(prev => prev.filter(c => c.sym !== sym))
    setPlayers(prev => prev.map(p => { const s = { ...p.shares }; delete s[sym]; return { ...p, shares: s } }))
  }
  const [rounds, setRounds] = useState(() => Math.max(...initState.corps.map(c => c.prices.length), 1))

  const setPrice = (sym, roundIdx, val) => {
    setCorps(prev => prev.map(c => {
      if (c.sym !== sym) return c
      const prices = [...c.prices]
      while (prices.length <= roundIdx) prices.push(prices[prices.length - 1] || 0)
      prices[roundIdx] = parseInt(val) || 0
      return { ...c, prices }
    }))
  }
  const addRound = () => {
    const newRounds = rounds + 1
    setRounds(newRounds)
    setCorps(prev => prev.map(c => {
      if (game?.stockMarket?.corpPositions?.[c.sym]) {
        const projected = projectPrices(game.stockMarket, c.sym, newRounds - 1)
        if (projected.length >= newRounds) return { ...c, prices: projected.slice(0, newRounds) }
      }
      return { ...c, prices: [...c.prices, c.prices[c.prices.length - 1] || 0] }
    }))
  }
  const removeRound = () => {
    if (rounds <= 1) return
    setRounds(r => r - 1)
    setCorps(prev => prev.map(c => ({ ...c, prices: c.prices.slice(0, -1) })))
  }

  // --- Player helpers ---
  const setPlayerField = (idx, field, val) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: field === 'name' ? val : (parseInt(val) || 0) } : p))
  }
  const setPlayerShares = (idx, sym, val) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, shares: { ...p.shares, [sym]: parseInt(val) || 0 } } : p))
  }
  const addPlayer = () => {
    const shares = {}
    corps.forEach(c => { shares[c.sym] = 0 })
    setPlayers(prev => [...prev, { name: `Player ${prev.length + 1}`, cash: 0, shares }])
  }
  const removePlayer = (idx) => {
    if (players.length <= 2) return
    setPlayers(prev => prev.filter((_, i) => i !== idx))
  }

  // --- Live calculation ---
  // total = cash + (revenue × rounds) + sum(prices) × shares per corp
  const calcResults = () => {
    const standings = players.map(p => {
      let total = p.cash
      for (const c of corps) {
        const shares = p.shares[c.sym] || 0
        if (shares === 0) continue
        total += (c.revenue || 0) * rounds
        let priceSum = 0
        for (let r = 0; r < rounds; r++) {
          priceSum += c.prices[r] ?? c.prices[c.prices.length - 1] ?? 0
        }
        total += priceSum * shares
      }
      return { name: p.name, startCash: p.cash, total }
    }).sort((a, b) => b.total - a.total)
    return { standings }
  }

  const result = calcResults()

  // --- Styles ---
  const inputCls = m
    ? 'w-14 bg-black/30 border border-blue-800 rounded px-1 py-0.5 text-xs text-blue-300 text-right focus:outline-none focus:border-green-600'
    : 'w-14 bg-broker-bg border border-broker-border rounded px-1 py-0.5 text-xs text-white text-right focus:outline-none focus:border-blue-500'
  const nameInputCls = m
    ? 'w-16 bg-black/30 border border-blue-800 rounded px-1 py-0.5 text-xs text-yellow-300 focus:outline-none focus:border-green-600'
    : 'w-16 bg-broker-bg border border-broker-border rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500'
  const labelCls = m ? 'text-blue-400 text-[10px]' : 'text-broker-text-muted text-[10px]'
  const btnCls = m
    ? 'text-[10px] text-blue-400 hover:text-blue-300 px-1'
    : 'text-[10px] text-broker-text-muted hover:text-white px-1'
  const btnSmall = m
    ? 'text-[10px] bg-green-900/50 text-green-300 hover:bg-green-800 px-2 py-0.5 rounded'
    : 'text-[10px] bg-broker-surface-hover text-broker-text hover:text-white px-2 py-0.5 rounded'

  return (
    <div className={m
      ? 'font-mono text-xs p-2 space-y-3 overflow-y-auto bg-blue-950 text-blue-300 h-full'
      : 'text-sm p-3 space-y-4 overflow-y-auto bg-broker-bg h-full'
    }>
      <div className="flex items-center gap-3">
        <h2 className={m ? 'text-green-400 font-bold' : 'text-white font-bold text-lg'}>Endgame Calculator</h2>
        {game && game.corporations.some(c => c.floated) && (
          <button onClick={loadFromGame} className={m
            ? 'text-[10px] bg-blue-800 text-blue-300 hover:bg-blue-700 px-2 py-0.5 rounded'
            : 'text-[10px] bg-broker-surface-hover text-broker-text hover:text-white px-2 py-0.5 rounded'
          }>Load from game</button>
        )}
      </div>

      {/* Standings */}
      <Panel m={m} title="">
        <div className="space-y-1">
          {result.standings.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`w-4 font-bold ${i === 0 ? 'text-green-400' : m ? 'text-blue-400' : 'text-broker-text-muted'}`}>{i + 1}</span>
              <span className={`flex-1 truncate ${i === 0 ? 'text-green-400 font-bold' : m ? 'text-yellow-300' : 'text-broker-text'}`}>{p.name}</span>
              <span className={m ? 'text-white text-lg font-bold' : 'text-white text-lg font-bold'}>{fmt(p.total)}</span>
              {i === 0 && <span className="text-green-400 text-xs font-bold">WINNER</span>}
            </div>
          ))}
        </div>
      </Panel>

      {/* Stock prices grid */}
      <Panel m={m} title="">
        <div className="flex items-center gap-2 mb-2">
          <span className={m ? 'text-green-400 font-bold' : 'text-white font-medium'}>Stock Prices</span>
          <span className={labelCls}>{rounds} round{rounds !== 1 ? 's' : ''}</span>
          <button onClick={removeRound} disabled={rounds <= 1} className={`${btnSmall} disabled:opacity-30`}>−</button>
          <button onClick={addRound} className={btnSmall}>+</button>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className={`${labelCls} text-left px-1 w-12`} />
                {corps.map(c => (
                  <th key={c.sym} className="px-1 text-center">
                    <span style={{ color: c.color }} className="font-bold">{c.sym}</span>
                    <button onClick={() => removeCorp(c.sym)} className={`${btnCls} text-red-400 ml-0.5`}>×</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Revenue row */}
              <tr>
                <td className={`${labelCls} px-1`}>Rev</td>
                {corps.map(c => (
                  <td key={c.sym} className="px-1">
                    <input type="number" value={c.revenue || ''}
                      onChange={e => setCorps(prev => prev.map(x => x.sym === c.sym ? { ...x, revenue: parseInt(e.target.value) || 0 } : x))}
                      className={`${inputCls} w-full`} />
                  </td>
                ))}
              </tr>
              <tr><td colSpan={corps.length + 1} className={m ? 'border-b border-blue-800 py-0.5' : 'border-b border-broker-border py-0.5'} /></tr>
              {/* Price rows */}
              {Array.from({ length: rounds }, (_, r) => (
                <tr key={r}>
                  <td className={`${labelCls} px-1 ${r === rounds - 1 ? 'font-bold' : ''}`}>{r === 0 ? 'now' : 'OR'}</td>
                  {corps.map(c => {
                    const val = c.prices[r] ?? c.prices[c.prices.length - 1] ?? 0
                    const isActive = activeCell?.sym === c.sym && activeCell?.roundIdx === r
                    return (
                      <td key={c.sym} className="px-1">
                        <input type="number" value={val || ''}
                          onChange={e => setPrice(c.sym, r, e.target.value)}
                          onFocus={() => setActiveCell({ sym: c.sym, roundIdx: r })}
                          onBlur={() => setTimeout(() => setActiveCell(prev => prev?.sym === c.sym && prev?.roundIdx === r ? null : prev), 200)}
                          className={`${inputCls} w-full ${r === rounds - 1 ? 'font-bold' : ''} ${isActive ? (m ? 'border-green-500' : 'border-blue-500') : ''}`} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick price buttons — click to fill active cell */}
        {activeCell && (
          <div className="mt-2">
            <div className={`${labelCls} mb-1`}>
              <span style={{ color: corps.find(c => c.sym === activeCell.sym)?.color }} className="font-bold">{activeCell.sym}</span>
              {' '}{activeCell.roundIdx === 0 ? 'now' : 'OR'}
            </div>
            <div className="flex flex-wrap gap-1">
              {COMMON_PRICES.map(p => {
                const currentVal = corps.find(c => c.sym === activeCell.sym)?.prices[activeCell.roundIdx] ?? 0
                return (
                  <button key={p}
                    onClick={() => setPrice(activeCell.sym, activeCell.roundIdx, p)}
                    className={`text-[10px] px-1.5 py-0.5 rounded min-w-[2rem] transition-colors ${
                      p === currentVal
                        ? (m ? 'bg-green-700 text-white font-bold' : 'bg-blue-600 text-white font-bold')
                        : (m ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800' : 'bg-broker-surface-hover text-broker-text hover:text-white')
                    }`}>
                    {p}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-1 items-center mt-2">
          <input type="text" value={newCorpName} onChange={e => setNewCorpName(e.target.value)}
            placeholder="Name" onKeyDown={e => e.key === 'Enter' && addCorp()}
            className={`${nameInputCls} w-14`} />
          <button onClick={addCorp} className={btnSmall}>+ Corp</button>
        </div>
      </Panel>

      {/* Players */}
      {players.map((p, pi) => {
        const total = result.standings.find(s => s.name === p.name)?.total || 0
        return (
          <Panel key={pi} m={m} title="">
            <div className="flex items-center gap-2 mb-1">
              <input type="text" value={p.name} onChange={e => setPlayerField(pi, 'name', e.target.value)}
                className={`${nameInputCls} w-24 font-bold`} />
              <span className={labelCls}>cash</span>
              <input type="number" value={p.cash || ''} onChange={e => setPlayerField(pi, 'cash', e.target.value)} className={inputCls} />
              <span className={`ml-auto font-bold ${m ? 'text-white' : 'text-white'}`}>{fmt(total)}</span>
              <button onClick={() => removePlayer(pi)} className={`${btnCls} text-red-400`}>×</button>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {corps.map(c => (
                <div key={c.sym} className="flex items-center gap-1">
                  <span style={{ color: c.color }} className="font-bold text-[10px]">{c.sym}</span>
                  <input type="number" value={p.shares[c.sym] || ''} onChange={e => setPlayerShares(pi, c.sym, e.target.value)}
                    className={`${inputCls} w-10`} min="0" />
                </div>
              ))}
            </div>
          </Panel>
        )
      })}

      <button onClick={addPlayer} className={btnSmall}>+ Player</button>
    </div>
  )
}

function Panel({ m, title, children }) {
  return (
    <div className={m
      ? 'bg-blue-900/30 border border-blue-800 rounded p-2'
      : 'bg-broker-surface rounded-lg p-3 border border-broker-border'
    }>
      {title && <div className={m ? 'text-green-400 font-bold mb-1' : 'text-white font-medium mb-2'}>{title}</div>}
      {children}
    </div>
  )
}
