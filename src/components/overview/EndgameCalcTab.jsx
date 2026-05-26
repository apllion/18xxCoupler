// EndgameCalcTab — standalone endgame calculator.
// Simple matrix: players × corps. Enter cash, shares, prices, revenues. Crank to finish.
// Pre-fills from game if one is loaded, otherwise fully manual.

import { useState, useMemo } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { formatCurrency } from '../../utils/currency.js'
import { corpPrice, priceAt, moveDividend, moveUp } from '../../engine/stockMarket.js'
import { playerSharePercent } from '../../engine/player.js'

export default function EndgameCalcTab() {
  const game = useGameStore((s) => s.game)
  const skin = useUIStore((s) => s.skin)
  const m = skin === 'moderator'

  // Build initial state from game or empty
  const initState = useMemo(() => {
    if (game && game.corporations.some(c => c.floated)) {
      const corps = game.corporations.filter(c => c.floated)
      const players = game.players.map(p => {
        const shares = {}
        for (const c of corps) {
          const pct = playerSharePercent(p, c.sym)
          shares[c.sym] = Math.round(pct / 10) // number of 10% shares
        }
        return { name: p.name, cash: p.cash, shares }
      })
      const corpData = {}
      for (const c of corps) {
        const price = corpPrice(game.stockMarket, c.sym) || 0
        let lastRev = 0
        for (let i = game.actionLog.length - 1; i >= 0; i--) {
          const a = game.actionLog[i].action
          if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && a.corpSym === c.sym) {
            lastRev = a.totalRevenue || 0; break
          }
        }
        const soldOut = c.ipoShares <= 0 && c.marketShares <= 0
        corpData[c.sym] = { price, revenue: lastRev, color: c.color, soldOut }
      }
      return {
        players,
        corps: Object.keys(corpData),
        corpData,
        bank: game.bank.cash,
        hasGame: true,
      }
    }
    // Empty — 3 players, 2 corps as starting template
    return {
      players: [
        { name: 'Player 1', cash: 0, shares: { A: 0, B: 0 } },
        { name: 'Player 2', cash: 0, shares: { A: 0, B: 0 } },
        { name: 'Player 3', cash: 0, shares: { A: 0, B: 0 } },
      ],
      corps: ['A', 'B'],
      corpData: {
        A: { price: 100, revenue: 0, color: '#d81e3e', soldOut: false },
        B: { price: 100, revenue: 0, color: '#0189d1', soldOut: false },
      },
      bank: 8000,
      hasGame: false,
    }
  }, []) // only compute once

  const [players, setPlayers] = useState(initState.players)
  const [corps, setCorps] = useState(initState.corps)
  const [corpData, setCorpData] = useState(initState.corpData)
  const [bank, setBank] = useState(initState.bank)
  const [result, setResult] = useState(null)
  const [newCorpName, setNewCorpName] = useState('')

  const fmt = (n) => formatCurrency(n, game?.title?.currencyFormat || '$')

  // --- Edit helpers ---
  const setPlayerField = (idx, field, val) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: field === 'name' ? val : (parseInt(val) || 0) } : p))
    setResult(null)
  }
  const setPlayerShares = (idx, sym, val) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, shares: { ...p.shares, [sym]: parseInt(val) || 0 } } : p))
    setResult(null)
  }
  const setCorpField = (sym, field, val) => {
    setCorpData(prev => ({ ...prev, [sym]: { ...prev[sym], [field]: parseInt(val) || 0 } }))
    setResult(null)
  }
  const toggleSoldOut = (sym) => {
    setCorpData(prev => ({ ...prev, [sym]: { ...prev[sym], soldOut: !prev[sym]?.soldOut } }))
    setResult(null)
  }
  const addPlayer = () => {
    const shares = {}
    corps.forEach(c => { shares[c] = 0 })
    setPlayers(prev => [...prev, { name: `Player ${prev.length + 1}`, cash: 0, shares }])
  }
  const removePlayer = (idx) => {
    if (players.length <= 2) return
    setPlayers(prev => prev.filter((_, i) => i !== idx))
  }
  const addCorp = () => {
    const sym = newCorpName.trim().toUpperCase() || String.fromCharCode(65 + corps.length)
    if (corps.includes(sym)) return
    setCorps(prev => [...prev, sym])
    setCorpData(prev => ({ ...prev, [sym]: { price: 100, revenue: 0, color: '#888', soldOut: false } }))
    setPlayers(prev => prev.map(p => ({ ...p, shares: { ...p.shares, [sym]: 0 } })))
    setNewCorpName('')
  }
  const removeCorp = (sym) => {
    if (corps.length <= 1) return
    setCorps(prev => prev.filter(c => c !== sym))
    setCorpData(prev => { const n = { ...prev }; delete n[sym]; return n })
    setPlayers(prev => prev.map(p => { const s = { ...p.shares }; delete s[sym]; return { ...p, shares: s } }))
  }

  // --- Calculate current net worth ---
  const netWorth = (p) => {
    let shareVal = 0
    for (const sym of corps) {
      shareVal += (p.shares[sym] || 0) * (corpData[sym]?.price || 0)
    }
    return p.cash + shareVal
  }

  // --- Simulate ---
  function simulate() {
    const totalRev = corps.reduce((s, sym) => s + (corpData[sym]?.revenue || 0), 0)
    if (totalRev === 0) {
      setResult({ error: 'Enter at least one corp revenue' })
      return
    }

    let simBank = bank
    // Clone player cash
    const simCash = players.map(p => p.cash)
    // Clone prices
    const simPrices = {}
    corps.forEach(sym => { simPrices[sym] = corpData[sym]?.price || 0 })

    // If game loaded, use real market for price movement
    const hasMarket = game?.stockMarket?.grid
    let simMarket = null
    if (hasMarket) {
      const positions = {}
      for (const sym of corps) {
        const pos = game.stockMarket.corpPositions[sym]
        if (pos) positions[sym] = { row: pos.row, col: pos.col }
      }
      simMarket = { grid: game.stockMarket.grid, corpPositions: positions }
    }

    const ors = []
    const maxRounds = 50

    for (let or = 1; or <= maxRounds && simBank > 0; or++) {
      const orRow = { or, prices: {}, bank: 0 }

      for (const sym of corps) {
        const rev = corpData[sym]?.revenue || 0
        if (rev <= 0) { orRow.prices[sym] = simPrices[sym]; continue }
        const perShare = Math.floor(rev / 10)

        // Pay dividends
        let totalPaid = 0
        for (let pi = 0; pi < players.length; pi++) {
          const shares = players[pi].shares[sym] || 0
          const amount = shares * perShare
          simCash[pi] += amount
          totalPaid += amount
        }
        simBank -= totalPaid

        // Move price
        if (simMarket && simMarket.corpPositions[sym]) {
          const divMvmt = game?.title?.dividendMovement || 'standard'
          moveDividend(simMarket, sym, perShare, divMvmt)
          simPrices[sym] = priceAt(simMarket, simMarket.corpPositions[sym].row, simMarket.corpPositions[sym].col) || simPrices[sym]
        } else {
          // Simple approximation: +10% per OR if paying
          simPrices[sym] = Math.round(simPrices[sym] * 1.1)
        }
        orRow.prices[sym] = simPrices[sym]
      }

      // Sold-out corps get price bump at end of OR
      for (const sym of corps) {
        if (corpData[sym]?.soldOut) {
          if (simMarket && simMarket.corpPositions[sym]) {
            moveUp(simMarket, sym, 1)
            simPrices[sym] = priceAt(simMarket, simMarket.corpPositions[sym].row, simMarket.corpPositions[sym].col) || simPrices[sym]
          } else {
            simPrices[sym] = Math.round(simPrices[sym] * 1.1)
          }
          orRow.prices[sym] = simPrices[sym]
        }
      }

      orRow.bank = simBank
      ors.push(orRow)
      if (simBank <= 0) break
    }

    // Final standings
    const standings = players.map((p, i) => {
      let shareVal = 0
      for (const sym of corps) {
        shareVal += (p.shares[sym] || 0) * (simPrices[sym] || 0)
      }
      return {
        name: p.name,
        startCash: p.cash, endCash: simCash[i],
        startShares: corps.reduce((s, sym) => s + (p.shares[sym] || 0) * (corpData[sym]?.price || 0), 0),
        endShares: shareVal,
        startTotal: netWorth(p),
        endTotal: simCash[i] + shareVal,
      }
    }).sort((a, b) => b.endTotal - a.endTotal)

    setResult({ ors, standings, finalPrices: { ...simPrices } })
  }

  // --- Styles ---
  const inputCls = m
    ? 'w-14 bg-black/30 border border-blue-800 rounded px-1 py-0.5 text-xs text-blue-300 text-right focus:outline-none focus:border-green-600'
    : 'w-14 bg-broker-bg border border-broker-border rounded px-1 py-0.5 text-xs text-white text-right focus:outline-none focus:border-blue-500'
  const nameInputCls = m
    ? 'w-16 bg-black/30 border border-blue-800 rounded px-1 py-0.5 text-xs text-yellow-300 focus:outline-none focus:border-green-600'
    : 'w-16 bg-broker-bg border border-broker-border rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500'
  const labelCls = m ? 'text-blue-400 text-[10px]' : 'text-broker-text-muted text-[10px]'
  const headCls = m ? 'text-green-400 text-[10px] font-bold' : 'text-broker-text-muted text-[10px] font-medium'
  const btnCls = m
    ? 'text-[10px] text-blue-400 hover:text-blue-300 px-1'
    : 'text-[10px] text-broker-text-muted hover:text-white px-1'

  return (
    <div className={m
      ? 'font-mono text-xs p-2 space-y-3 overflow-y-auto bg-blue-950 text-blue-300 h-full'
      : 'text-sm p-3 space-y-4 overflow-y-auto bg-broker-bg h-full'
    }>
      <h2 className={m ? 'text-green-400 font-bold' : 'text-white font-bold text-lg'}>
        Endgame Calculator
      </h2>

      {/* Corps setup — always rows */}
      <Panel m={m} title="Corporations">
        <div className="space-y-1">
          {corps.map(sym => (
            <div key={sym} className="flex items-center gap-2 flex-wrap">
              <span style={{ color: corpData[sym]?.color }} className="font-bold w-10">{sym}</span>
              <span className={labelCls}>price</span>
              <input type="number" value={corpData[sym]?.price || ''} onChange={e => setCorpField(sym, 'price', e.target.value)} className={inputCls} />
              <span className={labelCls}>rev</span>
              <input type="number" value={corpData[sym]?.revenue || ''} onChange={e => setCorpField(sym, 'revenue', e.target.value)} className={inputCls} />
              <button onClick={() => toggleSoldOut(sym)}
                className={`text-[10px] px-1.5 py-0.5 rounded ${corpData[sym]?.soldOut
                  ? (m ? 'bg-green-900 text-green-300' : 'bg-green-700 text-white')
                  : (m ? 'bg-blue-900/30 text-blue-400' : 'bg-broker-surface-hover text-broker-text-muted')
                }`}
                title="Toggle sold-out (price bump each OR)">
                {corpData[sym]?.soldOut ? 'SOLD OUT' : 'sold out?'}
              </button>
              <button onClick={() => removeCorp(sym)} className={`${btnCls} text-red-400`} title="Remove">×</button>
            </div>
          ))}
          <div className="flex gap-1 items-center mt-1">
            <input type="text" value={newCorpName} onChange={e => setNewCorpName(e.target.value)}
              placeholder="Name" onKeyDown={e => e.key === 'Enter' && addCorp()}
              className={`${nameInputCls} w-14`} />
            <button onClick={addCorp} className={m
              ? 'text-[10px] bg-green-900/50 text-green-300 hover:bg-green-800 px-2 py-0.5 rounded'
              : 'text-[10px] bg-broker-surface-hover text-broker-text hover:text-white px-2 py-0.5 rounded'
            }>+ Corp</button>
          </div>
        </div>
      </Panel>

      {/* Players — one card each, works on any width */}
      {players.map((p, pi) => {
        const nw = netWorth(p)
        return (
          <Panel key={pi} m={m} title="">
            <div className="flex items-center gap-2 mb-1">
              <input type="text" value={p.name} onChange={e => setPlayerField(pi, 'name', e.target.value)}
                className={`${nameInputCls} w-24 font-bold`} />
              <span className={labelCls}>cash</span>
              <input type="number" value={p.cash || ''} onChange={e => setPlayerField(pi, 'cash', e.target.value)} className={inputCls} />
              <span className={`ml-auto font-bold ${m ? 'text-white' : 'text-white'}`}>{fmt(nw)}</span>
              <button onClick={() => removePlayer(pi)} className={`${btnCls} text-red-400`} title="Remove">×</button>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {corps.map(sym => (
                <div key={sym} className="flex items-center gap-1">
                  <span style={{ color: corpData[sym]?.color }} className="font-bold text-[10px]">{sym}</span>
                  <input type="number" value={p.shares[sym] || ''} onChange={e => setPlayerShares(pi, sym, e.target.value)}
                    className={`${inputCls} w-10`} min="0" />
                  <span className={`${labelCls}`}>= {fmt((p.shares[sym] || 0) * (corpData[sym]?.price || 0))}</span>
                </div>
              ))}
            </div>
          </Panel>
        )
      })}

      {/* Controls */}
      <div className="flex gap-2 items-center flex-wrap">
        <button onClick={addPlayer} className={m
          ? 'text-[10px] bg-green-900/50 text-green-300 hover:bg-green-800 px-2 py-1 rounded'
          : 'text-[10px] bg-broker-surface-hover text-broker-text hover:text-white px-2 py-1 rounded'
        }>+ Player</button>
        <span className={labelCls}>Bank:</span>
        <input type="number" value={bank || ''} onChange={e => { setBank(parseInt(e.target.value) || 0); setResult(null) }}
          className={inputCls} />
      </div>

      <button onClick={simulate} className={m
        ? 'bg-green-900/80 text-green-300 hover:bg-green-800 px-4 py-2 rounded text-xs font-bold w-full'
        : 'bg-blue-600 text-white hover:bg-blue-500 px-4 py-2 rounded text-xs font-bold w-full'
      }>
        Crank it
      </button>

      {/* Error */}
      {result?.error && (
        <Panel m={m} title=""><span className="text-red-400">{result.error}</span></Panel>
      )}

      {/* Results */}
      {result && !result.error && (
        <>
          <Panel m={m} title={`${result.ors.length} ORs to bank break`}>
            <div className="overflow-x-auto">
              <table className="text-[10px] w-full">
                <thead>
                  <tr className={m ? 'text-green-400' : 'text-broker-text-muted'}>
                    <th className="text-left px-1">OR</th>
                    {corps.map(sym => <th key={sym} className="text-right px-1" style={{ color: corpData[sym]?.color }}>{sym}</th>)}
                    <th className="text-right px-1">Bank</th>
                  </tr>
                </thead>
                <tbody>
                  {result.ors.map(or => (
                    <tr key={or.or} className={or.bank <= 0 ? 'text-red-400' : m ? 'text-blue-300' : 'text-broker-text'}>
                      <td className="px-1">{or.or}</td>
                      {corps.map(sym => <td key={sym} className="text-right px-1">{fmt(or.prices[sym] || 0)}</td>)}
                      <td className="text-right px-1">{fmt(or.bank)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel m={m} title="Final Standings">
            <div className="space-y-1">
              <div className={`flex items-center gap-2 text-[10px] ${m ? 'text-blue-400' : 'text-broker-text-muted'}`}>
                <span className="w-4" />
                <span className="w-16">Player</span>
                <span className="w-14 text-right">Now</span>
                <span className="w-4" />
                <span className="w-14 text-right">End</span>
                <span className="w-14 text-right">Change</span>
              </div>
              {result.standings.map((p, i) => {
                const gain = p.endTotal - p.startTotal
                return (
                  <div key={i}>
                    <div className="flex items-center gap-2">
                      <span className={`w-4 font-bold ${i === 0 ? 'text-green-400' : m ? 'text-blue-400' : 'text-broker-text-muted'}`}>{i + 1}</span>
                      <span className={`w-16 truncate ${i === 0 ? 'text-green-400 font-bold' : m ? 'text-yellow-300' : 'text-broker-text'}`}>{p.name}</span>
                      <span className={m ? 'text-blue-300 w-14 text-right' : 'text-broker-text-muted w-14 text-right'}>{fmt(p.startTotal)}</span>
                      <span className={m ? 'text-blue-400' : 'text-broker-text-muted'}>→</span>
                      <span className={m ? 'text-white w-14 text-right font-bold' : 'text-white w-14 text-right font-bold'}>{fmt(p.endTotal)}</span>
                      <span className={`w-14 text-right text-xs ${gain > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {gain >= 0 ? '+' : ''}{fmt(gain)}
                      </span>
                      {i === 0 && <span className="text-green-400 text-xs font-bold">WINNER</span>}
                    </div>
                    <div className={m ? 'ml-6 text-[10px] text-blue-400 flex gap-3' : 'ml-6 text-[10px] text-broker-text-muted flex gap-3'}>
                      <span>cash {fmt(p.startCash)}→{fmt(p.endCash)}</span>
                      <span>shares {fmt(p.startShares)}→{fmt(p.endShares)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>

          <Panel m={m} title="Final Prices">
            <div className="flex flex-wrap gap-3">
              {corps.map(sym => {
                const start = corpData[sym]?.price || 0
                const end = result.finalPrices[sym] || 0
                const diff = end - start
                return (
                  <span key={sym} className="text-xs">
                    <span style={{ color: corpData[sym]?.color }} className="font-bold">{sym}</span>
                    {' '}{fmt(start)}→{fmt(end)}
                    <span className={diff > 0 ? ' text-green-400' : diff < 0 ? ' text-red-400' : ''}>
                      {' '}{diff >= 0 ? '+' : ''}{fmt(diff)}
                    </span>
                  </span>
                )
              })}
            </div>
          </Panel>
        </>
      )}
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
