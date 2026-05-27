// EndgameCalcTab — endgame calculator.
// Each corp: enter the stock prices it will hit round by round.
// Number of prices = number of rounds. Results calculate live.
// Players: cash + shares × final price = net worth.

import { useState, useMemo } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { formatCurrency } from '../../utils/currency.js'
import { corpPrice } from '../../engine/stockMarket.js'
import { playerSharePercent } from '../../engine/player.js'

export default function EndgameCalcTab() {
  const game = useGameStore((s) => s.game)
  const skin = useUIStore((s) => s.skin)
  const m = skin === 'moderator'
  const fmt = (n) => formatCurrency(n, game?.title?.currencyFormat || '$')

  const initState = useMemo(() => {
    if (game && game.corporations.some(c => c.floated)) {
      const fCorps = game.corporations.filter(c => c.floated)
      const players = game.players.map(p => {
        const shares = {}
        for (const c of fCorps) shares[c.sym] = Math.round(playerSharePercent(p, c.sym) / 10)
        return { name: p.name, cash: p.cash, shares }
      })
      const corps = fCorps.map(c => ({
        sym: c.sym, color: c.color,
        prices: [corpPrice(game.stockMarket, c.sym) || 0], // start with current price
      }))
      return { players, corps }
    }
    return {
      players: [
        { name: 'Player 1', cash: 0, shares: { A: 0, B: 0 } },
        { name: 'Player 2', cash: 0, shares: { A: 0, B: 0 } },
        { name: 'Player 3', cash: 0, shares: { A: 0, B: 0 } },
      ],
      corps: [
        { sym: 'A', color: '#d81e3e', prices: [100] },
        { sym: 'B', color: '#0189d1', prices: [100] },
      ],
    }
  }, [])

  const [players, setPlayers] = useState(initState.players)
  const [corps, setCorps] = useState(initState.corps)
  const [newCorpName, setNewCorpName] = useState('')

  // --- Corp helpers ---
  const addCorp = () => {
    const sym = newCorpName.trim().toUpperCase() || String.fromCharCode(65 + corps.length)
    if (corps.some(c => c.sym === sym)) return
    setCorps(prev => [...prev, { sym, color: '#888', prices: [100] }])
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
    setRounds(r => r + 1)
    setCorps(prev => prev.map(c => ({ ...c, prices: [...c.prices, c.prices[c.prices.length - 1] || 0] })))
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
  // Revenue per share = price at that round (the share value for that OR)
  // Final price = last entered price
  const calcResults = () => {
    const simCash = players.map(p => p.cash)

    // For each round, each corp pays per-share = that round's price / 10
    // Actually: revenue = the price itself tells you value, dividends depend on revenue not price
    // Simpler: the user enters the prices the corp will be at each round.
    // The final price determines share value. The dividend each round = price[r] / 10 per share.
    // But that's wrong — dividend is from route revenue, not price.
    //
    // Actually the RIGHT model: prices are just what the stock will be worth.
    // The user enters them because they know the stock market grid.
    // Final net worth = cash + shares × last price. That's it.
    // Cash grows from dividends, but the user would need to enter revenue separately...
    //
    // Simplest correct model: final price = last entered price per corp.
    // No dividend simulation needed — the user is saying "this is where prices will end up"
    // and the result is just cash + shares × final prices.

    const finalPrices = {}
    for (const c of corps) {
      finalPrices[c.sym] = c.prices[c.prices.length - 1] || 0
    }

    const standings = players.map(p => {
      let shareVal = 0
      for (const c of corps) {
        shareVal += (p.shares[c.sym] || 0) * (finalPrices[c.sym] || 0)
      }
      const startShares = corps.reduce((s, c) => s + (p.shares[c.sym] || 0) * (c.prices[0] || 0), 0)
      return {
        name: p.name,
        cash: p.cash,
        startShares,
        endShares: shareVal,
        startTotal: p.cash + startShares,
        endTotal: p.cash + shareVal,
      }
    }).sort((a, b) => b.endTotal - a.endTotal)

    return { standings, finalPrices }
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
      <h2 className={m ? 'text-green-400 font-bold' : 'text-white font-bold text-lg'}>
        Endgame Calculator
      </h2>

      {/* Standings — always at top, live */}
      <Panel m={m} title="">
        <div className="space-y-1">
          {result.standings.map((p, i) => {
            const gain = p.endTotal - p.startTotal
            return (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-4 font-bold ${i === 0 ? 'text-green-400' : m ? 'text-blue-400' : 'text-broker-text-muted'}`}>{i + 1}</span>
                <span className={`w-16 truncate ${i === 0 ? 'text-green-400 font-bold' : m ? 'text-yellow-300' : 'text-broker-text'}`}>{p.name}</span>
                <span className={m ? 'text-blue-300 w-14 text-right' : 'text-broker-text-muted w-14 text-right'}>{fmt(p.startTotal)}</span>
                <span className={m ? 'text-blue-400' : 'text-broker-text-muted'}>→</span>
                <span className={m ? 'text-white w-14 text-right font-bold' : 'text-white w-14 text-right font-bold'}>{fmt(p.endTotal)}</span>
                <span className={`w-14 text-right text-xs ${gain > 0 ? 'text-green-400' : gain < 0 ? 'text-red-400' : ''}`}>
                  {gain !== 0 ? (gain >= 0 ? '+' : '') + fmt(gain) : ''}
                </span>
                {i === 0 && <span className="text-green-400 text-xs font-bold">WINNER</span>}
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Stock price path — shared rounds */}
      <Panel m={m} title="">
        <div className="flex items-center gap-2 mb-2">
          <span className={m ? 'text-green-400 font-bold' : 'text-white font-medium'}>Stock Prices</span>
          <span className={labelCls}>{rounds} round{rounds !== 1 ? 's' : ''}</span>
          <button onClick={removeRound} disabled={rounds <= 1}
            className={`${btnSmall} disabled:opacity-30`}>− round</button>
          <button onClick={addRound} className={btnSmall}>+ round</button>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className={`${labelCls} text-left px-1 w-12`}>Corp</th>
                {Array.from({ length: rounds }, (_, r) => (
                  <th key={r} className={`${labelCls} text-right px-1 ${r === rounds - 1 ? 'font-bold' : ''}`}>
                    {r === 0 ? 'now' : `OR${r}`}
                  </th>
                ))}
                <th className="px-1 w-6" />
              </tr>
            </thead>
            <tbody>
              {corps.map(c => (
                <tr key={c.sym}>
                  <td className="px-1"><span style={{ color: c.color }} className="font-bold">{c.sym}</span></td>
                  {Array.from({ length: rounds }, (_, r) => {
                    const val = c.prices[r] ?? c.prices[c.prices.length - 1] ?? 0
                    return (
                      <td key={r} className="px-1">
                        <input type="number" value={val || ''}
                          onChange={e => setPrice(c.sym, r, e.target.value)}
                          className={`${inputCls} w-12 ${r === rounds - 1 ? 'font-bold' : ''}`} />
                      </td>
                    )
                  })}
                  <td className="px-1">
                    <button onClick={() => removeCorp(c.sym)} className={`${btnCls} text-red-400`}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-1 items-center mt-2">
          <input type="text" value={newCorpName} onChange={e => setNewCorpName(e.target.value)}
            placeholder="Name" onKeyDown={e => e.key === 'Enter' && addCorp()}
            className={`${nameInputCls} w-14`} />
          <button onClick={addCorp} className={btnSmall}>+ Corp</button>
        </div>
      </Panel>

      {/* Players */}
      {players.map((p, pi) => {
        const finalVal = corps.reduce((s, c) => s + (p.shares[c.sym] || 0) * (c.prices[c.prices.length - 1] || 0), 0)
        const total = p.cash + finalVal
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
                  <span className={labelCls}>= {fmt((p.shares[c.sym] || 0) * (c.prices[c.prices.length - 1] || 0))}</span>
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
