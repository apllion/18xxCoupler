// EndgameCalcTab — standalone endgame calculator, available in both Broker and PlusPlus.
// Cranks frozen-map ORs until bank breaks. Enter revenues, see projected standings.

import { useState } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { formatCurrency } from '../../utils/currency.js'
import { corpPrice, priceAt, moveDividend, moveUp } from '../../engine/stockMarket.js'
import { playerSharePercent } from '../../engine/player.js'
import { allNetWorths } from '../../engine/rules/netWorth.js'

export default function EndgameCalcTab() {
  const game = useGameStore((s) => s.game)
  const skin = useUIStore((s) => s.skin)
  const m = skin === 'moderator'

  if (!game) return null

  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)

  return (
    <div className={m
      ? 'font-mono text-xs p-2 space-y-3 overflow-y-auto bg-blue-950 text-blue-300 h-full'
      : 'text-sm p-3 space-y-4 overflow-y-auto bg-broker-bg h-full'
    }>
      <h2 className={m ? 'text-green-400 font-bold' : 'text-white font-bold text-lg'}>
        Endgame Calculator — {game.title.title}
      </h2>
      <EndgameCalc game={game} fmt={fmt} m={m} />
    </div>
  )
}

function EndgameCalc({ game, fmt, m }) {
  const corps = game.corporations.filter(c => c.floated)
  const divMovement = game.title.dividendMovement || 'standard'

  const initRevenues = () => {
    const revs = {}
    for (const c of corps) {
      let lastRev = 0
      for (let i = game.actionLog.length - 1; i >= 0; i--) {
        const a = game.actionLog[i].action
        if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && a.corpSym === c.sym) {
          lastRev = a.totalRevenue || 0
          break
        }
      }
      revs[c.sym] = lastRev
    }
    return revs
  }

  const [revenues, setRevenues] = useState(initRevenues)
  const [result, setResult] = useState(null)

  const setRev = (sym, val) => setRevenues(prev => ({ ...prev, [sym]: parseInt(val) || 0 }))

  function simulate() {
    const bankTotal = typeof game.title.bankCash === 'number'
      ? game.title.bankCash
      : (game.title.bankCash?.[game.playerCount] || 8000)
    let bank = game.bank.cash

    const positions = {}
    for (const [sym, pos] of Object.entries(game.stockMarket.corpPositions)) {
      positions[sym] = { row: pos.row, col: pos.col }
    }
    const simMarket = { grid: game.stockMarket.grid, corpPositions: positions }

    const playerCash = {}
    game.players.forEach(p => { playerCash[p.id] = p.cash })

    const ors = []
    const maxRounds = 50

    for (let or = 1; or <= maxRounds && bank > 0; or++) {
      const orData = { or, corps: [], bank: bank, playerTotals: {} }

      const ordered = [...corps].sort((a, b) => {
        const pa = priceAt(simMarket, positions[a.sym]?.row, positions[a.sym]?.col) || 0
        const pb = priceAt(simMarket, positions[b.sym]?.row, positions[b.sym]?.col) || 0
        return pb - pa
      })

      for (const c of ordered) {
        const rev = revenues[c.sym] || 0
        if (rev <= 0) continue
        const perShare = Math.floor(rev / 10)

        let totalPaid = 0
        for (const p of game.players) {
          const pct = playerSharePercent(p, c.sym)
          if (pct > 0) {
            const amount = Math.floor(rev * pct / 100)
            playerCash[p.id] += amount
            totalPaid += amount
          }
        }

        bank -= totalPaid
        const priceBefore = priceAt(simMarket, positions[c.sym]?.row, positions[c.sym]?.col) || 0
        moveDividend(simMarket, c.sym, perShare, divMovement)
        const priceAfter = priceAt(simMarket, positions[c.sym]?.row, positions[c.sym]?.col) || 0

        orData.corps.push({ sym: c.sym, color: c.color, rev, paid: totalPaid, priceBefore, priceAfter })
      }

      for (const c of corps) {
        if (c.ipoShares <= 0 && c.marketShares <= 0 && positions[c.sym]) {
          moveUp(simMarket, c.sym, 1)
        }
      }

      orData.bank = bank
      for (const p of game.players) {
        let shareVal = 0
        for (const c of corps) {
          const pct = playerSharePercent(p, c.sym)
          const price = priceAt(simMarket, positions[c.sym]?.row, positions[c.sym]?.col) || 0
          shareVal += (price * pct) / 10
        }
        let privVal = 0
        for (const sym of p.privates) {
          const co = (game.companies || []).find(x => x.sym === sym)
          if (co && !co.closed) privVal += co.value || 0
        }
        orData.playerTotals[p.id] = playerCash[p.id] + shareVal + privVal
      }

      ors.push(orData)
      if (bank <= 0) break
    }

    const finalPrices = {}
    for (const c of corps) {
      finalPrices[c.sym] = priceAt(simMarket, positions[c.sym]?.row, positions[c.sym]?.col) || 0
    }

    setResult({ ors, finalPrices, playerCash, bankRemaining: bank })
  }

  const inputCls = m
    ? 'w-16 bg-black/30 border border-blue-800 rounded px-1 py-0.5 text-xs text-blue-300 text-right focus:outline-none focus:border-green-600'
    : 'w-16 bg-broker-bg border border-broker-border rounded px-1 py-0.5 text-xs text-white text-right focus:outline-none focus:border-blue-500'

  return (
    <>
      <Panel m={m} title="Revenue Inputs">
        <div className={m ? 'text-blue-400 text-[10px] mb-2' : 'text-broker-text-muted text-xs mb-2'}>
          Assumes frozen map: same revenues, all corps pay dividends every OR. Cranks until bank breaks.
        </div>
        <div className="space-y-1">
          {corps.map(c => (
            <div key={c.sym} className="flex items-center gap-2">
              <span style={{ color: c.color }} className="font-bold w-10">{c.sym}</span>
              <span className={m ? 'text-blue-400 text-[10px] w-12' : 'text-broker-text-muted text-[10px] w-12'}>
                @ {fmt(corpPrice(game.stockMarket, c.sym) || 0)}
              </span>
              <label className={m ? 'text-blue-400 text-[10px]' : 'text-broker-text-muted text-[10px]'}>rev:</label>
              <input type="number" value={revenues[c.sym] || ''} onChange={e => setRev(c.sym, e.target.value)}
                className={inputCls} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={m ? 'text-blue-400 text-[10px]' : 'text-broker-text-muted text-[10px]'}>
            Bank: {fmt(game.bank.cash)}
          </span>
          <button onClick={simulate}
            className={m
              ? 'bg-green-900/80 text-green-300 hover:bg-green-800 px-3 py-1 rounded text-xs font-bold'
              : 'bg-blue-600 text-white hover:bg-blue-500 px-3 py-1 rounded text-xs font-bold'
            }>
            Crank it
          </button>
        </div>
      </Panel>

      {result && (
        <>
          <Panel m={m} title={`Result: ${result.ors.length} ORs to bank break`}>
            <div className="overflow-x-auto">
              <table className="text-[10px] w-full">
                <thead>
                  <tr className={m ? 'text-green-400' : 'text-broker-text-muted'}>
                    <th className="text-left px-1">OR</th>
                    {corps.map(c => <th key={c.sym} className="text-right px-1" style={{ color: c.color }}>{c.sym}</th>)}
                    <th className="text-right px-1">Bank</th>
                  </tr>
                </thead>
                <tbody>
                  {result.ors.map(or => (
                    <tr key={or.or} className={or.bank <= 0 ? 'text-red-400' : m ? 'text-blue-300' : 'text-broker-text'}>
                      <td className="px-1">{or.or}</td>
                      {corps.map(c => {
                        const cd = or.corps.find(x => x.sym === c.sym)
                        return <td key={c.sym} className="text-right px-1">{cd ? fmt(cd.priceAfter) : '—'}</td>
                      })}
                      <td className="text-right px-1">{fmt(or.bank)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel m={m} title="Projected Final Standings">
            <div className="space-y-1">
              <div className={`flex items-center gap-2 text-[10px] ${m ? 'text-blue-400' : 'text-broker-text-muted'}`}>
                <span className="w-4" />
                <span className="w-16">Player</span>
                <span className="w-16 text-right">Now</span>
                <span className="w-4" />
                <span className="w-16 text-right">End</span>
                <span className="w-14 text-right">Change</span>
              </div>
              {game.players
                .map(p => {
                  const nw = allNetWorths(game).find(w => w.playerId === p.id)
                  const endTotal = result.ors[result.ors.length - 1]?.playerTotals[p.id] || 0
                  const endCash = result.playerCash[p.id] || 0
                  let endShareVal = 0
                  for (const c of corps) {
                    const pct = playerSharePercent(p, c.sym)
                    endShareVal += ((result.finalPrices[c.sym] || 0) * pct) / 10
                  }
                  return {
                    name: p.name, id: p.id,
                    nowCash: nw?.cash || 0, nowShares: nw?.shareValue || 0, nowPriv: nw?.privateValue || 0, nowTotal: nw?.total || 0,
                    endCash, endShares: Math.round(endShareVal), endTotal,
                  }
                })
                .sort((a, b) => b.endTotal - a.endTotal)
                .map((p, i) => {
                  const gain = p.endTotal - p.nowTotal
                  return (
                    <div key={p.id}>
                      <div className="flex items-center gap-2">
                        <span className={`w-4 font-bold ${i === 0 ? 'text-green-400' : m ? 'text-blue-400' : 'text-broker-text-muted'}`}>{i + 1}</span>
                        <span className={`w-16 truncate ${i === 0 ? 'text-green-400 font-bold' : m ? 'text-yellow-300' : 'text-broker-text'}`}>{p.name}</span>
                        <span className={m ? 'text-blue-300 w-16 text-right' : 'text-broker-text-muted w-16 text-right'}>{fmt(p.nowTotal)}</span>
                        <span className={m ? 'text-blue-400' : 'text-broker-text-muted'}>→</span>
                        <span className={m ? 'text-white w-16 text-right font-bold' : 'text-white w-16 text-right font-bold'}>{fmt(p.endTotal)}</span>
                        <span className={`w-14 text-right text-xs ${gain > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {gain >= 0 ? '+' : ''}{fmt(gain)}
                        </span>
                        {i === 0 && <span className="text-green-400 text-xs font-bold">WINNER</span>}
                      </div>
                      <div className={m ? 'ml-6 text-[10px] text-blue-400 flex gap-3' : 'ml-6 text-[10px] text-broker-text-muted flex gap-3'}>
                        <span>cash {fmt(p.nowCash)}→{fmt(p.endCash)}</span>
                        <span>shares {fmt(p.nowShares)}→{fmt(p.endShares)}</span>
                        {p.nowPriv > 0 && <span>priv {fmt(p.nowPriv)}</span>}
                      </div>
                    </div>
                  )
                })}
            </div>
          </Panel>

          <Panel m={m} title="Final Stock Prices">
            <div className="flex flex-wrap gap-3">
              {corps.map(c => {
                const startPrice = corpPrice(game.stockMarket, c.sym) || 0
                const endPrice = result.finalPrices[c.sym] || 0
                const diff = endPrice - startPrice
                return (
                  <div key={c.sym} className="text-xs">
                    <span style={{ color: c.color }} className="font-bold">{c.sym}</span>
                    {' '}{fmt(startPrice)} → {fmt(endPrice)}
                    <span className={diff > 0 ? ' text-green-400' : diff < 0 ? ' text-red-400' : ''}>
                      {' '}{diff >= 0 ? '+' : ''}{fmt(diff)}
                    </span>
                  </div>
                )
              })}
            </div>
          </Panel>
        </>
      )}
    </>
  )
}

function Panel({ m, title, children }) {
  return (
    <div className={m
      ? 'bg-blue-900/30 border border-blue-800 rounded p-2'
      : 'bg-broker-surface rounded-lg p-3 border border-broker-border'
    }>
      <div className={m ? 'text-green-400 font-bold mb-1' : 'text-white font-medium mb-2'}>{title}</div>
      {children}
    </div>
  )
}
