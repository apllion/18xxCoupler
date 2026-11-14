// DisplayShell — auto-rotating TV dashboard for conventions.
// Cycles between Scoreboard, Market, and Corp Summary with crossfade.

import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useRoleStore } from '../../store/roleStore.js'
import { useGameData } from '../../hooks/useGameData.js'
import { playerNetWorth } from '../../engine/rules/netWorth.js'
import { playerSharePercent, playerCertCount, isPresident } from '../../engine/player.js'
import { corpPrice } from '../../engine/stockMarket.js'

const VIEWS = ['scoreboard', 'market', 'corpsummary']
const VIEW_LABELS = { scoreboard: 'Scoreboard', market: 'Stock Market', corpsummary: 'Corporations' }
const DEFAULT_INTERVAL = 8000

export default function DisplayShell() {
  const game = useGameStore((s) => s.game)
  const [activeView, setActiveView] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(true) // for crossfade

  const cycle = useCallback(() => {
    setVisible(false)
    setTimeout(() => {
      setActiveView((i) => (i + 1) % VIEWS.length)
      setVisible(true)
    }, 500)
  }, [])

  useEffect(() => {
    if (paused) return
    const id = setInterval(cycle, DEFAULT_INTERVAL)
    return () => clearInterval(id)
  }, [paused, cycle])

  function handleTap() {
    setPaused((p) => !p)
  }

  if (!game) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">No game loaded</div>
          <button onClick={() => useRoleStore.getState().reset()}
            className="text-sm text-broker-text-muted hover:text-white">
            Back to Hub
          </button>
        </div>
      </div>
    )
  }

  const rt = game.roundTracker
  const isSR = rt?.roundType === 'SR'
  const isOR = rt?.roundType === 'OR'

  return (
    <div className="h-screen flex flex-col bg-broker-bg text-white overflow-hidden select-none"
      onClick={handleTap}>

      {/* Minimal top bar */}
      <div className={`flex items-center justify-between px-6 py-3 flex-shrink-0 border-b ${
        isSR ? 'bg-green-900/30 border-green-800' : isOR ? 'bg-amber-900/30 border-amber-800' : 'bg-broker-surface border-broker-border'
      }`}>
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold tracking-wide">{game.title.title}</span>
          {rt && (
            <span className={`text-sm font-medium px-3 py-1 rounded ${
              isSR ? 'bg-green-800 text-green-200' : isOR ? 'bg-amber-800 text-amber-200' : 'bg-purple-800 text-purple-200'
            }`}>{rt.roundType}</span>
          )}
          <span className="text-sm text-broker-text-muted">{VIEW_LABELS[VIEWS[activeView]]}</span>
        </div>
        <div className="flex items-center gap-4">
          {paused && <span className="text-xs text-amber-400 uppercase tracking-wider">Paused</span>}
          <button onClick={(e) => { e.stopPropagation(); useRoleStore.getState().reset() }}
            className="text-xs text-broker-text-muted hover:text-white px-2 py-1 rounded bg-broker-surface/50">
            Leave
          </button>
        </div>
      </div>

      {/* View content with crossfade */}
      <div className="flex-1 overflow-auto p-6"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 500ms ease-in-out' }}>
        {VIEWS[activeView] === 'scoreboard' && <ScoreboardView game={game} />}
        {VIEWS[activeView] === 'market' && <MarketView game={game} />}
        {VIEWS[activeView] === 'corpsummary' && <CorpSummaryView game={game} />}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-3 py-3 flex-shrink-0">
        {VIEWS.map((v, i) => (
          <button key={v} onClick={(e) => {
            e.stopPropagation()
            setVisible(false)
            setTimeout(() => { setActiveView(i); setVisible(true) }, 300)
          }}
            className={`rounded-full transition-all duration-300 ${
              i === activeView
                ? 'w-8 h-3 bg-broker-gold'
                : 'w-3 h-3 bg-broker-text-muted/30 hover:bg-broker-text-muted/60'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

// --- Scoreboard View ---
function ScoreboardView({ game }) {
  const fmt = (n) => {
    const cf = game.title.currencyFormat
    if (cf === 'euro') return `\u20AC${n}`
    if (cf === 'pound') return `\xA3${n}`
    return `$${n}`
  }

  const players = game.players
    .map((p) => {
      const nw = playerNetWorth(game, p.id)
      let shareValue = 0
      for (const s of p.shares) {
        const price = corpPrice(game.stockMarket, s.corpSym) || 0
        shareValue += price * (s.percent / 10)
      }
      return { ...p, netWorth: nw, shareValue, certs: playerCertCount(p) }
    })
    .sort((a, b) => b.netWorth - a.netWorth)

  const corps = game.corporations.filter((c) => c.ipoed || c.floated)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold tracking-tight">Scoreboard</h2>
        <p className="text-broker-text-muted mt-1">Player Rankings by Net Worth</p>
      </div>

      <div className="space-y-4">
        {players.map((p, rank) => {
          const isPD = p.id === game.priorityDeal
          return (
            <div key={p.id}
              className={`rounded-2xl p-5 border transition-all ${
                rank === 0
                  ? 'bg-broker-gold/10 border-broker-gold/40 shadow-lg shadow-broker-gold/5'
                  : 'bg-broker-surface border-broker-border'
              }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <span className={`text-3xl font-black ${
                    rank === 0 ? 'text-broker-gold' : 'text-broker-text-muted'
                  }`}>#{rank + 1}</span>
                  <div>
                    <span className={`text-2xl font-bold ${isPD ? 'text-broker-gold' : 'text-white'}`}>
                      {p.name}
                    </span>
                    {isPD && <span className="text-xs text-broker-gold ml-2">Priority Deal</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{fmt(p.netWorth)}</div>
                  <div className="text-sm text-broker-text-muted">
                    Cash {fmt(p.cash)} + Shares {fmt(p.shareValue)}
                  </div>
                </div>
              </div>

              {/* Share badges */}
              <div className="flex gap-2 flex-wrap">
                {corps.map((c) => {
                  const pct = playerSharePercent(p, c.sym)
                  if (pct === 0) return null
                  const pres = isPresident(p, c.sym)
                  return (
                    <span key={c.sym}
                      className="px-2 py-1 rounded font-bold text-sm"
                      style={c.stripeColor
                        ? { background: `linear-gradient(135deg, ${c.color} 50%, ${c.stripeColor} 50%)`, color: c.textColor }
                        : { backgroundColor: c.color, color: c.textColor }
                      }>
                      {c.sym} {pct}%{pres ? ' P' : ''}
                    </span>
                  )
                })}
                <span className="text-sm text-broker-text-muted self-center">
                  Certs: {p.certs}/{typeof game.certLimit === 'number' ? game.certLimit : '?'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bank */}
      <div className="mt-6 text-center">
        <span className={`text-lg font-bold ${game.bank.cash <= 0 ? 'text-red-400' : 'text-broker-text-muted'}`}>
          Bank: {fmt(game.bank.cash)}
        </span>
      </div>
    </div>
  )
}

// --- Market View ---
function MarketView({ game }) {
  const { grid, corpPositions } = game.stockMarket

  const ZONE_COLORS = {
    yellow: 'bg-yellow-900/40 text-yellow-300 border-yellow-800/50',
    orange: 'bg-orange-900/40 text-orange-300 border-orange-800/50',
    brown: 'bg-red-900/40 text-red-400 border-red-800/50',
    close: 'bg-broker-bg text-broker-gold-dim border-broker-border',
    endgame: 'bg-broker-green/40 text-broker-gold border-broker-green',
    initial: 'bg-purple-900/40 text-purple-300 border-purple-800/50',
    reserved: 'bg-green-900/40 text-green-300 border-green-800/50',
    bonus: 'bg-cyan-900/40 text-cyan-300 border-cyan-800/50',
    normal: 'bg-broker-surface text-broker-text border-broker-border',
  }

  // Build corps-at-position map
  const corpsAt = {}
  for (const [sym, pos] of Object.entries(corpPositions)) {
    const key = `${pos.row},${pos.col}`
    if (!corpsAt[key]) corpsAt[key] = []
    corpsAt[key].push({ sym, order: pos.order ?? 0 })
  }
  for (const key of Object.keys(corpsAt)) {
    corpsAt[key].sort((a, b) => a.order - b.order)
  }

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-4xl font-bold tracking-tight mb-6">Stock Market</h2>
      <div className="overflow-x-auto w-full">
        <table className="border-collapse mx-auto text-sm">
          <tbody>
            {grid.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  if (!cell) return <td key={ci} className="w-16 h-14" />
                  const key = `${ri},${ci}`
                  const corps = corpsAt[key] || []
                  const zoneClass = ZONE_COLORS[cell.zone] || ZONE_COLORS.normal

                  return (
                    <td key={ci}
                      className={`w-16 h-14 border text-center relative ${zoneClass} ${
                        cell.canPar ? 'ring-1 ring-inset ring-broker-gold' : ''
                      }`}>
                      <div className="text-xs leading-tight font-medium">{cell.price}</div>
                      {corps.length > 0 && (
                        <div className="flex gap-0.5 justify-center mt-0.5 flex-wrap">
                          {corps.map((entry) => {
                            const corp = game.corporations.find((c) => c.sym === entry.sym)
                            return (
                              <div key={entry.sym}
                                className="w-4 h-4 rounded-full text-[7px] flex items-center justify-center font-bold"
                                style={{ backgroundColor: corp?.color, color: corp?.textColor || '#fff' }}
                                title={entry.sym}
                              />
                            )
                          })}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Corp Summary View ---
function CorpSummaryView({ game }) {
  const fmt = (n) => {
    const cf = game.title.currencyFormat
    if (cf === 'euro') return `\u20AC${n}`
    if (cf === 'pound') return `\xA3${n}`
    return `$${n}`
  }

  const corps = game.corporations
    .filter((c) => c.floated)
    .map((c) => ({
      ...c,
      price: corpPrice(game.stockMarket, c.sym) || 0,
      president: game.players.find((p) => isPresident(p, c.sym)),
    }))
    .sort((a, b) => b.price - a.price)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold tracking-tight">Corporations</h2>
        <p className="text-broker-text-muted mt-1">{corps.length} floated</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {corps.map((c) => {
          const soldOut = c.ipoed && c.ipoShares === 0 && c.marketShares === 0
          // Last revenue
          let lastRev = null
          for (let i = game.actionLog.length - 1; i >= 0; i--) {
            const a = game.actionLog[i].action
            if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && a.corpSym === c.sym) {
              lastRev = { amount: a.totalRevenue, type: a.type }
              break
            }
          }

          return (
            <div key={c.sym}
              className="rounded-2xl p-4 border bg-broker-surface border-broker-border">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg font-bold text-lg"
                    style={c.stripeColor
                      ? { background: `linear-gradient(135deg, ${c.color} 50%, ${c.stripeColor} 50%)`, color: c.textColor }
                      : { backgroundColor: c.color, color: c.textColor }
                    }>{c.sym}</span>
                  {soldOut && <span className="text-xs text-green-400 font-medium">Sold Out</span>}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{fmt(c.price)}</div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-broker-text-muted">Treasury: </span>
                  <span className={c.cash < 0 ? 'text-red-400 font-bold' : 'text-sky-300 font-bold'}>{fmt(c.cash)}</span>
                </div>
                <div>
                  <span className="text-broker-text-muted">President: </span>
                  <span className="text-white font-medium">{c.president?.name || '--'}</span>
                </div>
                <div>
                  <span className="text-broker-text-muted">Trains: </span>
                  <span className="text-white font-medium">
                    {c.trains.length > 0 ? c.trains.map((t) => t.name).join(', ') : <span className="text-red-400">none</span>}
                  </span>
                </div>
                <div>
                  <span className="text-broker-text-muted">Tokens: </span>
                  <span className="text-white">{c.tokensPlaced}/{c.tokens.length}</span>
                </div>
              </div>

              {/* Last revenue */}
              {lastRev && (
                <div className="mt-2 text-sm">
                  <span className="text-broker-text-muted">Revenue: </span>
                  <span className={lastRev.type === 'WITHHOLD_DIVIDEND' ? 'text-red-400' : 'text-green-400'}>
                    {fmt(lastRev.amount)} {lastRev.type === 'WITHHOLD_DIVIDEND' ? '(W)' : lastRev.type === 'HALF_DIVIDEND' ? '(H)' : '(P)'}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
