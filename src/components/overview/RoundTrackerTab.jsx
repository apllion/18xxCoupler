// RoundTrackerTab — dedicated view for round/turn/phase tracking.
// Shows current round, turn order, phase info, and modification actions.

import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { useDispatch } from '../../hooks/useDispatch.js'
import { roundLabel } from '../../engine/roundTracker.js'
import { currentPhase } from '../../engine/phase.js'
import { corpPrice } from '../../engine/stockMarket.js'
import { formatCurrency } from '../../utils/currency.js'

const OR_STEPS = ['Track', 'Token', 'Routes', 'Dividend', 'Trains']

export default function RoundTrackerTab() {
  const game = useGameStore((s) => s.game)
  const dispatch = useDispatch()

  if (!game) return null

  const rt = game.roundTracker
  const phase = currentPhase(game.phaseManager)
  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const label = rt ? roundLabel(rt) : '—'
  const isSR = rt?.type === 'stock'
  const isOR = rt?.type === 'operating'

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
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => dispatch({ type: 'ADVANCE_ROUND' })}
            className={`flex-1 py-2 rounded font-medium text-sm ${
              isSR
                ? 'bg-broker-green text-broker-gold hover:bg-broker-green-light'
                : 'bg-amber-900 text-amber-200 hover:bg-amber-800'
            }`}
          >
            Advance → {isSR ? 'OR' : 'next'}
          </button>
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
            <span className="text-broker-text-muted">Total ORs played: </span>
            <span className="text-white">{rt?.orTotal || 0}</span>
          </div>
          <div>
            <span className="text-broker-text-muted">SR count: </span>
            <span className="text-white">{rt?.srNumber || 1}</span>
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

      {/* Manual Round Override */}
      <div className="bg-broker-surface rounded-lg p-3 border border-broker-border">
        <div className="text-broker-text font-medium mb-2">Manual Override</div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => dispatch({ type: 'SET_ROUND', roundType: 'stock' })}
            className={`text-xs px-3 py-1.5 rounded ${isSR ? 'bg-broker-green text-broker-gold' : 'bg-broker-surface-hover text-broker-text-muted hover:text-white'}`}
          >
            Set SR
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_ROUND', roundType: 'operating' })}
            className={`text-xs px-3 py-1.5 rounded ${isOR ? 'bg-amber-900 text-amber-200' : 'bg-broker-surface-hover text-broker-text-muted hover:text-white'}`}
          >
            Set OR
          </button>
          {rt?.fixedSequence && (
            <>
              <button
                onClick={() => {
                  if (rt.fixedIndex > 0) dispatch({ type: 'SET_ROUND', fixedIndex: rt.fixedIndex - 1 })
                }}
                disabled={rt.fixedIndex <= 0}
                className="text-xs px-3 py-1.5 rounded bg-broker-surface-hover text-broker-text-muted hover:text-white disabled:opacity-30"
              >
                ← Prev Round
              </button>
              <span className="text-xs text-broker-text-muted self-center">
                {rt.fixedIndex + 1}/{rt.fixedSequence.length}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
