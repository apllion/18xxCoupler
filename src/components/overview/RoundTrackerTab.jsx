// RoundTrackerTab — dedicated view for round/turn/phase tracking.
// Shows current round, turn order, phase info, and modification actions.

import { useState } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useDispatch } from '../../hooks/useDispatch.js'
import { useSyncContext } from '../../hooks/SyncContext.jsx'
import { roundLabel } from '../../engine/roundTracker.js'
import { currentPhase } from '../../engine/phase.js'
import { corpPrice } from '../../engine/stockMarket.js'
import { formatCurrency } from '../../utils/currency.js'

const OR_STEPS = ['Track', 'Token', 'Routes', 'Dividend', 'Trains']

export default function RoundTrackerTab() {
  const game = useGameStore((s) => s.game)
  const dispatch = useDispatch()
  const sync = useSyncContext()

  if (!game) return null

  const rt = game.roundTracker
  const phase = currentPhase(game.phaseManager)
  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const label = rt ? roundLabel(rt) : '—'
  const isSR = rt?.roundType === 'SR'
  const isOR = rt?.roundType === 'OR'

  // Build round history from action log
  const roundHistory = []
  for (const entry of game.actionLog) {
    if (entry.action.type === 'ADVANCE_ROUND') {
      roundHistory.push(entry.action.newLabel || entry.description || 'advance')
    }
  }

  // Current turn queue
  const turnQueue = game.turnQueue || []
  const turnIndex = game.turnIndex || 0
  const srPassed = game.srPassed || []
  const orStep = game.orStep || 0

  // Operating order (floated corps by price)
  const operatingOrder = game.corporations
    .filter(c => c.floated)
    .map(c => ({ ...c, price: corpPrice(game.stockMarket, c.sym) || 0 }))
    .sort((a, b) => b.price - a.price)

  return (
    <div className="text-sm p-3 space-y-4 overflow-y-auto bg-broker-bg h-full">
      {/* Current Round */}
      <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-broker-text-muted text-[10px] uppercase">Current Round</div>
            <div className="text-2xl font-bold text-white">{label}</div>
          </div>
          <div className="text-right">
            <div className="text-broker-text-muted text-[10px] uppercase">Phase</div>
            <div className="text-lg font-bold text-white">{phase.name}</div>
          </div>
        </div>
        <div className="flex gap-1 mt-2">
          {(rt?.roundTypes || ['SR', 'OR']).map((rType) => {
            const active = rType === rt?.roundType
            const colors = active
              ? rType === 'SR' ? 'bg-broker-green text-broker-gold'
                : rType === 'OR' ? 'bg-amber-900 text-amber-200'
                : rType === 'Pregame' ? 'bg-purple-800 text-purple-200'
                : 'bg-blue-800 text-blue-200'
              : 'bg-broker-surface-hover text-broker-text-muted hover:text-white'
            return (
              <button
                key={rType}
                onClick={() => dispatch({ type: 'SET_ROUND', roundType: rType })}
                className={`flex-1 py-2 rounded font-medium text-sm transition-colors ${colors}`}
              >
                {rType}
              </button>
            )
          })}
        </div>
      </div>

      {/* Phase Info */}
      <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
        <div className="text-broker-text font-medium mb-2">Phase Details</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-broker-text-muted">Train limit: </span>
            <span className="text-white">{typeof phase.trainLimit === 'number' ? phase.trainLimit : JSON.stringify(phase.trainLimit)}</span>
          </div>
          <div>
            <span className="text-broker-text-muted">ORs per set: </span>
            <span className="text-white">{phase.operatingRounds || 2}</span>
          </div>
          <div>
            <span className="text-broker-text-muted">Bank: </span>
            <span className={game.bank.cash <= 0 ? 'text-red-400 font-bold' : 'text-white'}>{fmt(game.bank.cash)}</span>
          </div>
          {phase.events?.length > 0 && (
            <div className="col-span-2">
              <span className="text-broker-text-muted">Events: </span>
              <span className="text-amber-400">{phase.events.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Turn Order — SR */}
      {isSR && (
        <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
          <div className="text-broker-text font-medium mb-2">Stock Round — Player Order</div>
          {turnQueue.length > 0 ? (
            <div className="space-y-1">
              {turnQueue.map((playerId, i) => {
                const player = game.players.find(p => p.id === playerId)
                if (!player) return null
                const isCurrent = i === turnIndex
                const passed = srPassed.includes(playerId)
                return (
                  <div key={playerId} className={`flex items-center gap-2 px-2 py-1.5 rounded ${
                    isCurrent ? 'bg-broker-green/20 border border-broker-gold/30' : ''
                  }`}>
                    <span className={`w-5 text-center text-xs ${isCurrent ? 'text-broker-gold font-bold' : 'text-broker-text-muted'}`}>{i + 1}</span>
                    <span className={`flex-1 ${
                      passed ? 'text-broker-text-muted line-through opacity-50' :
                      isCurrent ? 'text-white font-bold' : 'text-broker-text'
                    }`}>{player.name}</span>
                    <span className="text-broker-text-muted text-xs">{fmt(player.cash)}</span>
                    {passed && <span className="text-xs text-broker-text-muted">passed</span>}
                    {isCurrent && <span className="text-xs text-broker-gold">◄</span>}
                    {!passed && !isCurrent && (
                      <button
                        onClick={() => dispatch({ type: 'SR_PASS', playerId })}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-broker-surface-hover text-broker-text-muted hover:text-red-300"
                      >
                        Pass
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-broker-text-muted text-xs">No turn queue set. Advance round or enable turn tracking.</div>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => dispatch({ type: 'SR_ACTED' })}
              className="text-xs px-3 py-1.5 rounded bg-broker-surface-hover text-white hover:bg-broker-green/30"
            >
              Next Player
            </button>
            <button
              onClick={() => {
                const ids = game.players.map(p => p.id)
                const prioIdx = ids.indexOf(game.priorityDeal)
                const queue = prioIdx > 0 ? [...ids.slice(prioIdx), ...ids.slice(0, prioIdx)] : ids
                dispatch({ type: 'SET_TURN_QUEUE', queue })
              }}
              className="text-xs px-3 py-1.5 rounded bg-broker-surface-hover text-broker-text-muted hover:text-white"
            >
              Reset Queue
            </button>
          </div>
        </div>
      )}

      {/* Turn Order — OR */}
      {isOR && (
        <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
          <div className="text-broker-text font-medium mb-2">Operating Round — Corp Order</div>
          {turnQueue.length > 0 ? (
            <div className="space-y-1">
              {turnQueue.map((corpSym, i) => {
                const corp = game.corporations.find(c => c.sym === corpSym)
                if (!corp) return null
                const isCurrent = i === turnIndex
                const price = corpPrice(game.stockMarket, corpSym) || 0
                const pres = game.players.find(p => p.shares.some(s => s.corpSym === corpSym && s.isPresident))
                return (
                  <div key={corpSym} className={`flex items-center gap-2 px-2 py-1.5 rounded ${
                    isCurrent ? 'bg-amber-900/20 border border-amber-700/30' : ''
                  }`}>
                    <span className={`w-5 text-center text-xs ${isCurrent ? 'text-amber-400 font-bold' : 'text-broker-text-muted'}`}>{i + 1}</span>
                    <span style={{ color: corp.color }} className="font-bold w-10">{corp.sym}</span>
                    <span className="text-broker-text-muted text-xs flex-1">{pres?.name || '—'}</span>
                    <span className="text-white text-xs">{fmt(price)}</span>
                    {isCurrent && (
                      <div className="flex gap-0.5 ml-2">
                        {OR_STEPS.map((step, si) => (
                          <button key={step}
                            onClick={() => dispatch({ type: 'SET_OR_STEP', step: si })}
                            className={`text-[9px] px-1 py-0.5 rounded ${
                              si === orStep ? 'bg-amber-700 text-white font-medium' :
                              si < orStep ? 'bg-broker-surface/30 text-broker-text-muted opacity-40' :
                              'bg-broker-surface-hover text-broker-text-muted'
                            }`}
                          >{step}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {operatingOrder.map((corp, i) => {
                const pres = game.players.find(p => p.shares.some(s => s.corpSym === corp.sym && s.isPresident))
                return (
                  <div key={corp.sym} className="flex items-center gap-2 px-2 py-1">
                    <span className="w-5 text-center text-xs text-broker-text-muted">{i + 1}</span>
                    <span style={{ color: corp.color }} className="font-bold w-10">{corp.sym}</span>
                    <span className="text-broker-text-muted text-xs flex-1">{pres?.name || '—'}</span>
                    <span className="text-white text-xs">{fmt(corp.price)}</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => dispatch({ type: 'OR_NEXT_CORP' })}
              className="text-xs px-3 py-1.5 rounded bg-broker-surface-hover text-white hover:bg-amber-900/30"
            >
              Next Corp
            </button>
            <button
              onClick={() => {
                const queue = operatingOrder.map(c => c.sym)
                dispatch({ type: 'SET_TURN_QUEUE', queue })
              }}
              className="text-xs px-3 py-1.5 rounded bg-broker-surface-hover text-broker-text-muted hover:text-white"
            >
              Reset Queue
            </button>
          </div>
        </div>
      )}

      {/* Round History */}
      {roundHistory.length > 0 && (
        <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
          <div className="text-broker-text font-medium mb-2">Round History</div>
          <div className="flex flex-wrap gap-1">
            {roundHistory.map((r, i) => (
              <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${
                r.includes('SR') ? 'bg-broker-green/20 text-broker-gold' : 'bg-amber-900/20 text-amber-300'
              }`}>{r}</span>
            ))}
          </div>
        </div>
      )}


      {/* Sync / Room */}
      <SyncSection sync={sync} />
    </div>
  )
}

function SyncSection({ sync }) {
  const [joinCode, setJoinCode] = useState('')
  const [showJoin, setShowJoin] = useState(false)

  if (!sync) return null

  if (sync.roomId) {
    return (
      <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
        <div className="text-broker-text font-medium mb-2">Multi-Device Sync</div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${sync.status === 'connected' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
          <span className="font-mono font-bold text-white tracking-wider">{sync.roomId}</span>
          <span className="text-broker-text-muted text-xs">
            {sync.peerCount > 0 ? `${sync.peerCount + 1} devices` : 'waiting...'}
          </span>
          <button onClick={sync.leaveRoom}
            className="ml-auto text-xs text-broker-text-muted hover:text-red-300 px-2 py-1 rounded bg-broker-surface-hover">
            Leave
          </button>
        </div>
      </div>
    )
  }

  if (sync.savedRoom) {
    return (
      <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
        <div className="text-broker-text font-medium mb-2">Multi-Device Sync</div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-broker-text-muted text-xs">Previous room:</span>
          <span className="font-mono font-bold text-white tracking-wider">{sync.savedRoom.code}</span>
          <button onClick={sync.rejoinRoom}
            className="text-xs bg-blue-800 hover:bg-blue-700 text-white px-2 py-1 rounded">
            Reconnect
          </button>
          <button onClick={() => { localStorage.removeItem('18xxCoupler_room'); location.reload() }}
            className="text-xs text-broker-text-muted hover:text-red-300 px-1">
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
      <div className="text-broker-text font-medium mb-2">Multi-Device Sync</div>
      <p className="text-broker-text-muted text-xs mb-2">
        Create or join a room to sync game state across devices in real time.
      </p>
      {showJoin ? (
        <div className="flex items-center gap-2">
          <input type="text" value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ROOM CODE" maxLength={6} autoFocus
            className="flex-1 bg-broker-bg border border-broker-border rounded px-3 py-2 text-sm text-white font-mono tracking-wider placeholder-broker-text-muted" />
          <button onClick={() => { if (joinCode.trim().length >= 4) { sync.joinRoom(joinCode); setShowJoin(false) } }}
            disabled={joinCode.trim().length < 4}
            className="text-sm bg-blue-800 hover:bg-blue-700 text-white px-3 py-2 rounded disabled:opacity-40">
            Join
          </button>
          <button onClick={() => setShowJoin(false)}
            className="text-sm text-broker-text-muted hover:text-white px-2">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={sync.createRoom}
            className="flex-1 text-sm bg-broker-green hover:bg-broker-green-light text-broker-gold px-3 py-2 rounded">
            Create Room
          </button>
          <button onClick={() => setShowJoin(true)}
            className="flex-1 text-sm bg-broker-surface-hover hover:bg-broker-surface text-broker-text-muted hover:text-white px-3 py-2 rounded">
            Join Room
          </button>
        </div>
      )}
    </div>
  )
}
