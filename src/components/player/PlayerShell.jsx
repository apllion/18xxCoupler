// PlayerShell — mode-aware player view with SR/OR routing, orientation detection,
// and landscape two-panel layout. Wraps SRView and ORView.

import { useState, useEffect } from 'react'
import { useGameData } from '../../hooks/useGameData.js'
import { useRoleStore } from '../../store/roleStore.js'
import { useGameStore } from '../../store/gameStore.js'
import { NumPadProvider, usePhysicalKeyboard } from '../input/NumPadContext.jsx'
import { IconBack, IconUndo } from '../shared/Icons.jsx'
import CorpBadge from '../shared/CorpBadge.jsx'
import SRView from './SRView.jsx'
import ORView from './ORView.jsx'

export default function PlayerShell() {
  return (
    <NumPadProvider>
      <PlayerShellInner />
    </NumPadProvider>
  )
}

function PlayerShellInner() {
  const baseData = useGameData()
  const storedPlayerId = useRoleStore((s) => s.playerId)
  const [playerId, setPlayerId] = useState(storedPlayerId)
  const { hasPhysicalKeyboard } = usePhysicalKeyboard()
  const [isLandscape, setIsLandscape] = useState(false)

  // Orientation detection
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)')
    setIsLandscape(mq.matches)
    function onChange(e) { setIsLandscape(e.matches) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (!baseData.game) return null

  const { game, fmt, corps, dispatch, isSR, isOR, rt, playerSharePercent, isPresident, certLimit } = baseData
  const me = game.players.find(p => p.id === playerId) || null

  const data = { game, fmt, me, myPlayerId: playerId, corps, dispatch }

  // Player selector if no player chosen
  if (!me) {
    return (
      <div className="min-h-screen bg-broker-bg text-white flex flex-col">
        <TopBar game={game} fmt={fmt} rt={rt} isSR={isSR} isOR={isOR} me={null} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <div className="text-lg font-medium text-broker-text-muted">Select your player</div>
          <div className="space-y-2 w-full max-w-sm">
            {game.players.map(p => (
              <button key={p.id} onClick={() => setPlayerId(p.id)}
                className="w-full bg-broker-surface hover:bg-broker-surface-hover rounded-lg px-4 py-4 text-left flex items-center justify-between min-h-[44px]">
                <span className="font-medium">{p.name}</span>
                <span className="text-broker-cash font-bold">{fmt(p.cash)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Compute holdings summary for compact panel
  const shareSize = game.title.shares?.[1] ?? 10
  const holdings = corps.map(c => {
    const pct = playerSharePercent(me, c.sym)
    if (pct === 0) return null
    const pres = isPresident(me, c.sym)
    return { sym: c.sym, corp: c, pct, pres }
  }).filter(Boolean)

  const twoPanel = isLandscape && hasPhysicalKeyboard

  // Active view based on round type
  const activeView = isSR
    ? <SRView {...data} />
    : <ORView {...data} />

  const modeColor = isSR ? 'green' : isOR ? 'amber' : 'teal'

  return (
    <div className="min-h-screen bg-broker-bg text-white flex flex-col">
      <TopBar game={game} fmt={fmt} rt={rt} isSR={isSR} isOR={isOR} me={me}
        onChangePlayer={() => setPlayerId(null)} />

      {twoPanel ? (
        /* Landscape + keyboard: two-panel layout */
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel: compact holdings */}
          <div className="w-[40%] border-r border-broker-border overflow-y-auto p-3">
            <PlayerHoldings me={me} fmt={fmt} holdings={holdings} corps={corps} shareSize={shareSize}
              certLimit={certLimit} playerCertCount={baseData.playerCertCount} />
          </div>
          {/* Right panel: active input area */}
          <div className="w-[60%] overflow-y-auto p-4">
            <div className={`border-l-2 border-${modeColor}-500 pl-3 mb-2`}>
              <span className={`text-xs font-bold text-${modeColor}-300`}>{isSR ? 'Stock Round' : isOR ? 'Operating Round' : rt?.roundType || 'Round'}</span>
            </div>
            {activeView}
          </div>
        </div>
      ) : (
        /* Portrait: stacked layout */
        <div className="flex-1 overflow-y-auto p-4">
          {/* Compact holdings at top */}
          <PlayerHoldings me={me} fmt={fmt} holdings={holdings} corps={corps} shareSize={shareSize}
            certLimit={certLimit} playerCertCount={baseData.playerCertCount} compact />
          {/* Mode indicator */}
          <div className={`border-l-2 border-${modeColor}-500 pl-3 mb-3 mt-3`}>
            <span className={`text-xs font-bold text-${modeColor}-300`}>{isSR ? 'Stock Round' : isOR ? 'Operating Round' : rt?.roundType || 'Round'}</span>
          </div>
          {activeView}
        </div>
      )}
    </div>
  )
}

function TopBar({ game, fmt, rt, isSR, isOR, me, onChangePlayer }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-broker-surface border-b border-broker-border flex-shrink-0">
      <div className="flex items-center gap-2">
        <button onClick={() => useRoleStore.getState().reset()}
          className="text-broker-text-muted hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <IconBack />
        </button>
        <span className="text-sm font-bold">{game.title.title}</span>
        <span className="text-[10px] text-broker-text-muted">Ph {game.phaseManager?.currentPhaseIndex != null ? game.phaseManager.currentPhaseIndex + 1 : '?'}</span>
      </div>
      <div className="flex items-center gap-2">
        {rt && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
            isSR ? 'bg-green-800 text-green-200' : isOR ? 'bg-amber-800 text-amber-200' : 'bg-broker-green text-white'
          }`}>{rt.roundType}</span>
        )}
        {me && <span className="text-xs text-broker-cash font-bold">{fmt(me.cash)}</span>}
        <button onClick={() => { const s = useGameStore.getState(); if (s.canUndo()) s.undo() }}
          className="text-broker-text-muted hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Undo">
          <IconUndo className="w-4 h-4" />
        </button>
        {me && onChangePlayer && (
          <button onClick={onChangePlayer}
            className="text-[10px] text-broker-text-muted hover:text-white px-1">Switch</button>
        )}
      </div>
    </div>
  )
}

function PlayerHoldings({ me, fmt, holdings, corps, shareSize, certLimit, playerCertCount, compact }) {
  const totalShareValue = holdings.reduce((s, h) => {
    const price = h.corp.price || 0
    return s + price * (h.pct / shareSize)
  }, 0)
  const certs = playerCertCount(me)

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold">{me.name}</span>
          <span className="text-broker-cash font-bold">{fmt(me.cash)}</span>
          <span className="text-xs text-broker-text-muted">Net {fmt(me.cash + totalShareValue)}</span>
          <span className="text-xs text-broker-text-muted">Certs {certs}/{certLimit}</span>
        </div>
        {holdings.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {holdings.map(h => (
              <span key={h.sym} className="inline-flex items-center gap-0.5 text-xs">
                <CorpBadge sym={h.corp.sym} color={h.corp.color} textColor={h.corp.textColor}
                  stripeColor={h.corp.stripeColor} stripeTextColor={h.corp.stripeTextColor} />
                <span className="text-broker-text-muted">{h.pct}%{h.pres ? 'P' : ''}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Full holdings for landscape left panel
  return (
    <div className="space-y-3">
      <div>
        <div className="text-lg font-bold">{me.name}</div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-2xl font-bold text-broker-cash">{fmt(me.cash)}</span>
          <div className="text-xs text-broker-text-muted space-y-0.5">
            <div>Shares: {fmt(totalShareValue)}</div>
            <div>Net: {fmt(me.cash + totalShareValue)}</div>
            <div>Certs: {certs}/{certLimit}</div>
          </div>
        </div>
      </div>
      {holdings.length > 0 && (
        <div className="space-y-1">
          {holdings.map(h => (
            <div key={h.sym} className="flex items-center justify-between bg-broker-bg rounded-lg px-2 py-1.5">
              <div className="flex items-center gap-2">
                <CorpBadge sym={h.corp.sym} color={h.corp.color} textColor={h.corp.textColor}
                  stripeColor={h.corp.stripeColor} stripeTextColor={h.corp.stripeTextColor} />
                <span className="text-sm">{h.pct}%{h.pres ? ' P' : ''}</span>
              </div>
              <span className="text-xs text-broker-text-muted">{fmt(h.corp.price)}</span>
            </div>
          ))}
        </div>
      )}
      {(me.privates || []).length > 0 && (
        <div>
          <div className="text-xs text-broker-text-muted mb-1">Privates</div>
          <div className="flex gap-1 flex-wrap">
            {me.privates.map(sym => (
              <span key={sym} className="text-xs bg-broker-green/30 text-broker-accent px-2 py-0.5 rounded">{sym}</span>
            ))}
          </div>
        </div>
      )}
      {(me.debt || 0) > 0 && (
        <div className="text-sm text-red-300">Debt: {fmt(me.debt)}</div>
      )}
    </div>
  )
}
