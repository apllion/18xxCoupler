// EndgameCalcTab — endgame calculator.
// total = cash + (revenue × rounds) + sum(prices) × shares per corp
// Prices: tap cell, pick from buttons (no keyboard). Revenue/cash: input. Shares: +/- buttons.

import { useState, useMemo } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { formatCurrency } from '../../utils/currency.js'
import { corpPrice, projectPrices } from '../../engine/stockMarket.js'
import { playerSharePercent } from '../../engine/player.js'

const COMMON_PRICES = [40, 50, 60, 67, 70, 76, 80, 82, 90, 100, 110, 112, 120, 124, 130, 137, 140, 150, 160, 170, 180, 200, 220, 250, 275, 300, 350, 400, 450, 500, 550]

export default function EndgameCalcTab() {
  const game = useGameStore((s) => s.game)
  const skin = useUIStore((s) => s.skin)
  const m = skin === 'moderator'
  const fmt = (n) => formatCurrency(n, game?.title?.currencyFormat || '$')

  const stateFromGame = (projectRounds = 3) => {
    if (!game || !game.corporations.some(c => c.floated)) return null
    const fCorps = game.corporations.filter(c => c.floated)
    const loanValue = game.title.loans?.loanValue || 100
    const players = game.players.map(p => {
      const shares = {}
      for (const c of fCorps) {
        const long = Math.round(playerSharePercent(p, c.sym) / 10)
        const shortCount = p.shares.filter(s => s.corpSym === c.sym && s.isShort).length
        shares[c.sym] = shortCount > 0 ? -shortCount : long // negative = short
      }
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
      return { sym: c.sym, color: c.color, revenue: lastRev, loans: c.loans || 0, prices: prices.length > 0 ? prices : [corpPrice(game.stockMarket, c.sym) || 0] }
    })
    const hasLoans = !!game.title.loans
    const hasShorts = !!game.title.shorts
    return { players, corps, rounds: projectRounds + 1, hasLoans, hasShorts, loanValue }
  }

  const emptyState = {
    players: [
      { name: 'Player 1', cash: 0, shares: { A: 0, B: 0 } },
      { name: 'Player 2', cash: 0, shares: { A: 0, B: 0 } },
      { name: 'Player 3', cash: 0, shares: { A: 0, B: 0 } },
    ],
    corps: [
      { sym: 'A', color: '#d81e3e', revenue: 0, loans: 0, prices: [100] },
      { sym: 'B', color: '#0189d1', revenue: 0, loans: 0, prices: [100] },
    ],
    hasLoans: false, hasShorts: false, loanValue: 100,
  }

  const initState = useMemo(() => stateFromGame(3) || emptyState, [])

  const [players, setPlayers] = useState(initState.players)
  const [corps, setCorps] = useState(initState.corps)
  const [showExtras, setShowExtras] = useState(initState.hasLoans || initState.hasShorts)
  const [loanValue] = useState(initState.loanValue || 100)
  const [newCorpName, setNewCorpName] = useState('')
  const [activeCell, setActiveCell] = useState(null) // { sym, roundIdx }
  const [customPrice, setCustomPrice] = useState('')
  const [rounds, setRounds] = useState(() => Math.max(...initState.corps.map(c => c.prices.length), 1))

  const loadFromGame = () => {
    const s = stateFromGame(rounds - 1)
    if (!s) return
    setPlayers(s.players); setCorps(s.corps)
    if (s.rounds) setRounds(s.rounds)
  }

  // --- Price values for buttons ---
  const priceValues = useMemo(() => {
    if (game?.stockMarket?.grid) {
      return [...new Set(game.stockMarket.grid.flat().filter(c => c).map(c => c.price))].sort((a, b) => a - b)
    }
    return COMMON_PRICES
  }, [game])

  // --- Corp helpers ---
  const addCorp = () => {
    const sym = newCorpName.trim().toUpperCase() || String.fromCharCode(65 + corps.length)
    if (corps.some(c => c.sym === sym)) return
    setCorps(prev => [...prev, { sym, color: '#888', revenue: 0, loans: 0, prices: [100] }])
    setPlayers(prev => prev.map(p => ({ ...p, shares: { ...p.shares, [sym]: 0 } })))
    setNewCorpName('')
  }
  const removeCorp = (sym) => {
    if (corps.length <= 1) return
    setCorps(prev => prev.filter(c => c.sym !== sym))
    setPlayers(prev => prev.map(p => { const s = { ...p.shares }; delete s[sym]; return { ...p, shares: s } }))
  }
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
    const nr = rounds + 1
    setRounds(nr)
    setCorps(prev => prev.map(c => {
      if (game?.stockMarket?.corpPositions?.[c.sym]) {
        const proj = projectPrices(game.stockMarket, c.sym, nr - 1)
        if (proj.length >= nr) return { ...c, prices: proj.slice(0, nr) }
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
  // Shares: positive = long, negative = short. Can't have both.
  const adjShares = (idx, sym, delta) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, shares: { ...p.shares, [sym]: (p.shares[sym] || 0) + delta } } : p))
  }
  const adjLoans = (sym, delta) => {
    setCorps(prev => prev.map(c => c.sym === sym ? { ...c, loans: Math.max(0, (c.loans || 0) + delta) } : c))
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
  // Shares positive = long, negative = short
  // Long:  + revenue × rounds + sum(prices) × shares - loan debt share
  // Short: - sum(prices) × |shorts|
  const calcResults = () => {
    const standings = players.map(p => {
      let total = p.cash
      for (const c of corps) {
        const shares = p.shares[c.sym] || 0
        if (shares === 0) continue
        const finalPrice = c.prices[c.prices.length - 1] ?? 0
        let priceSum = 0
        for (let r = 0; r < rounds; r++) priceSum += c.prices[r] ?? finalPrice

        if (shares > 0) {
          // Long: dividends (revenue/10 per share per round) + share value - loan debt
          total += Math.floor((c.revenue || 0) / 10) * shares * rounds
          total += priceSum * shares
          const loansDebt = (c.loans || 0) * loanValue
          if (loansDebt > 0) total -= Math.round(loansDebt * shares * 10 / 100)
        } else {
          // Short: negative value (owes price × count)
          total += priceSum * shares // shares is negative, so this subtracts
        }
      }
      return { name: p.name, total }
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
  const btnCls = m ? 'text-[10px] text-blue-400 hover:text-blue-300 px-1' : 'text-[10px] text-broker-text-muted hover:text-white px-1'
  const btnSmall = m
    ? 'text-[10px] bg-green-900/50 text-green-300 hover:bg-green-800 px-2 py-0.5 rounded'
    : 'text-[10px] bg-broker-surface-hover text-broker-text hover:text-white px-2 py-0.5 rounded'

  // Style for tappable price cells
  const cellCls = (isActive, isFinal) => `text-xs text-right px-1.5 py-1 rounded cursor-pointer min-w-[2.5rem] transition-colors ${isFinal ? 'font-bold' : ''} ${
    isActive
      ? (m ? 'bg-green-800 text-green-200 ring-1 ring-green-500' : 'bg-blue-600 text-white ring-1 ring-blue-400')
      : (m ? 'bg-black/30 text-blue-300 border border-blue-800' : 'bg-broker-bg text-white border border-broker-border')
  }`

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

      {/* Stock prices — tap cells, pick from buttons */}
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
              {/* Revenue — normal inputs */}
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
              {/* Loans row — optional */}
              {showExtras && (
                <tr>
                  <td className={`${labelCls} px-1`}>Loans</td>
                  {corps.map(c => (
                    <td key={c.sym} className="px-1">
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => adjLoans(c.sym, -1)} disabled={(c.loans || 0) <= 0}
                          className={`text-xs px-1 py-0.5 rounded disabled:opacity-20 ${m ? 'bg-blue-900/50 text-blue-300' : 'bg-broker-surface-hover text-broker-text'}`}>−</button>
                        <span className={`text-xs w-4 text-center font-bold ${(c.loans || 0) > 0 ? 'text-red-400' : m ? 'text-blue-400' : 'text-broker-text-muted'}`}>{c.loans || 0}</span>
                        <button onClick={() => adjLoans(c.sym, 1)}
                          className={`text-xs px-1 py-0.5 rounded ${m ? 'bg-blue-900/50 text-blue-300' : 'bg-broker-surface-hover text-broker-text'}`}>+</button>
                      </div>
                    </td>
                  ))}
                </tr>
              )}
              <tr><td colSpan={corps.length + 1} className={m ? 'border-b border-blue-800 py-0.5' : 'border-b border-broker-border py-0.5'} /></tr>
              {/* Price rows — tappable cells */}
              {Array.from({ length: rounds }, (_, r) => (
                <tr key={r}>
                  <td className={`${labelCls} px-1 ${r === rounds - 1 ? 'font-bold' : ''}`}>{r === 0 ? 'now' : 'OR'}</td>
                  {corps.map(c => {
                    const val = c.prices[r] ?? c.prices[c.prices.length - 1] ?? 0
                    const isActive = activeCell?.sym === c.sym && activeCell?.roundIdx === r
                    return (
                      <td key={c.sym} className="px-1">
                        <button
                          onClick={() => setActiveCell(isActive ? null : { sym: c.sym, roundIdx: r })}
                          className={cellCls(isActive, r === rounds - 1)}>
                          {val || '—'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Price buttons — always visible when a cell is selected */}
        {activeCell && (
          <div className="mt-2">
            <div className={`${labelCls} mb-1`}>
              <span style={{ color: corps.find(c => c.sym === activeCell.sym)?.color }} className="font-bold">{activeCell.sym}</span>
              {' '}{activeCell.roundIdx === 0 ? 'now' : 'OR'}
            </div>
            <div className="flex flex-wrap gap-1">
              {priceValues.map(v => {
                const currentVal = corps.find(c => c.sym === activeCell.sym)?.prices[activeCell.roundIdx] ?? 0
                return (
                  <button key={v} onClick={() => setPrice(activeCell.sym, activeCell.roundIdx, v)}
                    className={`text-[10px] px-1.5 py-0.5 rounded min-w-[2rem] transition-colors ${
                      v === currentVal
                        ? (m ? 'bg-green-700 text-white font-bold' : 'bg-blue-600 text-white font-bold')
                        : (m ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800' : 'bg-broker-surface-hover text-broker-text hover:text-white')
                    }`}>{v}</button>
                )
              })}
              <input type="number" value={customPrice}
                onChange={e => setCustomPrice(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && customPrice) { setPrice(activeCell.sym, activeCell.roundIdx, parseInt(customPrice) || 0); setCustomPrice('') } }}
                placeholder="other" className={`${inputCls} w-12`} />
            </div>
          </div>
        )}

        <div className="flex gap-1 items-center mt-2">
          <input type="text" value={newCorpName} onChange={e => setNewCorpName(e.target.value)}
            placeholder="Name" onKeyDown={e => e.key === 'Enter' && addCorp()}
            className={`${nameInputCls} w-14`} />
          <button onClick={addCorp} className={btnSmall}>+ Corp</button>
          {!showExtras && (
            <button onClick={() => setShowExtras(true)} className={`${btnSmall} ml-auto`}>Loans</button>
          )}
        </div>
      </Panel>

      {/* Players — cash input, shares +/- */}
      {players.map((p, pi) => {
        const total = result.standings.find(s => s.name === p.name)?.total || 0
        return (
          <Panel key={pi} m={m} title="">
            <div className="flex items-center gap-2 mb-1">
              <input type="text" value={p.name} onChange={e => setPlayerField(pi, 'name', e.target.value)}
                className={`${nameInputCls} w-24 font-bold`} />
              <span className={labelCls}>cash</span>
              <input type="number" value={p.cash || ''} onChange={e => setPlayerField(pi, 'cash', e.target.value)}
                className={inputCls} />
              <span className={`ml-auto font-bold ${m ? 'text-white' : 'text-white'}`}>{fmt(total)}</span>
              <button onClick={() => removePlayer(pi)} className={`${btnCls} text-red-400`}>×</button>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {corps.map(c => {
                const val = p.shares[c.sym] || 0
                const isShort = val < 0
                return (
                  <div key={c.sym} className="flex items-center gap-0.5">
                    <span style={{ color: c.color }} className="font-bold text-[10px] w-8">{c.sym}</span>
                    <button onClick={() => adjShares(pi, c.sym, -1)}
                      className={`text-xs px-1 py-0.5 rounded ${m ? 'bg-blue-900/50 text-blue-300' : 'bg-broker-surface-hover text-broker-text'}`}>−</button>
                    <span className={`text-xs w-4 text-center font-bold ${isShort ? 'text-red-400' : m ? 'text-white' : 'text-white'}`}>
                      {val}
                    </span>
                    <button onClick={() => adjShares(pi, c.sym, 1)}
                      className={`text-xs px-1 py-0.5 rounded ${m ? 'bg-blue-900/50 text-blue-300' : 'bg-broker-surface-hover text-broker-text'}`}>+</button>
                    {isShort && <span className="text-[9px] text-red-400">S</span>}
                  </div>
                )
              })}
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
