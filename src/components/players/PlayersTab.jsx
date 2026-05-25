import { useState, useEffect, useMemo } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { useDispatch } from '../../hooks/useDispatch.js'
import { formatCurrency } from '../../utils/currency.js'
import { corpPrice } from '../../engine/stockMarket.js'
import { playerNetWorth } from '../../engine/rules/netWorth.js'
import { playerSharePercent } from '../../engine/player.js'
import { playerAdvisorTips } from '../../engine/rules/advisorTips.js'
import { AdvisorSection } from '../shared/AdvisorSection.jsx'

export default function PlayersTab() {
  const game = useGameStore((s) => s.game)
  const dispatch = useDispatch()
  const turnTracking = useUIStore((s) => s.turnTracking)
  const plusPlus = useUIStore((s) => s.plusPlus)
  const isWhatIf = !!useGameStore((s) => s.whatIfSnapshot)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [assigningCard, setAssigningCard] = useState(null)

  // Navigate from CorpsTab cross-link
  const activePlayerId = useUIStore((s) => s.activePlayerId)
  useEffect(() => {
    if (activePlayerId && game) {
      const idx = game.players.findIndex(p => p.id === activePlayerId)
      if (idx >= 0) setSelectedIdx(idx)
      useUIStore.getState().setActivePlayer(null)
    }
  }, [activePlayerId])

  // In guided mode, auto-select the active turn player
  const isGuided = turnTracking === 'on' && !isWhatIf
  const turnQueue = game?.turnQueue || []
  const turnIndex = game?.turnIndex || 0
  const isSR = game?.roundTracker?.type === 'stock' && !game?.roundTracker?.inPregame
  const isOR = game?.roundTracker?.type === 'operating' && !game?.roundTracker?.inPregame
  const currentEntity = turnQueue[turnIndex]
  const guidedPlayerId = isSR ? currentEntity
    : isOR ? game?.players?.find((p) =>
        p.shares.some((s) => s.corpSym === currentEntity && s.isPresident)
      )?.id
    : null

  useEffect(() => {
    if (isGuided && guidedPlayerId && game) {
      const idx = game.players.findIndex((p) => p.id === guidedPlayerId)
      if (idx >= 0 && idx !== selectedIdx) setSelectedIdx(idx)
    }
  }, [guidedPlayerId, isGuided])

  if (!game) return null

  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const players = game.players
  const selected = players[selectedIdx]

  if (!selected) return null

  // Corp navigation helper
  const goToCorp = (corpSym) => {
    useUIStore.getState().setActiveCorp(corpSym)
    useUIStore.getState().setActiveTab('corps')
  }

  // Compute share holdings
  const holdings = []
  const corpTotals = {}
  const shortTotals = {}
  for (const s of selected.shares) {
    if (s.isShort) {
      shortTotals[s.corpSym] = (shortTotals[s.corpSym] || 0) + 1
    } else {
      corpTotals[s.corpSym] = (corpTotals[s.corpSym] || 0) + s.percent
    }
  }
  for (const [corpSym, pct] of Object.entries(corpTotals)) {
    const corp = game.corporations.find((c) => c.sym === corpSym)
    const price = corpPrice(game.stockMarket, corpSym)
    const value = price ? (price * pct) / 10 : 0
    const isPresident = selected.shares.some((s) => s.corpSym === corpSym && s.isPresident)
    holdings.push({ corpSym, pct, price, value, isPresident, corp })
  }
  for (const [corpSym, count] of Object.entries(shortTotals)) {
    const corp = game.corporations.find((c) => c.sym === corpSym)
    const price = corpPrice(game.stockMarket, corpSym)
    holdings.push({ corpSym, pct: -(count * 10), price, value: -(price ? price * count : 0), isPresident: false, corp, isShort: true })
  }
  holdings.sort((a, b) => b.value - a.value)

  const privates = (selected.privates || []).map((sym) => {
    const company = game.companies?.find((c) => c.sym === sym)
    return company ? { sym, name: company.name, value: company.value, revenue: company.revenue, closed: company.closed } : null
  }).filter(Boolean)

  const presidencies = holdings.filter((h) => h.isPresident)
  const totalShareValue = holdings.reduce((s, h) => s + h.value, 0)
  const totalPrivateValue = privates.reduce((s, p) => s + (p.closed ? 0 : p.value), 0)
  const netWorth = playerNetWorth(game, selected.id)

  // Corps this player's corps hold shares (PTG/21Moon)
  const corpHeldShares = []
  for (const h of presidencies) {
    const corp = game.corporations.find((c) => c.sym === h.corpSym)
    if (!corp?.sharesHeld?.length) continue
    const grouped = {}
    for (const s of corp.sharesHeld) {
      grouped[s.corpSym] = (grouped[s.corpSym] || 0) + s.percent
    }
    for (const [targetSym, pct] of Object.entries(grouped)) {
      const targetPrice = corpPrice(game.stockMarket, targetSym)
      corpHeldShares.push({
        ownerSym: h.corpSym, ownerColor: corp?.color,
        targetSym, pct, value: targetPrice ? (targetPrice * pct) / 10 : 0,
      })
    }
  }

  // Advisor tips
  const tips = useMemo(() => plusPlus ? playerAdvisorTips(game, selected.id) : [], [game, selected.id, plusPlus])

  return (
    <div className="p-3 space-y-3">
      {/* Player selector */}
      <div className="flex gap-1 overflow-x-auto">
        {players.map((p, i) => {
          const locked = isGuided && guidedPlayerId && p.id !== guidedPlayerId
          return (
            <button
              key={p.id}
              onClick={() => !locked && setSelectedIdx(i)}
              className={`flex-shrink-0 px-3 py-2 rounded text-sm font-medium transition-colors ${
                i === selectedIdx
                  ? 'bg-broker-gold text-broker-bg'
                  : locked
                    ? 'bg-broker-surface text-broker-text-muted opacity-30'
                    : 'bg-broker-surface text-broker-text-muted hover:text-white'
              }`}
            >
              {p.name}
            </button>
          )
        })}
      </div>

      {/* ======== DATA ======== */}
      <SectionHeader title="Data" />

      {/* Cash & Net Worth */}
      <div className="bg-broker-surface rounded-lg p-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-broker-text-muted font-medium uppercase">Cash</span>
          <span className="text-xl font-bold">{fmt(selected.cash)}</span>
        </div>
        <div className="flex justify-between text-sm text-broker-text-muted">
          <span>Shares: {fmt(totalShareValue)}</span>
          {totalPrivateValue > 0 && <span>Privates: {fmt(totalPrivateValue)}</span>}
          <span className="text-white font-medium">Net: {fmt(netWorth)}</span>
        </div>
      </div>

      {/* Share Holdings */}
      {holdings.length > 0 && (
        <div className="bg-broker-surface rounded-lg p-3">
          <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">Share Holdings</div>
          <div className="space-y-1">
            {holdings.map((h, i) => (
              <div key={`${h.corpSym}-${h.isShort ? 'short' : i}`} className={`flex items-center gap-2 ${h.isShort ? 'text-red-300' : ''}`}>
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 cursor-pointer"
                  style={h.corp?.stripeColor
                    ? { background: `linear-gradient(135deg, ${h.corp.color} 50%, ${h.corp.stripeColor} 50%)` }
                    : { backgroundColor: h.corp?.color || '#666' }
                  }
                  onClick={() => goToCorp(h.corpSym)}
                />
                <button onClick={() => goToCorp(h.corpSym)} className="text-sm font-medium w-14 text-left hover:underline">{h.corpSym}</button>
                <span className="text-sm w-10 text-right">{h.pct}%</span>
                {h.isPresident && <span className="text-xs bg-yellow-900 text-yellow-300 px-1 rounded">P</span>}
                {h.isShort && <span className="text-xs bg-red-900 text-red-300 px-1 rounded">SHORT</span>}
                <span className="text-sm text-broker-text-muted ml-auto">
                  {h.price ? `@ ${fmt(h.price)}` : '—'}
                </span>
                <span className={`text-sm font-medium w-16 text-right ${h.isShort ? 'text-red-300' : ''}`}>{fmt(h.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Corp-Held Shares (PTG, 21Moon) */}
      {corpHeldShares.length > 0 && (
        <div className="bg-broker-surface rounded-lg p-3">
          <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">Corp-Held Shares</div>
          <div className="space-y-1">
            {corpHeldShares.map((ch, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ch.ownerColor || '#666' }} />
                <button onClick={() => goToCorp(ch.ownerSym)} className="font-medium w-14 hover:underline">{ch.ownerSym}</button>
                <span className="text-broker-text-muted">owns</span>
                <button onClick={() => goToCorp(ch.targetSym)} className="font-medium hover:underline">{ch.pct}% {ch.targetSym}</button>
                <span className="text-broker-text-muted ml-auto">{fmt(ch.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Cards (PTG) */}
      {(selected.cards?.length > 0 || game.title.strategyCards) && (
        <div className="bg-broker-surface rounded-lg p-3">
          <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">Strategy Cards</div>
          {selected.cards?.length > 0 ? (
            <div className="space-y-2">
              {selected.cards.map((card) => (
                <div key={card.id} className={`text-sm rounded p-2 ${card.used ? 'opacity-40 bg-broker-bg' : 'bg-broker-surface-hover'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{card.name}</span>
                    <span className="text-xs text-broker-text-muted">({card.color})</span>
                    {card.used && <span className="text-xs text-red-400 ml-auto">{card.usedAs === 'unique_action' ? 'Used' : `→ ${card.assignedTo?.corpSym}`}</span>}
                  </div>
                  {!card.used && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => dispatch({ type: 'USE_CARD_ACTION', playerId: selected.id, cardId: card.id })}
                        className="text-xs bg-blue-900 hover:bg-blue-800 text-blue-200 px-2 py-1 rounded"
                      >Use Unique</button>
                      <button
                        onClick={() => setAssigningCard(assigningCard?.cardId === card.id ? null : { cardId: card.id })}
                        className="text-xs bg-yellow-900 hover:bg-yellow-800 text-yellow-200 px-2 py-1 rounded"
                      >Assign to Train</button>
                    </div>
                  )}
                  {!card.used && assigningCard?.cardId === card.id && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs text-broker-text-muted">Select train:</div>
                      {presidencies.map((h) => {
                        const corp = game.corporations.find((c) => c.sym === h.corpSym)
                        return corp?.trains.filter((t) => !t.attachment).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              dispatch({ type: 'ASSIGN_CARD_TO_TRAIN', playerId: selected.id, cardId: card.id, corpSym: corp.sym, trainId: t.id })
                              setAssigningCard(null)
                            }}
                            className="text-xs bg-broker-surface hover:bg-broker-surface-hover px-2 py-1 rounded mr-1"
                          >{corp.sym} {t.name}-train</button>
                        ))
                      })}
                    </div>
                  )}
                  <div className="text-xs text-broker-text-muted mt-1">Permit: {card.permit}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-broker-text-muted">No cards yet</div>
          )}
          {game.title.strategyCards && (
            <GiveCardPanel game={game} playerId={selected.id} playerCards={selected.cards || []} dispatch={dispatch} />
          )}
        </div>
      )}

      {/* Private Companies */}
      {privates.length > 0 && (
        <div className="bg-broker-surface rounded-lg p-3">
          <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">Private Companies</div>
          <div className="space-y-1">
            {privates.map((p) => (
              <div key={p.sym} className={`flex items-center gap-2 text-sm ${p.closed ? 'opacity-40' : ''}`}>
                <span className="font-medium w-10">{p.sym}</span>
                <span className="flex-1 text-broker-text-muted truncate">{p.name}</span>
                <span className="text-broker-text-muted">{fmt(p.revenue)}/OR</span>
                <span className="font-medium w-14 text-right">{fmt(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Presidencies */}
      {presidencies.length > 0 && (
        <div className="bg-broker-surface rounded-lg p-3">
          <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">President Of</div>
          <div className="flex flex-wrap gap-2">
            {presidencies.map((h) => {
              const corp = game.corporations.find((c) => c.sym === h.corpSym)
              return (
                <button
                  key={h.corpSym}
                  onClick={() => goToCorp(h.corpSym)}
                  className="px-2 py-1 rounded text-xs font-medium hover:ring-2 hover:ring-white/50 transition-all"
                  style={corp?.stripeColor
                    ? { background: `linear-gradient(135deg, ${corp.color} 50%, ${corp.stripeColor} 50%)`, color: corp.textColor || '#fff' }
                    : { backgroundColor: corp?.color || '#666', color: corp?.textColor || '#fff' }
                  }
                >
                  {h.corpSym} — {fmt(corp?.cash || 0)} treasury
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ======== ANALYSIS (++ only) ======== */}
      {plusPlus && tips.length > 0 && (
        <>
          <SectionHeader title="Analysis" />
          <div className="bg-broker-surface rounded-lg p-3">
            <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">Advisor</div>
            <AdvisorSection tips={tips} skin="broker" onCorpClick={goToCorp} />
          </div>
        </>
      )}

      {/* No holdings */}
      {holdings.length === 0 && privates.length === 0 && (selected.cards || []).length === 0 && !plusPlus && (
        <div className="text-center text-broker-text-muted text-sm py-4">No assets</div>
      )}
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div className="text-broker-text-muted text-[10px] uppercase tracking-widest border-b border-broker-border pb-1 mt-2">
      {title}
    </div>
  )
}

function GiveCardPanel({ game, playerId, playerCards, dispatch }) {
  const allGiven = game.players.flatMap((p) => (p.cards || []).map((c) => c.id))
  const available = (game.title.strategyCards || []).filter((c) => !allGiven.includes(c.id))
  if (available.length === 0) return null

  return (
    <div className="mt-2">
      <div className="text-xs text-broker-text-muted mb-1">Give card:</div>
      <div className="flex flex-wrap gap-1">
        {available.map((card) => (
          <button
            key={card.id}
            onClick={() => dispatch({ type: 'GIVE_CARD', playerId, card })}
            className="text-xs bg-broker-surface-hover hover:bg-broker-surface px-2 py-1 rounded"
            title={`${card.unique}\nPermit: ${card.permit}`}
          >{card.name}</button>
        ))}
      </div>
    </div>
  )
}
